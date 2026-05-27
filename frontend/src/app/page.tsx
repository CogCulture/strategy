"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Brain, ArrowRight, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Multi-Model AI Pipeline",
    description: "GPT-4o, Claude Sonnet, Gemini Flash — each model handles what it does best",
  },
  {
    icon: Zap,
    title: "Real-Time Streaming",
    description: "Watch your strategy come alive with live SSE-powered progress tracking",
  },
  {
    icon: Shield,
    title: "Human-in-the-Loop Review",
    description: "Approve, edit, and refine AI outputs before final generation",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Minimal Background */}
      <div className="absolute inset-0 bg-background -z-10" />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-4xl mx-auto mb-16"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-sm text-muted-foreground mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          Powered by Multi-Model AI
        </motion.div>

        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-foreground leading-tight">
          Brand Research
          <br />
          Intelligence
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered strategic intelligence for forward-thinking brands.
          Generate comprehensive brand strategy, competitive analysis, and content frameworks in minutes.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/new">
            <Button
              size="lg"
              className="text-lg px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Research
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full"
      >
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.15, duration: 0.5 }}
            className="bg-background border border-border rounded-2xl p-6 hover:shadow-sm transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
    </main>
  );
}
