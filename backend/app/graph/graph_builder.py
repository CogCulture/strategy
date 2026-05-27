from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from app.graph.state import GraphState
from app.graph.nodes.router_node import router_node
from app.graph.nodes.brand_strategy_node import brand_strategy_node
from app.graph.nodes.competition_scan_node import competition_scan_node
from app.graph.nodes.brand_audit_node import brand_audit_node
from app.graph.nodes.positioning_node import positioning_node
from app.graph.nodes.seo_node import seo_node
from app.graph.nodes.social_media_node import social_media_node
from app.graph.nodes.launch_plan_node import launch_plan_node
from app.graph.nodes.content_strategy.buckets_node import buckets_node
from app.graph.nodes.content_strategy.tone_node import tone_node
from app.graph.nodes.content_strategy.messaging_node import messaging_node


def _route_after_router(state: GraphState) -> list[str]:
    """Determine which nodes to fan-out to based on selected_modules."""
    selected = state.get("selected_modules", [])
    # Always run these independent nodes (they skip internally if not selected)
    targets = [
        "brand_strategy",
        "competition_scan",
        "brand_audit",
        "positioning",
        "seo_audit",
        "social_media",
        "launch_plan",
    ]
    # Only enter the content strategy chain if the user actually selected it
    if "content_strategy" in selected:
        targets.append("content_buckets")
    return targets


def build_graph():
    builder = StateGraph(GraphState)

    # Add all nodes
    builder.add_node("router", router_node)
    builder.add_node("brand_strategy", brand_strategy_node)
    builder.add_node("competition_scan", competition_scan_node)
    builder.add_node("brand_audit", brand_audit_node)
    builder.add_node("positioning", positioning_node)
    builder.add_node("seo_audit", seo_node)
    builder.add_node("social_media", social_media_node)
    builder.add_node("launch_plan", launch_plan_node)
    builder.add_node("content_buckets", buckets_node)
    builder.add_node("content_tone", tone_node)
    builder.add_node("content_messaging", messaging_node)

    # Entry point
    builder.set_entry_point("router")

    # Conditional fan-out from router — only includes content_buckets when selected
    builder.add_conditional_edges("router", _route_after_router)

    # Content strategy flows sequentially with interrupts
    builder.add_edge("content_buckets", "content_tone")   # interrupted for human review
    builder.add_edge("content_tone", "content_messaging")  # interrupted for human review

    # All terminal nodes go to END
    for node in [
        "brand_strategy", "competition_scan", "brand_audit",
        "positioning", "seo_audit", "social_media", "launch_plan",
        "content_messaging",
    ]:
        builder.add_edge(node, END)

    checkpointer = MemorySaver()
    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["content_tone", "content_messaging"]  # human-in-the-loop
    )

graph = build_graph()
