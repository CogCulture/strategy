import json
import re
import logging
from typing import Optional
from anthropic import AsyncAnthropic
from app.config import settings

logger = logging.getLogger(__name__)

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

SONNET_MODEL = "claude-sonnet-4-20250514"

# Prefix map for generating chunk IDs from section keys
SECTION_PREFIXES = {
    "brand_strategy": "bs",
    "competition_scan": "cs",
    "brand_audit": "ba",
    "positioning": "ps",
    "social_media": "sm",
    "seo_audit": "se",
    "launch_plan": "lp",
    "content_buckets": "cb",
    "content_tone": "ct",
    "content_messaging": "cm",
}


async def prepare_research_memory(outputs: dict) -> tuple[str, str, dict]:
    """
    One-time setup after pipeline completes.
    Parses all research outputs into chunks, then calls Haiku once to
    generate a research_map and chunk_index.
    """
    chunks: dict[str, str] = {}
    section_summaries: list[dict] = []  # for the Haiku prompt

    for section_key, content in outputs.items():
        if not content or not isinstance(content, str):
            continue

        prefix = SECTION_PREFIXES.get(section_key, section_key[:2])

        # Split on ## headers — nested ### headers stay within their parent chunk
        parts = re.split(r"(?=^## )", content, flags=re.MULTILINE)
        chunk_counter = 0

        for part in parts:
            part = part.strip()
            if not part:
                continue
            chunk_counter += 1
            chunk_id = f"{prefix}-{chunk_counter}"
            chunks[chunk_id] = part

            # Extract title (first line) for index building
            first_line = part.split("\n")[0].strip().lstrip("# ").strip()
            preview = part[:200].replace("\n", " ")
            section_summaries.append({
                "chunk_id": chunk_id,
                "section": section_key,
                "title": first_line,
                "preview": preview,
            })

    # Call Haiku once to build the research map and chunk index
    summaries_text = "\n".join(
        f"- {s['chunk_id']} [{s['section']}] \"{s['title']}\": {s['preview']}"
        for s in section_summaries
    )

    try:
        response = await client.messages.create(
            model=SONNET_MODEL,
            max_tokens=1500,
            system="You are a research indexing assistant. Given a list of research chunk summaries, produce two outputs in the exact format specified.",
            messages=[{
                "role": "user",
                "content": f"""Here are the research chunks:

{summaries_text}

Produce the following two sections:

---RESEARCH_MAP---
A hierarchical overview of all research sections and how they relate (~500 tokens).
Group chunks by their section and describe the overall structure.

---CHUNK_INDEX---
For each chunk, provide:
chunk_id: title — one-line summary

Return both sections with the exact delimiters above."""
            }],
        )

        raw = response.content[0].text

        # Parse research_map and chunk_index from response
        research_map = ""
        chunk_index = ""

        if "---RESEARCH_MAP---" in raw and "---CHUNK_INDEX---" in raw:
            map_part = raw.split("---RESEARCH_MAP---")[1].split("---CHUNK_INDEX---")[0].strip()
            index_part = raw.split("---CHUNK_INDEX---")[1].strip()
            research_map = map_part
            chunk_index = index_part
        else:
            # Fallback: use entire response as both
            research_map = raw[:1500]
            chunk_index = raw

    except Exception as e:
        logger.error(f"Haiku indexing call failed: {e}")
        # Fallback: build simple index manually
        research_map = "Research sections: " + ", ".join(
            s["section"] for s in section_summaries
        )
        chunk_index = "\n".join(
            f"{s['chunk_id']}: {s['title']} — {s['preview'][:80]}"
            for s in section_summaries
        )

    return research_map, chunk_index, chunks


async def route_to_chunks(message: str, chunk_index: str) -> list[str]:
    """
    Fast Haiku call to identify 3-5 relevant chunk IDs for a user message.
    Falls back to keyword matching if Haiku fails.
    """
    try:
        response = await client.messages.create(
            model=SONNET_MODEL,
            max_tokens=200,
            system=(
                "Given the user's question and the research chunk index below, "
                "return a JSON array of 3-5 chunk IDs most relevant to answering "
                "the question. Return ONLY the JSON array, nothing else."
            ),
            messages=[{
                "role": "user",
                "content": f"Question: {message}\n\nChunk Index:\n{chunk_index}",
            }],
        )

        raw = response.content[0].text.strip()
        # Extract JSON array from response
        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match:
            chunk_ids = json.loads(match.group())
            if isinstance(chunk_ids, list) and all(isinstance(c, str) for c in chunk_ids):
                return chunk_ids

    except Exception as e:
        logger.warning(f"Haiku routing failed, falling back to keyword match: {e}")

    # Fallback: keyword matching against chunk index lines
    return _keyword_fallback(message, chunk_index)


def _keyword_fallback(message: str, chunk_index: str) -> list[str]:
    """Simple keyword matching when Haiku routing fails."""
    words = set(message.lower().split())
    # Remove common stop words
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "how",
                  "can", "do", "does", "in", "on", "for", "to", "of", "and",
                  "my", "our", "this", "that", "about", "me", "i"}
    keywords = words - stop_words

    scored: list[tuple[str, int]] = []
    for line in chunk_index.split("\n"):
        line_lower = line.lower()
        # Extract chunk_id from the line
        match = re.match(r"^([a-z]{2}-\d+)", line.strip())
        if not match:
            continue
        chunk_id = match.group(1)
        score = sum(1 for kw in keywords if kw in line_lower)
        if score > 0:
            scored.append((chunk_id, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    result = [cid for cid, _ in scored[:5]]

    # If nothing matched, return first 3 chunk IDs from the index
    if not result:
        for line in chunk_index.split("\n"):
            m = re.match(r"^([a-z]{2}-\d+)", line.strip())
            if m:
                result.append(m.group(1))
            if len(result) >= 3:
                break

    return result


CHAT_SYSTEM_PROMPT = """You are a senior brand strategist and consultant. Your role depends on the current state of the research:

IF RESEARCH OUTPUTS EXIST:
You have just completed an in-depth research report for this brand. 
1. ALWAYS reference specific data, names, numbers, and findings from the research when answering. Never give generic marketing advice.
2. Quote and reference actual findings — don't paraphrase vaguely.
3. If asked about something NOT covered in the research, explicitly say "This wasn't covered in the current research" and offer to add it.
4. Be opinionated and strategic. Keep responses actionable.

IF RESEARCH OUTPUTS DO NOT EXIST YET:
You are preparing to generate the strategy module.
1. Review the "Knowledge Base" provided below (User Inputs and Documents).
2. If you are missing crucial context to generate the requested strategy, act as a consultant and ASK the user for it politely.
3. If you have enough context, confirm you are ready and offer to generate the report.

DOCUMENT MODIFICATION RULES:
When the user asks you to MODIFY, REWRITE, ADD, or REMOVE content from the research document (OR if you are generating it for the first time), you MUST include a structured update tag at the END of your response (after your conversational reply):

---RESEARCH_UPDATE---
action: replace | append | add_new | remove
section: section_key (e.g. brand_strategy, launch_plan, competition_scan, positioning, social_media, seo_audit, brand_audit)
chunk: chunk_id (optional, for chunk-level changes within a section)
title: Section Title (required only for add_new action)
content:
(the actual research content to go into the document — write it as polished, professional research output, not conversational text)
---END_UPDATE---

When the user just asks questions or has a discussion, respond normally WITHOUT any update tags. Only include the tag when explicitly asked to change, add, rewrite, or remove something, OR when generating it for the first time.
IMPORTANT: The content inside the update tag must be written as formal research output (with ## headers, bullet points, data) — NOT as chat conversation."""


def build_chat_prompt(
    session,
    message: str,
    relevant_chunk_ids: list[str],
) -> list[dict]:
    """
    Assemble the full prompt from 4 tiers:
    1. System prompt + knowledge base + research map + key decisions
    2. Conversation summary (if exists)
    3. Last 6 raw messages (sliding window)
    4. Full text of relevant chunks + current user message
    """
    # --- System message ---
    system_parts = [CHAT_SYSTEM_PROMPT]
    
    # Inject Knowledge Base
    kb_parts = []
    if session.knowledge_base:
        if session.knowledge_base.brand_input:
            kb_parts.append(f"User Inputs:\n{json.dumps(session.knowledge_base.brand_input, indent=2)}")
        if session.knowledge_base.document_extracts:
            kb_parts.append(f"Extracted Documents Context:\n" + "\n".join(session.knowledge_base.document_extracts))
        if session.knowledge_base.social_media_extracts:
            kb_parts.append(f"Social Media Extracts:\n" + "\n".join(session.knowledge_base.social_media_extracts))
            
    if kb_parts:
        system_parts.append("\n\n## Knowledge Base\n" + "\n\n".join(kb_parts))

    if session.research_map:
        system_parts.append(f"\n\n## Research Overview\n{session.research_map}")

    if session.key_decisions:
        decisions_text = "\n".join(f"- {d}" for d in session.key_decisions)
        system_parts.append(f"\n\n## Key Decisions So Far\n{decisions_text}")

    system_message = "\n".join(system_parts)

    # --- Build messages list ---
    messages: list[dict] = []

    # Conversation summary as first context message
    if session.conversation_summary:
        messages.append({
            "role": "user",
            "content": f"[Previous conversation summary: {session.conversation_summary}]",
        })
        messages.append({
            "role": "assistant",
            "content": "I understand the context from our previous conversation. How can I help?",
        })

    # Last 6 raw messages from the sliding window
    start = session.working_memory_start
    recent_messages = session.chat_messages[start:][-6:]
    for msg in recent_messages:
        messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    # Relevant chunks as context + current user message
    chunk_texts = []
    for cid in relevant_chunk_ids:
        if cid in session.chunks:
            chunk_texts.append(f"[Chunk {cid}]:\n{session.chunks[cid]}")

    context_block = ""
    if chunk_texts:
        context_block = (
            "\n\n## Relevant Research Sections\n"
            + "\n\n---\n\n".join(chunk_texts)
            + "\n\n---\n\n"
        )

    user_content = f"{context_block}User question: {message}"
    messages.append({"role": "user", "content": user_content})

    return [{"role": "system", "content": system_message}] + messages


async def maybe_compress_memory(session) -> object:
    """
    If the sliding window has grown beyond 6 messages, compress older messages
    into a summary and extract key decisions.
    """
    total = len(session.chat_messages)
    window_size = total - session.working_memory_start

    if window_size <= 6:
        return session

    # Messages to compress: from working_memory_start to (total - 6)
    compress_end = total - 6
    to_compress = session.chat_messages[session.working_memory_start:compress_end]

    if not to_compress:
        return session

    conversation_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in to_compress
    )

    existing_summary = session.conversation_summary or ""
    existing_context = (
        f"Previous summary: {existing_summary}\n\n" if existing_summary else ""
    )

    try:
        response = await client.messages.create(
            model=SONNET_MODEL,
            max_tokens=600,
            system="You are a conversation summarizer. Be concise and preserve key information.",
            messages=[{
                "role": "user",
                "content": f"""{existing_context}New conversation messages to incorporate:

{conversation_text}

Produce two sections:

---SUMMARY---
A concise paragraph summarizing the full conversation so far (merge with previous summary if provided).

---DECISIONS---
A JSON array of strings listing any key decisions, preferences, or directions the user expressed. Return [] if none.
""",
            }],
        )

        raw = response.content[0].text

        # Parse summary
        if "---SUMMARY---" in raw:
            summary_part = raw.split("---SUMMARY---")[1]
            if "---DECISIONS---" in summary_part:
                summary_part = summary_part.split("---DECISIONS---")[0]
            session.conversation_summary = summary_part.strip()
        else:
            session.conversation_summary = raw[:500]

        # Parse decisions
        if "---DECISIONS---" in raw:
            decisions_raw = raw.split("---DECISIONS---")[1].strip()
            match = re.search(r"\[.*?\]", decisions_raw, re.DOTALL)
            if match:
                new_decisions = json.loads(match.group())
                if isinstance(new_decisions, list):
                    session.key_decisions.extend(
                        d for d in new_decisions
                        if isinstance(d, str) and d not in session.key_decisions
                    )

    except Exception as e:
        logger.error(f"Memory compression failed: {e}")
        # Fallback: just update the window start without summarizing
        pass

    session.working_memory_start = compress_end
    return session
