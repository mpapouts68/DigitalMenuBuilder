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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full">
      {/* Left scroll button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
        onClick={scrollLeft}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Right scroll button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
        onClick={scrollRight}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Scrollable categories */}
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto px-8 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex space-x-2 mt-3 pb-2 px-1 min-w-max">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full whitespace-nowrap flex-shrink-0"
            onClick={() => onCategoryChange("all")}
          >
            All Items
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap flex-shrink-0"
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
