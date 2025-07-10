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
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Force text color after render
  useEffect(() => {
    const forceTextColor = () => {
      if (containerRef.current) {
        const buttons = containerRef.current.querySelectorAll('button');
        buttons.forEach((button) => {
          const isActive = button.classList.contains('bg-blue-600');
          if (!isActive) {
            // Force all possible style properties
            button.style.setProperty('background-color', '#ffffff', 'important');
            button.style.setProperty('color', '#000000', 'important');
            button.style.setProperty('border', '2px solid #000000', 'important');
            button.style.setProperty('opacity', '1', 'important');
            button.style.setProperty('visibility', 'visible', 'important');
            button.style.setProperty('display', 'inline-block', 'important');
            button.style.setProperty('font-weight', 'bold', 'important');
            button.style.setProperty('font-size', '14px', 'important');
            
            // Also force text content color
            const textNodes = button.childNodes;
            textNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
                node.parentElement.style.setProperty('color', '#000000', 'important');
              }
            });
          }
        });
      }
    };
    
    // Run multiple times to ensure it takes
    const timer1 = setTimeout(forceTextColor, 10);
    const timer2 = setTimeout(forceTextColor, 100);
    const timer3 = setTimeout(forceTextColor, 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activeCategory, categories]);

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
      <div ref={containerRef} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        <button
          onClick={() => onCategoryChange("all")}
          className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
            activeCategory === "all"
              ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
              : ""
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
                ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                : ""
            }`}
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
        <div ref={containerRef} className="flex space-x-3 pb-3 px-1 min-w-max">
          <button
            onClick={() => onCategoryChange("all")}
            className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
              activeCategory === "all"
                ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                : ""
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
                  ? "bg-blue-600 text-white shadow-blue-200 transform scale-105"
                  : ""
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
