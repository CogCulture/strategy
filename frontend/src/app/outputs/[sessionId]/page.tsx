"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Download, Play, Home, RotateCcw, Plus, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OutputSelector } from "@/components/outputs/OutputSelector";
import { ResearchChat } from "@/components/outputs/ResearchChat";
import { PipelineProgress } from "@/components/outputs/PipelineProgress";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSSE } from "@/components/shared/SSEStream";
import { runPipeline, getExportUrl } from "@/lib/api";
import type { SSEEvent } from "@/lib/types";

type ModuleStatus = "pending" | "running" | "complete" | "error" | "review";

export default function OutputsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [pipelineStarted, setPipelineStarted] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, ModuleStatus>>({});

  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      if (event.event === "pipeline_complete") {
        setPipelineComplete(true);
        // Mark remaining running modules as complete
        setModuleStatuses((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            if (updated[key] === "running") updated[key] = "complete";
          }
          return updated;
        });
        toast.success("Pipeline complete! Your report is ready.");
      } else if (event.event === "error") {
        toast.error("Pipeline error: " + (event.message || "Unknown error"));
      } else if (event.event === "awaiting_bucket_review") {
        setModuleStatuses((prev) => ({ ...prev, content_strategy: "review" }));
        router.push(`/review/${sessionId}?stage=buckets`);
      } else if (event.event === "awaiting_tone_review") {
        setModuleStatuses((prev) => ({ ...prev, content_strategy: "review" }));
        router.push(`/review/${sessionId}?stage=tone`);
      } else if (event.event.endsWith("_complete")) {
        const moduleName = event.event.replace("_complete", "");
        setModuleStatuses((prev) => ({ ...prev, [moduleName]: "complete" }));
      }
    },
    [router, sessionId]
  );

  useSSE({
    sessionId,
    onEvent: handleSSEEvent,
    enabled: pipelineStarted && !pipelineComplete,
  });

  const handleStartPipeline = async () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one output module");
      return;
    }

    setIsStarting(true);
    try {
      // Initialize all selected modules as "running"
      const initialStatuses: Record<string, ModuleStatus> = {};
      selectedModules.forEach((m) => {
        initialStatuses[m] = "running";
      });
      setModuleStatuses(initialStatuses);

      await runPipeline(sessionId, selectedModules);
      setPipelineStarted(true);
      toast.success("Pipeline started!");
    } catch (err) {
      toast.error("Failed to start pipeline: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-primary font-semibold">Brand Research Intelligence</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {pipelineComplete ? "Research Complete — Refine Your Report" : pipelineStarted ? "Pipeline Running" : "Select Outputs"}
        </h1>
        <p className="text-muted-foreground">
          {pipelineComplete
            ? "Chat with your research assistant to refine and modify your report"
            : pipelineStarted
              ? "Watch your strategy come alive in real-time"
              : "Choose which strategic outputs to generate"}
        </p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {!pipelineStarted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-background border border-border rounded-xl p-8 shadow-sm">
              <OutputSelector
                selectedModules={selectedModules}
                onSelectionChange={setSelectedModules}
              />
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleStartPipeline}
                disabled={selectedModules.length === 0 || isStarting}
                className="gap-2 text-lg px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isStarting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Starting Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-background border border-border rounded-xl p-8 shadow-sm">
              <PipelineProgress
                moduleStatuses={moduleStatuses}
                selectedModules={selectedModules}
              />
            </div>

            {pipelineComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col gap-6"
              >
                {/* Chat component — main focus */}
                <ResearchChat sessionId={sessionId} />

                <Separator className="bg-border/30" />

                {/* Download */}
                <div className="flex flex-col items-center gap-2">
                  <a href={getExportUrl(sessionId)} download>
                    <Button
                      size="lg"
                      className="gap-2 text-lg px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download Report
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground text-center">
                    Your report includes all modifications made during this conversation
                  </p>
                </div>

                {/* Navigation actions */}
                <Separator className="bg-border/30" />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPipelineStarted(false);
                      setPipelineComplete(false);
                      setModuleStatuses({});
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Edit Choices & Regenerate
                  </Button>
                  <Link href="/new">
                    <Button variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      New Research
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="ghost" className="gap-2">
                      <Home className="w-4 h-4" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
