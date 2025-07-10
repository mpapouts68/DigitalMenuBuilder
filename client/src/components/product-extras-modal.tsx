import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  { id: 'extra', label: 'Extra', selected: false },
  { id: 'without', label: 'Without', selected: false },
  { id: 'alot', label: 'A Lot', selected: false },
  { id: 'alittle', label: 'A Little', selected: false },
  { id: 'only', label: 'Only', selected: false },
];

const getPrefixColors = (prefixId: string, selected: boolean) => {
  const colors = {
    extra: selected 
      ? "bg-purple-900/30 border-purple-500 ring-2 ring-purple-400/50 text-purple-200" 
      : "bg-purple-900/10 border-purple-600 text-purple-300 hover:bg-purple-900/20",
    without: selected 
      ? "bg-red-900/30 border-red-500 ring-2 ring-red-400/50 text-red-200" 
      : "bg-red-900/10 border-red-600 text-red-300 hover:bg-red-900/20",
    alot: selected 
      ? "bg-green-900/30 border-green-500 ring-2 ring-green-400/50 text-green-200" 
      : "bg-green-900/10 border-green-600 text-green-300 hover:bg-green-900/20",
    alittle: selected 
      ? "bg-yellow-900/30 border-yellow-500 ring-2 ring-yellow-400/50 text-yellow-200" 
      : "bg-yellow-900/10 border-yellow-600 text-yellow-300 hover:bg-yellow-900/20",
    only: selected 
      ? "bg-orange-900/30 border-orange-500 ring-2 ring-orange-400/50 text-orange-200" 
      : "bg-orange-900/10 border-orange-600 text-orange-300 hover:bg-orange-900/20",
  };
  return colors[prefixId as keyof typeof colors] || (selected 
    ? "bg-blue-900/30 border-blue-500 ring-2 ring-blue-400/50 text-blue-200" 
    : "bg-blue-900/10 border-blue-600 text-blue-300 hover:bg-blue-900/20");
};

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
  const [finalCombinations, setFinalCombinations] = useState<Array<{id: string, text: string, price: string}>>([]);
  const [comment, setComment] = useState('');
  const [servingCourse, setServingCourse] = useState('main');

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
    const extra = extras.find(e => e.productId === extraId);
    const selectedPrefix = prefixes.find(p => p.selected);
    
    if (extra && !extra.selected) {
      // Add combination to final list
      const prefixText = selectedPrefix ? selectedPrefix.label : '';
      const combinationText = prefixText ? `${prefixText} ${extra.description}` : extra.description;
      const newCombination = {
        id: `${Date.now()}-${extraId}`,
        text: combinationText,
        price: extra.price
      };
      
      setFinalCombinations(prev => [...prev, newCombination]);
      
      // Reset all selections
      setExtras(prev => prev.map(e => ({ ...e, selected: false })));
      setPrefixes(PREFIXES.map(p => ({ ...p, selected: false })));
    } else if (extra && extra.selected) {
      // Just deselect if already selected
      setExtras(prev => 
        prev.map(e => 
          e.productId === extraId 
            ? { ...e, selected: false }
            : e
        )
      );
    }
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
    const extrasTotal = finalCombinations
      .reduce((sum, combination) => sum + parseFloat(combination.price), 0);
    return ((basePrice + extrasTotal) * quantity).toFixed(2);
  };

  const getCurrentItemPrice = () => {
    const basePrice = parseFloat(product?.price || '0');
    const extrasTotal = finalCombinations
      .reduce((sum, combination) => sum + parseFloat(combination.price), 0);
    return (basePrice + extrasTotal).toFixed(2);
  };

  const removeCombination = (combinationId: string) => {
    setFinalCombinations(prev => prev.filter(combo => combo.id !== combinationId));
  };

  const handleAddToOrder = () => {
    if (!product) return;
    
    // Convert final combinations back to the expected format for compatibility
    const combinationExtras = finalCombinations.map(combo => ({
      productId: parseInt(combo.id.split('-')[1]),
      description: combo.text,
      price: combo.price,
      selected: true,
      source: 'item' as const
    }));
    
    onAddToOrder(product, combinationExtras, []);
    
    // Reset state
    setQuantity(1);
    setExtras(prev => prev.map(extra => ({ ...extra, selected: false })));
    setPrefixes(PREFIXES.map(p => ({ ...p, selected: false })));
    setFinalCombinations([]);
    setComment('');
    setServingCourse('main');
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
        {product && (
          <div className="space-y-4">
            {/* Product Info with Quantity Controls */}
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h3 className="text-lg font-semibold text-gray-100">{product.description}</h3>
                    {product.description2 && (
                      <p className="text-sm text-gray-400">{product.description2}</p>
                    )}
                    
                    {/* Final Combinations Tree */}
                    <div className="mt-3 space-y-1">
                      {finalCombinations.map(combination => (
                        <div key={combination.id} className="ml-4 text-sm text-green-300 flex items-center group cursor-pointer hover:text-green-200" onClick={() => removeCombination(combination.id)}>
                          <span className="text-gray-500 mr-2">├─</span>
                          <span>{combination.text}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {parseFloat(combination.price) === 0 ? '(Free)' : `(+€${combination.price})`}
                          </span>
                          <X className="w-3 h-3 ml-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                      {comment && (
                        <div className="ml-4 text-sm text-yellow-300 flex items-center">
                          <span className="text-gray-500 mr-2">├─</span>
                          <span>Note: {comment}</span>
                        </div>
                      )}
                      {servingCourse !== 'main' && (
                        <div className="ml-4 text-sm text-blue-300 flex items-center">
                          <span className="text-gray-500 mr-2">├─</span>
                          <span>Serve with: {servingCourse.charAt(0).toUpperCase() + servingCourse.slice(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Side: Quantity and Clear */}
                  <div className="flex flex-col items-end space-y-2">
                    {/* Price and Course on same row */}
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className={`${finalCombinations.length > 0 ? 'text-yellow-300 border-yellow-600' : 'text-green-300 border-green-600'}`}>
                        €{getCurrentItemPrice()}
                      </Badge>
                      <Select value={servingCourse} onValueChange={setServingCourse}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100 text-xs h-8 w-32">
                          <SelectValue placeholder="Course" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="main" className="text-gray-100 text-xs">Main</SelectItem>
                          <SelectItem value="starter" className="text-gray-100 text-xs">Starter</SelectItem>
                          <SelectItem value="dessert" className="text-gray-100 text-xs">Dessert</SelectItem>
                          <SelectItem value="appetizer" className="text-gray-100 text-xs">Appetizer</SelectItem>
                          <SelectItem value="side" className="text-gray-100 text-xs">Side</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Compact Quantity Selector */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 w-8 h-8 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-lg font-bold text-gray-100 min-w-[2rem] text-center">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(quantity + 1)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 w-8 h-8 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Clear All Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExtras(prev => prev.map(extra => ({ ...extra, selected: false })));
                        setPrefixes(prev => prev.map(prefix => ({ ...prefix, selected: false })));
                        setFinalCombinations([]);
                        setComment('');
                        setServingCourse('main');
                      }}
                      className="bg-red-900/20 border-red-600 text-red-300 hover:bg-red-900/30 hover:text-red-200 px-2 py-1 h-8 text-xs w-32"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prefixes - Rectangle Container */}
            <div className="border-2 border-gray-600 rounded-lg p-4 bg-gray-900/50">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {prefixes.map((prefix) => (
                  <Card 
                    key={prefix.id}
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      getPrefixColors(prefix.id, prefix.selected)
                    )}
                    onClick={() => togglePrefix(prefix.id)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          prefix.selected 
                            ? "border-white bg-white" 
                            : "border-gray-400"
                        )}>
                          {prefix.selected && (
                            <div className="w-2 h-2 rounded-full bg-gray-800"></div>
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

            {/* Comment Section */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add special instructions or comments..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-400 resize-none h-20"
                maxLength={200}
              />
              <div className="text-xs text-gray-400 text-right">
                {comment.length}/200 characters
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="border-t border-gray-700 pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-100">Total:</span>
                <span className="text-xl font-bold text-green-300">€{calculateTotal()}</span>
              </div>
              

            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}