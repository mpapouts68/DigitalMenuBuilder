import { Button } from "@/components/ui/button";
import type { Category } from "@shared/schema";

interface CategoryPillsProps {
  categories: Category[];
  activeCategory: number | "all";
  onCategoryChange: (categoryId: number | "all") => void;
}

export function CategoryPills({ categories, activeCategory, onCategoryChange }: CategoryPillsProps) {
  return (
    <div className="w-full overflow-x-auto">
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
  );
}
