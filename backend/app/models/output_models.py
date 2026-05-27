from pydantic import BaseModel
from typing import Optional, Dict, Any

class SessionCreateResponse(BaseModel):
    session_id: str
    status: str = "created"

class PipelineRunResponse(BaseModel):
    status: str
    session_id: str

class ReviewResponse(BaseModel):
    status: str
    next_stage: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    status: str
    filename: str
    session_id: str
    extract_preview: Optional[str] = None
