"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OutputCardProps {
  title: string;
  content: string;
  status: "pending" | "running" | "complete" | "error";
  icon?: string;
}

export function OutputCard({ title, content, status, icon }: OutputCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="glass glow-sm border-[oklch(0.65_0.25_280/0.2)] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {icon && <span>{icon}</span>}
              {title}
            </CardTitle>
            <Badge
              variant="secondary"
              className={`text-xs ${
                status === "complete"
                  ? "bg-[oklch(0.55_0.2_160/0.2)] text-[oklch(0.6_0.2_150)] border-[oklch(0.55_0.2_160/0.3)]"
                  : status === "running"
                  ? "bg-[oklch(0.75_0.15_200/0.2)] text-[oklch(0.75_0.15_200)] border-[oklch(0.75_0.15_200/0.3)] animate-pulse"
                  : status === "error"
                  ? "bg-destructive/20 text-destructive border-destructive/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {status === "complete" ? "✅ Complete" : status === "running" ? "🔄 Running" : status === "error" ? "❌ Error" : "⏳ Pending"}
            </Badge>
          </div>
        </CardHeader>
        {status === "complete" && content && (
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="prose prose-invert prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {content}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
