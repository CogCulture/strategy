"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3, Check, Palette } from "lucide-react";

export interface ToneGuideline {
  bucket_name: string;
  tone_of_voice: string;
  language_style: string;
  dos: string[];
  donts: string[];
  visual_style_guidance: string;
  format_recommendations: string;
  hashtag_strategy: string;
}

interface ToneReviewerProps {
  tones: ToneGuideline[];
  onTonesChange: (tones: ToneGuideline[]) => void;
}

export function ToneReviewer({ tones, onTonesChange }: ToneReviewerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateTone = (index: number, updates: Partial<ToneGuideline>) => {
    const updated = [...tones];
    updated[index] = { ...updated[index], ...updates };
    onTonesChange(updated);
  };

  return (
    <div className="space-y-4">
      {tones.map((tone, index) => (
        <motion.div
          key={`tone-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="glass border-[oklch(0.65_0.25_280/0.2)] hover:border-[oklch(0.65_0.25_280/0.4)] transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.6_0.2_320)] to-[oklch(0.7_0.15_280)] flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  {tone.bucket_name}
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
              {/* Tone of Voice */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tone of Voice</Label>
                {editingIndex === index ? (
                  <Textarea
                    value={tone.tone_of_voice}
                    onChange={(e) => updateTone(index, { tone_of_voice: e.target.value })}
                    className="mt-1 min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                  />
                ) : (
                  <p className="text-sm mt-1">{tone.tone_of_voice}</p>
                )}
              </div>

              {/* Language Style */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Language Style</Label>
                {editingIndex === index ? (
                  <Textarea
                    value={tone.language_style}
                    onChange={(e) => updateTone(index, { language_style: e.target.value })}
                    className="mt-1 min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                  />
                ) : (
                  <p className="text-sm mt-1">{tone.language_style}</p>
                )}
              </div>

              {/* Do's and Don'ts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[oklch(0.6_0.2_150)] uppercase tracking-wider">Do&apos;s</Label>
                  <ul className="mt-1 space-y-1">
                    {(tone.dos || []).map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-[oklch(0.6_0.2_150)] mt-0.5">✓</span>
                        {editingIndex === index ? (
                          <input
                            value={item}
                            onChange={(e) => {
                              const newDos = [...(tone.dos || [])];
                              newDos[i] = e.target.value;
                              updateTone(index, { dos: newDos });
                            }}
                            className="flex-1 bg-transparent border-b border-[oklch(0.65_0.25_280/0.2)] text-sm focus:outline-none focus:border-[oklch(0.65_0.25_280)]"
                          />
                        ) : (
                          <span>{item}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Label className="text-xs text-destructive uppercase tracking-wider">Don&apos;ts</Label>
                  <ul className="mt-1 space-y-1">
                    {(tone.donts || []).map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-destructive mt-0.5">✗</span>
                        {editingIndex === index ? (
                          <input
                            value={item}
                            onChange={(e) => {
                              const newDonts = [...(tone.donts || [])];
                              newDonts[i] = e.target.value;
                              updateTone(index, { donts: newDonts });
                            }}
                            className="flex-1 bg-transparent border-b border-[oklch(0.65_0.25_280/0.2)] text-sm focus:outline-none focus:border-[oklch(0.65_0.25_280)]"
                          />
                        ) : (
                          <span>{item}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Visual Style & Format */}
              {editingIndex === index ? (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Visual Style Guidance</Label>
                    <Textarea
                      value={tone.visual_style_guidance}
                      onChange={(e) => updateTone(index, { visual_style_guidance: e.target.value })}
                      className="mt-1 min-h-[40px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Format Recommendations</Label>
                    <Textarea
                      value={tone.format_recommendations}
                      onChange={(e) => updateTone(index, { format_recommendations: e.target.value })}
                      className="mt-1 min-h-[40px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  {tone.visual_style_guidance && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Visual Style</Label>
                      <p className="text-sm mt-1 text-muted-foreground">{tone.visual_style_guidance}</p>
                    </div>
                  )}
                  {tone.format_recommendations && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Formats</Label>
                      <p className="text-sm mt-1 text-muted-foreground">{tone.format_recommendations}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
