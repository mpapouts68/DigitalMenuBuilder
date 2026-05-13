import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, ImageIcon, Minus, Plus, Settings2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface MenuItemProps {
  product: Product;
  isAdminMode: boolean;
  /** Sum of cart line quantities for this product (0 = not in order). */
  cartQuantity: number;
  onEdit: () => void;
  onViewDetails: () => void;
  /** Opens customizer; quantity is initial line qty (typically 1). */
  onAddToOrder: (quantity: number) => void;
  onDecrementCartForProduct: (productId: number) => void;
  onEditModifiers: () => void;
}

export function MenuItem({
  product,
  isAdminMode,
  cartQuantity,
  onEdit,
  onViewDetails,
  onAddToOrder,
  onDecrementCartForProduct,
  onEditModifiers,
}: MenuItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasDiscount =
    Number(product.isSpecialOffer ?? 0) === 1 &&
    Math.max(0, Math.min(100, Math.round(Number(product.specialOfferDiscountPercent ?? 0)))) > 0;
  const effectiveDisplayPrice = (() => {
    const rawPrice = Number(product.price ?? 0);
    const isSpecial = Number(product.isSpecialOffer ?? 0) === 1;
    const rawDiscount = Number(product.specialOfferDiscountPercent ?? 0);
    const discountPercent = isSpecial ? Math.max(0, Math.min(100, Math.round(rawDiscount))) : 0;
    const discounted = rawPrice * (1 - discountPercent / 100);
    return Math.round(discounted * 100) / 100;
  })();

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
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
      <CardContent className="p-[21px]">
        <div className="flex items-stretch gap-4">
          {/* Image Section */}
          <div className="flex flex-shrink-0 flex-col items-start">
            {product.imageUrl ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-sm">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
            )}
            {(product.isSpecialOffer === 1 || product.isTopSelling === 1) && (
              <div className="mt-auto flex flex-col gap-1 pt-2">
                {product.isSpecialOffer === 1 && (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 border border-amber-200">
                      Special Offer
                    </span>
                    {Number(product.specialOfferDiscountPercent ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 border border-rose-200">
                        -{Math.round(Number(product.specialOfferDiscountPercent))}%
                      </span>
                    )}
                  </div>
                )}
                {product.isTopSelling === 1 && (
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 border border-violet-200">
                    Top Selling
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 text-base leading-tight pr-1 min-w-0">
                {product.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {hasDiscount && (
                  <span className="text-[11px] text-slate-500 line-through tabular-nums">
                    €{Number(product.price ?? 0).toFixed(2)}
                  </span>
                )}
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-800 border border-red-200/80 font-semibold text-xs tabular-nums px-2 py-0.5 leading-none rounded-full h-6 min-h-0 inline-flex items-center"
                >
                  €{effectiveDisplayPrice.toFixed(2)}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-2">
              {product.description}
            </p>
            
            {isAdminMode ? (
              <div className="flex gap-2 pt-2 border-t border-slate-100 flex-wrap">
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
                    onEditModifiers();
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Settings2 className="h-4 w-4 mr-1" />
                  Modifiers
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
            ) : (
              <div className="pt-1 border-t border-slate-100 flex items-center justify-end">
                  {cartQuantity <= 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg border border-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToOrder(1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : Number((product as { disableQuantityControl?: number }).disableQuantityControl ?? 0) === 1 ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1">
                      <div className="min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-semibold">
                        {cartQuantity}
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDecrementCartForProduct(product.id);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-semibold">
                        {cartQuantity}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToOrder(1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
