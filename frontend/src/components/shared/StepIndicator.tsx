"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;

        return (
          <div key={step.number} className="flex items-center">
            <motion.div
              className="flex items-center gap-2"
              initial={false}
              animate={{
                scale: isActive ? 1 : 0.95,
              }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "step-completed text-white"
                    : isActive
                    ? "step-active text-white"
                    : "step-pending text-muted-foreground"
                }`}
                layout
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  step.number
                )}
              </motion.div>
              <span
                className={`hidden sm:block text-sm font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-foreground"
                    : isCompleted
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {step.title}
              </span>
            </motion.div>

            {index < steps.length - 1 && (
              <div className="w-8 sm:w-16 mx-2">
                <div className="h-px bg-border relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.15_200)]"
                    initial={{ width: "0%" }}
                    animate={{
                      width: isCompleted ? "100%" : isActive ? "50%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
