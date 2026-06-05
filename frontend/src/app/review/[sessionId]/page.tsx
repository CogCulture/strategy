"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, ArrowRight, RotateCcw, Layers, Palette, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BucketReviewer, type Bucket } from "@/components/review/BucketReviewer";
import { ToneReviewer, type ToneGuideline } from "@/components/review/ToneReviewer";
import { MessagingReviewer, type MessagingFramework } from "@/components/review/MessagingReviewer";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { submitReview } from "@/lib/api";

function ReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const initialStage = searchParams.get("stage") || "buckets";

  const [activeTab, setActiveTab] = useState(initialStage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [tones, setTones] = useState<ToneGuideline[]>([]);
  const [messaging, setMessaging] = useState<MessagingFramework[]>([]);

  // In a real app, we'd fetch initial data from the backend here
  // For now, mock data would come from SSE events
  useEffect(() => {
    // TODO: Fetch review data from backend based on sessionId and stage
  }, [sessionId, initialStage]);

  const handleApprove = async (stage: string) => {
    setIsSubmitting(true);
    try {
      let edits: Record<string, unknown> | undefined;

      if (stage === "buckets" && buckets.length > 0) {
        edits = { buckets };
      } else if (stage === "tone" && tones.length > 0) {
        edits = { tone_guidelines: tones };
      } else if (stage === "messaging" && messaging.length > 0) {
        edits = { messaging_framework: messaging };
      }

      await submitReview({
        session_id: sessionId,
        review_stage: stage,
        approved: true,
        edits,
      });

      toast.success(`${stage.charAt(0).toUpperCase() + stage.slice(1)} approved!`);

      // Navigate to next stage or back to outputs
      if (stage === "buckets") {
        setActiveTab("tone");
      } else if (stage === "tone") {
        setActiveTab("messaging");
      } else {
        router.push(`/outputs/${sessionId}`);
      }
    } catch (err) {
      toast.error("Failed to submit review: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (stage: string) => {
    setIsSubmitting(true);
    try {
      await submitReview({
        session_id: sessionId,
        review_stage: stage,
        approved: false,
      });

      toast.info(`${stage.charAt(0).toUpperCase() + stage.slice(1)} sent back for regeneration`);
    } catch (err) {
      toast.error("Failed to submit rejection: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const TAB_CONFIG = [
    { id: "buckets", label: "Content Buckets", icon: Layers, description: "Review and edit content pillars" },
    { id: "tone", label: "Tone Guidelines", icon: Palette, description: "Review tone of voice per bucket" },
    { id: "messaging", label: "Messaging", icon: MessageCircle, description: "Review core messaging framework" },
  ];

  return (
    <main className="min-h-screen py-12 px-6 relative">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 hover:bg-muted text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <Sparkles className="w-4 h-4 text-[oklch(0.75_0.15_200)]" />
          <span className="gradient-text font-semibold">Brand Research Intelligence</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Content Strategy Review</h1>
        <p className="text-muted-foreground">Review, edit, and approve AI-generated content strategy</p>
      </motion.div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="w-full glass rounded-xl p-1 h-auto grid grid-cols-3 gap-1">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-lg py-3 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[oklch(0.55_0.25_280)] data-[state=active]:to-[oklch(0.6_0.2_300)] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">{tab.label}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              {TAB_CONFIG.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Tab Description */}
                    <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center">
                        <tab.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{tab.label}</h3>
                        <p className="text-sm text-muted-foreground">{tab.description}</p>
                      </div>
                    </div>

                    {/* Content */}
                    {tab.id === "buckets" && (
                      <BucketReviewer
                        buckets={buckets}
                        onBucketsChange={setBuckets}
                      />
                    )}
                    {tab.id === "tone" && (
                      <ToneReviewer
                        tones={tones}
                        onTonesChange={setTones}
                      />
                    )}
                    {tab.id === "messaging" && (
                      <MessagingReviewer
                        messaging={messaging}
                        onMessagingChange={setMessaging}
                      />
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-border/30">
                      <Button
                        variant="outline"
                        onClick={() => handleReject(tab.id)}
                        disabled={isSubmitting}
                        className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Regenerate
                      </Button>

                      <Button
                        onClick={() => handleApprove(tab.id)}
                        disabled={isSubmitting}
                        className="gap-2 bg-gradient-to-r from-[oklch(0.45_0.2_160)] to-[oklch(0.55_0.15_180)] hover:from-[oklch(0.5_0.2_160)] hover:to-[oklch(0.6_0.15_180)] text-white transition-all duration-300 hover:scale-105"
                      >
                        {isSubmitting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {tab.id === "messaging" ? "Approve & Finish" : "Approve & Continue"}
                        {tab.id !== "messaging" && <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </motion.div>
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading review..." />
      </div>
    }>
      <ReviewPageContent />
    </Suspense>
  );
}
