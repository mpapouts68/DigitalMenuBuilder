import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Category } from "@shared/schema";
import { DebugCategoryButton } from "./debug-category-button";

interface CategoryPillsProps {
  categories: Category[];
  activeCategory: number | "all";
  onCategoryChange: (categoryId: number | "all") => void;
}

export function CategoryPills({ categories, activeCategory, onCategoryChange }: CategoryPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(checkScrollability, 100);
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        clearTimeout(timeoutId);
        scrollElement.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
    return () => clearTimeout(timeoutId);
  }, [categories]);

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

  if (isMobile) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        <button
          onClick={() => onCategoryChange("all")}
          className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
            activeCategory === "all"
              ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
              : "bg-white border border-gray-400"
          }`}
          style={{ color: activeCategory === "all" ? "white" : "#000000" }}
        >
          All Items
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
              activeCategory === category.id
                ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                : "bg-white border border-gray-400"
            }`}
            style={{ color: activeCategory === category.id ? "white" : "#000000" }}
          >
            {category.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Left scroll button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm rounded-full"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Right scroll button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm rounded-full"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable categories */}
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto px-8 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex space-x-3 pb-3 px-1 min-w-max">
          <button
            onClick={() => onCategoryChange("all")}
            className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
              activeCategory === "all"
                ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                : "bg-white border border-gray-400"
            }`}
            style={{ color: activeCategory === "all" ? "white" : "#000000" }}
          >
            All Items
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
                activeCategory === category.id
                  ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                  : "bg-white border border-gray-400"
              }`}
              style={{ color: activeCategory === category.id ? "white" : "#000000" }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
