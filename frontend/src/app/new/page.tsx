"use client";

import { motion } from "framer-motion";
import { BrandForm } from "@/components/input/BrandForm";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewBrandPage() {
  return (
    <main className="min-h-screen py-12 px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <Sparkles className="w-4 h-4 text-[oklch(0.75_0.15_200)]" />
          <span className="gradient-text font-semibold">Brand Research Intelligence</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">New Brand Research</h1>
        <p className="text-muted-foreground">Fill in brand details to generate strategic intelligence</p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <BrandForm />
      </motion.div>
    </main>
  );
}
