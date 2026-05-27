from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.graph.state import GraphState
import json

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def social_media_node(state: GraphState) -> dict:
    if "social_media" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["social_media_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "social_media")
        
        social_extracts = kb_slice.get("social_media_extracts", [])
        has_social_data = bool(social_extracts and any(s.strip() for s in social_extracts))
        
        # Build the prompt based on whether we have real social media data
        if has_social_data:
            extracts_text = "\n\n".join(social_extracts)
            data_note = f"""## EXTRACTED SOCIAL MEDIA DATA (from uploaded PDF screenshots)
The following data was extracted from actual social media page screenshots uploaded by the user. This is REAL data — reference it directly with exact numbers and observations.

{extracts_text}"""
        else:
            data_note = """## NO SOCIAL MEDIA DATA UPLOADED
The user did not upload social media page screenshots. Use your web search capability to research the brand's social media presence. Be transparent that this analysis is based on publicly available information found via web search, NOT from direct page data."""
        
        prompt = f"""You are a senior social media strategist and analyst. You are producing a Social Media Analysis for:

Brand: {kb_slice.get('brand_name')}
Category: {kb_slice.get('category')} > {kb_slice.get('sub_category')}
Geography: {kb_slice.get('geography')}
Target Audience: {kb_slice.get('target_audience')}

{data_note}

Search the web for {kb_slice.get('brand_name')}'s social media profiles to supplement and verify the data above.

Produce a comprehensive Social Media Analysis:

## 1. Platform Presence Overview
Which platforms is the brand active on? Current follower counts, posting frequency, platform priority.

## 2. Content Strategy Assessment
What content formats are being used? What themes dominate? What is the content mix (educational, promotional, community, etc.)?

## 3. Engagement Analysis
Engagement rates, best-performing content types, comment quality, community sentiment.

## 4. Audience Analysis
Who is engaging? Does the engaged audience match the target audience? Underserved segments.

## 5. Competitor Social Benchmarking
How does the brand compare to competitors on social? Who is doing it better and why? Search for competitor social profiles.

## 6. Hashtag & Discovery Strategy
Hashtags being used, effectiveness, discovery opportunities being missed.

## 7. Visual & Creative Assessment
Visual quality, consistency, creative innovation, brand identity alignment.

## 8. Community Management
Response rates, tone of community interaction, engagement quality.

## 9. Opportunities & Recommendations
Specific, actionable recommendations prioritized by impact. Be concrete — name specific content ideas, formats, platforms.

## 10. Social Media KPI Framework
Metrics to track, benchmarks to aim for, measurement cadence.

Guardrails: {kb_slice.get('guardrails', 'None')}

Be specific and evidence-based. Reference exact numbers from the extracted data where available. When using web search data, cite what you found."""

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract text from all content blocks (web search returns mixed types)
        output_text = "\n".join([
            block.text for block in message.content
            if hasattr(block, "text")
        ])
        
        return {
            "outputs": {"social_media": output_text},
            "stream_events": ["social_media_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["social_media_failed"]
        }
