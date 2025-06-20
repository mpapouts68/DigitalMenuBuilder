import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Edit } from "lucide-react";
import type { Product, Category } from "@shared/schema";

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  category: Category | undefined;
  isAdminMode: boolean;
  onEdit: () => void;
}

export function ProductDetailsModal({ 
  open, 
  onOpenChange, 
  product, 
  category,
  isAdminMode,
  onEdit 
}: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg mx-4">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
            {isAdminMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription>
            View detailed information about {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Badge */}
          {category && (
            <Badge variant="secondary" className="w-fit">
              {category.name}
            </Badge>
          )}

          {/* Image */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No image available</p>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-center">
            <span className="text-3xl font-bold text-blue-600">
              €{parseFloat(product.price).toFixed(2)}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Description</h4>
            <p className="text-slate-600">{product.description}</p>
          </div>

          {/* Details */}
          {product.details && (
            <div>
              <h4 className="font-medium text-slate-800 mb-2">Details</h4>
              <p className="text-slate-600 whitespace-pre-wrap">{product.details}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}