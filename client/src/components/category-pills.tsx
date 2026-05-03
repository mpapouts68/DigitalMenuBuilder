import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Category } from "@shared/schema";

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
      <div className="flex justify-start gap-3 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onCategoryChange("all")}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
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
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
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

  return (
    <div className="relative flex w-full min-w-0 justify-start">
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
        className="w-full overflow-x-auto pl-0 pr-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex min-w-max justify-start gap-3 pb-1">
          <button
            onClick={() => onCategoryChange("all")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
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
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
                activeCategory === category.id
                  ? "bg-red-600 text-white shadow-red-200 transform scale-105"
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md border border-slate-200 active:scale-95"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
