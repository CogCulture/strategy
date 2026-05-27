"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3, Check, MessageCircle } from "lucide-react";

export interface MessagingFramework {
  bucket_name: string;
  core_message: string;
  supporting_messages: string[];
  proof_points: string;
  audience_response_desired: string;
  sample_captions: string[];
  sample_hooks: string[];
}

interface MessagingReviewerProps {
  messaging: MessagingFramework[];
  onMessagingChange: (messaging: MessagingFramework[]) => void;
}

export function MessagingReviewer({ messaging, onMessagingChange }: MessagingReviewerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateMessaging = (index: number, updates: Partial<MessagingFramework>) => {
    const updated = [...messaging];
    updated[index] = { ...updated[index], ...updates };
    onMessagingChange(updated);
  };

  return (
    <div className="space-y-4">
      {messaging.map((msg, index) => (
        <motion.div
          key={`msg-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="glass border-[oklch(0.65_0.25_280/0.2)] hover:border-[oklch(0.65_0.25_280/0.4)] transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_200)] to-[oklch(0.65_0.25_280)] flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  {msg.bucket_name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[oklch(0.65_0.25_280/0.15)]"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                >
                  {editingIndex === index ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Core Message */}
              <div>
                <Label className="text-xs text-[oklch(0.75_0.15_200)] uppercase tracking-wider font-semibold">Core Message</Label>
                {editingIndex === index ? (
                  <Textarea
                    value={msg.core_message}
                    onChange={(e) => updateMessaging(index, { core_message: e.target.value })}
                    className="mt-1 min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                  />
                ) : (
                  <p className="text-sm mt-1 font-medium text-[oklch(0.85_0.05_280)]">{msg.core_message}</p>
                )}
              </div>

              {/* Supporting Messages */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Supporting Messages</Label>
                <ul className="mt-1 space-y-1">
                  {(msg.supporting_messages || []).map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-[oklch(0.65_0.25_280)] mt-0.5">→</span>
                      {editingIndex === index ? (
                        <input
                          value={item}
                          onChange={(e) => {
                            const newMsgs = [...(msg.supporting_messages || [])];
                            newMsgs[i] = e.target.value;
                            updateMessaging(index, { supporting_messages: newMsgs });
                          }}
                          className="flex-1 bg-transparent border-b border-[oklch(0.65_0.25_280/0.2)] text-sm focus:outline-none focus:border-[oklch(0.65_0.25_280)]"
                        />
                      ) : (
                        <span className="text-muted-foreground">{item}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Proof Points */}
              {(msg.proof_points || editingIndex === index) && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Proof Points</Label>
                  {editingIndex === index ? (
                    <Textarea
                      value={msg.proof_points}
                      onChange={(e) => updateMessaging(index, { proof_points: e.target.value })}
                      className="mt-1 min-h-[40px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                    />
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground">{msg.proof_points}</p>
                  )}
                </div>
              )}

              {/* Sample Captions */}
              {(msg.sample_captions?.length > 0 || editingIndex === index) && (
                <div>
                  <Label className="text-xs text-[oklch(0.7_0.2_320)] uppercase tracking-wider">Sample Captions</Label>
                  <div className="mt-2 space-y-2">
                    {(msg.sample_captions || []).map((caption, i) => (
                      <div key={i} className="rounded-lg bg-[oklch(0.2_0.025_280/0.5)] p-3 text-sm">
                        {editingIndex === index ? (
                          <Textarea
                            value={caption}
                            onChange={(e) => {
                              const newCaptions = [...(msg.sample_captions || [])];
                              newCaptions[i] = e.target.value;
                              updateMessaging(index, { sample_captions: newCaptions });
                            }}
                            className="min-h-[40px] bg-transparent border-none resize-none text-sm p-0 focus-visible:ring-0"
                          />
                        ) : (
                          <p className="text-muted-foreground italic">&ldquo;{caption}&rdquo;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Hooks */}
              {(msg.sample_hooks?.length > 0 || editingIndex === index) && (
                <div>
                  <Label className="text-xs text-[oklch(0.7_0.15_40)] uppercase tracking-wider">Sample Hooks</Label>
                  <div className="mt-2 space-y-2">
                    {(msg.sample_hooks || []).map((hook, i) => (
                      <div key={i} className="rounded-lg bg-[oklch(0.2_0.025_280/0.5)] p-3 text-sm border-l-2 border-[oklch(0.65_0.25_280/0.5)]">
                        {editingIndex === index ? (
                          <input
                            value={hook}
                            onChange={(e) => {
                              const newHooks = [...(msg.sample_hooks || [])];
                              newHooks[i] = e.target.value;
                              updateMessaging(index, { sample_hooks: newHooks });
                            }}
                            className="w-full bg-transparent border-none text-sm focus:outline-none"
                          />
                        ) : (
                          <p className="text-muted-foreground">{hook}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
