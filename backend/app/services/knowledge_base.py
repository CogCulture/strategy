import json
from app.config import settings
from app.models.session_models import KnowledgeBase, SessionState

# In-memory session store to replace Redis temporarily
_SESSION_STORE = {}

async def save_session(session_state: SessionState):
    # Store session as JSON string similar to Redis
    _SESSION_STORE[f"session:{session_state.session_id}"] = session_state.model_dump_json()

async def load_session(session_id: str) -> SessionState | None:
    data = _SESSION_STORE.get(f"session:{session_id}")
    if not data:
        return None
    return SessionState.model_validate_json(data)

def slice_kb_for_node(kb: KnowledgeBase, node_name: str) -> dict:
    """
    Return only the KB fields relevant to a given node.
    This is the primary token-saving mechanism — never send the full KB to every node.
    """
    base = {
        "brand_name": kb.brand_input.get("brand_name"),
        "category": kb.brand_input.get("category"),
        "sub_category": kb.brand_input.get("sub_category"),
        "geography": kb.brand_input.get("geography"),
        "guardrails": kb.guardrails,
    }
    
    node_slices = {
        "brand_strategy": {
            **base,
            "target_audience": kb.brand_input.get("target_audience"),
            "persona": kb.brand_input.get("persona"),
            "campaign_positioning": kb.brand_input.get("campaign_positioning"),
            "product_service": kb.brand_input.get("product_service"),
            "website_summary": kb.website_summary,
            "context": kb.raw_context,
            "document_extracts": kb.document_extracts,
        },
        "competition_scan": {
            **base,
            "product_service": kb.brand_input.get("product_service"),
            "website_summary": kb.website_summary,
        },
        "brand_audit": {
            **base,
            "document_extracts": kb.document_extracts,
            "website_summary": kb.website_summary,
        },
        "positioning": {
            **base,
            "target_audience": kb.brand_input.get("target_audience"),
            "persona": kb.brand_input.get("persona"),
            "campaign_positioning": kb.brand_input.get("campaign_positioning"),
            "website_summary": kb.website_summary,
            "document_extracts": kb.document_extracts,
        },
        "social_media": {
            **base,
            "document_extracts": kb.document_extracts,
            "social_media_extracts": kb.social_media_extracts,
            "target_audience": kb.brand_input.get("target_audience"),
        },
        "seo_audit": {
            **base,
            "website_url": kb.brand_input.get("website_url"),
            "product_service": kb.brand_input.get("product_service"),
            "website_summary": kb.website_summary,
        },
        "launch_plan": {
            **base,
            "campaign_positioning": kb.brand_input.get("campaign_positioning"),
            "target_audience": kb.brand_input.get("target_audience"),
            "product_service": kb.brand_input.get("product_service"),
            "context": kb.raw_context,
        },
        "content_strategy": {
            **base,
            "target_audience": kb.brand_input.get("target_audience"),
            "persona": kb.brand_input.get("persona"),
            "campaign_positioning": kb.brand_input.get("campaign_positioning"),
            "product_service": kb.brand_input.get("product_service"),
            "website_summary": kb.website_summary,
            "context": kb.raw_context,
        },
    }
    return node_slices.get(node_name, base)
