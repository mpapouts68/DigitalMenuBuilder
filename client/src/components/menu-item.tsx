import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, ImageIcon, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface MenuItemProps {
  product: Product;
  isAdminMode: boolean;
  isDeleteMode: boolean;
  onEdit: () => void;
  onViewDetails: () => void;
}

export function MenuItem({ product, isAdminMode, isDeleteMode, onEdit, onViewDetails }: MenuItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest(`/api/products/${productId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product deleted",
        description: "Product has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:transform hover:scale-[1.02] bg-white border-0 shadow-sm"
      onClick={onViewDetails}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Image Section */}
          <div className="flex-shrink-0">
            {product.imageUrl ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-sm">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-slate-900 text-base leading-tight pr-2">
                {product.name}
              </h3>
              <Badge 
                variant="secondary" 
                className="bg-red-100 text-red-800 border-red-200 font-semibold text-sm px-3 py-1 rounded-full flex-shrink-0"
              >
                €{product.price}
              </Badge>
            </div>
            
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">
              {product.description}
            </p>
            
            {/* Admin Controls */}
            {isAdminMode && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {isDeleteMode && (
                  <Button
                    onClick={handleDeleteProduct}
                    variant="destructive"
                    size="sm"
                    className="h-9 px-3 rounded-lg"
                    disabled={deleteProductMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails();
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
