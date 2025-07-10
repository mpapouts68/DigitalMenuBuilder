import type { Category } from "@shared/schema";

interface SimpleCategoryButtonsProps {
  categories: Category[];
  activeCategory: number | "all";
  onCategoryChange: (categoryId: number | "all") => void;
}

export function SimpleCategoryButtons({ categories, activeCategory, onCategoryChange }: SimpleCategoryButtonsProps) {
  const buttonStyle = (isActive: boolean) => ({
    padding: '12px 20px',
    margin: '0 6px',
    borderRadius: '25px',
    border: isActive ? 'none' : '2px solid black',
    backgroundColor: isActive ? '#2563eb' : 'white',
    color: isActive ? 'white' : 'black',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      padding: '0 0 12px 0',
      gap: '0'
    }}>
      <button
        onClick={() => onCategoryChange("all")}
        style={buttonStyle(activeCategory === "all")}
      >
        All Items
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          style={buttonStyle(activeCategory === category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}