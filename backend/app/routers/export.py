from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.services.knowledge_base import load_session
from app.services.docx_generator import generate_output_docx

router = APIRouter()

@router.get("/export/{session_id}")
async def export_report(session_id: str):
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")
    
    if not session.outputs:
        raise HTTPException(400, detail="No outputs generated yet")
    
    brand_name = session.knowledge_base.brand_input.get("brand_name", "Brand")
    docx_bytes = generate_output_docx(brand_name, session.outputs, session.modifications or None)
    
    filename = f"{brand_name.replace(' ', '_')}_Brand_Research_Report.docx"
    
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
