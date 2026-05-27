from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.utils.prompt_builder import get_positioning_prompt
from app.graph.state import GraphState

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def positioning_node(state: GraphState) -> dict:
    if "positioning" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["positioning_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "positioning")
        prompt = get_positioning_prompt(kb_slice)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        output_text = message.content[0].text
        return {
            "outputs": {"positioning": output_text},
            "stream_events": ["positioning_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["positioning_failed"]
        }
