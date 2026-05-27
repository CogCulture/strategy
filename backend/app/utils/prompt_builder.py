import json

# ─────────────────────────────────────────────
# DOCUMENT VISION PROMPTS
# ─────────────────────────────────────────────

def get_document_vision_prompt(doc_context: str = "") -> str:
    return f"""You are a senior brand strategist and analyst. You are reading {doc_context if doc_context else "a brand document"}.

Your task is to extract every piece of information that would be useful for building a brand strategy. Be exhaustive and structured.

Extract and clearly label the following if present:
1. BRAND MESSAGING — taglines, mission statements, slogans, value propositions
2. VISUAL IDENTITY — colours, typography style, logo usage, design language
3. TONE OF VOICE — how the brand communicates (formal/casual, aspirational/functional, etc.)
4. CONTENT THEMES — recurring topics, themes, narratives the brand uses
5. AUDIENCE SIGNALS — who is being spoken to, what pain points are addressed
6. PRODUCT / SERVICE CLAIMS — key features, benefits, differentiators highlighted
7. COMPETITIVE LANGUAGE — any references to competitors or market positioning
8. CAMPAIGN ELEMENTS — any campaign names, hashtags, calls to action
9. SOCIAL PROOF — testimonials, statistics, awards, press mentions
10. GAPS OR INCONSISTENCIES — anything that seems off-brand or missing

If a section has no relevant content visible on this page, write "Not visible on this page" for that section.
Do not fabricate information. Only extract what is explicitly present."""

def get_social_media_vision_prompt(page_context: str = "") -> str:
    return f"""You are a senior social media analyst. You are looking at {page_context if page_context else 'a social media page screenshot'}.

Your task is to extract every piece of social media intelligence visible on this page. Be exhaustive and precise.

Extract and clearly label the following if visible:
1. PLATFORM — Which platform is this (Instagram, Facebook, LinkedIn, Twitter/X, YouTube, etc.)?
2. PROFILE INFO — Username/handle, display name, bio text, profile photo description, verification status
3. FOLLOWER METRICS — Follower count, following count, total posts count, subscriber count
4. POST CONTENT — For each visible post:
   - Content type (image, carousel, reel, video, text post, story)
   - Caption text (full or partial)
   - Visual description of the post image/video thumbnail
   - Hashtags used
   - Engagement metrics: likes, comments, shares, saves, views if visible
5. ENGAGEMENT PATTERNS — Overall engagement rate signals, comment quality/sentiment, response patterns
6. VISUAL STYLE — Color palette, photography style, graphic design approach, template usage, brand consistency
7. CONTENT THEMES — Recurring topics, content categories, posting patterns
8. HIGHLIGHTS/STORIES — Any story highlights, pinned posts, featured content visible
9. BIO LINKS — Any links in bio, linktree, CTA buttons
10. ADS/PROMOTED — Any sponsored or promoted content visible

IMPORTANT:
- Extract EXACT numbers (follower counts, likes, comments) where visible
- Do NOT fabricate or estimate numbers — only report what is explicitly visible
- If a section has no relevant content visible, write 'Not visible on this page'
- Be specific about visual elements — describe colors, layouts, imagery style"""

def get_text_document_prompt(full_text: str, filename: str) -> str:
    return f"""You are a senior brand strategist. You have been given the full text content of a document titled "{filename}".

Document content:
---
{full_text[:8000]}
---

Extract every piece of information relevant to brand strategy, positioning, audience, messaging, tone, and competitive context. Structure your output with clear section headers. Be thorough and precise. Do not fabricate anything not present in the text."""

# ─────────────────────────────────────────────
# WEBSITE EXTRACTION PROMPTS
# ─────────────────────────────────────────────

def get_website_summarisation_prompt(raw_content: str, brand_name: str) -> str:
    return f"""You are a brand intelligence analyst. You have been given the raw extracted content of {brand_name}'s website.

Raw content:
---
{raw_content[:12000]}
---

Your job is to produce a comprehensive brand intelligence report from this content. Structure it as follows:

## Brand Positioning
What position does the brand occupy in its market? What is their core value proposition?

## Tone of Voice
How does the brand communicate? Describe the tone, style, and language patterns with specific examples from the content.

## Product / Service Offerings
List and describe all products or services mentioned. Include pricing signals if present.

## Target Audience
Who is the brand speaking to? What audience signals are present in the language, imagery descriptions, and content?

## Key Brand Claims
What are the primary claims the brand makes about itself? List them explicitly.

## Differentiators
What makes this brand different from competitors according to their own positioning?

## Content Themes
What topics, themes, and narratives recur across the website?

## SEO Signals
What keywords appear frequently? What does the content structure suggest about their SEO strategy?

## Gaps and Opportunities
What is notably absent or underdeveloped on this website that competitors likely cover?

Be specific. Use direct examples from the content. Do not pad with generalities."""

# ─────────────────────────────────────────────
# OUTPUT NODE PROMPTS — all use Claude Sonnet
# ─────────────────────────────────────────────

def get_brand_strategy_prompt(kb_slice: dict) -> str:
    return f"""You are a senior brand strategist at a top-tier marketing agency. You have been briefed on the following brand:

{json.dumps(kb_slice, indent=2)}

Produce a comprehensive Brand Strategy document. This will be used directly in client-facing strategy decks. Structure it as follows:

## 1. Brand Purpose & Vision
Define why this brand exists beyond making money. What change does it want to create in the world?

## 2. Brand Mission
A practical statement of what the brand does, for whom, and how.

## 3. Brand Values (list 4–6)
Core values with a one-paragraph explanation of each and how it manifests in the brand's behaviour.

## 4. Brand Personality
Describe the brand as a person. Include: archetype, character traits, how they speak, how they act.

## 5. Positioning Statement
Format: "For [target audience] who [need/pain], [brand name] is the [category] that [key benefit] because [reason to believe]."

## 6. Brand Promise
One powerful sentence that captures what the brand consistently delivers to its audience.

## 7. Key Brand Pillars (3–4 pillars)
The strategic themes that everything the brand does, says, and creates must ladder up to.

## 8. Audience Insight
A deep articulation of who the target audience is — their aspirations, tensions, behaviours, and what they need from a brand in this category.

## 9. Messaging Hierarchy
Primary message → Secondary messages → Proof points

## 10. Brand Voice Guidelines
Describe the tone of voice. Include: vocabulary to use, vocabulary to avoid, sentence structure, and 3 example phrases that are "on-brand" vs "off-brand".

Respect these guardrails throughout: {kb_slice.get('guardrails', 'None specified')}

Write with strategic depth. This is a senior deliverable."""

def get_competition_scan_prompt(kb_slice: dict) -> str:
    return f"""You are a competitive intelligence analyst at a marketing agency. You are producing a Competition Scan for:

Brand: {kb_slice.get('brand_name')}
Category: {kb_slice.get('category')} > {kb_slice.get('sub_category')}
Geography: {kb_slice.get('geography')}
Product/Service: {kb_slice.get('product_service')}
Website summary: {kb_slice.get('website_summary', 'Not available')}

Produce a Competition Scan structured as follows:

## 1. Competitive Landscape Overview
Who are the key players in this space in {kb_slice.get('geography')}? Map the landscape (premium vs mass, digital-first vs traditional, etc.)

## 2. Direct Competitors (identify 4–6)
For each competitor:
- Brand name
- Positioning in one sentence
- Strengths
- Weaknesses
- Their key audience
- What they do better than {kb_slice.get('brand_name')}
- What {kb_slice.get('brand_name')} can beat them on

## 3. Indirect Competitors (2–3)
Brands not in the same category but competing for the same audience attention or budget.

## 4. Competitive White Space
Where is there a gap in the market that {kb_slice.get('brand_name')} can uniquely occupy?

## 5. Competitive Threats
What competitive moves should {kb_slice.get('brand_name')} be aware of?

## 6. Benchmarking Summary Table
| Brand | Positioning | Strength | Weakness | Audience |
|---|---|---|---|---|
(fill for all competitors)

Be specific and evidence-based. Name real brands."""

def get_brand_audit_prompt(kb_slice: dict) -> str:
    return f"""You are a brand auditor reviewing {kb_slice.get('brand_name')}'s brand presence across social platforms.

Brand context:
{json.dumps(kb_slice, indent=2)}

Based on the document extracts provided (which are from their social media pages), produce a Brand Audit:

## 1. Visual Identity Consistency
Is the visual identity (colours, fonts, logo usage, imagery style) consistent across platforms and content? What inconsistencies exist?

## 2. Tone of Voice Consistency
Is the brand's voice consistent? Does it match their stated positioning? Provide specific examples.

## 3. Content Quality Assessment
Rate and describe: production quality, creative variety, caption quality, use of platform features.

## 4. Messaging Alignment
Does the content reflect the brand's core messages and positioning? What messages are over/under-represented?

## 5. Audience Engagement Signals
What content formats and themes appear to generate the most engagement? What falls flat?

## 6. Platform-Specific Observations
Separate observations per platform if multiple platforms were provided.

## 7. Strengths
What is the brand doing well in its current brand expression?

## 8. Gaps and Recommendations
What is missing? What should change? Be specific and actionable.

Guardrails: {kb_slice.get('guardrails', 'None')}"""

def get_positioning_prompt(kb_slice: dict) -> str:
    return f"""You are a positioning strategist. Using the following brand intelligence, develop a full Positioning document for {kb_slice.get('brand_name')}.

Brand context:
{json.dumps(kb_slice, indent=2)}

## 1. Current Positioning Assessment
Based on the available evidence, where does the brand currently sit in the market?

## 2. Desired Positioning
Where should the brand position itself? Justify this recommendation.

## 3. Positioning Statement (multiple options)
Write 3 alternative positioning statements. Recommend one and explain why.

## 4. Perceptual Map
Describe (in text) where the brand and key competitors sit on two axes most relevant to this category.

## 5. Messaging Territories
What 3–4 thematic territories should the brand own in its communications?

## 6. Proof Points
What evidence supports the brand's right to claim its desired positioning?

## 7. Social Media Positioning
How should the positioning translate into the brand's social media presence? What is the social media "role" of the brand?

Guardrails: {kb_slice.get('guardrails', 'None')}"""

def get_seo_audit_prompt(kb_slice: dict) -> str:
    return f"""You are an SEO strategist. Conduct an SEO audit for {kb_slice.get('brand_name')} at {kb_slice.get('website_url')}.

Category: {kb_slice.get('category')} > {kb_slice.get('sub_category')}
Geography: {kb_slice.get('geography')}
Product/Service: {kb_slice.get('product_service')}
Website summary from extraction: {kb_slice.get('website_summary', 'Not available')}

Using your web search capability, research and produce:

## 1. Keyword Landscape
What are the primary keywords this brand should be targeting? Include: head terms, long-tail variations, and question-based queries.

## 2. Current SEO Signals
Based on available signals, assess the brand's current SEO health: domain presence, indexed content, backlink quality signals.

## 3. Competitor SEO Positioning
Which keywords are competitors ranking for that this brand should target?

## 4. Content Gap Analysis
What content does this brand need to create to compete organically?

## 5. Technical SEO Checklist
List key technical considerations (page speed, mobile, schema, URL structure) relevant to this brand type.

## 6. Local/Geographic SEO
If geography is specific, what local SEO opportunities exist?

## 7. Priority Recommendations
Top 5 SEO actions ranked by impact vs effort."""

def get_launch_plan_prompt(kb_slice: dict) -> str:
    return f"""You are a brand launch strategist. Create a Launch Plan for {kb_slice.get('brand_name')}.

Brand context:
{json.dumps(kb_slice, indent=2)}

## 1. Launch Objectives
What does a successful launch look like? Define measurable objectives.

## 2. Launch Phases (Pre-launch / Launch / Post-launch)
For each phase, define:
- Duration
- Key activities
- Channel focus
- Milestones

## 3. Channel Strategy
Which channels to activate, in what order, and why.

## 4. Content Calendar (first 30 days)
A week-by-week content plan for launch.

## 5. Key Messages per Phase
How does the messaging evolve from teaser to launch to sustain?

## 6. Influencer / Partnership Strategy
Any influencer or co-brand opportunities relevant to this category and geography.

## 7. Budget Allocation Framework
How should launch budget be split across channels? (give percentages, not absolute figures)

## 8. KPIs and Measurement Framework
What metrics matter, what tools to use, and what benchmarks to aim for.

Guardrails: {kb_slice.get('guardrails', 'None')}"""

# ─────────────────────────────────────────────
# CONTENT STRATEGY PROMPTS — 3 phases
# ─────────────────────────────────────────────

def get_content_buckets_prompt(kb_slice: dict) -> str:
    return f"""You are a content strategist. Based on the brand intelligence below, generate a set of Content Buckets for {kb_slice.get('brand_name')}'s social media and content strategy.

Brand context:
{json.dumps(kb_slice, indent=2)}

A content bucket is a strategic thematic category that organises content creation. Each bucket should:
- Serve a clear strategic purpose
- Appeal to the target audience
- Be executable with varied formats
- Ladder up to the brand's positioning

Generate 6–8 content buckets. For each bucket provide:
- **Bucket name** (2–4 words, memorable)
- **Strategic purpose** (why this bucket exists)
- **Description** (what kind of content lives here)
- **Audience need it serves**
- **Example content ideas** (3–5 specific ideas)
- **Recommended content ratio** (what % of total content this bucket should represent)

Guardrails: {kb_slice.get('guardrails', 'None')}

Return your response as a JSON array in this exact format:
[
  {{
    "name": "bucket name",
    "strategic_purpose": "...",
    "description": "...",
    "audience_need": "...",
    "example_ideas": ["idea 1", "idea 2", "idea 3"],
    "content_ratio_percent": 15
  }}
]"""

def get_tone_and_details_prompt(kb_slice: dict, approved_buckets: list) -> str:
    bucket_names = [b.get("name") for b in approved_buckets]
    return f"""You are a brand voice and content strategist. You have been given the approved content buckets for {kb_slice.get('brand_name')}: {bucket_names}

Brand context:
{json.dumps(kb_slice, indent=2)}

For each approved bucket, define the detailed Tone and Content Guidelines:

For each bucket provide:
- **Bucket name**
- **Tone of voice** — how does the brand sound in this bucket? (e.g., authoritative, playful, empathetic)
- **Language style** — vocabulary level, sentence length, formality
- **Do's** — 4–5 specific guidelines for content in this bucket
- **Don'ts** — 4–5 things to avoid
- **Visual style guidance** — what should content look like for this bucket?
- **Format recommendations** — which content formats work best (carousel, reel, static, story, etc.)
- **Hashtag strategy** — branded hashtags, community hashtags, discovery hashtags

Guardrails: {kb_slice.get('guardrails', 'None')}

Return as a JSON array matching the bucket names exactly."""

def get_key_messaging_prompt(kb_slice: dict, approved_buckets: list, approved_tones: list) -> str:
    return f"""You are a brand copywriter and messaging strategist. You are writing the Key Messaging framework for {kb_slice.get('brand_name')}'s content buckets.

Approved buckets: {json.dumps(approved_buckets, indent=2)}
Approved tone guidelines: {json.dumps(approved_tones, indent=2)}

Brand context:
{json.dumps(kb_slice, indent=2)}

For each bucket, produce the Key Messaging:
- **Bucket name**
- **Core message** — the single most important thing this bucket communicates
- **Supporting messages** (3–4) — messages that reinforce the core
- **Proof points** — evidence or examples that back up these messages
- **Audience response desired** — what should the audience think/feel/do after seeing this content?
- **3 sample captions** — ready-to-use example captions (short, medium, long format)
- **3 sample hooks** — opening lines for video or carousel content

Guardrails: {kb_slice.get('guardrails', 'None')}

Return as a JSON array."""

# ─────────────────────────────────────────────
# ROUTING PROMPT — Claude Haiku
# ─────────────────────────────────────────────

def get_router_prompt(selected_modules: list, kb_summary: str) -> str:
    return f"""You are a pipeline router. You have been given a list of output modules to generate and a knowledge base summary.

Selected modules: {selected_modules}
Knowledge base available: {kb_summary}

Return a JSON object with:
- "dispatch_order": list of module names in the order they should be executed (parallel-safe modules first, content_strategy last if selected)
- "requires_social_pdfs": true/false — whether brand_audit or social_media are selected
- "has_content_strategy": true/false

Return only the JSON. No explanation."""

# ─────────────────────────────────────────────
# SOCIAL MEDIA ANALYSIS PROMPT
# ─────────────────────────────────────────────

def get_social_media_prompt(kb_slice: dict) -> str:
    return f"""You are a social media strategist and analyst at a leading marketing agency. You are producing a Social Media Analysis for:

Brand: {kb_slice.get('brand_name')}
Category: {kb_slice.get('category')} > {kb_slice.get('sub_category')}
Geography: {kb_slice.get('geography')}
Target Audience: {kb_slice.get('target_audience')}

Based on the document extracts provided (which are from the brand's and competitors' social media pages):

Brand context:
{json.dumps(kb_slice, indent=2)}

Produce a comprehensive Social Media Analysis:

## 1. Platform Presence Overview
Which platforms is the brand active on? What is the relative priority and investment level per platform?

## 2. Content Strategy Assessment
What content formats are being used? What is the posting frequency? What themes dominate?

## 3. Engagement Analysis
What content generates the highest engagement? What patterns emerge in comments, shares, and saves?

## 4. Audience Analysis
Who is engaging with the brand? Does the engaged audience match the target audience? What audience segments are underserved?

## 5. Competitor Social Benchmarking
How does the brand's social presence compare to competitors in the same category? Who is doing social better and why?

## 6. Hashtag & Discovery Strategy
What hashtags are being used? Are they effective? What discovery opportunities are being missed?

## 7. Visual & Creative Assessment
Rate the visual quality, consistency, and creative innovation of the brand's social content.

## 8. Community Management
How does the brand interact with its community? Response rates, tone, engagement quality.

## 9. Opportunities & Recommendations
Specific, actionable recommendations to improve the brand's social media performance. Prioritise by impact.

## 10. Social Media KPI Framework
What metrics should the brand track, what benchmarks should they aim for, and how should they measure success?

Guardrails: {kb_slice.get('guardrails', 'None')}

Be specific and evidence-based. Reference actual content from the extracts provided."""
