import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ProductExtrasModal } from '@/components/product-extras-modal';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  productId: number;
  description: string;
  description2?: string;
  price: string;
  productGroupId?: number;
  picture?: string;
  menuNumber?: number;
  favorite?: boolean;
}

interface OrderItem {
  orderIdSub: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: string;
  product?: Product;
}

interface Order {
  orderId: number;
  timeDate: string;
  orderTotal: string;
  postId: number;
  items: OrderItem[];
}

export function OrderPage() {
  const { postId } = useParams<{ postId: string }>();
  const [, setLocation] = useLocation();
  const { staff, cacheData } = useAuth();
  const { toast } = useToast();
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [parentCategory, setParentCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const products = cacheData?.products || [];
  const groups = cacheData?.groups || [];
  const tables = cacheData?.tables || [];
  
  // Get parent categories (has_sub = true, is_sub = false)
  const parentCategories = groups.filter(g => g.hasSub && !g.isSub);
  
  // Get subcategories for current parent (is_sub = true, sub_from_group_id = parentCategory)
  const subCategories = parentCategory 
    ? groups.filter(g => g.isSub && g.subFromGroupId === parentCategory)
    : [];
  
  // Get direct categories (has_sub = false, is_sub = false)
  const directCategories = groups.filter(g => !g.hasSub && !g.isSub);
  
  // Current visible categories based on navigation state
  const visibleCategories = parentCategory ? subCategories : [...parentCategories, ...directCategories];
  

  
  const currentTable = tables.find(t => t.postId === parseInt(postId!));
  
  useEffect(() => {
    if (!postId) return;
    
    // Load existing order for this table if any
    // For now, start with empty order
    const newOrder: Order = {
      orderId: Date.now(), // Temporary ID
      timeDate: new Date().toISOString(),
      orderTotal: '0.00',
      postId: parseInt(postId),
      items: []
    };
    setCurrentOrder(newOrder);
  }, [postId]);

  const openExtrasModal = (product: Product) => {
    setSelectedProduct(product);
    setExtrasModalOpen(true);
  };

  const addToOrder = (product: Product, extras: any[] = [], prefixes: any[] = []) => {
    const existingItem = orderItems.find(item => item.productId === product.productId);
    
    if (existingItem) {
      setOrderItems(items => 
        items.map(item => 
          item.productId === product.productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem: OrderItem = {
        orderIdSub: Date.now() + Math.random(),
        orderId: currentOrder?.orderId || 0,
        productId: product.productId,
        quantity: 1,
        price: product.price,
        product
      };
      setOrderItems(items => [...items, newItem]);
    }

    let description = product.description;
    if (extras.length > 0) {
      description += ' with ' + extras.map(e => e.description).join(', ');
    }
    if (prefixes.length > 0) {
      description += ' (' + prefixes.map(p => p.label).join(', ') + ')';
    }

    toast({
      title: "Added to order",
      description: description,
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(items => items.filter(item => item.productId !== productId));
    } else {
      setOrderItems(items => 
        items.map(item => 
          item.productId === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0).toFixed(2);
  };

  const handleCategoryClick = (categoryId: number) => {
    try {
      const category = groups.find(g => g.productGroupId === categoryId);
      console.log('Category clicked:', categoryId, category);
      
      if (category?.hasSub) {
        // This is a parent category, show subcategories
        console.log('Setting parent category:', categoryId);
        setParentCategory(categoryId);
        setSelectedCategory(null);
      } else {
        // This is a subcategory or direct category, show products
        console.log('Setting selected category:', categoryId);
        setSelectedCategory(categoryId);
      }
    } catch (error) {
      console.error('Error in handleCategoryClick:', error);
      toast({
        title: "Category Error",
        description: "Failed to navigate category. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleBackToParent = () => {
    setParentCategory(null);
    setSelectedCategory(null);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.productGroupId === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });



  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/tables')}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-100">
                  {currentTable?.description || `Table ${postId}`}
                </h1>
                <p className="text-sm text-gray-300">Staff: {staff?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                Items: {orderItems.length}
              </Badge>
              <Badge variant="outline" className="text-green-300 border-green-600">
                Total: €{calculateTotal()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Menu */}
          <div className="lg:col-span-2">
            <div className="w-full">

              <div className="mt-4">
                {/* Category Navigation */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {parentCategory ? (
                    <button
                      onClick={handleBackToParent}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '2px solid black',
                        backgroundColor: 'white',
                        color: 'black',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Categories
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setParentCategory(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: (selectedCategory === null && parentCategory === null) ? 'none' : '2px solid black',
                        backgroundColor: (selectedCategory === null && parentCategory === null) ? '#2563eb' : 'white',
                        color: (selectedCategory === null && parentCategory === null) ? 'white' : 'black',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      All Categories
                    </button>
                  )}
                  
                  {visibleCategories.map((group) => (
                    <button
                      key={group.productGroupId}
                      onClick={() => handleCategoryClick(group.productGroupId)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: selectedCategory === group.productGroupId ? 'none' : '2px solid black',
                        backgroundColor: selectedCategory === group.productGroupId ? '#2563eb' : 'white',
                        color: selectedCategory === group.productGroupId ? 'white' : 'black',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {group.description}
                      {group.hasSub && !group.isSub && (
                        <span style={{ fontSize: '12px' }}>→</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.productId}
                      className="bg-gray-800 border-gray-700 relative cursor-pointer"
                      onClick={() => {
                        const checkbox = document.getElementById(`extras-${product.productId}`) as HTMLInputElement;
                        if (checkbox?.checked) {
                          openExtrasModal(product);
                        } else {
                          // Add directly to order with quantity 1
                          addToOrder(product, [], []);
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-100 mb-1 text-sm line-clamp-2">
                            {product.description}
                          </h3>
                          {product.description2 && (
                            <p className="text-xs text-gray-400 mb-1 line-clamp-1">
                              {product.description2}
                            </p>
                          )}
                          <div className="flex justify-center items-center mb-2">
                            <Badge variant="outline" className="text-green-300 border-green-600 text-xs">
                              €{product.price}
                            </Badge>
                          </div>
                          
                          {/* Layout: Checkbox left, Quantity controls right */}
                          <div className="flex items-center justify-between">
                            {/* Left side - Checkbox for extras */}
                            <div className="flex flex-col items-center">
                              <input
                                type="checkbox"
                                id={`extras-${product.productId}`}
                                className="w-3 h-3 mb-1"
                                style={{ accentColor: '#2563eb' }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <label 
                                htmlFor={`extras-${product.productId}`} 
                                className="text-xs text-gray-300 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Extras
                              </label>
                            </div>

                            {/* Right side - Quantity Controls */}
                            <div className="flex flex-col items-center">
                              <div className="flex flex-col items-center space-y-1 mb-1">
                                <span className="text-lg font-bold text-gray-100 text-center">
                                  {orderItems.find(item => item.productId === product.productId)?.quantity || 0}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const existingItem = orderItems.find(item => item.productId === product.productId);
                                    if (existingItem && existingItem.quantity > 0) {
                                      updateQuantity(product.productId, existingItem.quantity - 1);
                                    }
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    border: '1px solid #ef4444',
                                    backgroundColor: '#991b1b',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    minWidth: '20px'
                                  }}
                                >
                                  -
                                </button>
                              </div>
                              <span className="text-xs text-gray-400">Qty</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 sticky top-4">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Current Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No items in order</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.orderIdSub} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-100 text-sm">
                            {item.product?.description}
                          </h4>
                          <p className="text-xs text-gray-400">
                            €{item.price} each
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 p-0 border-gray-600 text-gray-300"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-gray-100 font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 p-0 border-gray-600 text-gray-300"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t border-gray-600 pt-3 mt-4">
                      <div className="flex justify-between items-center text-lg font-bold text-gray-100">
                        <span>Total:</span>
                        <span>€{calculateTotal()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <Receipt className="w-4 h-4 mr-2" />
                        Send to Kitchen
                      </Button>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                        Save Draft
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Product Extras Modal */}
      <ProductExtrasModal
        open={extrasModalOpen}
        onOpenChange={setExtrasModalOpen}
        product={selectedProduct}
        onAddToOrder={addToOrder}
      />
    </div>
  );
}