from PIL import Image
import io

def resize_image_if_needed(image_bytes: bytes, max_size: int = 2048) -> bytes:
    """Resize image if either dimension exceeds max_size."""
    img = Image.open(io.BytesIO(image_bytes))
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.read()

def validate_image(image_bytes: bytes) -> bool:
    """Check if the bytes represent a valid image."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        return True
    except Exception:
        return False

def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    """Return (width, height) of image."""
    img = Image.open(io.BytesIO(image_bytes))
    return img.size
