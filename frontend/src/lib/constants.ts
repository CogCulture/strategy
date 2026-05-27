export const CATEGORIES: Record<string, string[]> = {
  "FMCG": ["Personal Care", "Food & Beverage", "Home Care", "Baby Care", "Pet Care"],
  "D2C": ["Apparel", "Accessories", "Beauty", "Wellness", "Home Decor"],
  "B2B SaaS": ["HR Tech", "Fintech", "Marketing Tech", "Sales Tech", "Dev Tools"],
  "Healthcare": ["Pharma", "MedTech", "Mental Health", "Fitness", "Nutrition"],
  "Finance": ["Banking", "Insurance", "Investments", "Payments", "Crypto"],
  "E-commerce": ["Marketplace", "Niche Retail", "Luxury", "Grocery", "Electronics"],
  "Services": ["Consulting", "Education", "Legal", "Real Estate", "Travel"],
  "Custom": ["Custom"],
};

export const OUTPUT_MODULES = [
  { id: "brand_strategy", label: "Brand Strategy", description: "Purpose, values, positioning, messaging hierarchy" },
  { id: "competition_scan", label: "Competition Scan", description: "Competitor analysis and white space mapping" },
  { id: "brand_audit", label: "Brand Audit", description: "Review of brand's social presence — requires social PDFs" },
  { id: "positioning", label: "Positioning", description: "Market positioning and messaging territories" },
  { id: "social_media", label: "Social Media", description: "Social analysis for brand + competitors — requires PDFs" },
  { id: "seo_audit", label: "SEO Audit", description: "Keyword landscape and content gap analysis" },
  { id: "launch_plan", label: "Launch Plan", description: "Phased launch roadmap and channel strategy" },
  { id: "content_strategy", label: "Content Strategy", description: "Buckets, tone, and key messaging — requires review" },
];
