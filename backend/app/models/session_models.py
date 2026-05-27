from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum

class SessionStatus(str, Enum):
    CREATED = "created"
    PROCESSING_DOCS = "processing_docs"
    KB_READY = "kb_ready"
    RUNNING = "running"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    FAILED = "failed"

class KnowledgeBase(BaseModel):
    brand_input: Dict[str, Any]
    website_summary: Optional[str] = None
    document_extracts: List[str] = []
    social_media_extracts: List[str] = []  # Extracted from social media page PDFs via vision
    raw_context: Optional[str] = None
    guardrails: Optional[str] = None

class SessionState(BaseModel):
    session_id: str
    status: SessionStatus = SessionStatus.CREATED
    knowledge_base: Optional[KnowledgeBase] = None
    selected_modules: List[str] = []
    outputs: Dict[str, Any] = {}
    review_stage: Optional[str] = None
    review_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    stream_events: List[str] = []  # node completion events for SSE polling

    # Research memory
    research_map: Optional[str] = None
    chunk_index: Optional[str] = None
    chunks: Dict[str, str] = {}  # chunk_id -> full text

    # Chat memory
    key_decisions: List[str] = []
    conversation_summary: Optional[str] = None
    chat_messages: List[Dict[str, str]] = []  # all messages for display
    working_memory_start: int = 0  # index where working memory begins

    # Document modifications
    modifications: List[Dict[str, Any]] = []
