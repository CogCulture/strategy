import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

UPDATE_START = "---RESEARCH_UPDATE---"
UPDATE_END = "---END_UPDATE---"


def parse_response(raw_response: str) -> tuple[str, Optional[dict]]:
    """
    Parse the raw LLM response for RESEARCH_UPDATE blocks.
    Returns (clean_response, modification_dict or None).
    """
    if UPDATE_START not in raw_response:
        return raw_response, None

    try:
        # Extract the update block
        start_idx = raw_response.index(UPDATE_START)
        end_idx = raw_response.index(UPDATE_END) + len(UPDATE_END) if UPDATE_END in raw_response else len(raw_response)

        update_block = raw_response[start_idx + len(UPDATE_START):end_idx - len(UPDATE_END) if UPDATE_END in raw_response else end_idx].strip()

        # Clean the visible response by removing the update block
        clean_response = (raw_response[:start_idx] + raw_response[end_idx:]).strip()

        # Parse the structured fields
        modification = _parse_update_block(update_block)

        if modification:
            return clean_response, modification
        else:
            # Failed to parse — return original response
            return raw_response, None

    except (ValueError, IndexError) as e:
        logger.warning(f"Failed to parse RESEARCH_UPDATE block: {e}")
        return raw_response, None


def _parse_update_block(block: str) -> Optional[dict]:
    """Parse individual fields from the update block text."""
    result: dict = {}

    # Parse action
    action_match = re.search(r"^action:\s*(.+)$", block, re.MULTILINE)
    if action_match:
        action = action_match.group(1).strip().lower()
        if action in ("replace", "append", "add_new", "remove"):
            result["action"] = action
        else:
            logger.warning(f"Unknown action: {action}")
            return None
    else:
        return None

    # Parse section
    section_match = re.search(r"^section:\s*(.+)$", block, re.MULTILINE)
    if section_match:
        result["section"] = section_match.group(1).strip()
    else:
        return None

    # Parse optional chunk
    chunk_match = re.search(r"^chunk:\s*(.+)$", block, re.MULTILINE)
    if chunk_match:
        chunk_val = chunk_match.group(1).strip()
        if chunk_val and chunk_val.lower() not in ("none", "n/a", ""):
            result["chunk"] = chunk_val

    # Parse optional title (for add_new)
    title_match = re.search(r"^title:\s*(.+)$", block, re.MULTILINE)
    if title_match:
        result["title"] = title_match.group(1).strip()

    # Parse content — everything after "content:" line
    content_match = re.search(r"^content:\s*\n?(.*)", block, re.MULTILINE | re.DOTALL)
    if content_match:
        result["content"] = content_match.group(1).strip()
    elif result["action"] != "remove":
        # Content is required for non-remove actions
        return None

    return result


def apply_modifications(original_outputs: dict, modifications: list[dict]) -> dict:
    """
    Apply all modifications in order to produce final outputs.
    Returns a new dict with modifications applied.
    """
    outputs = dict(original_outputs)

    for mod in modifications:
        action = mod.get("action")
        section = mod.get("section")
        content = mod.get("content", "")
        chunk_id = mod.get("chunk")
        title = mod.get("title")

        if not section or not action:
            continue

        if action == "replace":
            if chunk_id:
                # Replace a specific chunk within the section
                outputs[section] = _replace_chunk_in_section(
                    outputs.get(section, ""), chunk_id, content
                )
            else:
                # Replace entire section
                outputs[section] = content

        elif action == "append":
            existing = outputs.get(section, "")
            outputs[section] = existing.rstrip() + "\n\n" + content

        elif action == "add_new":
            section_title = title or section.replace("_", " ").title()
            new_content = f"## {section_title}\n\n{content}"
            outputs[section] = new_content

        elif action == "remove":
            if section in outputs:
                del outputs[section]

    return outputs


def _replace_chunk_in_section(section_text: str, chunk_id: str, new_content: str) -> str:
    """
    Replace a chunk within section text by finding its ## header.
    Falls back to appending if the chunk header can't be found.
    """
    if not section_text:
        return new_content

    # Split on ## headers
    parts = re.split(r"(^## .+$)", section_text, flags=re.MULTILINE)

    # The chunk_id format is like 'bs-2', meaning the 2nd ## section
    # Extract the chunk number
    chunk_match = re.match(r"[a-z]{2}-(\d+)", chunk_id)
    if not chunk_match:
        # Can't determine chunk number; replace entire section
        return new_content

    chunk_num = int(chunk_match.group(1))

    # Reconstruct: parts alternates between non-header text and header lines
    # Find the nth ## header and replace it + its body
    header_count = 0
    rebuilt = []
    i = 0
    replaced = False

    while i < len(parts):
        part = parts[i]
        if part.startswith("## "):
            header_count += 1
            if header_count == chunk_num and not replaced:
                # Replace this header + its body
                rebuilt.append(new_content)
                # Skip the body part that follows
                i += 2  # skip header + body
                replaced = True
                continue
        rebuilt.append(part)
        i += 1

    if not replaced:
        # Chunk number not found — append instead
        rebuilt.append("\n\n" + new_content)

    return "".join(rebuilt)
