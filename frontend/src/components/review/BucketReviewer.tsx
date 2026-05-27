"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Edit3, Check, RotateCcw } from "lucide-react";

export interface Bucket {
  name: string;
  strategic_purpose: string;
  description: string;
  audience_need: string;
  example_ideas: string[];
  content_ratio_percent: number;
}

interface BucketReviewerProps {
  buckets: Bucket[];
  onBucketsChange: (buckets: Bucket[]) => void;
}

export function BucketReviewer({ buckets, onBucketsChange }: BucketReviewerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBucket, setNewBucket] = useState<Bucket>({
    name: "",
    strategic_purpose: "",
    description: "",
    audience_need: "",
    example_ideas: [""],
    content_ratio_percent: 10,
  });

  const updateBucket = (index: number, updates: Partial<Bucket>) => {
    const updated = [...buckets];
    updated[index] = { ...updated[index], ...updates };
    onBucketsChange(updated);
  };

  const removeBucket = (index: number) => {
    onBucketsChange(buckets.filter((_, i) => i !== index));
  };

  const addBucket = () => {
    if (newBucket.name && newBucket.description) {
      onBucketsChange([...buckets, { ...newBucket, example_ideas: newBucket.example_ideas.filter(Boolean) }]);
      setNewBucket({
        name: "",
        strategic_purpose: "",
        description: "",
        audience_need: "",
        example_ideas: [""],
        content_ratio_percent: 10,
      });
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {buckets.map((bucket, index) => (
          <motion.div
            key={`bucket-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass border-[oklch(0.65_0.25_280/0.2)] hover:border-[oklch(0.65_0.25_280/0.4)] transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    {editingIndex === index ? (
                      <Input
                        value={bucket.name}
                        onChange={(e) => updateBucket(index, { name: e.target.value })}
                        className="h-8 text-lg font-semibold glass-subtle border-[oklch(0.65_0.25_280/0.3)]"
                      />
                    ) : (
                      <span>{bucket.name}</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[oklch(0.75_0.15_200)] font-mono mr-2">
                      {bucket.content_ratio_percent}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[oklch(0.65_0.25_280/0.15)]"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                      {editingIndex === index ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => removeBucket(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Strategic Purpose</Label>
                      <Textarea
                        value={bucket.strategic_purpose}
                        onChange={(e) => updateBucket(index, { strategic_purpose: e.target.value })}
                        className="mt-1 min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        value={bucket.description}
                        onChange={(e) => updateBucket(index, { description: e.target.value })}
                        className="mt-1 min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Content Ratio (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={bucket.content_ratio_percent}
                        onChange={(e) => updateBucket(index, { content_ratio_percent: parseInt(e.target.value) || 0 })}
                        className="mt-1 w-24 glass-subtle border-[oklch(0.65_0.25_280/0.2)] text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{bucket.strategic_purpose}</p>
                    <p className="text-sm">{bucket.description}</p>
                    {bucket.audience_need && (
                      <p className="text-xs text-muted-foreground italic">Audience need: {bucket.audience_need}</p>
                    )}
                    {bucket.example_ideas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bucket.example_ideas.map((idea, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full bg-[oklch(0.65_0.25_280/0.1)] text-[oklch(0.75_0.2_280)] border border-[oklch(0.65_0.25_280/0.2)]">
                            {idea}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Bucket */}
      {showAddForm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="glass border-dashed border-[oklch(0.65_0.25_280/0.3)]">
            <CardContent className="pt-6 space-y-3">
              <Input
                placeholder="Bucket name"
                value={newBucket.name}
                onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                className="glass-subtle border-[oklch(0.65_0.25_280/0.2)]"
              />
              <Textarea
                placeholder="Description"
                value={newBucket.description}
                onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                className="min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none"
              />
              <Textarea
                placeholder="Strategic purpose"
                value={newBucket.strategic_purpose}
                onChange={(e) => setNewBucket({ ...newBucket, strategic_purpose: e.target.value })}
                className="min-h-[60px] glass-subtle border-[oklch(0.65_0.25_280/0.2)] resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addBucket} className="bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.6_0.25_280)] text-white">
                  <Check className="w-4 h-4 mr-1" /> Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed border-[oklch(0.65_0.25_280/0.3)] hover:border-[oklch(0.65_0.25_280/0.5)] hover:bg-[oklch(0.65_0.25_280/0.05)] transition-all"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Bucket
        </Button>
      )}
    </div>
  );
}
