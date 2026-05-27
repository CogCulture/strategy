from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.input_models import OutputSelectionInput
from app.services.knowledge_base import load_session, save_session
from app.models.session_models import SessionStatus
from app.graph.graph_builder import graph
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

async def _run_graph_and_save(session_id: str, initial_state: dict, config: dict):
    """Run the LangGraph pipeline, streaming node events to Redis as they complete."""
    try:
        final_result = None
        async for event in graph.astream_events(initial_state, config=config, version="v2"):
            kind = event.get("event", "")
            name = event.get("name", "")

            # Skip framework-internal nodes
            if name in ("__start__", "LangGraph"):
                continue

            if kind == "on_chain_end":
                output = event.get("data", {}).get("output", {})
                node_events = output.get("stream_events", []) if isinstance(output, dict) else []

                if node_events:
                    # Write new events to Redis so SSE poller picks them up immediately
                    session = await load_session(session_id)
                    if session:
                        session.stream_events = session.stream_events + node_events
                        await save_session(session)

                # Track last output as final result
                if isinstance(output, dict) and ("outputs" in output or "error" in output):
                    final_result = output

        # After graph finishes, consolidate outputs and mark complete
        session = await load_session(session_id)
        if session:
            # Get full final state from the checkpointer
            state = await graph.aget_state(config)
            if state and state.values:
                graph_outputs = state.values.get("outputs", {})
                clean_outputs = {k: v for k, v in graph_outputs.items() if not k.startswith("_") and v}
                session.outputs = clean_outputs
                if state.values.get("error"):
                    session.error = state.values["error"]
                    session.status = SessionStatus.FAILED
                else:
                    session.status = SessionStatus.COMPLETED
            else:
                session.status = SessionStatus.COMPLETED
            await save_session(session)
            logger.info(f"Session {session_id} complete with {len(session.outputs)} outputs")
        else:
            logger.error(f"Session {session_id} not found after graph completion")
    except Exception as e:
        logger.error(f"Graph execution failed for {session_id}: {e}", exc_info=True)
        session = await load_session(session_id)
        if session:
            session.status = SessionStatus.FAILED
            session.error = str(e)
            await save_session(session)


@router.post("/pipeline/run")
async def run_pipeline(body: OutputSelectionInput):
    session = await load_session(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    session.selected_modules = [m.value for m in body.selected_modules]
    session.status = SessionStatus.RUNNING
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
        "stream_events": []
    }
    
    config = {"configurable": {"thread_id": body.session_id}}
    
    # Run graph async — now saves outputs back to session when done
    asyncio.create_task(_run_graph_and_save(body.session_id, initial_state, config))
    
    return {"status": "pipeline_started", "session_id": body.session_id}

@router.get("/pipeline/stream/{session_id}")
async def stream_pipeline(session_id: str):
    """SSE endpoint — polls session status and emits events as pipeline progresses."""

    async def event_generator():
        config = {"configurable": {"thread_id": session_id}}
        last_event_count = 0
        no_progress_ticks = 0
        max_wait_ticks = 300  # 300 × 2s = 10 minutes max

        # Send an initial heartbeat so the browser knows we're alive
        yield f"data: {json.dumps({'event': 'connected'})}\n\n"

        while no_progress_ticks < max_wait_ticks:
            try:
                # Check session status first — it's updated by _run_graph_and_save
                session = await load_session(session_id)

                if session:
                    # Emit any new stream_events recorded by nodes
                    current_events = session.stream_events if hasattr(session, "stream_events") else []
                    new_events = current_events[last_event_count:]
                    for se in new_events:
                        yield f"data: {json.dumps({'event': se})}\n\n"
                    if new_events:
                        last_event_count = len(current_events)
                        no_progress_ticks = 0
                    else:
                        no_progress_ticks += 1

                    if session.status == SessionStatus.COMPLETED:
                        yield f"data: {json.dumps({'event': 'pipeline_complete'})}\n\n"
                        return

                    if session.status == SessionStatus.FAILED:
                        yield f"data: {json.dumps({'event': 'error', 'message': session.error or 'Pipeline failed'})}\n\n"
                        return

                # Also check graph state for human-in-the-loop interrupts
                try:
                    state = await graph.aget_state(config)
                    if state and state.values:
                        # Pick up any stream_events the graph has accumulated
                        graph_events = state.values.get("stream_events", [])
                        new_graph_events = graph_events[last_event_count:]
                        for se in new_graph_events:
                            yield f"data: {json.dumps({'event': se})}\n\n"
                        if new_graph_events:
                            last_event_count = len(graph_events)
                            no_progress_ticks = 0

                        if state.next:
                            if "content_tone" in state.next:
                                buckets = state.values.get("outputs", {}).get("content_buckets")
                                yield f"data: {json.dumps({'event': 'awaiting_bucket_review', 'data': buckets})}\n\n"
                                return
                            if "content_messaging" in state.next:
                                review_data = state.values.get("review_data")
                                yield f"data: {json.dumps({'event': 'awaiting_tone_review', 'data': review_data})}\n\n"
                                return
                        elif state.values and not state.next:
                            # Graph finished but session status update may lag — emit complete
                            if state.values.get("stream_events"):
                                yield f"data: {json.dumps({'event': 'pipeline_complete'})}\n\n"
                                return
                except Exception:
                    pass  # Graph state not available yet, keep polling

            except Exception as e:
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                return

            await asyncio.sleep(2)

        # Timeout
        yield f"data: {json.dumps({'event': 'error', 'message': 'Pipeline timed out after 10 minutes'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection": "keep-alive",
        },
    )
