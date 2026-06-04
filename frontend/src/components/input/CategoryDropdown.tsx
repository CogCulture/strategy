"use client";

import { useState } from "react";
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
  const [isEditingCat, setIsEditingCat] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);

  // A category is considered a 'Custom Option' if it's not in the predefined list and not empty
  const isCustomOptionCat = category !== "" && !CATEGORIES[category];
  
  // For subcategories, we need the base category array.
  // If the category itself is custom, there are no predefined subcategories, so we just use an empty array.
  const predefinedSubs = CATEGORIES[category] || [];
  
  // A sub-category is considered a 'Custom Option' if it's not in the predefined list for the current category and not empty
  const isCustomOptionSub = subCategory !== "" && !predefinedSubs.includes(subCategory);

  const handleCatChange = (val: string) => {
    if (val === "Custom") {
      setIsEditingCat(true);
      onCategoryChange(""); // Start with empty input
      onSubCategoryChange("");
    } else {
      setIsEditingCat(false);
      onCategoryChange(val);
      onSubCategoryChange("");
    }
  };

  const handleSubChange = (val: string) => {
    if (val === "Custom") {
      setIsEditingSub(true);
      onSubCategoryChange("");
    } else {
      setIsEditingSub(false);
      onSubCategoryChange(val);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        {isEditingCat ? (
          <div className="flex gap-2">
            <Input
              id="category"
              autoFocus
              placeholder="Type and press Enter..."
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (category.trim()) setIsEditingCat(false);
                }
              }}
              className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => { setIsEditingCat(false); onCategoryChange(""); onSubCategoryChange(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Select value={category} onValueChange={handleCatChange}>
            <SelectTrigger id="category" className="bg-background border-input hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              {Object.keys(CATEGORIES).filter(cat => cat !== "Custom").map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              {isCustomOptionCat && (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              )}
              <SelectItem value="Custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub_category" className="text-sm font-medium">
          Sub-Category <span className="text-destructive">*</span>
        </Label>
        {isEditingSub ? (
          <div className="flex gap-2">
            <Input
              id="sub_category"
              autoFocus
              placeholder="Type and press Enter..."
              value={subCategory}
              onChange={(e) => onSubCategoryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (subCategory.trim()) setIsEditingSub(false);
                }
              }}
              className="border-input hover:border-primary/50 focus:border-primary transition-colors bg-background flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => { setIsEditingSub(false); onSubCategoryChange(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Select value={subCategory} onValueChange={handleSubChange} disabled={!category}>
            <SelectTrigger id="sub_category" className="bg-background border-input hover:border-primary/50 transition-colors">
              <SelectValue placeholder={category ? "Select sub-category" : "Select category first"} />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              {predefinedSubs.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
              {isCustomOptionSub && (
                <SelectItem key={subCategory} value={subCategory}>{subCategory}</SelectItem>
              )}
              <SelectItem value="Custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
