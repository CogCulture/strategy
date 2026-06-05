"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Settings, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OUTPUT_MODULES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Mock implementation of the new components for now
import { ModuleChat } from "@/components/workspace/ModuleChat";

const MODULE_ICONS: Record<string, string> = {
  brand_strategy: "🎯",
  competition_scan: "🔍",
  brand_audit: "📊",
  positioning: "📍",
  social_media: "📱",
  seo_audit: "🔎",
  launch_plan: "🚀",
  content_strategy: "✍️",
};

import { getSessionData } from "@/lib/api";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [activeModuleId, setActiveModuleId] = useState<string>(OUTPUT_MODULES[0].id);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getSessionData(sessionId);
        setSessionData(data);
      } catch (e) {
        console.error("Failed to load session data:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  const activeModule = OUTPUT_MODULES.find(m => m.id === activeModuleId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Sparkles className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex bg-background overflow-hidden h-screen">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border bg-card/30 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="mt-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg truncate">
              {sessionData?.knowledge_base?.brand_input?.brand_name || "New Brand"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
            Strategy Modules
          </div>
          {OUTPUT_MODULES.map((module) => {
            const isActive = activeModuleId === module.id;
            return (
              <button
                key={module.id}
                onClick={() => setActiveModuleId(module.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-lg">{MODULE_ICONS[module.id]}</span>
                <span className="truncate flex-1">{module.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
            <Settings className="w-4 h-4" />
            Session Settings
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
        {activeModule && (
          <div className="flex-1 flex flex-col h-full">
            <div className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
              <div className="flex items-center">
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="text-xl">{MODULE_ICONS[activeModule.id]}</span>
                  {activeModule.label}
                </h2>
                <div className="ml-4 text-sm text-muted-foreground">
                  {activeModule.description}
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2"
                onClick={async () => {
                  try {
                    const toastId = toast.loading("Opus is polishing your final report...");
                    const res = await fetch(`http://127.0.0.1:8000/api/export/${sessionId}`);
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(errorData.detail || "Export failed");
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Brand_Strategy_Report.docx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success("Report downloaded successfully!", { id: toastId });
                  } catch (e: any) {
                    toast.error(`Export failed: ${e.message}`);
                  }
                }}
              >
                <Download className="w-4 h-4" />
                Export Final Report
              </Button>
            </div>
            
            <div className="flex-1 relative flex flex-col min-h-0">
               <ModuleChat 
                 activeModuleId={activeModuleId} 
                 sessionData={sessionData} 
               />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
