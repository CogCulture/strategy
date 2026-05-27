export type OutputModule =
  | "brand_strategy"
  | "competition_scan"
  | "brand_audit"
  | "positioning"
  | "social_media"
  | "seo_audit"
  | "launch_plan"
  | "content_strategy";

export interface BrandInput {
  brand_name: string;
  website_url: string;
  category: string;
  sub_category: string;
  target_audience: string;
  persona: string;
  campaign_positioning: string;
  product_service: string;
  geography: string;
  context?: string;
  guardrails?: string;
}

export interface SessionState {
  session_id: string;
  status: string;
  selected_modules: OutputModule[];
  outputs: Record<string, string>;
  review_stage?: string;
}

export interface SSEEvent {
  event: string;
  data?: unknown;
  message?: string;
}

export interface ReviewApproval {
  session_id: string;
  review_stage: "buckets" | "tone" | "messaging";
  approved: boolean;
  edits?: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasModification?: boolean;
}
