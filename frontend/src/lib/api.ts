import type { ChatMessage } from "./types";

// Use relative URLs so calls go through Next.js rewrites → no CORS.
// Set NEXT_PUBLIC_API_URL only if you want to bypass the proxy (e.g. dev without Docker).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function createSession(data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/session/create`, {
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

export function createSSEConnection(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/api/pipeline/stream/${sessionId}`);
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
