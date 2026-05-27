from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.utils.prompt_builder import get_key_messaging_prompt
from app.graph.state import GraphState
import json
import re

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def messaging_node(state: GraphState) -> dict:
    if "content_strategy" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["content_messaging_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "content_strategy")
        approved_buckets = state.get("approved_buckets", [])
        approved_tones = state.get("approved_tones", [])

        if not approved_buckets or not approved_tones:
            return {
                "error": "No approved buckets or tones found",
                "stream_events": ["content_messaging_failed"]
            }

        prompt = get_key_messaging_prompt(kb_slice, approved_buckets, approved_tones)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = message.content[0].text
        try:
            messaging = json.loads(raw_text)
        except json.JSONDecodeError:
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw_text)
            if json_match:
                messaging = json.loads(json_match.group(1))
            else:
                messaging = raw_text

        return {
            "outputs": {"content_messaging": messaging},
            "stream_events": ["content_messaging_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["content_messaging_failed"]
        }
