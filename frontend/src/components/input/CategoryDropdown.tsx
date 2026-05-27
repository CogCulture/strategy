"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/constants";

interface CategoryDropdownProps {
  category: string;
  subCategory: string;
  onCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
}

export function CategoryDropdown({
  category,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
}: CategoryDropdownProps) {
  const subCategories = category ? CATEGORIES[category] || [] : [];
  const isCustom = category === "Custom" && subCategory === "Custom";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select value={category} onValueChange={(val) => {
          if (val) onCategoryChange(val);
          onSubCategoryChange("");
        }}>
          <SelectTrigger id="category" className="bg-background border-input hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border shadow-md">
            {Object.keys(CATEGORIES).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub_category" className="text-sm font-medium">
          Sub-Category <span className="text-destructive">*</span>
        </Label>
        {isCustom ? (
          <Input
            id="sub_category"
            placeholder="Enter custom sub-category"
            value={subCategory === "Custom" ? "" : subCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background"
          />
        ) : (
          <Select value={subCategory} onValueChange={(val) => { if (val) onSubCategoryChange(val); }} disabled={!category}>
            <SelectTrigger id="sub_category" className="bg-background border-input hover:border-primary/50 transition-colors">
              <SelectValue placeholder={category ? "Select sub-category" : "Select category first"} />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              {subCategories.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
