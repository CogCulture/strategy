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
    """Run the LangGraph pipeline, then write outputs back to the session store."""
    try:
        result = await graph.ainvoke(initial_state, config=config)

        # Write graph outputs back to the session
        session = await load_session(session_id)
        if session:
            graph_outputs = result.get("outputs", {})
            # Filter out internal keys like _routing
            clean_outputs = {k: v for k, v in graph_outputs.items() if not k.startswith("_") and v}
            session.outputs = clean_outputs
            session.status = SessionStatus.COMPLETED
            if result.get("error"):
                session.error = result["error"]
                session.status = SessionStatus.FAILED
            await save_session(session)
            logger.info(f"Session {session_id} saved with {len(clean_outputs)} outputs: {list(clean_outputs.keys())}")
        else:
            logger.error(f"Session {session_id} not found after graph completion")
    except Exception as e:
        logger.error(f"Graph execution failed for {session_id}: {e}")
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
    """SSE endpoint — frontend connects here to receive live node completion events."""
    
    async def event_generator():
        config = {"configurable": {"thread_id": session_id}}
        last_event_count = 0
        
        while True:
            try:
                state = await graph.aget_state(config)
                if state and state.values:
                    events = state.values.get("stream_events", [])
                    new_events = events[last_event_count:]
                    for event in new_events:
                        yield f"data: {json.dumps({'event': event})}\n\n"
                    last_event_count = len(events)
                    
                    # Check if awaiting human review
                    if state.next and "content_tone" in state.next:
                        yield f"data: {json.dumps({'event': 'awaiting_bucket_review', 'data': state.values.get('outputs', {}).get('content_buckets')})}\n\n"
                    elif state.next and "content_messaging" in state.next:
                        yield f"data: {json.dumps({'event': 'awaiting_tone_review', 'data': state.values.get('review_data')})}\n\n"
                    
                    # Check if all done
                    if not state.next:
                        yield f"data: {json.dumps({'event': 'pipeline_complete'})}\n\n"
                        break
                        
            except Exception as e:
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                break
            
            await asyncio.sleep(2)
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
