from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.graph.state import GraphState
import logging

client = AsyncAnthropic(api_key=settings.anthropic_api_key)
logger = logging.getLogger(__name__)

async def seo_node(state: GraphState) -> dict:
    if "seo_audit" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["seo_audit_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "seo_audit")
        
        brand_name = kb_slice.get('brand_name')
        website_url = kb_slice.get('website_url')
        category = kb_slice.get('category')
        sub_category = kb_slice.get('sub_category')
        geography = kb_slice.get('geography')
        product_service = kb_slice.get('product_service')
        website_summary = kb_slice.get('website_summary', 'Not available')
        
        # STEP 1: Site Analysis — search and analyze the brand's actual website
        site_prompt = f"""You are an SEO analyst. Search the web for {brand_name}'s website at {website_url}.

Search for:
1. "site:{website_url}" to see what pages are indexed
2. {website_url} directly to analyze the site structure
3. "{brand_name} {category}" to see how the brand appears in search results

Analyze and report:
- What pages/content exist on the site?
- What keywords does the site appear to target?
- How does the site structure look (blog, product pages, landing pages)?
- Any technical SEO signals visible (page titles, meta descriptions, URL structure)
- Content freshness — when was content last updated?
- Domain authority signals — how established is this domain?

Website summary from previous extraction: {website_summary}

Be specific — reference actual pages and content you find."""

        site_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": site_prompt}]
        )
        site_text = "\n".join([b.text for b in site_response.content if hasattr(b, "text")])
        
        # STEP 2: Competitor SEO — find what competitors rank for
        competitor_prompt = f"""You are an SEO analyst. Search the web to identify SEO competitors of {brand_name} in the {category} > {sub_category} space in {geography}.

Search for:
1. Key category terms like "{sub_category} {geography}", "best {sub_category}"
2. See which brands appear in top results for these terms
3. Search competitor websites to analyze their content strategy

Report:
- Which competitors dominate organic search in this category?
- What keywords are they targeting that {brand_name} should also target?
- What content formats do top-ranking competitors use (blogs, guides, comparison pages)?
- What is their content strategy and publishing frequency?
- Any notable SEO tactics they employ?

Be specific — name real competitors and the actual keywords/content you found."""

        competitor_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": competitor_prompt}]
        )
        competitor_text = "\n".join([b.text for b in competitor_response.content if hasattr(b, "text")])
        
        # STEP 3: Keyword & Opportunity Research
        keyword_prompt = f"""You are an SEO keyword researcher. Research keyword opportunities for {brand_name} in the {category} > {sub_category} space in {geography}.

Product/Service: {product_service}

Search for:
1. "{sub_category} guide", "{sub_category} tips", "how to choose {sub_category}"
2. Long-tail keywords: "{sub_category} for [specific use case]", "best {sub_category} [year]"
3. Question queries: "what is the best {sub_category}", "how to [related action]"
4. "People also ask" and related searches for core category terms

Report:
- Primary keywords (head terms) the brand should target
- Long-tail keyword opportunities with estimated difficulty
- Question-based queries for FAQ/blog content
- Trending topics and seasonal keyword patterns
- Content gap opportunities — topics no one is covering well
- Local/geographic SEO keywords if applicable to {geography}

Be specific — provide actual keyword suggestions, not generic categories."""

        keyword_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": keyword_prompt}]
        )
        keyword_text = "\n".join([b.text for b in keyword_response.content if hasattr(b, "text")])
        
        # STEP 4: Synthesis — combine all research into structured audit
        synthesis_prompt = f"""You are a senior SEO strategist. Synthesize the following research into a comprehensive SEO Audit for {brand_name} ({website_url}).

## SITE ANALYSIS:
{site_text}

## COMPETITOR SEO:
{competitor_text}

## KEYWORD RESEARCH:
{keyword_text}

Produce a polished, actionable SEO Audit structured as:

## 1. Keyword Landscape
Primary keywords, long-tail variations, question-based queries. Organize by priority tier.

## 2. Current SEO Health Assessment
Domain presence, indexed content, content quality, technical signals. What's working and what's broken.

## 3. Competitor SEO Positioning
Who ranks for what, competitive keyword gaps, content strategy comparison.

## 4. Content Gap Analysis
What content does {brand_name} need to create? Prioritize by search volume potential and competition level.

## 5. Technical SEO Checklist
Page speed, mobile optimization, schema markup, URL structure, internal linking — specific to this brand's needs.

## 6. Local/Geographic SEO ({geography})
Local SEO opportunities, Google Business Profile, location-specific strategies.

## 7. Priority Recommendations
Top 10 SEO actions ranked by impact vs effort. Be specific — "Create a comparison guide for [keyword]" not "improve content".

Reference specific findings from the research above. Be actionable and concrete."""

        synthesis_response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            messages=[{"role": "user", "content": synthesis_prompt}]
        )
        output_text = synthesis_response.content[0].text
        
        return {
            "outputs": {"seo_audit": output_text},
            "stream_events": ["seo_audit_complete"]
        }
    except Exception as e:
        logger.error(f"SEO audit failed: {e}")
        return {
            "error": str(e),
            "stream_events": ["seo_audit_failed"]
        }
