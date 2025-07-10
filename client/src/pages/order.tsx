import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShoppingCart,
  Receipt,
  Search,
  Star,
  Grid3X3,
  Coffee
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

  const addToOrder = (product: Product) => {
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

    toast({
      title: "Added to order",
      description: `${product.description} added successfully`,
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

  const favoriteProducts = products.filter(p => p.favorite);

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
            <Tabs defaultValue="menu" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger value="menu" className="data-[state=active]:bg-gray-700">
                  <Coffee className="w-4 h-4 mr-2" />
                  Menu
                </TabsTrigger>
                <TabsTrigger value="favorites" className="data-[state=active]:bg-gray-700">
                  <Star className="w-4 h-4 mr-2" />
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="numeric" className="data-[state=active]:bg-gray-700">
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Numeric
                </TabsTrigger>
                <TabsTrigger value="search" className="data-[state=active]:bg-gray-700">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="menu" className="mt-4">
                {/* Category Navigation */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {parentCategory ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToParent}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Categories
                    </Button>
                  ) : (
                    <Button
                      variant={selectedCategory === null && parentCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(null);
                        setParentCategory(null);
                      }}
                      className={cn(
                        "border-gray-600",
                        (selectedCategory === null && parentCategory === null)
                          ? "bg-blue-600 text-white" 
                          : "text-gray-300 hover:bg-gray-700"
                      )}
                    >
                      All Categories
                    </Button>
                  )}
                  
                  {visibleCategories.map((group) => (
                    <Button
                      key={group.productGroupId}
                      variant={selectedCategory === group.productGroupId ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategoryClick(group.productGroupId)}
                      className={cn(
                        "border-gray-600",
                        selectedCategory === group.productGroupId 
                          ? "bg-blue-600 text-white" 
                          : "text-gray-300 hover:bg-gray-700"
                      )}
                    >
                      {group.description}
                      {group.hasSub && !group.isSub && (
                        <span className="ml-1 text-xs">→</span>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.productId}
                      className="cursor-pointer transition-all duration-200 hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => addToOrder(product)}
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
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-green-300 border-green-600 text-xs">
                              €{product.price}
                            </Badge>
                            {product.menuNumber && (
                              <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">
                                #{product.menuNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="mt-4">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {favoriteProducts.map((product) => (
                    <Card 
                      key={product.productId}
                      className="cursor-pointer transition-all duration-200 hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => addToOrder(product)}
                    >
                      <CardContent className="p-3">
                        <div className="text-center">
                          <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                          <h3 className="font-semibold text-gray-100 mb-1 text-sm line-clamp-2">
                            {product.description}
                          </h3>
                          <Badge variant="outline" className="text-green-300 border-green-600 text-xs">
                            €{product.price}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="numeric" className="mt-4">
                <div className="text-center py-8">
                  <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Numeric ordering system coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.productId}
                      className="cursor-pointer transition-all duration-200 hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => addToOrder(product)}
                    >
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2">
                            {product.description}
                          </h3>
                          <Badge variant="outline" className="text-green-300 border-green-600">
                            €{product.price}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
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
    </div>
  );
}