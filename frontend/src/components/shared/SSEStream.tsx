"use client";

import { useEffect, useRef, useCallback } from "react";
import { createSSEConnection } from "@/lib/api";
import type { SSEEvent } from "@/lib/types";

interface UseSSEOptions {
  sessionId: string;
  onEvent: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE({ sessionId, onEvent, onError, enabled = true }: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const es = createSSEConnection(sessionId);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        onEvent(data);

        if (data.event === "pipeline_complete" || data.event === "error") {
          disconnect();
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    es.onerror = (event) => {
      onError?.(event);
      disconnect();
    };

    return () => {
      disconnect();
    };
  }, [sessionId, enabled, onEvent, onError, disconnect]);

  return { disconnect };
}
