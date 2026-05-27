from typing import TypedDict, Optional, List, Dict, Any, Annotated
import operator

class GraphState(TypedDict):
    session_id: str
    knowledge_base: Dict[str, Any]
    selected_modules: List[str]
    outputs: Annotated[Dict[str, Any], operator.or_]  # merge dicts
    review_stage: Optional[str]
    review_data: Optional[Dict[str, Any]]
    approved_buckets: Optional[List[Dict]]
    approved_tones: Optional[List[Dict]]
    error: Optional[str]
    stream_events: Annotated[List[str], operator.add]  # append events
