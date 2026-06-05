import type { ChatMessage } from "./types";

// Regular API calls go through the Next.js rewrite proxy (same-origin, no CORS).
const API_BASE = "";

// SSE (EventSource) must connect DIRECTLY to the backend — Next.js may buffer SSE responses.
// In Docker: NEXT_PUBLIC_BACKEND_URL is not set at build time, so we derive it at runtime.
function getSSEBase(): string {
  if (typeof window === "undefined") return "http://backend:8000";
  // Use same hostname but port 8000 (the backend)
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

export async function createSession(data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateCohorts(data: Partial<Record<string, unknown>>) {
  const res = await fetch(`${API_BASE}/api/personas/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadDocument(sessionId: string, file: File, docType: string = "general"): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);
  formData.append("doc_type", docType);
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function selectOutputs(sessionId: string, modules: string[]) {
  const res = await fetch(`${API_BASE}/api/outputs/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, selected_modules: modules }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runPipeline(sessionId: string, modules: string[]) {
  const res = await fetch(`${API_BASE}/api/pipeline/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, selected_modules: modules }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Poll session status — replaces SSE to avoid proxy buffering issues */
export async function pollPipelineStatus(sessionId: string): Promise<{
  status: string;
  error?: string;
  stream_events?: string[];
  review_stage?: string;
}> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionData(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function createSSEConnection(sessionId: string): EventSource {
  return new EventSource(`${getSSEBase()}/api/pipeline/stream/${sessionId}`);
}

export async function submitReview(data: {
  session_id: string;
  review_stage: string;
  approved: boolean;
  edits?: Record<string, unknown>;
}) {
  const res = await fetch(`${API_BASE}/api/review/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getExportUrl(sessionId: string): string {
  return `${API_BASE}/api/export/${sessionId}`;
}

export async function sendChatMessage(sessionId: string, message: string): Promise<Response> {
  const res = await fetch(`${API_BASE}/api/chat/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res; // Return raw response for streaming
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/api/chat/history/${sessionId}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.messages || [];
}
