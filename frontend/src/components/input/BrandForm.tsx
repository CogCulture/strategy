"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Rocket, Globe, Users, FileText, ShieldCheck, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { CategoryDropdown } from "@/components/input/CategoryDropdown";
import { DocumentUploader } from "@/components/input/DocumentUploader";
import { GuardrailsInput } from "@/components/input/GuardrailsInput";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createSession, uploadDocument } from "@/lib/api";
import type { BrandInput } from "@/lib/types";
import { 
  B2B_COMPANY_SIZES, B2B_COMPANY_CATEGORIES, 
  AUDIENCE_AGES, AUDIENCE_GENDERS, AUDIENCE_SECS, 
  INDIA_REGIONS, INDIA_STATES 
} from "@/lib/constants";

const ALL_INDIA_STATES = Array.from(new Set(Object.values(INDIA_STATES).flat())).sort();

const STEPS = [
  { number: 1, title: "Brand Basics" },
  { number: 2, title: "Audience & Strategy" },
  { number: 3, title: "Context & Guardrails" },
  { number: 4, title: "Documents" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function BrandForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<BrandInput>({
    brand_name: "",
    website_url: "",
    category: "",
    sub_category: "",
    target_audience: "",
    persona: "",
    campaign_positioning: "",
    product_service: "",
    geography: "",
    context: "",
    guardrails: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [socialFiles, setSocialFiles] = useState<File[]>([]);

  // Complex Audience & Geo state
  const [b2bSize, setB2bSize] = useState("");
  const [b2bCategory, setB2bCategory] = useState("");
  const [audAge, setAudAge] = useState("");
  const [audGender, setAudGender] = useState("");
  const [audSEC, setAudSEC] = useState("");
  const [geoCountry, setGeoCountry] = useState("");
  const [geoRegion, setGeoRegion] = useState("");
  const [geoState, setGeoState] = useState("");
  const [geoCustom, setGeoCustom] = useState("");

  const isB2B = formData.category.toLowerCase().includes("b2b");

  const updateField = (field: keyof BrandInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step === 2) {
      // Compile target audience
      if (isB2B) {
        updateField("target_audience", `Company Size: ${b2bSize || "Not specified"}\nCompany Category: ${b2bCategory || "Not specified"}`);
      } else {
        updateField("target_audience", `Age: ${audAge || "Not specified"}\nGender: ${audGender || "Not specified"}\nSEC: ${audSEC || "Not specified"}`);
      }

      // Compile geography
      if (geoCountry === "India") {
        updateField("geography", `Country: India\nRegion: ${geoRegion || "Not specified"}\nState: ${geoState || "Not specified"}`);
      } else if (geoCountry === "Foreign") {
        updateField("geography", `Country: Foreign\nDetails: ${geoCustom || "Not specified"}`);
      } else {
        updateField("geography", geoCustom || "Not specified");
      }
    }

    if (step < 4) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!(formData.brand_name && formData.website_url && formData.category && formData.sub_category);
      case 2:
        return !!(formData.product_service && (geoCountry || geoCustom));
      case 3:
        return true; // Optional step
      case 4:
        return true; // Documents optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createSession(formData as unknown as Record<string, unknown>);
      const sessionId = result.session_id;

      // Upload general documents
      for (const file of files) {
        await uploadDocument(sessionId, file);
      }
      // Upload social media documents
      for (const file of socialFiles) {
        await uploadDocument(sessionId, file, "social_media");
      }

      toast.success("Brand session created successfully!");
      router.push(`/outputs/${sessionId}`);
    } catch (err) {
      toast.error("Failed to create session: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <StepIndicator steps={STEPS} currentStep={step} />

      <div className="bg-background rounded-xl p-8 border border-border shadow-sm relative overflow-hidden">

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Brand Basics</h2>
                    <p className="text-sm text-muted-foreground">Tell us about your brand</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand_name">Brand Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="brand_name"
                    value={formData.brand_name}
                    onChange={(e) => updateField("brand_name", e.target.value)}
                    placeholder="e.g. Nike, Apple, Tesla"
                    className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL <span className="text-destructive">*</span></Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => updateField("website_url", e.target.value)}
                    placeholder="https://www.example.com"
                    className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
                  />
                </div>

                <CategoryDropdown
                  category={formData.category}
                  subCategory={formData.sub_category}
                  onCategoryChange={(val) => updateField("category", val)}
                  onSubCategoryChange={(val) => updateField("sub_category", val)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Audience & Strategy</h2>
                    <p className="text-sm text-muted-foreground">Define your target market</p>
                  </div>
                </div>

                {isB2B ? (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Target Audience</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <Select value={b2bSize} onValueChange={setB2bSize}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select size" /></SelectTrigger>
                          <SelectContent>
                            {B2B_COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Company Category</Label>
                        <Select value={b2bCategory} onValueChange={setB2bCategory}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {B2B_COMPANY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Target Audience</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Select value={audAge} onValueChange={setAudAge}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select age" /></SelectTrigger>
                          <SelectContent>
                            {AUDIENCE_AGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={audGender} onValueChange={setAudGender}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select gender" /></SelectTrigger>
                          <SelectContent>
                            {AUDIENCE_GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Socio-Economic</Label>
                        <Select value={audSEC} onValueChange={setAudSEC}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select SEC" /></SelectTrigger>
                          <SelectContent>
                            {AUDIENCE_SECS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Geography <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={geoCountry} onValueChange={(val) => {
                        setGeoCountry(val);
                        setGeoRegion("");
                        setGeoState("");
                        if (val === "India") setGeoCustom("");
                      }}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="Foreign">Foreign</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {geoCountry === "India" && (
                      <>
                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Select value={geoRegion} onValueChange={(val) => {
                            setGeoRegion(val);
                            setGeoState("");
                          }}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Select region" /></SelectTrigger>
                            <SelectContent>
                              {INDIA_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Select value={geoState} onValueChange={setGeoState}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>
                              {(geoRegion ? (INDIA_STATES[geoRegion] || []) : ALL_INDIA_STATES).map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Custom Geography</Label>
                    <Input
                      placeholder={geoCountry === "India" ? "Custom geography is disabled for India" : "Enter specific geography..."}
                      value={geoCustom}
                      onChange={(e) => setGeoCustom(e.target.value)}
                      disabled={geoCountry === "India"}
                      className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona">Persona</Label>
                  <Textarea
                    id="persona"
                    value={formData.persona}
                    onChange={(e) => updateField("persona", e.target.value)}
                    placeholder="e.g. Urban professional, 25–35, tech-savvy, sustainability-conscious"
                    className="min-h-[80px] border-input hover:border-primary/50 focus:border-primary transition-colors bg-background resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign_positioning">Campaign / Positioning</Label>
                  <Input
                    id="campaign_positioning"
                    value={formData.campaign_positioning}
                    onChange={(e) => updateField("campaign_positioning", e.target.value)}
                    placeholder="Current or desired brand positioning"
                    className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_service">Product / Service <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="product_service"
                    value={formData.product_service}
                    onChange={(e) => updateField("product_service", e.target.value)}
                    placeholder="Describe your core product or service offering..."
                    className="min-h-[80px] border-input hover:border-primary/50 focus:border-primary transition-colors bg-background resize-none"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Context & Guardrails</h2>
                    <p className="text-sm text-muted-foreground">Optional strategic context</p>
                  </div>
                </div>

                <GuardrailsInput
                  label="Additional Context"
                  value={formData.context || ""}
                  onChange={(val) => updateField("context", val)}
                  placeholder="Any additional context about the brand, its history, recent changes, upcoming launches, competitive situation..."
                  helpText="This context will be injected into all AI-generated outputs"
                />

                <GuardrailsInput
                  label="Guardrails"
                  value={formData.guardrails || ""}
                  onChange={(val) => updateField("guardrails", val)}
                  placeholder="Things the brand should never do or say. Topics to avoid. Messaging boundaries..."
                  helpText="These constraints will be enforced across all generated content"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.25_280)] to-[oklch(0.65_0.15_200)] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Document Upload</h2>
                    <p className="text-sm text-muted-foreground">Upload brand assets and documents</p>
                  </div>
                </div>

                <DocumentUploader
                  files={files}
                  onFilesChange={setFiles}
                />

                <p className="text-xs text-muted-foreground text-center">
                  Upload brand guidelines, pitch decks, or any relevant documents.
                  All files are processed through AI vision for comprehensive analysis.
                </p>

                <div className="border-t border-border/40 my-6" />

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.65_0.20_330)] to-[oklch(0.60_0.20_280)] flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Social Media Pages (Optional)</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload PDF screenshots of your brand&apos;s Instagram, Facebook, LinkedIn, or Twitter pages for real engagement data extraction
                    </p>
                  </div>
                </div>

                <DocumentUploader
                  files={socialFiles}
                  onFilesChange={setSocialFiles}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1}
            className="gap-2 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch Research
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
