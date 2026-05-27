from anthropic import AsyncAnthropic
from app.config import settings
from app.utils.prompt_builder import get_router_prompt
from app.graph.state import GraphState
import json

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def router_node(state: GraphState) -> dict:
    try:
        modules = state["selected_modules"]
        kb = state["knowledge_base"]
        kb_summary = f"Brand: {kb.get('brand_input', {}).get('brand_name', 'Unknown')}, Modules: {modules}"
        prompt = get_router_prompt(modules, kb_summary)

        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        # Try to parse router response
        try:
            routing = json.loads(response_text)
        except json.JSONDecodeError:
            routing = {"dispatch_order": modules}

        return {
            "outputs": {"_routing": routing},
            "stream_events": ["router_complete"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "stream_events": ["router_failed"]
        }
