"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-3"
    >
      <div className="relative">
        <div className={`${sizeMap[size]} rounded-full border-2 border-[oklch(0.65_0.25_280/0.2)] border-t-[oklch(0.65_0.25_280)] animate-spin`} />
        <div className={`absolute inset-0 ${sizeMap[size]} rounded-full border-2 border-transparent border-b-[oklch(0.75_0.15_200/0.5)] animate-spin`} style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </motion.div>
  );
}
