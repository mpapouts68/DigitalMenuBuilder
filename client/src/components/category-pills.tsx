import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Category } from "@shared/schema";

interface CategoryPillsProps {
  categories: Category[];
  activeCategory: number | "all";
  onCategoryChange: (categoryId: number | "all") => void;
}

export function CategoryPills({ categories, activeCategory, onCategoryChange }: CategoryPillsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
      <button
        onClick={() => onCategoryChange("all")}
        className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
          activeCategory === "all"
            ? "bg-red-600 text-white shadow-red-200 transform scale-105"
            : "bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md border border-slate-200 active:scale-95"
        }`}
      >
        All Items
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
            activeCategory === category.id
              ? "bg-red-600 text-white shadow-red-200 transform scale-105"
              : "bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md border border-slate-200 active:scale-95"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
