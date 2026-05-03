import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/menu-item";
import { Edit, Trash2, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Product } from "@shared/schema";

interface MenuSectionProps {
  category: Category;
  products: Product[];
  isAdminMode: boolean;
  isDeleteMode: boolean;
  cartQuantityForProduct: (productId: number) => number;
  onEditItem: (item: Product) => void;
  onViewProduct: (item: Product) => void;
  onAddProductToOrder: (item: Product, quantity: number) => void;
  onDecrementCartForProduct: (productId: number) => void;
  onEditProductModifiers: (item: Product) => void;
  onAddItem: () => void;
}

export function MenuSection({ 
  category, 
  products, 
  isAdminMode, 
  isDeleteMode,
  cartQuantityForProduct,
  onEditItem,
  onViewProduct,
  onAddProductToOrder,
  onDecrementCartForProduct,
  onEditProductModifiers,
  onAddItem 
}: MenuSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Category deleted",
        description: "The category and all its items have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string }) => {
      await apiRequest("PUT", `/api/categories/${payload.id}`, { name: payload.name.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category updated",
        description: "The category name was updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCategory = () => {
    if (confirm("Are you sure you want to delete this category and all its items?")) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleEditCategory = () => {
    const nextName = window.prompt("Rename category", category.name)?.trim();
    if (!nextName || nextName === category.name) {
      return;
    }
    updateCategoryMutation.mutate({ id: category.id, name: nextName });
  };

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-slate-800">{category.name}</h2>
        {isAdminMode && (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-800"
              onClick={handleEditCategory}
              disabled={updateCategoryMutation.isPending}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-800"
              onClick={handleDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {products.map(product => (
          <MenuItem
            key={product.id}
            product={product}
            isAdminMode={isAdminMode}
            isDeleteMode={isDeleteMode}
            cartQuantity={cartQuantityForProduct(product.id)}
            onEdit={() => onEditItem(product)}
            onViewDetails={() => onViewProduct(product)}
            onAddToOrder={(quantity) => onAddProductToOrder(product, quantity)}
            onDecrementCartForProduct={onDecrementCartForProduct}
            onEditModifiers={() => onEditProductModifiers(product)}
          />
        ))}
        
        {products.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-2xl mb-2">🍽️</div>
            <p>No items in this category</p>
            {isAdminMode && (
              <Button
                variant="ghost"
                onClick={onAddItem}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add first item
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
