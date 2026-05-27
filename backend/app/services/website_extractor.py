import httpx
from vertexai import init as vertex_init
from vertexai.generative_models import GenerativeModel
from app.config import settings
from app.utils.prompt_builder import get_website_summarisation_prompt

vertex_init(project=settings.google_cloud_project, location=settings.google_cloud_location)

async def extract_website_with_tavily(url: str) -> str:
    """Use Tavily Extract API to get full structured content from a website."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.tavily.com/extract",
            json={
                "urls": [url],
                "api_key": settings.tavily_api_key,
                "include_images": False,
                "extract_depth": "advanced"
            }
        )
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        if not results:
            return ""
        return results[0].get("raw_content", "")

async def summarise_with_gemini_flash(raw_content: str, brand_name: str) -> str:
    """Summarise extracted website content using Gemini 1.5 Flash for brand intelligence."""
    model = GenerativeModel("gemini-1.5-flash")
    prompt = get_website_summarisation_prompt(raw_content, brand_name)
    response = await model.generate_content_async(prompt)
    return response.text

async def extract_and_summarise(url: str, brand_name: str) -> str:
    """Full pipeline: Tavily extract → Gemini Flash summarise."""
    raw_content = await extract_website_with_tavily(url)
    if not raw_content:
        return f"Could not extract content from {url}"
    summary = await summarise_with_gemini_flash(raw_content, brand_name)
    return summary
