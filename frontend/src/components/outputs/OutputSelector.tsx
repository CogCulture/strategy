"use client";

import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OUTPUT_MODULES } from "@/lib/constants";
import { FileText, AlertTriangle, MessageSquare } from "lucide-react";

interface OutputSelectorProps {
  selectedModules: string[];
  onSelectionChange: (modules: string[]) => void;
}

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

export function OutputSelector({ selectedModules, onSelectionChange }: OutputSelectorProps) {
  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      onSelectionChange(selectedModules.filter((m) => m !== moduleId));
    } else {
      onSelectionChange([...selectedModules, moduleId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(OUTPUT_MODULES.map((m) => m.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const hasPdfModule = selectedModules.includes("brand_audit") || selectedModules.includes("social_media");
  const hasContentStrategy = selectedModules.includes("content_strategy");

  return (
    <div className="space-y-6">
      {/* Select controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-[oklch(0.65_0.25_280/0.15)] text-[oklch(0.75_0.2_280)] border-[oklch(0.65_0.25_280/0.3)]">
            {selectedModules.length} selected
          </Badge>
        </div>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-[oklch(0.75_0.15_200)] transition-colors">
            Select all
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button onClick={deselectAll} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            Deselect all
          </button>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OUTPUT_MODULES.map((module, i) => {
          const isSelected = selectedModules.includes(module.id);
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleModule(module.id)}
              className={`relative rounded-xl p-4 cursor-pointer transition-all duration-300 group ${
                isSelected
                  ? "glass glow-sm border-[oklch(0.65_0.25_280/0.4)]"
                  : "glass-subtle hover:border-[oklch(0.65_0.25_280/0.3)] hover:bg-[oklch(0.2_0.02_280/0.5)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleModule(module.id)}
                  className="mt-0.5 border-[oklch(0.65_0.25_280/0.5)] data-[state=checked]:bg-[oklch(0.65_0.25_280)] data-[state=checked]:border-[oklch(0.65_0.25_280)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MODULE_ICONS[module.id]}</span>
                    <Label className="font-semibold cursor-pointer">{module.label}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {module.description}
                  </p>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="selected-indicator"
                  className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[oklch(0.75_0.15_200)] m-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Conditional Alerts */}
      {hasPdfModule && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Alert className="glass border-[oklch(0.7_0.15_40/0.3)] bg-[oklch(0.7_0.15_40/0.08)]">
            <FileText className="h-4 w-4 text-[oklch(0.7_0.15_40)]" />
            <AlertDescription className="text-sm">
              <strong>Brand Audit / Social Media</strong> requires uploaded social media PDFs (Instagram, LinkedIn, etc.) from the input step.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {hasContentStrategy && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Alert className="glass border-[oklch(0.75_0.15_200/0.3)] bg-[oklch(0.75_0.15_200/0.08)]">
            <MessageSquare className="h-4 w-4 text-[oklch(0.75_0.15_200)]" />
            <AlertDescription className="text-sm">
              <strong>Content Strategy</strong> requires 3 review steps. You&apos;ll approve buckets, tone, and messaging before final output.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}
