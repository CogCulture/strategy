from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import json
import logging
from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import load_session
from app.services.docx_generator import generate_output_docx

router = APIRouter()
logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.anthropic_api_key)

OPUS_MODEL = "claude-opus-4-8"

@router.get("/export/{session_id}")
async def export_report(session_id: str):
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")
    
    if not session.outputs:
        raise HTTPException(400, detail="No outputs generated yet")
    
    brand_name = session.knowledge_base.brand_input.get("brand_name", "Brand")
    
    # First, apply any modifications before sending to Opus
    draft_outputs = session.outputs
    if session.modifications:
        from app.services.modification_parser import apply_modifications
        draft_outputs = apply_modifications(session.outputs, session.modifications)

    # Use Opus to polish the final report
    prompt = f"""You are the Executive Creative Director of a top-tier brand agency. 
Your task is to take the following draft brand strategy outputs and polish them into a flawless, cohesive final report.
Elevate the vocabulary, ensure a consistent premium tone, and fix any inconsistencies.

Draft Outputs:
{json.dumps(draft_outputs, indent=2)}

Return your polished version as a JSON object with the EXACT SAME keys as the input. 
Do NOT wrap the JSON in markdown blocks (e.g. ```json). Output raw valid JSON only."""

    polished_outputs = draft_outputs
    try:
        response = await client.messages.create(
            model=OPUS_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = response.content[0].text.strip()
        # Clean up any potential markdown block
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        polished_outputs = json.loads(response_text.strip())
    except Exception as e:
        logger.error(f"Opus polish failed, falling back to draft: {e}")

    # Generate the DOCX with the polished outputs (passing None for modifications since they are already applied)
    docx_bytes = generate_output_docx(brand_name, polished_outputs, None)
    
    filename = f"{brand_name.replace(' ', '_')}_Brand_Research_Report.docx"
    
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
