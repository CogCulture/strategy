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
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  const isCustomCategory = category === "Custom" || (category !== "" && !CATEGORIES[category]);
  const categorySelectValue = category === "" ? "" : isCustomCategory ? "Custom" : category;

  const subCategories = isCustomCategory ? ["Custom"] : (CATEGORIES[category] || []);
  const isCustomSubCategory = subCategory === "Custom" || (subCategory !== "" && !subCategories.includes(subCategory));
  const subCategorySelectValue = subCategory === "" ? "" : isCustomSubCategory ? "Custom" : subCategory;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        {isCustomCategory ? (
          <div className="flex gap-2">
            <Input
              id="category"
              placeholder="Enter custom category"
              value={category === "Custom" ? "" : category}
              onChange={(e) => onCategoryChange(e.target.value || "Custom")}
              className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => { onCategoryChange(""); onSubCategoryChange(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Select value={categorySelectValue} onValueChange={(val) => {
            if (val) onCategoryChange(val);
            // If they picked "Custom" for category, subcategory should reset
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
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub_category" className="text-sm font-medium">
          Sub-Category <span className="text-destructive">*</span>
        </Label>
        {isCustomSubCategory ? (
          <div className="flex gap-2">
            <Input
              id="sub_category"
              placeholder="Enter custom sub-category"
              value={subCategory === "Custom" ? "" : subCategory}
              onChange={(e) => onSubCategoryChange(e.target.value || "Custom")}
              className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background flex-1"
            />
            {!isCustomCategory && (
              <Button type="button" variant="outline" size="icon" onClick={() => onSubCategoryChange("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <Select value={subCategorySelectValue} onValueChange={(val) => { if (val) onSubCategoryChange(val); }} disabled={!category}>
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
