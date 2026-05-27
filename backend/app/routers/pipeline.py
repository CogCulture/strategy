from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.input_models import OutputSelectionInput
from app.services.knowledge_base import load_session, save_session
from app.models.session_models import SessionStatus
from app.graph.graph_builder import graph
import asyncio
import json
import traceback

router = APIRouter()


async def _run_graph_and_save(session_id: str, initial_state: dict, config: dict):
    """Run the LangGraph pipeline with ainvoke, then persist results to Redis."""
    print(f"[PIPELINE] Starting graph for session {session_id}", flush=True)
    try:
        # ainvoke is proven reliable — runs the full graph to completion
        result = await graph.ainvoke(initial_state, config=config)
        print(f"[PIPELINE] Graph finished for session {session_id}", flush=True)

        session = await load_session(session_id)
        if not session:
            print(f"[PIPELINE] ERROR: session {session_id} not found after graph completion", flush=True)
            return

        # Persist outputs
        graph_outputs = result.get("outputs", {}) if isinstance(result, dict) else {}
        clean_outputs = {
            k: v for k, v in graph_outputs.items()
            if not k.startswith("_") and v
        }
        session.outputs = clean_outputs

        # Persist stream_events for the SSE poller
        graph_events = result.get("stream_events", []) if isinstance(result, dict) else []
        session.stream_events = graph_events

        if isinstance(result, dict) and result.get("error"):
            session.error = result["error"]
            session.status = SessionStatus.FAILED
            print(f"[PIPELINE] Graph reported error for {session_id}: {result['error']}", flush=True)
        else:
            session.status = SessionStatus.COMPLETED

        await save_session(session)
        print(f"[PIPELINE] Session {session_id} saved — status={session.status.value}, outputs={list(clean_outputs.keys())}", flush=True)

    except Exception as e:
        print(f"[PIPELINE] EXCEPTION for {session_id}: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        try:
            session = await load_session(session_id)
            if session:
                session.status = SessionStatus.FAILED
                session.error = str(e)
                await save_session(session)
        except Exception as save_err:
            print(f"[PIPELINE] Could not save failure state: {save_err}", flush=True)


@router.post("/pipeline/run")
async def run_pipeline(body: OutputSelectionInput):
    session = await load_session(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    session.selected_modules = [m.value for m in body.selected_modules]
    session.status = SessionStatus.RUNNING
    session.stream_events = []
    await save_session(session)

    initial_state = {
        "session_id": body.session_id,
        "knowledge_base": session.knowledge_base.model_dump(),
        "selected_modules": session.selected_modules,
        "outputs": {},
        "review_stage": None,
        "review_data": None,
        "approved_buckets": None,
        "approved_tones": None,
        "error": None,
        "stream_events": [],
    }

    config = {"configurable": {"thread_id": body.session_id}}

    print(f"[PIPELINE] Scheduling task for session {body.session_id} modules={session.selected_modules}", flush=True)
    asyncio.create_task(_run_graph_and_save(body.session_id, initial_state, config))

    return {"status": "pipeline_started", "session_id": body.session_id}


@router.get("/pipeline/stream/{session_id}")
async def stream_pipeline(session_id: str):
    """
    SSE endpoint — polls Redis session status every 3 s.
    Emits pipeline_complete or error based on session.status.
    Sends a : heartbeat comment every 15 s so browsers don't time out.
    """

    async def event_generator():
        # Tell browser we're alive
        yield f"data: {json.dumps({'event': 'connected'})}\n\n"
        print(f"[SSE] Client connected for {session_id}", flush=True)

        tick = 0
        max_ticks = 400  # 400 × 3 s = ~20 minutes max

        while tick < max_ticks:
            tick += 1

            # Heartbeat every 15 s (every 5 ticks) to keep connection alive
            if tick % 5 == 0:
                yield ": heartbeat\n\n"

            try:
                session = await load_session(session_id)
                if not session:
                    yield f"data: {json.dumps({'event': 'error', 'message': 'Session not found'})}\n\n"
                    return

                if session.status == SessionStatus.COMPLETED:
                    # Forward all stream_events (node completions) then signal done
                    for se in session.stream_events:
                        yield f"data: {json.dumps({'event': se})}\n\n"
                    yield f"data: {json.dumps({'event': 'pipeline_complete'})}\n\n"
                    print(f"[SSE] pipeline_complete sent for {session_id}", flush=True)
                    return

                if session.status == SessionStatus.FAILED:
                    yield f"data: {json.dumps({'event': 'error', 'message': session.error or 'Pipeline failed'})}\n\n"
                    print(f"[SSE] pipeline_failed sent for {session_id}: {session.error}", flush=True)
                    return

                # Check for human-in-the-loop graph interrupts
                try:
                    config = {"configurable": {"thread_id": session_id}}
                    state = await graph.aget_state(config)
                    if state and state.next:
                        if "content_tone" in state.next:
                            buckets = state.values.get("outputs", {}).get("content_buckets")
                            yield f"data: {json.dumps({'event': 'awaiting_bucket_review', 'data': buckets})}\n\n"
                            return
                        if "content_messaging" in state.next:
                            review_data = state.values.get("review_data")
                            yield f"data: {json.dumps({'event': 'awaiting_tone_review', 'data': review_data})}\n\n"
                            return
                except Exception:
                    pass  # Graph state not ready yet — normal during early polling

            except Exception as e:
                print(f"[SSE] Error polling for {session_id}: {e}", flush=True)
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                return

            await asyncio.sleep(3)

        yield f"data: {json.dumps({'event': 'error', 'message': 'Pipeline timed out'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
