"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface GuardrailsInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  helpText?: string;
}

export function GuardrailsInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 2000,
  helpText,
}: GuardrailsInputProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span
          className={`text-xs transition-colors ${
            isNearLimit ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) {
            onChange(e.target.value);
          }
        }}
        placeholder={placeholder}
        className="min-h-[120px] border-input hover:border-primary/50 focus:border-primary transition-colors bg-background resize-none"
      />
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
