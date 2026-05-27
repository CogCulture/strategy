"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Download, Play, Home, RotateCcw, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OutputSelector } from "@/components/outputs/OutputSelector";
import { ResearchChat } from "@/components/outputs/ResearchChat";
import { PipelineProgress } from "@/components/outputs/PipelineProgress";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { runPipeline, getExportUrl, pollPipelineStatus } from "@/lib/api";

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  };

  const startPolling = (modules: string[]) => {
    startedAt.current = Date.now();

    // Elapsed timer (updates every second for UI)
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);

    // Status poll every 4 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const result = await pollPipelineStatus(sessionId);

        if (result.status === "completed") {
          stopPolling();
          // Mark all running modules as complete
          const done: Record<string, ModuleStatus> = {};
          modules.forEach((m) => { done[m] = "complete"; });
          // Apply any specific module events from stream_events
          (result.stream_events || []).forEach((ev: string) => {
            if (ev.endsWith("_complete")) {
              const mod = ev.replace("_complete", "");
              if (done[mod] !== undefined) done[mod] = "complete";
            } else if (ev.endsWith("_failed")) {
              const mod = ev.replace("_failed", "");
              if (done[mod] !== undefined) done[mod] = "error";
            }
          });
          setModuleStatuses(done);
          setPipelineComplete(true);
          toast.success("Pipeline complete! Your report is ready.");

        } else if (result.status === "failed") {
          stopPolling();
          const errored: Record<string, ModuleStatus> = {};
          modules.forEach((m) => { errored[m] = "error"; });
          setModuleStatuses(errored);
          toast.error("Pipeline failed: " + (result.error || "Unknown error"));

        } else if (result.status === "awaiting_review") {
          stopPolling();
          if (result.review_stage === "buckets") {
            router.push(`/review/${sessionId}?stage=buckets`);
          } else if (result.review_stage === "tone") {
            router.push(`/review/${sessionId}?stage=tone`);
          }
        }
        // status === "running" → keep polling
      } catch (err) {
        console.error("Poll error:", err);
        // Don't stop on transient errors — keep trying
      }
    }, 4000);
  };

  const handleStartPipeline = async () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one output module");
      return;
    }

    setIsStarting(true);
    try {
      const initialStatuses: Record<string, ModuleStatus> = {};
      selectedModules.forEach((m) => { initialStatuses[m] = "running"; });
      setModuleStatuses(initialStatuses);
      setElapsedSeconds(0);

      await runPipeline(sessionId, selectedModules);
      setPipelineStarted(true);
      toast.success("Pipeline started!");
      startPolling(selectedModules);
    } catch (err) {
      toast.error("Failed to start pipeline: " + (err instanceof Error ? err.message : "Unknown error"));
      // Reset statuses on failure
      setModuleStatuses({});
    } finally {
      setIsStarting(false);
    }
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
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
              ? `Watch your strategy come alive in real-time — ${formatElapsed(elapsedSeconds)} elapsed`
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
                      stopPolling();
                      setPipelineStarted(false);
                      setPipelineComplete(false);
                      setModuleStatuses({});
                      setElapsedSeconds(0);
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
