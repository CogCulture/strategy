"use client";

import { motion } from "framer-motion";
import { OUTPUT_MODULES } from "@/lib/constants";

type ModuleStatus = "pending" | "running" | "complete" | "error" | "review";

interface PipelineProgressProps {
  moduleStatuses: Record<string, ModuleStatus>;
  selectedModules: string[];
}

const STATUS_CONFIG: Record<ModuleStatus, { icon: string; label: string; color: string }> = {
  pending: { icon: "⏳", label: "Pending", color: "text-muted-foreground" },
  running: { icon: "🔄", label: "Running", color: "text-[oklch(0.75_0.15_200)]" },
  complete: { icon: "✅", label: "Complete", color: "text-[oklch(0.6_0.2_150)]" },
  error: { icon: "❌", label: "Error", color: "text-destructive" },
  review: { icon: "🔁", label: "Awaiting Review", color: "text-[oklch(0.7_0.2_60)]" },
};

export function PipelineProgress({ moduleStatuses, selectedModules }: PipelineProgressProps) {
  const selectedModuleInfo = OUTPUT_MODULES.filter((m) => selectedModules.includes(m.id));
  const completedCount = Object.values(moduleStatuses).filter((s) => s === "complete").length;
  const totalCount = selectedModules.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pipeline Progress</span>
          <span className="font-mono text-[oklch(0.75_0.15_200)]">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[oklch(0.2_0.02_280)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.55_0.25_280)] to-[oklch(0.75_0.15_200)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-3">
        {selectedModuleInfo.map((module, i) => {
          const status = moduleStatuses[module.id] || "pending";
          const config = STATUS_CONFIG[status];

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 rounded-xl p-4 transition-all duration-300 ${
                status === "running"
                  ? "glass glow-sm"
                  : status === "complete"
                  ? "glass-subtle border-[oklch(0.6_0.2_150/0.3)]"
                  : "glass-subtle"
              }`}
            >
              <motion.span
                className="text-xl"
                animate={status === "running" ? { rotate: 360 } : {}}
                transition={status === "running" ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
              >
                {config.icon}
              </motion.span>
              <div className="flex-1">
                <p className="font-medium text-sm">{module.label}</p>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
