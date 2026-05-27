from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from enum import Enum

class OutputModule(str, Enum):
    BRAND_STRATEGY = "brand_strategy"
    COMPETITION_SCAN = "competition_scan"
    BRAND_AUDIT = "brand_audit"
    POSITIONING = "positioning"
    SOCIAL_MEDIA = "social_media"
    SEO_AUDIT = "seo_audit"
    LAUNCH_PLAN = "launch_plan"
    CONTENT_STRATEGY = "content_strategy"

class BrandInput(BaseModel):
    brand_name: str
    website_url: str
    category: str
    sub_category: str
    target_audience: str
    persona: str
    campaign_positioning: str
    product_service: str
    geography: str
    context: Optional[str] = None
    guardrails: Optional[str] = None

class OutputSelectionInput(BaseModel):
    session_id: str
    selected_modules: List[OutputModule]

class ReviewApprovalInput(BaseModel):
    session_id: str
    review_stage: str  # "buckets" | "tone" | "messaging"
    approved: bool
    edits: Optional[dict] = None  # user-supplied edits if approved=False
