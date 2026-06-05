"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Rocket, Globe, Users, FileText, ShieldCheck, Camera, Sparkles, Plus, Trash2, Check, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SleekDropdown } from "@/components/shared/SleekDropdown";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { CategoryDropdown } from "@/components/input/CategoryDropdown";
import { DocumentUploader } from "@/components/input/DocumentUploader";
import { GuardrailsInput } from "@/components/input/GuardrailsInput";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import { createSession, uploadDocument, generateCohorts } from "@/lib/api";
import type { BrandInput, Cohort } from "@/lib/types";
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
    competitors: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [socialFiles, setSocialFiles] = useState<File[]>([]);

  // Complex Audience & Geo state
  const [b2bSize, setB2bSize] = useState("");
  const [b2bCategory, setB2bCategory] = useState("");
  const [b2bCustomCategory, setB2bCustomCategory] = useState("");
  const [audAge, setAudAge] = useState("");
  const [audGender, setAudGender] = useState("");
  const [audSEC, setAudSEC] = useState("");
  const [geoCountry, setGeoCountry] = useState("");
  const [geoRegion, setGeoRegion] = useState("");
  const [geoState, setGeoState] = useState("");
  const [geoCustom, setGeoCustom] = useState("");
  
  const [audSECList, setAudSECList] = useState<string[]>([]);
  const [useAgeSlider, setUseAgeSlider] = useState(false);
  const [hoveredAgeMode, setHoveredAgeMode] = useState<"preset" | "slider" | null>(null);
  const [ageRange, setAgeRange] = useState([18, 65]);
  const [audCustomDescription, setAudCustomDescription] = useState("");

  const [offeringType, setOfferingType] = useState<"product" | "service" | "">("");
  const [offeringDescription, setOfferingDescription] = useState("");

  const [competitorsList, setCompetitorsList] = useState<{name: string, link: string}[]>([]);
  const [compNameInput, setCompNameInput] = useState("");
  const [compLinkInput, setCompLinkInput] = useState("");

  // AI Personas State
  const [generatedCohorts, setGeneratedCohorts] = useState<Cohort[]>([]);
  const [selectedCohorts, setSelectedCohorts] = useState<Set<number>>(new Set());
  const [isGeneratingCohorts, setIsGeneratingCohorts] = useState(false);
  const [customCohorts, setCustomCohorts] = useState<Cohort[]>([]);
  const [selectedCustomCohorts, setSelectedCustomCohorts] = useState<Set<number>>(new Set());
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCustomCohort, setNewCustomCohort] = useState<Cohort>({ name: "", description: "", search_prompts: [] });
  const [newCustomPrompt, setNewCustomPrompt] = useState("");

  const isB2B = formData.category.toLowerCase().includes("b2b");

  const updateField = (field: keyof BrandInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCompetitor = () => {
    if (!compNameInput.trim()) return;
    const newList = [...competitorsList, { name: compNameInput.trim(), link: compLinkInput.trim() }];
    setCompetitorsList(newList);
    setCompNameInput("");
    setCompLinkInput("");
    updateField("competitors", JSON.stringify(newList));
  };

  const handleRemoveCompetitor = (index: number) => {
    const newList = competitorsList.filter((_, i) => i !== index);
    setCompetitorsList(newList);
    updateField("competitors", JSON.stringify(newList));
  };

  const handleGenerateCohorts = async () => {
    setIsGeneratingCohorts(true);
    try {
      let tempTargetAudience = "";
      if (isB2B) {
        const finalCategory = b2bCategory === "Custom" ? b2bCustomCategory : b2bCategory;
        tempTargetAudience = `Company Size: ${b2bSize || "Not specified"}\nCompany Category: ${finalCategory || "Not specified"}`;
      } else {
        const ageStr = useAgeSlider ? `${ageRange[0]} - ${ageRange[1]}${ageRange[1] === 100 ? '+' : ''}` : (audAge || "Not specified");
        const secStr = audSECList.length > 0 ? audSECList.join(", ") : "Not specified";
        tempTargetAudience = `Age: ${ageStr}\nGender: ${audGender || "Not specified"}\nSEC: ${secStr}`;
      }
      
      if (audCustomDescription) {
        tempTargetAudience += `\nAdditional Details: ${audCustomDescription}`;
      }
      
      let tempGeo = geoCustom;
      if (geoCountry === "India") {
        tempGeo = `Country: India\nRegion: ${geoRegion || "Not specified"}\nState: ${geoState || "Not specified"}`;
      } else if (geoCountry === "Foreign") {
        tempGeo = `Country: Foreign\nDetails: ${geoCustom || "Not specified"}`;
      }
      
      const res = await generateCohorts({
        ...formData,
        target_audience: tempTargetAudience,
        geography: tempGeo,
      });
      setGeneratedCohorts(res.cohorts);
      setSelectedCohorts(new Set());
    } catch (err) {
      toast.error("Failed to generate AI cohorts");
    } finally {
      setIsGeneratingCohorts(false);
    }
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

      // Compile personas
      const finalCohorts = [
        ...generatedCohorts.filter((_, i) => selectedCohorts.has(i)),
        ...customCohorts.filter((_, i) => selectedCustomCohorts.has(i))
      ];
      updateField("persona", JSON.stringify(finalCohorts));
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
        return !!(offeringType && offeringDescription.trim() !== "" && (geoCountry || geoCustom));
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

                <div className="space-y-4 pt-4">
                  <Label>Competitors (Optional)</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      placeholder="Competitor Name"
                      value={compNameInput}
                      onChange={(e) => setCompNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCompetitor();
                        }
                      }}
                      className="flex-1 bg-background"
                    />
                    <Input
                      placeholder="Website Link (Optional)"
                      value={compLinkInput}
                      onChange={(e) => setCompLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCompetitor();
                        }
                      }}
                      className="flex-1 bg-background"
                    />
                    <Button type="button" onClick={handleAddCompetitor} variant="outline" className="px-4">
                      Add
                    </Button>
                  </div>
                  
                  {competitorsList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {competitorsList.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-muted/50 border border-border px-3 py-1.5 rounded-full text-sm">
                          <span className="font-medium text-foreground">{comp.name}</span>
                          {comp.link && <span className="text-muted-foreground/70 text-xs truncate max-w-[150px]">({comp.link})</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveCompetitor(idx)}
                            className="ml-1 text-muted-foreground hover:text-destructive transition-colors focus:outline-none"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Press Enter in either field or click Add to save a competitor.</p>
                </div>
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
                        <SleekDropdown 
                          value={b2bSize} 
                          onValueChange={setB2bSize} 
                          options={B2B_COMPANY_SIZES as string[]} 
                          placeholder="Select size" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Category</Label>
                        <SleekDropdown 
                          value={b2bCategory} 
                          onValueChange={setB2bCategory} 
                          options={[...(B2B_COMPANY_CATEGORIES as string[]), "Custom"]} 
                          placeholder="Select category" 
                        />
                        <AnimatePresence>
                          {b2bCategory === "Custom" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pt-2"
                            >
                              <Input 
                                placeholder="Enter custom category" 
                                value={b2bCustomCategory} 
                                onChange={(e) => setB2bCustomCategory(e.target.value)}
                                className="bg-background"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Target Audience</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Popover>
                          <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal bg-background h-10 px-3 py-2 border-input overflow-hidden text-sm")}>
                            <span className="truncate">
                              {useAgeSlider ? `${ageRange[0]} - ${ageRange[1] === 100 ? '100+' : ageRange[1]}` : (audAge || <span className="text-muted-foreground">Select age</span>)}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-[520px] p-0 flex flex-row overflow-hidden border-border shadow-lg" align="start"
                            onMouseLeave={() => setHoveredAgeMode(null)}
                          >
                            {/* Left Side: Standard Options */}
                            <div 
                              className={`flex flex-col w-[200px] border-r border-border bg-muted/10 transition-all duration-200 ${(hoveredAgeMode ? hoveredAgeMode === "preset" : !useAgeSlider) ? 'opacity-100' : 'opacity-40 grayscale'}`}
                              onMouseEnter={() => setHoveredAgeMode("preset")}
                            >
                              <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
                                <h4 className="text-sm font-semibold text-foreground/80">Preset Ranges</h4>
                              </div>
                              <div className="p-2 flex flex-col gap-0.5">
                                {AUDIENCE_AGES.map(age => (
                                  <Button 
                                    key={age} 
                                    variant="ghost" 
                                    size="sm"
                                    className={`justify-between font-medium px-3 h-9 transition-colors ${audAge === age && !useAgeSlider ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => { 
                                      if (audAge === age) {
                                        setAudAge("");
                                      } else {
                                        setAudAge(age); 
                                        setUseAgeSlider(false); 
                                      }
                                    }}
                                  >
                                    {age}
                                    {audAge === age && !useAgeSlider && <Check className="w-4 h-4 opacity-70" />}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Right Side: Range Bar */}
                            <div 
                              className="flex flex-col flex-1 bg-background"
                              onMouseEnter={() => setHoveredAgeMode("slider")}
                            >
                              <div className="flex justify-between items-center px-5 py-3 border-b border-border/50 bg-muted/5">
                                <h4 className="text-sm font-semibold text-foreground/80">Custom Range</h4>
                              </div>
                              <div className={`flex-1 px-8 pt-8 pb-10 flex flex-col justify-center transition-all duration-200 ${(hoveredAgeMode ? hoveredAgeMode === "slider" : useAgeSlider) ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                <div className="flex w-full justify-between mb-8">
                                   <div className="flex flex-col items-start">
                                     <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Min</span>
                                     <span className="text-4xl font-light tracking-tight text-foreground">{ageRange[0]}</span>
                                   </div>
                                   <div className="flex flex-col items-end">
                                     <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Max</span>
                                     <span className="text-4xl font-light tracking-tight text-foreground">{ageRange[1] === 100 ? '100+' : ageRange[1]}</span>
                                   </div>
                                </div>
                                
                                <div className="w-full relative mt-2">
                                  <Slider
                                    value={ageRange}
                                    min={1}
                                    max={100}
                                    step={1}
                                    onValueChange={(val) => {
                                      setAgeRange(val as number[]);
                                      setUseAgeSlider(true);
                                    }}
                                    className="z-10 relative cursor-grab active:cursor-grabbing"
                                  />
                                  <div className="absolute w-full top-6 left-0">
                                    <div className="relative w-full h-4">
                                      {[1, 20, 40, 60, 80, 100].map(tick => (
                                        <span 
                                          key={tick} 
                                          className="absolute text-[10px] text-muted-foreground/60 font-medium -translate-x-1/2" 
                                          style={{ left: `${((tick - 1) / 99) * 100}%` }}
                                        >
                                          {tick === 100 ? '100+' : tick}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <SleekDropdown 
                          value={audGender} 
                          onValueChange={setAudGender} 
                          options={AUDIENCE_GENDERS as string[]} 
                          placeholder="Select gender" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Socio-Economic</Label>
                        <Popover>
                          <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start text-left font-normal bg-background h-10 px-3 py-2 border-input overflow-hidden text-sm")}>
                            <span className="truncate">
                              {audSECList.length > 0 ? audSECList.join(", ") : <span className="text-muted-foreground">Select SECs</span>}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-2" align="start">
                            <div className="grid gap-2">
                              {AUDIENCE_SECS.map(s => (
                                <div key={s} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`sec-${s}`}
                                    checked={audSECList.includes(s)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setAudSECList(prev => [...prev, s]);
                                      } else {
                                        setAudSECList(prev => prev.filter(item => item !== s));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`sec-${s}`} className="text-sm cursor-pointer font-normal flex-1">{s}</Label>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <Label>Additional Audience Details (Optional)</Label>
                      <Textarea 
                        value={audCustomDescription}
                        onChange={(e) => setAudCustomDescription(e.target.value)}
                        placeholder="E.g., Gen-Z college students living in urban hostels, highly active on Instagram..."
                        className="bg-background resize-none min-h-[60px]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Geography <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <SleekDropdown 
                        value={geoCountry} 
                        onValueChange={(val) => {
                          setGeoCountry(val);
                          setGeoRegion("");
                          setGeoState("");
                          if (val === "India") setGeoCustom("");
                        }} 
                        options={["India", "Foreign"]} 
                        placeholder="Select country" 
                      />
                    </div>

                    {geoCountry === "India" && (
                      <>
                        <div className="space-y-2">
                          <Label>Region</Label>
                          <SleekDropdown 
                            value={geoRegion} 
                            onValueChange={(val) => {
                              setGeoRegion(val);
                              setGeoState("");
                            }} 
                            options={INDIA_REGIONS as string[]} 
                            placeholder="Select region" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <SleekDropdown 
                            value={geoState} 
                            onValueChange={setGeoState} 
                            options={(geoRegion ? (INDIA_STATES[geoRegion as keyof typeof INDIA_STATES] || []) : ALL_INDIA_STATES) as string[]} 
                            placeholder="Select state" 
                          />
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={geoCountry === "India"}
                      className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
                    />
                  </div>
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

                <div className="space-y-4">
                  <Label>Product / Service Offering <span className="text-destructive">*</span></Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={offeringType === "product" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setOfferingType("product");
                        updateField("product_service", `Product Based: ${offeringDescription}`);
                      }}
                    >
                      Product Based
                    </Button>
                    <Button
                      type="button"
                      variant={offeringType === "service" ? "default" : "outline"}
                      className="flex-1 h-12"
                      onClick={() => {
                        setOfferingType("service");
                        updateField("product_service", `Service Based: ${offeringDescription}`);
                      }}
                    >
                      Service Based
                    </Button>
                  </div>

                  <AnimatePresence>
                    {offeringType && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <Textarea
                          id="product_service"
                          value={offeringDescription}
                          onChange={(e) => {
                            setOfferingDescription(e.target.value);
                            updateField("product_service", `${offeringType === "product" ? "Product" : "Service"} Based: ${e.target.value}`);
                          }}
                          placeholder={offeringType === "product" ? "Describe your core product offering..." : "Describe your core service offering..."}
                          className="min-h-[100px] border-input hover:border-primary/50 focus:border-primary transition-colors bg-background resize-none mt-2"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* AI Personas UI */}
                <div className="space-y-4 pt-6 border-t border-border mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-lg font-semibold">Target Cohorts & Personas</Label>
                      <p className="text-sm text-muted-foreground">Generate AI cohorts based on your choices or add your own.</p>
                    </div>
                    <Button type="button" onClick={handleGenerateCohorts} disabled={isGeneratingCohorts} className="gap-2">
                      {isGeneratingCohorts ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                      Generate Cohorts
                    </Button>
                  </div>

                  {generatedCohorts.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">AI Generated Cohorts</Label>
                      <div className="grid gap-3">
                        {generatedCohorts.map((cohort, idx) => (
                          <div key={idx} className={`p-4 border rounded-lg transition-colors flex gap-4 items-start ${selectedCohorts.has(idx) ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                            <Checkbox 
                              checked={selectedCohorts.has(idx)} 
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedCohorts);
                                checked ? next.add(idx) : next.delete(idx);
                                setSelectedCohorts(next);
                              }} 
                            />
                            <div className="space-y-1 -mt-1">
                              <h4 className="font-semibold text-sm">{cohort.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">{cohort.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {customCohorts.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <Label className="text-sm font-medium">Your Custom Cohorts</Label>
                      <div className="grid gap-3">
                        {customCohorts.map((cohort, idx) => (
                          <div key={idx} className={`p-4 border rounded-lg transition-colors flex gap-4 items-start ${selectedCustomCohorts.has(idx) ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                            <Checkbox 
                              checked={selectedCustomCohorts.has(idx)} 
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedCustomCohorts);
                                checked ? next.add(idx) : next.delete(idx);
                                setSelectedCustomCohorts(next);
                              }} 
                            />
                            <div className="space-y-1 -mt-1 w-full">
                              <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-sm">{cohort.name}</h4>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => {
                                  setCustomCohorts(prev => prev.filter((_, i) => i !== idx));
                                  const next = new Set(selectedCustomCohorts);
                                  next.delete(idx);
                                  setSelectedCustomCohorts(next);
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{cohort.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isAddingCustom ? (
                    <Button type="button" variant="outline" onClick={() => setIsAddingCustom(true)} className="w-full gap-2">
                      <Plus className="w-4 h-4" /> Add Custom Cohort
                    </Button>
                  ) : (
                    <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/20">
                      <div className="space-y-2">
                        <Label>Cohort Name</Label>
                        <Input value={newCustomCohort.name} onChange={(e) => setNewCustomCohort(prev => ({...prev, name: e.target.value}))} placeholder="e.g. Enterprise IT Buyers" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={newCustomCohort.description} onChange={(e) => setNewCustomCohort(prev => ({...prev, description: e.target.value}))} placeholder="Briefly describe this cohort..." className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sample Search Prompts</Label>
                        <div className="flex gap-2">
                          <Input value={newCustomPrompt} onChange={(e) => setNewCustomPrompt(e.target.value)} onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newCustomPrompt.trim()) {
                                setNewCustomCohort(prev => ({...prev, search_prompts: [...prev.search_prompts, newCustomPrompt.trim()]}));
                                setNewCustomPrompt("");
                              }
                            }
                          }} placeholder="Type query and press Enter" />
                          <Button type="button" onClick={() => {
                            if (newCustomPrompt.trim()) {
                              setNewCustomCohort(prev => ({...prev, search_prompts: [...prev.search_prompts, newCustomPrompt.trim()]}));
                              setNewCustomPrompt("");
                            }
                          }}>Add</Button>
                        </div>
                        {newCustomCohort.search_prompts.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-muted-foreground mt-2">
                            {newCustomCohort.search_prompts.map((p, i) => (
                              <li key={i} className="flex items-center justify-between group">
                                <span>{p}</span>
                                <Trash2 className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                  setNewCustomCohort(prev => ({...prev, search_prompts: prev.search_prompts.filter((_, idx) => idx !== i)}));
                                }}/>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => {
                          setIsAddingCustom(false);
                          setNewCustomCohort({ name: "", description: "", search_prompts: [] });
                        }}>Cancel</Button>
                        <Button type="button" onClick={() => {
                          if (newCustomCohort.name.trim()) {
                            setCustomCohorts(prev => [...prev, newCustomCohort]);
                            setSelectedCustomCohorts(prev => {
                              const next = new Set(prev);
                              next.add(customCohorts.length);
                              return next;
                            });
                            setIsAddingCustom(false);
                            setNewCustomCohort({ name: "", description: "", search_prompts: [] });
                          }
                        }} disabled={!newCustomCohort.name.trim()}>Save Cohort</Button>
                      </div>
                    </div>
                  )}
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
            onClick={() => step === 1 ? router.push('/') : prevStep()}
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
