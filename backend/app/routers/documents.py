from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.models.output_models import DocumentUploadResponse
from app.services.knowledge_base import load_session, save_session
from app.services.document_reader import process_document, process_social_media_pdf
from app.models.session_models import SessionStatus
from app.config import settings

router = APIRouter()

@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    doc_type: str = Form("general")
):
    # Validate session
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")
    
    # Validate file type
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in settings.allowed_file_types_list:
        raise HTTPException(
            400, 
            detail=f"File type '{ext}' not allowed. Allowed: {settings.allowed_file_types_list}"
        )
    
    # Validate file size
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            400, 
            detail=f"File size exceeds {settings.max_upload_size_mb}MB limit"
        )
    
    # Process document
    try:
        session.status = SessionStatus.PROCESSING_DOCS
        await save_session(session)
        
        if doc_type == "social_media" and ext == "pdf":
            extract = await process_social_media_pdf(content, file.filename)
            session.knowledge_base.social_media_extracts.append(extract)
        else:
            extract = await process_document(content, file.filename, file.content_type or "")
            session.knowledge_base.document_extracts.append(extract)
        session.status = SessionStatus.KB_READY
        await save_session(session)
        
        return DocumentUploadResponse(
            status="processed",
            filename=file.filename,
            session_id=session_id,
            extract_preview=extract[:200] + "..." if len(extract) > 200 else extract
        )
    except Exception as e:
        session.status = SessionStatus.KB_READY  # Don't block on doc failure
        await save_session(session)
        raise HTTPException(500, detail=f"Document processing failed: {str(e)}")
