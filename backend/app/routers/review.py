from fastapi import APIRouter, HTTPException
from app.models.input_models import ReviewApprovalInput
from app.graph.graph_builder import graph
from app.services.knowledge_base import load_session, save_session
from app.models.session_models import SessionStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/review/approve")
async def approve_review(body: ReviewApprovalInput):
    config = {"configurable": {"thread_id": body.session_id}}
    
    current_state = await graph.aget_state(config)
    if not current_state or not current_state.values:
        raise HTTPException(404, "Session not found in graph")
    
    if body.review_stage == "buckets":
        if body.approved:
            buckets = current_state.values.get("outputs", {}).get("content_buckets")
            await graph.aupdate_state(config, {"approved_buckets": buckets}, as_node="content_buckets")
        else:
            edits = body.edits or {}
            await graph.aupdate_state(config, {"approved_buckets": edits.get("buckets", [])}, as_node="content_buckets")
        
        # Resume graph execution
        result = await graph.ainvoke(None, config=config)
        
        # Save outputs back to session
        await _sync_outputs_to_session(body.session_id, result)
        
        return {"status": "resumed", "next_stage": "tone"}
    
    elif body.review_stage == "tone":
        if body.approved:
            tone_data = current_state.values.get("outputs", {}).get("content_tone")
            await graph.aupdate_state(config, {"approved_tones": tone_data}, as_node="content_tone")
        else:
            edits = body.edits or {}
            await graph.aupdate_state(config, {"approved_tones": edits.get("tones", [])}, as_node="content_tone")
        
        result = await graph.ainvoke(None, config=config)
        
        # Save outputs back to session
        await _sync_outputs_to_session(body.session_id, result)
        
        return {"status": "resumed", "next_stage": "messaging"}
    
    elif body.review_stage == "messaging":
        # Final approval — no more stages
        return {"status": "content_strategy_complete"}
    
    raise HTTPException(400, "Invalid review stage")


async def _sync_outputs_to_session(session_id: str, result: dict):
    """Sync the graph outputs back to the session store after review resumes."""
    try:
        session = await load_session(session_id)
        if session and result:
            graph_outputs = result.get("outputs", {})
            clean_outputs = {k: v for k, v in graph_outputs.items() if not k.startswith("_") and v}
            session.outputs = clean_outputs
            session.status = SessionStatus.COMPLETED
            if result.get("error"):
                session.error = result["error"]
                session.status = SessionStatus.FAILED
            await save_session(session)
            logger.info(f"Review sync: Session {session_id} saved with {len(clean_outputs)} outputs")
    except Exception as e:
        logger.error(f"Failed to sync outputs after review for {session_id}: {e}")
