import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Calculator,
  Receipt,
  Users,
  Clock
} from 'lucide-react';
import { ProductWithGroup, Product, OrderWithItems } from '@shared/schema';

export function OrderPage() {
  const [, params] = useRoute('/order/:postId');
  const [, setLocation] = useLocation();
  const { cacheData, token } = useAuth();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderWithItems | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ product: Product; quantity: number; price: number }>>([]);

  const postId = params?.postId ? parseInt(params.postId) : null;
  const table = cacheData?.tables.find(t => t.postId === postId);
  const groups = cacheData?.groups || [];
  const products = cacheData?.products || [];

  useEffect(() => {
    if (postId && table?.currentOrder) {
      // Load existing order
      fetchOrder(table.currentOrder.orderId);
    }
  }, [postId, table]);

  const fetchOrder = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const order = await response.json();
        setCurrentOrder(order);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    }
  };

  const createNewOrder = async () => {
    if (!postId) return;
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId,
          orderType: 'dine-in',
        }),
      });
      
      if (response.ok) {
        const newOrder = await response.json();
        setCurrentOrder(newOrder);
        toast({
          title: "Order Created",
          description: `New order #${newOrder.orderId} created for table ${table?.postNumber || postId}`,
        });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    }
  };

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product.productId === product.productId);
    
    if (existingItem) {
      setOrderItems(items => 
        items.map(item => 
          item.product.productId === product.productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems(items => [...items, { 
        product, 
        quantity: 1, 
        price: parseFloat(product.price?.toString() || '0') 
      }]);
    }
    
    toast({
      title: "Added to Order",
      description: `${product.description} added to order`,
    });
  };

  const removeFromOrder = (productId: number) => {
    setOrderItems(items => items.filter(item => item.product.productId !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId);
      return;
    }
    
    setOrderItems(items =>
      items.map(item =>
        item.product.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const filteredProducts = selectedGroup 
    ? products.filter(p => p.group?.productGroupId === selectedGroup)
    : products;

  const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Table Not Found</h2>
            <p className="text-gray-600 mb-4">The requested table could not be found.</p>
            <Button onClick={() => setLocation('/tables')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tables
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation('/tables')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Table {table.postNumber || table.postId}
                </h1>
                <p className="text-sm text-gray-500">
                  {table.description || 'Order Management'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={currentOrder ? "default" : "outline"}>
                {currentOrder ? `Order #${currentOrder.orderId}` : 'No Active Order'}
              </Badge>
              {!currentOrder && (
                <Button onClick={createNewOrder}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="menu" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                    <TabsTrigger value="favorites">Favorites</TabsTrigger>
                    <TabsTrigger value="numeric">Numeric</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="menu" className="space-y-4">
                    {/* Group Selection */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedGroup === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGroup(null)}
                      >
                        All
                      </Button>
                      {groups.map(group => (
                        <Button
                          key={group.productGroupId}
                          variant={selectedGroup === group.productGroupId ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedGroup(group.productGroupId)}
                        >
                          {group.description}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Products Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredProducts.map(product => (
                        <Card
                          key={product.productId}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addToOrder(product)}
                        >
                          <CardContent className="p-3">
                            <div className="text-sm font-medium truncate mb-1">
                              {product.description}
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                              ${parseFloat(product.price?.toString() || '0').toFixed(2)}
                            </div>
                            {product.group && (
                              <div className="text-xs text-gray-500 mt-1">
                                {product.group.description}
                              </div>
                            )}
                            {product.menuNumber && (
                              <div className="text-xs text-gray-400">
                                #{product.menuNumber}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="favorites">
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2" />
                      <p>Favorite products will appear here</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="numeric">
                    <div className="text-center py-8 text-gray-500">
                      <Calculator className="w-12 h-12 mx-auto mb-2" />
                      <p>Numeric ordering system</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="search">
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2" />
                      <p>Search functionality</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Order</span>
                  <Badge variant="outline">{orderItems.length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2" />
                      <p>No items in order</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {orderItems.map(item => (
                          <div key={item.product.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.product.description}</div>
                              <div className="text-sm text-gray-600">
                                ${item.price.toFixed(2)} each
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.productId, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.productId, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total:</span>
                          <span>${orderTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button className="w-full" disabled={!currentOrder}>
                          <Receipt className="w-4 h-4 mr-2" />
                          Send to Kitchen
                        </Button>
                        <Button variant="outline" className="w-full" disabled={!currentOrder}>
                          <Clock className="w-4 h-4 mr-2" />
                          Hold Order
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}