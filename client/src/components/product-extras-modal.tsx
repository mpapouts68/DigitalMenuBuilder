import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Plus, Minus, Check, X } from 'lucide-react';

interface Product {
  productId: number;
  description: string;
  description2?: string;
  price: string;
  productGroupId?: number;
  productType?: string;
}

interface ProductExtrasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onAddToOrder: (product: Product, extras: ProductExtra[], prefixes: PrefixOption[]) => void;
}

interface ProductExtra {
  productId: number;
  description: string;
  price: string;
  selected: boolean;
  source: 'root' | 'category' | 'item';
}

interface PrefixOption {
  id: string;
  label: string;
  selected: boolean;
}

const PREFIXES: PrefixOption[] = [
  { id: 'without', label: 'Without', selected: false },
  { id: 'alot', label: 'A Lot', selected: false },
  { id: 'alittle', label: 'A Little', selected: false },
  { id: 'only', label: 'Only', selected: false },
];

export function ProductExtrasModal({ 
  open, 
  onOpenChange, 
  product, 
  onAddToOrder 
}: ProductExtrasModalProps) {
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [prefixes, setPrefixes] = useState<PrefixOption[]>(PREFIXES);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product && open) {
      loadExtras();
    }
  }, [product, open]);

  const loadExtras = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      // Simulate loading extras from the 3 sources as per VBA code:
      // 1. Root level (Food/Drinks based on drinkOrFood property)
      // 2. Category level (based on productGroupId)  
      // 3. Item level (specific to this product)
      
      const mockExtras: ProductExtra[] = [
        // Root level extras
        { productId: 51, description: 'Extra Cheese', price: '1.50', selected: false, source: 'root' },
        { productId: 52, description: 'Extra Sauce', price: '0.50', selected: false, source: 'root' },
        
        // Category level extras
        { productId: 55, description: 'Extra Shot', price: '1.00', selected: false, source: 'category' },
        { productId: 56, description: 'Decaf Option', price: '0.00', selected: false, source: 'category' },
        
        // Item level extras
        { productId: 59, description: 'Extra Dressing', price: '0.50', selected: false, source: 'item' },
        { productId: 60, description: 'No Onions', price: '0.00', selected: false, source: 'item' },
      ];
      
      setExtras(mockExtras);
    } catch (error) {
      console.error('Error loading extras:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExtra = (extraId: number) => {
    setExtras(prev => 
      prev.map(extra => 
        extra.productId === extraId 
          ? { ...extra, selected: !extra.selected }
          : extra
      )
    );
  };

  const togglePrefix = (prefixId: string) => {
    setPrefixes(prev => 
      prev.map(prefix => ({
        ...prefix,
        selected: prefix.id === prefixId ? !prefix.selected : false
      }))
    );
  };

  const calculateTotal = () => {
    const basePrice = parseFloat(product?.price || '0');
    const extrasTotal = extras
      .filter(extra => extra.selected)
      .reduce((sum, extra) => sum + parseFloat(extra.price), 0);
    return ((basePrice + extrasTotal) * quantity).toFixed(2);
  };

  const handleAddToOrder = () => {
    if (!product) return;
    
    const selectedExtras = extras.filter(extra => extra.selected);
    const selectedPrefix = prefixes.find(prefix => prefix.selected);
    
    onAddToOrder(product, selectedExtras, selectedPrefix ? [selectedPrefix] : []);
    
    // Reset state
    setQuantity(1);
    setExtras(prev => prev.map(extra => ({ ...extra, selected: false })));
    setPrefixes(PREFIXES.map(p => ({ ...p, selected: false })));
    onOpenChange(false);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'root': return 'bg-blue-800/20 text-blue-300 border-blue-600';
      case 'category': return 'bg-green-800/20 text-green-300 border-green-600';
      case 'item': return 'bg-purple-800/20 text-purple-300 border-purple-600';
      default: return 'bg-gray-800/20 text-gray-300 border-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">
            {product?.description} - Options & Extras
          </DialogTitle>
        </DialogHeader>

        {product && (
          <div className="space-y-6">
            {/* Product Info */}
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-100">{product.description}</h3>
                    {product.description2 && (
                      <p className="text-sm text-gray-400">{product.description2}</p>
                    )}
                    
                    {/* Selected Options Tree */}
                    <div className="mt-3 space-y-1">
                      {prefixes.filter(p => p.selected).map(prefix => (
                        <div key={prefix.id} className="ml-4 text-sm text-blue-300 flex items-center">
                          <span className="text-gray-500 mr-2">├─</span>
                          <span>Extra {prefix.label}</span>
                        </div>
                      ))}
                      {extras.filter(e => e.selected).map(extra => (
                        <div key={extra.productId} className="ml-4 text-sm text-green-300 flex items-center">
                          <span className="text-gray-500 mr-2">├─</span>
                          <span>{extra.description}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {parseFloat(extra.price) === 0 ? '(Free)' : `(+€${extra.price})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-300 border-green-600">
                    €{product.price}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quantity Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-bold text-gray-100 min-w-12 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Prefixes - Radio Button Style */}
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {prefixes.map((prefix) => (
                  <Card 
                    key={prefix.id}
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      prefix.selected 
                        ? "bg-blue-900/20 border-blue-600 ring-2 ring-blue-500/50" 
                        : "bg-gray-900 border-gray-700 hover:border-gray-600"
                    )}
                    onClick={() => togglePrefix(prefix.id)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          prefix.selected 
                            ? "border-blue-500 bg-blue-500" 
                            : "border-gray-400"
                        )}>
                          {prefix.selected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-100">
                          {prefix.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading extras...</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {extras.map((extra) => (
                    <Card 
                      key={extra.productId}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        extra.selected 
                          ? "bg-green-900/20 border-green-600" 
                          : "bg-gray-900 border-gray-700 hover:border-gray-600"
                      )}
                      onClick={() => toggleExtra(extra.productId)}
                    >
                      <CardContent className="p-2">
                        <div className="text-center space-y-1">
                          <div className="flex justify-center">
                            <Checkbox checked={extra.selected} onChange={() => {}} />
                          </div>
                          <h3 className="text-xs font-medium text-gray-100 truncate">
                            {extra.description}
                          </h3>
                          <Badge variant="outline" className="text-green-300 border-green-600 text-xs">
                            {parseFloat(extra.price) === 0 ? 'Free' : `€${extra.price}`}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Summary & Actions */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-100">Total:</span>
                <span className="text-xl font-bold text-green-300">€{calculateTotal()}</span>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddToOrder}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add to Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}