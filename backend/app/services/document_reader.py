import fitz  # PyMuPDF
import base64
import io
from PIL import Image
from openai import AsyncOpenAI
from app.config import settings
from app.utils.prompt_builder import get_document_vision_prompt

client = AsyncOpenAI(api_key=settings.openai_api_key)

async def pdf_to_images(pdf_bytes: bytes) -> list[bytes]:
    """Convert every page of a PDF to a PNG image using PyMuPDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        mat = fitz.Matrix(2.0, 2.0)  # 2x scale for clarity
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        images.append(img_bytes)
    doc.close()
    return images

async def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")

async def read_image_with_vision(image_bytes: bytes, doc_context: str = "") -> str:
    """Send a single image to GPT-4o Vision and extract brand intelligence."""
    b64 = await image_to_base64(image_bytes)
    prompt = get_document_vision_prompt(doc_context)
    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64}",
                            "detail": "high"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )
    return response.choices[0].message.content

async def process_pdf(pdf_bytes: bytes, filename: str) -> str:
    """Full pipeline: PDF → images → GPT-4o Vision → concatenated extract."""
    images = await pdf_to_images(pdf_bytes)
    extracts = []
    for i, img_bytes in enumerate(images):
        extract = await read_image_with_vision(img_bytes, doc_context=f"Page {i+1} of {len(images)} from file: {filename}")
        extracts.append(f"--- Page {i+1} ---\n{extract}")
    return "\n\n".join(extracts)

async def process_social_media_pdf(pdf_bytes: bytes, filename: str) -> str:
    """PDF → images → GPT-4o Vision with social-media-specific extraction."""
    from app.utils.prompt_builder import get_social_media_vision_prompt
    images = await pdf_to_images(pdf_bytes)
    extracts = []
    for i, img_bytes in enumerate(images):
        b64 = await image_to_base64(img_bytes)
        prompt = get_social_media_vision_prompt(f"Page {i+1} of {len(images)} from file: {filename}")
        response = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=3000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64}",
                                "detail": "high"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )
        extracts.append(f"--- Page {i+1} ---\n{response.choices[0].message.content}")
    return "\n\n".join(extracts)

async def process_image_file(image_bytes: bytes, filename: str) -> str:
    """Direct image → GPT-4o Vision."""
    return await read_image_with_vision(image_bytes, doc_context=f"File: {filename}")

async def process_docx(docx_bytes: bytes, filename: str) -> str:
    """Extract text from DOCX using python-docx, then pass to GPT-4o for brand intelligence extraction."""
    from docx import Document
    import io
    doc = Document(io.BytesIO(docx_bytes))
    full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    # Even for DOCX we pass through GPT-4o for consistent structured extraction
    from app.utils.prompt_builder import get_text_document_prompt
    prompt = get_text_document_prompt(full_text, filename)
    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

async def process_document(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Main router — dispatches to the correct processor based on file type."""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return await process_pdf(file_bytes, filename)
    elif ext in ("png", "jpg", "jpeg"):
        return await process_image_file(file_bytes, filename)
    elif ext == "docx":
        return await process_docx(file_bytes, filename)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
