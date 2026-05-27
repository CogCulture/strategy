import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic
from app.config import settings
from app.services.knowledge_base import load_session, save_session
from app.services.memory_manager import (
    prepare_research_memory,
    route_to_chunks,
    build_chat_prompt,
    maybe_compress_memory,
)
from app.services.modification_parser import parse_response

logger = logging.getLogger(__name__)

router = APIRouter()

client = AsyncAnthropic(api_key=settings.anthropic_api_key)
SONNET_MODEL = "claude-sonnet-4-20250514"


class ChatMessage(BaseModel):
    message: str


@router.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatMessage):
    """Stream a chat response via SSE, with research context and modification tracking."""
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")

    if not session.outputs:
        raise HTTPException(400, detail="No research outputs available for chat")

    # Initialize research memory on first chat
    if session.research_map is None:
        try:
            research_map, chunk_index, chunks = await prepare_research_memory(
                session.outputs
            )
            session.research_map = research_map
            session.chunk_index = chunk_index
            session.chunks = chunks
            await save_session(session)
        except Exception as e:
            logger.error(f"Failed to prepare research memory: {e}")
            raise HTTPException(500, detail="Failed to initialize chat context")

    # Route to relevant chunks
    relevant_chunk_ids = await route_to_chunks(body.message, session.chunk_index)

    # Build the full prompt
    prompt_messages = build_chat_prompt(session, body.message, relevant_chunk_ids)

    # Separate system message from conversation messages
    system_content = ""
    conversation_messages = []
    for msg in prompt_messages:
        if msg["role"] == "system":
            system_content = msg["content"]
        else:
            conversation_messages.append(msg)

    async def event_generator():
        full_response = ""
        try:
            async with client.messages.stream(
                model=SONNET_MODEL,
                max_tokens=4096,
                system=system_content,
                messages=conversation_messages,
            ) as stream:
                async for text in stream.text_stream:
                    full_response += text
                    chunk = json.dumps({"token": text})
                    yield f"data: {chunk}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_chunk = json.dumps({"error": str(e)})
            yield f"data: {error_chunk}\n\n"
            return

        # Post-stream processing
        try:
            clean_response, modification = parse_response(full_response)

            # Save messages to chat history
            session.chat_messages.append(
                {"role": "user", "content": body.message}
            )
            session.chat_messages.append(
                {"role": "assistant", "content": clean_response}
            )

            # Track modification if present
            has_modification = modification is not None
            if has_modification:
                session.modifications.append(modification)

            # Compress memory if needed
            await maybe_compress_memory(session)

            # Persist session
            await save_session(session)

            # Final SSE event
            done_chunk = json.dumps({
                "done": True,
                "has_modification": has_modification,
            })
            yield f"data: {done_chunk}\n\n"

        except Exception as e:
            logger.error(f"Post-stream processing error: {e}")
            error_chunk = json.dumps({"error": f"Post-processing failed: {e}"})
            yield f"data: {error_chunk}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    """Return the full chat message history for a session."""
    session = await load_session(session_id)
    if not session:
        raise HTTPException(404, detail="Session not found")

    return {"messages": session.chat_messages}
