from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.utils.prompt_builder import get_content_buckets_prompt
from app.graph.state import GraphState
import json

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def buckets_node(state: GraphState) -> dict:
    if "content_strategy" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["content_buckets_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "content_strategy")
        prompt = get_content_buckets_prompt(kb_slice)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = message.content[0].text
        try:
            buckets = json.loads(raw_text)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code block
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw_text)
            if json_match:
                buckets = json.loads(json_match.group(1))
            else:
                buckets = raw_text  # fallback to raw text

        return {
            "outputs": {"content_buckets": buckets},
            "stream_events": ["content_buckets_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["content_buckets_failed"]
        }
