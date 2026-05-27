import uuid
from datetime import datetime

def generate_session_id() -> str:
    """Generate a unique session ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique = uuid.uuid4().hex[:8]
    return f"session_{timestamp}_{unique}"

def get_session_key(session_id: str) -> str:
    """Return the Redis key for a session."""
    return f"session:{session_id}"
