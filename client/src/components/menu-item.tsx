import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface MenuItemProps {
  product: Product;
  isAdminMode: boolean;
  onEdit: () => void;
}

export function MenuItem({ product, isAdminMode, onEdit }: MenuItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Item deleted",
        description: "The menu item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteProductMutation.mutate(product.id);
    }
  };

  return (
    <div className="menu-item bg-white rounded-lg p-4 shadow-sm border border-slate-200 relative hover:shadow-md transition-all duration-200">
      {isAdminMode && (
        <div className="absolute top-2 right-2 flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-800"
            onClick={onEdit}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-800"
            onClick={handleDelete}
            disabled={deleteProductMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className={`flex justify-between items-start ${isAdminMode ? 'pr-12' : ''}`}>
        <div className="flex-1">
          <h3 className="font-medium text-slate-800">{product.name}</h3>
          <p className="text-sm text-slate-600 mt-1">{product.description}</p>
        </div>
        <span className="text-lg font-semibold text-blue-600 ml-4">
          ${parseFloat(product.price).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
