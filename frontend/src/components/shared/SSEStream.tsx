"use client";

import { useEffect, useRef } from "react";
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (!mountedRef.current) return;

      es = createSSEConnection(sessionId);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          onEvent(data);

          // Close only when pipeline is definitively done
          if (data.event === "pipeline_complete" || data.event === "error") {
            es.close();
            eventSourceRef.current = null;
          }
        } catch (err) {
          console.error("Failed to parse SSE event:", err);
        }
      };

      es.onerror = (event) => {
        // EventSource auto-reconnects on network errors.
        // Only call onError for visibility; don't close manually.
        onError?.(event);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId, enabled, onEvent, onError]);

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
  };
}

