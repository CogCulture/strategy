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
  { id: "brand_strategy", label: "Brand Strategy", description: "Purpose, values, positioning, messaging hierarchy", prerequisites: ["brand_name", "category"] },
  { id: "competition_scan", label: "Competition Scan", description: "Competitor analysis and white space mapping", prerequisites: ["competitors"] },
  { id: "brand_audit", label: "Brand Audit", description: "Review of brand's social presence — requires social PDFs", prerequisites: ["social_media_pdfs"] },
  { id: "positioning", label: "Positioning", description: "Market positioning and messaging territories", prerequisites: ["target_audience"] },
  { id: "social_media", label: "Social Media", description: "Social analysis for brand + competitors — requires PDFs", prerequisites: ["social_media_pdfs"] },
  { id: "seo_audit", label: "SEO Audit", description: "Keyword landscape and content gap analysis", prerequisites: ["website_url"] },
  { id: "launch_plan", label: "Launch Plan", description: "Phased launch roadmap and channel strategy", prerequisites: ["target_audience", "competitors"] },
  { id: "content_strategy", label: "Content Strategy", description: "Buckets, tone, and key messaging — requires review", prerequisites: ["target_audience"] },
];

export const B2B_COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

export const B2B_COMPANY_CATEGORIES = [
  "Software / SaaS",
  "Manufacturing",
  "Retail / E-commerce",
  "Healthcare / Medical",
  "Logistics / Supply Chain",
  "Financial Services",
  "Education",
  "Real Estate",
  "Consulting / Professional Services",
  "Media / Entertainment",
  "Other",
];

export const AUDIENCE_AGES = [
  "Under 18",
  "18 - 24",
  "25 - 34",
  "35 - 44",
  "45 - 54",
  "55 - 64",
  "65+",
  "All Age Groups",
];

export const AUDIENCE_GENDERS = ["Male", "Female", "Non-binary", "All Genders"];

export const AUDIENCE_SECS = [
  "SEC A1",
  "SEC A2",
  "SEC B1",
  "SEC B2",
  "SEC C",
  "SEC D/E",
  "Broad / Mass Market",
  "Premium / Luxury",
];

export const INDIA_REGIONS = ["North India", "South India", "East India", "West India", "Central India", "North-East India", "Pan India"];

export const INDIA_STATES: Record<string, string[]> = {
  "North India": ["Delhi", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Punjab", "Rajasthan", "Uttarakhand", "Uttar Pradesh"],
  "South India": ["Andhra Pradesh", "Karnataka", "Kerala", "Tamil Nadu", "Telangana"],
  "East India": ["Bihar", "Jharkhand", "Odisha", "West Bengal"],
  "West India": ["Goa", "Gujarat", "Maharashtra"],
  "Central India": ["Chhattisgarh", "Madhya Pradesh"],
  "North-East India": ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura"],
  "Pan India": ["All States"],
};
