"use client";

import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useState, useRef, useEffect } from "react";

interface SleekDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}

export function SleekDropdown({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className,
  contentClassName,
  disabled = false,
}: SleekDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);

  useEffect(() => {
    if (!triggerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTriggerWidth(entry.contentRect.width);
      }
    });
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <Popover>
      <PopoverTrigger 
        ref={triggerRef}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }), 
          "w-full justify-between text-left font-normal bg-background h-10 px-3 py-2 border-input overflow-hidden text-sm",
          !value && "text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="truncate">{value || placeholder}</span>
      </PopoverTrigger>
      <PopoverContent 
        style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
        className={cn("p-0 flex flex-col overflow-hidden border-border shadow-lg", contentClassName)} 
      >
        <div className="flex flex-col bg-muted/10">
          <div className="p-2 flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
            {options.map((option) => {
              const isSelected = value === option;
              return (
                <Button
                  key={option}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-between font-medium px-3 h-9 transition-colors",
                    isSelected 
                      ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    // Deselect if already selected
                    if (isSelected) {
                      onValueChange("");
                    } else {
                      onValueChange(option);
                    }
                  }}
                >
                  {option}
                  {isSelected && <Check className="w-4 h-4 opacity-70" />}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
