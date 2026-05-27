from fastapi import APIRouter, HTTPException
from app.models.input_models import OutputSelectionInput
from app.services.knowledge_base import load_session, save_session

router = APIRouter()

@router.post("/outputs/select")
async def select_outputs(body: OutputSelectionInput):
    session = await load_session(body.session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")
    
    session.selected_modules = [m.value for m in body.selected_modules]
    await save_session(session)
    
    return {"status": "modules_saved", "selected": session.selected_modules}
