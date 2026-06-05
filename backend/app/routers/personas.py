from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from app.models.input_models import BrandInput
from anthropic import AsyncAnthropic
from app.config import settings

router = APIRouter(prefix="/api/personas", tags=["personas"])
client = AsyncAnthropic(api_key=settings.anthropic_api_key)

class GenerateCohortsResponse(BaseModel):
    cohorts: list[dict]

@router.post("/generate", response_model=GenerateCohortsResponse)
async def generate_cohorts(brand_input: BrandInput):
    prompt = f"""
You are an expert Brand Strategist. The user is onboarding a new brand and needs to identify their Target Cohorts (Personas/Stakeholders).

Here is the information about the brand provided so far:
Brand Name: {brand_input.brand_name}
Website: {brand_input.website_url}
Category: {brand_input.category}
Sub-Category: {brand_input.sub_category}
Target Audience details: {brand_input.target_audience}
Product / Service: {brand_input.product_service}
Geography: {brand_input.geography}

Your task is to define 2-4 highly relevant Target Cohorts for this brand. 
For each cohort, provide:
1. "name": A concise, descriptive name.
2. "description": A detailed paragraph describing their motivations, behaviors, and why they would care about this brand.
3. "search_prompts": An array of 3-5 example search queries this cohort would type into Google related to this brand's product/service.

Respond ONLY with valid JSON in the exact format shown below, with no markdown formatting, no comments, and no introduction. 

[
  {{
    "name": "Value-Conscious Consumers",
    "description": "Everyday Indian shoppers seeking best-value product choices across price, features, and local availability, driving high-volume 'best/top' and comparative searches.",
    "search_prompts": [
        "best smartphones under 20000 in India 2026",
        "best smartphone for battery life under 20000"
    ]
  }},
  {{
    "name": "Procurement & Category Managers",
    "description": "Business buyers and procurement managers evaluating suppliers for bulk purchase, comparing vendor reliability, pricing, certifications, and total cost of ownership for shortlisting.",
    "search_prompts": [
        "bulk smartphone vendors India pricing minimum order quantity",
        "compare suppliers for smartphones for enterprise deployment"
    ]
  }}
]
"""
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        
        raw_text = response.content[0].text.strip()
        # Clean up any potential markdown formatting
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        cohorts = json.loads(raw_text.strip())
        return GenerateCohortsResponse(cohorts=cohorts)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
