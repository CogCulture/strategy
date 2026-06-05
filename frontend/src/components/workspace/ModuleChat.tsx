"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Bot, User, Plus, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OUTPUT_MODULES } from "@/lib/constants";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { sendChatMessage, uploadDocument } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Attachment {
  id: string;
  file: File;
}

interface ModuleChatProps {
  activeModuleId: string;
  sessionData: any;
}

export function ModuleChat({ activeModuleId, sessionData }: ModuleChatProps) {
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModule = OUTPUT_MODULES.find(m => m.id === activeModuleId);
  const currentHistory = chatHistories[activeModuleId] || [];

  // Generate the AI's first prerequisite check message
  const generateInitialAIMessage = () => {
    const kb = sessionData?.knowledge_base;
    const brandInput = kb?.brand_input;
    if (!brandInput) return `Hi! Let's get started on your ${activeModule?.label}. Could you provide some more details about your brand?`;
    
    const brand = brandInput.brand_name || "your brand";
    
    switch (activeModuleId) {
      case "brand_strategy":
        if (!brandInput.target_audience) {
          return `Hi! I'm ready to build the Brand Strategy for **${brand}**. Looking at your knowledge base, I still need to know a bit about your target audience. Could you tell me who you are targeting?`;
        }
        return `Hi! I have all the info I need for **${brand}**. Should I go ahead and generate your Brand Strategy?`;
      
      case "competition_scan":
        if (!brandInput.competitors || brandInput.competitors.length === 0) {
          return `To run a Competition Scan for **${brand}**, I need to know who we're up against! Could you list a few of your main competitors?`;
        }
        return `I see you've listed some competitors for **${brand}**. Should I begin the Competitive Scan now?`;
      
      case "brand_audit":
      case "social_media":
        return `Welcome to the **${activeModule?.label}** module for **${brand}**. I can analyze your brand's social presence and digital footprint. Click the '+' icon below to upload any relevant documents, or let me know how you'd like to proceed!`;

      default:
        return `Welcome to the **${activeModule?.label}** module for **${brand}**. I have your knowledge base loaded and ready. Let me know how you'd like to proceed!`;
    }
  };

  // Automatically send the first AI message when entering an empty module
  useEffect(() => {
    if (activeModuleId && currentHistory.length === 0 && sessionData) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        const initialMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: generateInitialAIMessage(),
          timestamp: new Date()
        };
        setChatHistories(prev => ({ ...prev, [activeModuleId]: [initialMsg] }));
        setIsTyping(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [activeModuleId, sessionData, currentHistory.length]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() && attachments.length === 0) return;
    
    let content = text;
    if (attachments.length > 0) {
      const fileNames = attachments.map(a => a.file.name).join(", ");
      content += `\n[Attached ${attachments.length} file(s): ${fileNames}]`;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content,
      timestamp: new Date()
    };

    const newHistory = [...currentHistory, newUserMsg];
    setChatHistories(prev => ({ ...prev, [activeModuleId]: newHistory }));
    setInputValue("");
    const currentAttachments = [...attachments];
    setAttachments([]); // Clear attachments after sending
    setIsTyping(true);

    try {
      const sessionId = sessionData?.session_id || "default";

      // 1. Upload attachments
      for (const att of currentAttachments) {
         await uploadDocument(sessionId, att.file, activeModuleId);
      }

      // 2. Send the chat message and stream response
      const fullPrompt = `[Context: ${activeModule?.label}]\n${content}`;
      const response = await sendChatMessage(sessionId, fullPrompt);
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      const botMsgId = (Date.now() + 1).toString();
      const newBotMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date()
      };
      
      setChatHistories(prev => ({ ...prev, [activeModuleId]: [...newHistory, newBotMsg] }));
      setIsTyping(false);

      let streamedContent = "";
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        
        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const dataStr = part.slice(6);
              if (dataStr.trim() === "[DONE]") continue;
              
              const payload = JSON.parse(dataStr);
              if (payload.token) {
                // Hide the RESEARCH_UPDATE tag from the user
                streamedContent += payload.token;
                const displayContent = streamedContent.split("---RESEARCH_UPDATE---")[0];
                
                setChatHistories(prev => {
                  const currentList = prev[activeModuleId] || [];
                  return {
                    ...prev,
                    [activeModuleId]: currentList.map(msg => 
                      msg.id === botMsgId ? { ...msg, content: displayContent } : msg
                    )
                  };
                });
              } else if (payload.error) {
                toast.error(payload.error);
                streamedContent += "\n[Error: " + payload.error + "]";
                
                setChatHistories(prev => {
                  const currentList = prev[activeModuleId] || [];
                  return {
                    ...prev,
                    [activeModuleId]: currentList.map(msg => 
                      msg.id === botMsgId ? { ...msg, content: streamedContent } : msg
                    )
                  };
                });
              }
            } catch (e) {
              console.warn("Failed to parse SSE chunk", part);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
      
      setChatHistories(prev => ({ 
        ...prev, 
        [activeModuleId]: [...newHistory, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Sorry, the backend chat API is currently unavailable or returned an error.",
          timestamp: new Date()
        }] 
      }));
      setIsTyping(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  if (!activeModule) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-card/10">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
          {currentHistory.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-background border border-border text-foreground rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="px-5 py-3.5 rounded-2xl bg-background border border-border rounded-tl-sm flex items-center gap-2 shadow-sm">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background/95 backdrop-blur z-10 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 bg-muted/60 text-sm px-3 py-1.5 rounded-full border border-border/50">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[150px]">{att.file.name}</span>
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2">
            {/* Upload Button */}
            <div className="relative">
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-xl flex-shrink-0 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Text Input */}
            <div className="flex-1 relative">
              <Textarea 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Reply to assistant...`}
                className="min-h-[48px] h-12 max-h-[200px] resize-y pr-14 py-3.5 rounded-xl bg-background border-border focus-visible:ring-1 focus-visible:ring-primary/50 text-[15px] shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                size="icon" 
                className="absolute right-1.5 bottom-1.5 rounded-lg h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                onClick={() => handleSend()}
                disabled={(!inputValue.trim() && attachments.length === 0) || isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-center mt-1.5 text-[11px] text-muted-foreground">
            AI responses are generated based on your session data and may require review.
          </div>
        </div>
      </div>
    </div>
  );
}
