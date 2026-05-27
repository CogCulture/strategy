from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import slice_kb_for_node
from app.models.session_models import KnowledgeBase
from app.utils.prompt_builder import get_launch_plan_prompt
from app.graph.state import GraphState

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def launch_plan_node(state: GraphState) -> dict:
    if "launch_plan" not in state["selected_modules"]:
        return {"outputs": {}, "stream_events": ["launch_plan_skipped"]}

    try:
        kb = KnowledgeBase(**state["knowledge_base"])
        kb_slice = slice_kb_for_node(kb, "launch_plan")
        prompt = get_launch_plan_prompt(kb_slice)

        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        output_text = message.content[0].text
        return {
            "outputs": {"launch_plan": output_text},
            "stream_events": ["launch_plan_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["launch_plan_failed"]
        }
