from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.graph.state import GraphState
import logging

client = AsyncAnthropic(api_key=settings.anthropic_api_key)
logger = logging.getLogger(__name__)

async def competition_scan_node(state: GraphState) -> dict:
    if "competition_scan" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["competition_scan_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "competition_scan")
        
        brand_name = kb_slice.get('brand_name')
        category = kb_slice.get('category')
        sub_category = kb_slice.get('sub_category')
        geography = kb_slice.get('geography')
        product_service = kb_slice.get('product_service')
        website_summary = kb_slice.get('website_summary', 'Not available')
        
        # STEP 1: Discovery — find real competitors via web search
        discovery_prompt = f"""You are a competitive intelligence analyst. Search the web to identify the real competitors of {brand_name} in the {category} > {sub_category} category in {geography}.

Brand context:
- Product/Service: {product_service}
- Website summary: {website_summary}

Search for:
1. "{brand_name} competitors {category} {geography}"
2. "best {sub_category} brands {geography}"
3. "{brand_name} vs" to find commonly compared brands
4. Industry reports or market maps for this category

Return a detailed list of:
- 4-6 DIRECT competitors (same category, same audience)
- 2-3 INDIRECT competitors (different category, competing for same wallet/attention)

For each competitor, provide:
- Brand name
- Website URL
- One-line description of what they do
- Why they are a competitor to {brand_name}
- Approximate market position (leader/challenger/niche)

Only name REAL, verified brands that you found via web search. Do not fabricate."""

        discovery_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": discovery_prompt}]
        )
        
        discovery_text = "\n".join([
            block.text for block in discovery_response.content
            if hasattr(block, "text")
        ])
        
        # STEP 2: Deep analysis — detailed competitive scan using discovered competitors
        analysis_prompt = f"""You are a competitive intelligence analyst at a top marketing agency. You have identified the following competitors for {brand_name}:

{discovery_text}

Now search the web for each competitor to gather detailed intelligence. For each competitor, search their website, social media, recent news, and any available data.

Produce a comprehensive Competition Scan:

## 1. Competitive Landscape Overview
Map the landscape: premium vs mass, digital-first vs traditional, established vs emerging. Where does {brand_name} sit?

## 2. Direct Competitors (4-6)
For each competitor:
- **Brand name & URL**
- **Positioning** in one sentence
- **Key strengths** (what they do well — be specific, reference real products/campaigns/content)
- **Weaknesses** (gaps, complaints, areas where they underperform)
- **Target audience** (who are they going after?)
- **What they do better** than {brand_name}
- **Where {brand_name} can win** against them
- **Pricing signals** if available
- **Social media presence** (follower counts if findable, content approach)

## 3. Indirect Competitors (2-3)
Brands competing for the same audience attention or budget but from different categories.

## 4. Competitive White Space
Where is there a genuine gap that {brand_name} can uniquely occupy? Be specific and evidence-based.

## 5. Competitive Threats
What competitive moves should {brand_name} watch for? Recent launches, funding, market expansions.

## 6. Benchmarking Summary Table
| Brand | Positioning | Key Strength | Key Weakness | Audience | Price Point |
|---|---|---|---|---|---|
(fill for all competitors identified)

Be specific. Use real data found via web search. Cite sources where possible."""

        analysis_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": analysis_prompt}]
        )
        
        analysis_text = "\n".join([
            block.text for block in analysis_response.content
            if hasattr(block, "text")
        ])
        
        # Combine both outputs
        final_output = analysis_text
        
        return {
            "outputs": {"competition_scan": final_output},
            "stream_events": ["competition_scan_complete"]
        }
    except Exception as e:
        logger.error(f"Competition scan failed: {e}")
        return {
            "error": str(e),
            "stream_events": ["competition_scan_failed"]
        }
