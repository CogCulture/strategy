# Brand Research Application

> AI-powered brand research platform that generates comprehensive strategic outputs using a multi-model pipeline.

## Project Overview

The Brand Research Application is a full-stack platform built for marketing agencies. It takes brand information as input, processes it through a multi-model AI pipeline (LangGraph), and generates structured strategic outputs delivered as a downloadable DOCX document.

### Two Phases

1. **Phase 1 — Input:** User fills a form with brand details, uploads relevant documents (PDFs, images, DOCX), and the system extracts brand intelligence using GPT-4o Vision and Tavily.
2. **Phase 2 — Output:** User selects desired output modules. The system runs a LangGraph pipeline and streams results back in real time. Content Strategy includes a mandatory human-in-the-loop review before proceeding.

### Output Modules

| Module | Description |
|---|---|
| Brand Strategy | Purpose, values, positioning, messaging hierarchy |
| Competition Scan | Competitor analysis and white space mapping |
| Brand Audit | Review of brand's social presence (requires social PDFs) |
| Positioning | Market positioning and messaging territories |
| Social Media | Social analysis for brand + competitors (requires PDFs) |
| SEO Audit | Keyword landscape and content gap analysis |
| Launch Plan | Phased launch roadmap and channel strategy |
| Content Strategy | Buckets, tone, and key messaging (requires 3-step review) |

---

## Tech Stack

### Backend
- **Python 3.11+** — Runtime
- **FastAPI** — REST API + SSE streaming
- **LangGraph** — Stateful multi-node AI pipeline
- **Redis** — Session and knowledge base storage (async client)
- **python-docx** — Final DOCX generation
- **PyMuPDF (fitz)** — PDF to image conversion
- **Pillow** — Image handling for vision inputs
- **httpx** — Async HTTP client for Tavily and model APIs
- **Pydantic v2** — Request/response validation

### Frontend
- **Next.js 14+ (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** — Component library
- **React Hook Form + Zod** — Form validation
- **EventSource API** — SSE consumption for live streaming

### AI Models

| Task | Model | Provider |
|---|---|---|
| Document OCR | GPT-4o | OpenAI |
| Website scrape summarisation | Gemini 1.5 Flash | Vertex AI |
| Competition scan | Gemini 1.5 Flash | Vertex AI |
| Strategic output generation | Claude Sonnet (claude-sonnet-4-20250514) | Anthropic |
| Routing, validation | Claude Haiku (claude-haiku-4-5-20251001) | Anthropic |
| SEO audit | Claude Sonnet + web search | Anthropic |
| Website extraction | Tavily Extract API | Tavily |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Redis** (local or Docker)
- **API Keys:**
  - Anthropic API key (Claude Sonnet + Haiku)
  - OpenAI API key (GPT-4o)
  - Google Cloud service account (Vertex AI / Gemini Flash)
  - Tavily API key

---

## Setup Instructions

### 1. Clone and Configure Environment

```bash
cd brand-research-app/backend
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or use docker-compose (see Docker Setup below)
```

### 4. Run Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Health check: `GET /health`.

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models | — |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | — |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | — |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI location | `us-central1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | — |
| `TAVILY_API_KEY` | Tavily API key for web extraction | — |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `SESSION_TTL_SECONDS` | Session expiry in seconds | `86400` (24h) |
| `MAX_UPLOAD_SIZE_MB` | Max file upload size in MB | `50` |
| `ALLOWED_FILE_TYPES` | Comma-separated allowed extensions | `pdf,docx,png,jpg,jpeg` |

---

## API Endpoint Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/session/create` | Create session, store brand input in Redis, return `session_id` |
| `POST` | `/api/documents/upload` | Upload files, process via document reader, append to KB |
| `POST` | `/api/outputs/select` | Save selected output modules to session |
| `POST` | `/api/pipeline/run` | Trigger LangGraph execution, return immediately |
| `GET` | `/api/pipeline/stream/{session_id}` | SSE stream of pipeline events |
| `POST` | `/api/review/approve` | Submit review decision (buckets/tone/messaging), resume graph |
| `GET` | `/api/export/{session_id}` | Generate and download DOCX report |

---

## Docker Setup

The easiest way to run the entire stack:

```bash
# From project root
docker-compose up --build
```

This starts:
- **Redis** on port `6379`
- **Backend (FastAPI)** on port `8000`
- **Frontend (Next.js)** on port `3000`

To stop:

```bash
docker-compose down
```

To reset Redis data:

```bash
docker-compose down -v
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Input    │  │ Output       │  │ Review             │    │
│  │ Form     │──│ Selection +  │──│ (Content Strategy) │    │
│  │ /new     │  │ Pipeline     │  │ /review/[id]       │    │
│  └──────────┘  │ /outputs/[id]│  └────────────────────┘    │
│                └──────────────┘                             │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP + SSE
┌───────────────────────┴─────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Routers                        │   │
│  │  /session/create  /documents/upload  /pipeline/run   │   │
│  │  /outputs/select  /pipeline/stream   /review/approve │   │
│  │  /export/{id}                                        │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                  LangGraph Pipeline                   │   │
│  │                                                       │   │
│  │  Router ─┬─ Brand Strategy ──────────────────► END   │   │
│  │          ├─ Competition Scan ────────────────► END   │   │
│  │          ├─ Brand Audit ─────────────────────► END   │   │
│  │          ├─ Positioning ─────────────────────► END   │   │
│  │          ├─ SEO Audit ───────────────────────► END   │   │
│  │          ├─ Launch Plan ─────────────────────► END   │   │
│  │          └─ Content Buckets ─► Tone ─► Messaging ► END  │
│  │                           ▲        ▲                 │   │
│  │                     [human review interrupts]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                    Services                           │   │
│  │  Document Reader (GPT-4o Vision)                     │   │
│  │  Website Extractor (Tavily + Gemini Flash)           │   │
│  │  Knowledge Base (Redis)                              │   │
│  │  DOCX Generator (python-docx)                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │
                   ┌────┴────┐
                   │  Redis  │
                   │  Store  │
                   └─────────┘
```

---

## Key Design Decisions

1. **Knowledge Base Slicing:** Each LangGraph node receives only the KB fields it needs via `slice_kb_for_node()`, minimizing token usage.
2. **Vision-First Document Processing:** All uploaded documents (PDF, DOCX, images) are processed through GPT-4o Vision — no text-extraction fallback.
3. **Human-in-the-Loop:** Content Strategy enforces sequential review: Buckets → Tone → Messaging, using LangGraph's `interrupt_before` mechanism.
4. **Session TTL:** All sessions expire after 24 hours (configurable). Redis `SETEX` enforces this automatically.
5. **Multi-Model Architecture:** Each task uses the most appropriate model (cost vs capability), not a single model for everything.

---

## Development

### Running Tests

```bash
cd backend
pytest tests/ -v
```

### Code Formatting

```bash
cd backend
black .
isort .
```

---

## License

Proprietary — Internal use only.
