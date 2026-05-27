"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Send, Bot, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChatMessage, getChatHistory } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface ResearchChatProps {
  sessionId: string;
}

/**
 * Strip ---RESEARCH_UPDATE--- … ---END_UPDATE--- blocks from displayed content.
 * This runs on every render so the user never sees raw tags during streaming.
 */
function stripUpdateTags(text: string): string {
  // Remove complete blocks
  let cleaned = text.replace(
    /---RESEARCH_UPDATE---[\s\S]*?---END_UPDATE---/g,
    ""
  );
  // Remove partial/in-progress blocks (tag opened but not yet closed during streaming)
  cleaned = cleaned.replace(/---RESEARCH_UPDATE---[\s\S]*$/g, "");
  // Remove trailing whitespace/newlines left behind
  return cleaned.trimEnd();
}

export function ResearchChat({ sessionId }: ResearchChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userIsScrolledUpRef = useRef(false);

  // Smart auto-scroll: only scroll if user is near the bottom
  const scrollToBottom = useCallback(() => {
    if (userIsScrolledUpRef.current) return; // Don't force scroll if user scrolled up
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Track whether user has scrolled up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Consider "near bottom" if within 100px
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    userIsScrolledUpRef.current = !isNearBottom;
  }, []);

  // Scroll on new messages (but respect user scroll position)
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await getChatHistory(sessionId);
        if (history.length > 0) {
          setMessages(history);
        }
      } catch {
        // No history yet — that's fine
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [sessionId]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 4 * 24; // ~4 lines
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    // Reset scroll lock so we follow the new response
    userIsScrolledUpRef.current = false;

    // Add empty assistant message placeholder
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await sendChatMessage(sessionId, trimmed);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.done) {
              // Finalize the message — strip any remaining tags from stored content
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: stripUpdateTags(updated[assistantIndex].content),
                  hasModification: parsed.has_modification === true,
                };
                return updated;
              });
            } else if (parsed.token !== undefined) {
              // Append token
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: updated[assistantIndex].content + parsed.token,
                };
                return updated;
              });
            } else if (parsed.error) {
              toast.error("Chat error: " + parsed.error);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      toast.error(
        "Failed to send message: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((_, i) => i !== assistantIndex));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bot className="w-5 h-5 animate-pulse" />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px] max-h-[700px] bg-background border border-border rounded-xl overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6"
      >
        {/* Push messages to bottom when few messages */}
        <div className="flex flex-col justify-end min-h-full space-y-4">
          {/* Welcome message when no messages */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center py-12"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Refine Your Report
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Ask me anything about your research. I can also modify, add, or
                remove sections from your report.
              </p>
            </motion.div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              // Strip tags from displayed content in real-time
              const displayContent =
                msg.role === "assistant"
                  ? stripUpdateTags(msg.content)
                  : msg.content;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        msg.role === "user"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Message bubble */}
                    <div>
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary/10 text-foreground"
                            : "bg-muted/50 text-foreground"
                        }`}
                      >
                        {displayContent}
                        {/* Streaming indicator — bouncing dots when empty */}
                        {msg.role === "assistant" &&
                          isStreaming &&
                          i === messages.length - 1 &&
                          displayContent === "" && (
                            <span className="inline-flex gap-1 items-center text-muted-foreground">
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                          )}
                        {/* Cursor while streaming visible content */}
                        {msg.role === "assistant" &&
                          isStreaming &&
                          i === messages.length - 1 &&
                          displayContent !== "" && (
                            <span className="inline-block w-0.5 h-4 bg-primary/60 ml-0.5 animate-pulse align-text-bottom" />
                          )}
                      </div>

                      {/* Modification badge */}
                      {msg.hasModification && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 mt-1.5 text-xs text-primary"
                        >
                          <Check className="w-3 h-3" />
                          <span>Research updated</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your research or request changes..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
