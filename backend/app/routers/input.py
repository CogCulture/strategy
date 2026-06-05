from fastapi import APIRouter, HTTPException
from app.models.input_models import BrandInput
from app.models.output_models import SessionCreateResponse
from app.models.session_models import SessionState, SessionStatus, KnowledgeBase
from app.services.knowledge_base import save_session, load_session
from app.services.website_extractor import extract_and_summarise
from app.utils.session_utils import generate_session_id

router = APIRouter()

@router.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Lightweight status endpoint polled by frontend every 4 s instead of SSE."""
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": session_id,
        "status": session.status.value,
        "error": session.error,
        "stream_events": session.stream_events,
        "review_stage": session.review_stage,
    }

@router.get("/session/{session_id}")
async def get_session_data(session_id: str):
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session.model_dump()


@router.post("/session/create", response_model=SessionCreateResponse)
async def create_session(body: BrandInput):
    session_id = generate_session_id()
    
    # Build initial knowledge base
    kb = KnowledgeBase(
        brand_input=body.model_dump(),
        guardrails=body.guardrails,
        raw_context=body.context,
    )
    
    # Create session
    session = SessionState(
        session_id=session_id,
        status=SessionStatus.CREATED,
        knowledge_base=kb,
    )
    await save_session(session)
    
    # Extract website in background (non-blocking for now, simple approach)
    try:
        website_summary = await extract_and_summarise(body.website_url, body.brand_name)
        session.knowledge_base.website_summary = website_summary
        session.status = SessionStatus.KB_READY
        await save_session(session)
    except Exception as e:
        # Website extraction failure should not block session creation
        session.status = SessionStatus.KB_READY
        await save_session(session)
    
    return SessionCreateResponse(session_id=session_id, status=session.status.value)
