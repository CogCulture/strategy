from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from app.models.input_models import OutputSelectionInput
from app.services.knowledge_base import load_session, save_session
from app.models.session_models import SessionStatus
from app.graph.graph_builder import graph
import asyncio
import json
import traceback

router = APIRouter()

# Module-level task store — prevents asyncio tasks from being GC'd before they run
_active_tasks: set = set()

CODE_VERSION = "v4-bgfix"  # bump this to verify new code is deployed


async def _run_graph_and_save(session_id: str, initial_state: dict, config: dict):
    """Run the LangGraph pipeline with ainvoke, then persist results to Redis."""
    print(f"[PIPELINE-{CODE_VERSION}] Starting graph for session {session_id}", flush=True)
    try:
        result = await graph.ainvoke(initial_state, config=config)
        print(f"[PIPELINE-{CODE_VERSION}] Graph finished for session {session_id}", flush=True)

        session = await load_session(session_id)
        if not session:
            print(f"[PIPELINE-{CODE_VERSION}] ERROR: session {session_id} not found after graph completion", flush=True)
            return

        graph_outputs = result.get("outputs", {}) if isinstance(result, dict) else {}
        clean_outputs = {k: v for k, v in graph_outputs.items() if not k.startswith("_") and v}
        session.outputs = clean_outputs

        graph_events = result.get("stream_events", []) if isinstance(result, dict) else []
        session.stream_events = graph_events

        if isinstance(result, dict) and result.get("error"):
            session.error = result["error"]
            session.status = SessionStatus.FAILED
            print(f"[PIPELINE-{CODE_VERSION}] Graph error for {session_id}: {result['error']}", flush=True)
        else:
            session.status = SessionStatus.COMPLETED

        await save_session(session)
        print(f"[PIPELINE-{CODE_VERSION}] Saved {session_id} status={session.status.value} outputs={list(clean_outputs.keys())}", flush=True)

    except Exception as e:
        print(f"[PIPELINE-{CODE_VERSION}] EXCEPTION for {session_id}: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        try:
            session = await load_session(session_id)
            if session:
                session.status = SessionStatus.FAILED
                session.error = str(e)
                await save_session(session)
        except Exception as save_err:
            print(f"[PIPELINE-{CODE_VERSION}] Could not save failure state: {save_err}", flush=True)


@router.get("/pipeline/version")
async def pipeline_version():
    """Canary endpoint — check this to confirm new code is deployed."""
    return {"version": CODE_VERSION}


@router.post("/pipeline/run")
async def run_pipeline(body: OutputSelectionInput, background_tasks: BackgroundTasks):
    """
    Start the pipeline using FastAPI BackgroundTasks (more reliable than asyncio.create_task).
    BackgroundTasks is managed by FastAPI/Starlette — won't be GC'd.
    """
    print(f"[PIPELINE-{CODE_VERSION}] /pipeline/run called for {body.session_id}", flush=True)

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

    print(f"[PIPELINE-{CODE_VERSION}] Scheduling background task modules={session.selected_modules}", flush=True)

    # Use BackgroundTasks — runs after response is sent, managed by FastAPI lifecycle
    background_tasks.add_task(_run_graph_and_save, body.session_id, initial_state, config)

    return {"status": "pipeline_started", "session_id": body.session_id}


@router.get("/pipeline/stream/{session_id}")
async def stream_pipeline(session_id: str):
    """
    SSE endpoint — polls Redis session status every 3 s.
    Sends pipeline_complete or error based on session.status.
    Sends : heartbeat comments every 15 s to keep connection alive through proxies.
    """

    async def event_generator():
        yield f"data: {json.dumps({'event': 'connected', 'version': CODE_VERSION})}\n\n"
        print(f"[SSE-{CODE_VERSION}] Client connected for {session_id}", flush=True)

        tick = 0
        max_ticks = 400  # 400 × 3 s ≈ 20 min

        while tick < max_ticks:
            tick += 1

            # Keep-alive heartbeat every 15 s (every 5 ticks at 3 s/tick)
            if tick % 5 == 0:
                yield ": heartbeat\n\n"
                print(f"[SSE-{CODE_VERSION}] heartbeat tick={tick} for {session_id}", flush=True)

            try:
                session = await load_session(session_id)
                if not session:
                    yield f"data: {json.dumps({'event': 'error', 'message': 'Session not found'})}\n\n"
                    return

                if session.status == SessionStatus.COMPLETED:
                    for se in session.stream_events:
                        yield f"data: {json.dumps({'event': se})}\n\n"
                    yield f"data: {json.dumps({'event': 'pipeline_complete'})}\n\n"
                    print(f"[SSE-{CODE_VERSION}] pipeline_complete sent for {session_id}", flush=True)
                    return

                if session.status == SessionStatus.FAILED:
                    yield f"data: {json.dumps({'event': 'error', 'message': session.error or 'Pipeline failed'})}\n\n"
                    print(f"[SSE-{CODE_VERSION}] pipeline_failed for {session_id}: {session.error}", flush=True)
                    return

                # Check human-in-the-loop interrupts
                try:
                    gconfig = {"configurable": {"thread_id": session_id}}
                    state = await graph.aget_state(gconfig)
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
                    pass  # Graph state not ready yet — normal during early ticks

            except Exception as e:
                print(f"[SSE-{CODE_VERSION}] Poll error for {session_id}: {e}", flush=True)
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                return

            await asyncio.sleep(3)

        yield f"data: {json.dumps({'event': 'error', 'message': 'Pipeline timed out after 20 minutes'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
