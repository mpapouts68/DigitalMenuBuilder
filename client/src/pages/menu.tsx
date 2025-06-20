import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuHeader } from "@/components/menu-header";
import { CategoryPills } from "@/components/category-pills";
import { AdminControls } from "@/components/admin-controls";
import { MenuSection } from "@/components/menu-section";
import { AdvertisementBanner } from "@/components/advertisement-banner";
import { AddItemModal } from "@/components/add-item-modal";
import { AddCategoryModal } from "@/components/add-category-modal";
import { ImportModal } from "@/components/import-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import type { Category, Product } from "@shared/schema";

export default function Menu() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState<number | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered products by category
  const groupedProducts = categories.reduce((acc, category) => {
    acc[category.id] = filteredProducts.filter(product => product.categoryId === category.id);
    return acc;
  }, {} as Record<number, Product[]>);

  const handleEditItem = (item: Product) => {
    setEditingItem(item);
    setShowAddItemModal(true);
  };

  const handleAddItemToCategory = (categoryId: number) => {
    setSelectedCategoryForNewItem(categoryId);
    setEditingItem(null);
    setShowAddItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowAddItemModal(false);
    setEditingItem(null);
    setSelectedCategoryForNewItem(null);
  };

  // Set page title
  useEffect(() => {
    document.title = "Bella Vista Café - Digital Menu";
  }, []);

  if (categoriesLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded mb-2"></div>
                <div className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="h-16 bg-slate-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <MenuHeader 
        isAdminMode={isAdminMode} 
        onAdminModeChange={setIsAdminMode}
      />

      <AdvertisementBanner className="max-w-md mx-auto my-4 h-20" />

      {/* Search and Filter */}
      <div className="max-w-md mx-auto px-4 mb-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        </div>
        
        <CategoryPills
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {isAdminMode && (
        <AdminControls
          onAddCategory={() => setShowAddCategoryModal(true)}
          onImportData={() => setShowImportModal(true)}
        />
      )}

      {/* Menu Content */}
      <main className="max-w-md mx-auto px-4 pb-8">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-3xl mb-4">🍽️</div>
            <p className="text-lg">No menu categories found</p>
            {isAdminMode && (
              <Button 
                onClick={() => setShowAddCategoryModal(true)}
                className="mt-4"
              >
                Add First Category
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(category => {
              const categoryProducts = groupedProducts[category.id] || [];
              
              // Show category if it has products or if in admin mode
              if (categoryProducts.length === 0 && !isAdminMode) return null;

              return (
                <MenuSection
                  key={category.id}
                  category={category}
                  products={categoryProducts}
                  isAdminMode={isAdminMode}
                  onEditItem={handleEditItem}
                  onAddItem={() => handleAddItemToCategory(category.id)}
                />
              );
            })}
          </div>
        )}

        {/* No results message */}
        {categories.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg">No items found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        )}
      </main>

      <AdvertisementBanner className="max-w-md mx-auto my-6 h-16" type="promotional" />

      {/* Floating Add Button (Admin Mode) */}
      {isAdminMode && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-all"
          onClick={() => {
            setEditingItem(null);
            setSelectedCategoryForNewItem(null);
            setShowAddItemModal(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Modals */}
      <AddItemModal
        open={showAddItemModal}
        onOpenChange={handleCloseItemModal}
        editingItem={editingItem}
        categories={categories}
        selectedCategoryId={selectedCategoryForNewItem}
      />

      <AddCategoryModal
        open={showAddCategoryModal}
        onOpenChange={setShowAddCategoryModal}
        existingCategories={categories}
      />

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />
    </div>
  );
}
