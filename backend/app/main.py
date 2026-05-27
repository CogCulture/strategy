from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import input, documents, outputs, pipeline, review, export, chat

app = FastAPI(title="Brand Research API", version="1.0.0")

import os

# Build allowed origins list from env + sensible defaults
_extra_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
_extra_origins = [o.strip() for o in _extra_origins if o.strip()]

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://35.253.241.79:3000",  # GCP server
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(input.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(outputs.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}
