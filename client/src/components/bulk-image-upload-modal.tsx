import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Check, AlertCircle, Search, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { Category, Product } from "@shared/schema";

interface BulkImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImageAssignment {
  id: string;
  file: File;
  preview: string;
  productId?: number;
  status: "pending" | "assigned" | "uploaded" | "error";
  errorMessage?: string;
}

export function BulkImageUploadModal({ open, onOpenChange }: BulkImageUploadModalProps) {
  const [images, setImages] = useState<ImageAssignment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [searchResults, setSearchResults] = useState<{[productId: number]: string[]}>({});
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  const generateGoogleImageSearchUrl = (productName: string, productDescription?: string) => {
    const searchQuery = productDescription 
      ? `${productName} ${productDescription} food dish restaurant`
      : `${productName} food dish restaurant`;
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
  };

  const searchImagesForProducts = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to generate searches",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    const results: {[productId: number]: string[]} = {};
    
    console.log("Selected products:", selectedProducts);
    console.log("Available products:", products);
    
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) {
        const searchUrl = generateGoogleImageSearchUrl(product.name, product.description);
        results[productId] = [searchUrl];
        console.log(`Generated search for ${product.name}:`, searchUrl);
      }
    });
    
    console.log("Final search results:", results);
    setSearchResults(results);
    setIsSearching(false);
    
    toast({
      title: "Search URLs generated",
      description: `Created ${Object.keys(results).length} Google Image searches. Look for blue "Open Google Search" buttons below.`,
    });
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const openGoogleImageSearch = (url: string, productName: string) => {
    window.open(url, '_blank');
    toast({
      title: "Search opened",
      description: `Google Image search for "${productName}" opened in new tab`,
    });
  };

  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: number; imageUrl: string }) => {
      return await apiRequest("PUT", `/api/products/${productId}`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage: ImageAssignment = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: e.target?.result as string,
            status: "pending",
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const assignImageToProduct = (imageId: string, productId: number) => {
    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, productId, status: "assigned" as const }
        : img
    ));
  };

  const removeImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const uploadAllImages = async () => {
    const assignedImages = images.filter(img => img.status === "assigned" && img.productId);
    
    if (assignedImages.length === 0) {
      toast({
        title: "No images assigned",
        description: "Please assign images to products before uploading.",
        variant: "destructive",
      });
      return;
    }

    for (const image of assignedImages) {
      try {
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, status: "uploading" as const }
            : img
        ));

        await updateProductMutation.mutateAsync({
          productId: image.productId!,
          imageUrl: image.preview
        });

        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, status: "uploaded" as const }
            : img
        ));
      } catch (error) {
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { 
                ...img, 
                status: "error" as const, 
                errorMessage: "Failed to upload image" 
              }
            : img
        ));
      }
    }

    const successCount = images.filter(img => img.status === "uploaded").length;
    const errorCount = images.filter(img => img.status === "error").length;

    toast({
      title: "Upload complete",
      description: `${successCount} images uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      // Clear uploaded images after a delay
      setTimeout(() => {
        setImages(prev => prev.filter(img => img.status !== "uploaded"));
      }, 2000);
    }
  };

  const getStatusIcon = (status: ImageAssignment["status"]) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "assigned":
        return <Check className="h-4 w-4 text-blue-500" />;
      case "uploaded":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk Image Management</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="upload" className="h-[75vh]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Images</TabsTrigger>
            <TabsTrigger value="search">Google Image Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="h-full mt-4">

            <div className="space-y-6">
              {/* Upload Section */}
              <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Category (Optional)</Label>
                <Select
                  value={selectedCategory?.toString() || "all"}
                  onValueChange={(value) => setSelectedCategory(value === "all" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select Images</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelection}
                    ref={fileInputRef}
                    className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Select multiple images to upload and assign to menu items
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Image Assignment Section */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Assign Images to Products
                  <Button onClick={uploadAllImages} disabled={updateProductMutation.isPending}>
                    Upload All Assigned Images
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {images.map(image => (
                    <div key={image.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(image.status)}
                          <Badge variant={
                            image.status === "uploaded" ? "default" :
                            image.status === "assigned" ? "secondary" :
                            image.status === "error" ? "destructive" : "outline"
                          }>
                            {image.status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="aspect-video bg-slate-100 rounded overflow-hidden">
                        <img
                          src={image.preview}
                          alt="Upload preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Assign to Product</Label>
                        <Select
                          value={image.productId?.toString() || "none"}
                          onValueChange={(value) => value !== "none" && assignImageToProduct(image.id, parseInt(value))}
                          disabled={image.status === "uploaded"}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>Select product</SelectItem>
                            {filteredProducts.map(product => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{product.name}</span>
                                  {product.imageUrl && (
                                    <Badge variant="secondary" className="text-xs">
                                      Has image
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {image.errorMessage && (
                        <p className="text-xs text-red-600">{image.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 space-y-2">
                <h4 className="font-medium">How to use:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Optionally select a category to filter products</li>
                  <li>Choose multiple image files from your device</li>
                  <li>Assign each image to a specific product from the dropdown</li>
                  <li>Click "Upload All Assigned Images" to apply changes</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

        <TabsContent value="search" className="h-full mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Select Products for Image Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Filter by Category</Label>
                  <Select
                    value={selectedCategory?.toString() || "all"}
                    onValueChange={(value) => setSelectedCategory(value === "all" ? null : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedProducts.size} products selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={() => setSelectedProducts(new Set())}
                      variant="outline"
                      size="sm"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={searchImagesForProducts}
                      disabled={selectedProducts.size === 0 || isSearching}
                      size="sm"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {isSearching ? "Searching..." : "Generate Searches"}
                    </Button>
                  </div>
                </div>

                <div className="h-80 overflow-y-auto border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredProducts.map(product => (
                      <div 
                        key={product.id}
                        className={`border rounded-lg p-3 transition-colors ${
                          selectedProducts.has(product.id) 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={(e) => {
                              e.preventDefault();
                              toggleProductSelection(product.id);
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => toggleProductSelection(product.id)}
                          >
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-600 mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                          {product.imageUrl && (
                            <Badge variant="secondary" className="text-xs">
                              Has image
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No products found</p>
                        <p className="text-sm">Try selecting a different category</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Google Image Search Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto border-2 border-gray-300 rounded-md p-4 bg-gray-50">
                  <div className="space-y-4">
                    <div className="text-xs text-gray-500 mb-2">
                      Debug: Found {Object.entries(searchResults).length} search results
                    </div>
                    {Object.entries(searchResults).length > 0 ? (
                      Object.entries(searchResults).map(([productId, urls]) => {
                        const product = products.find(p => p.id === parseInt(productId));
                        console.log('Rendering product:', productId, product);
                        if (!product) {
                          console.log('Product not found for ID:', productId);
                          return null;
                        }

                        return (
                          <div key={productId} className="border-2 border-blue-300 rounded-lg p-6 space-y-4 bg-white shadow-lg mb-4">
                            <div className="bg-green-100 p-2 rounded text-xs">
                              Debug: Rendering product {productId} - {product.name}
                            </div>
                            <div className="flex flex-col gap-4">
                              <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-900 mb-3">{product.name}</h4>
                                <p className="text-sm text-gray-600 break-words mb-4">
                                  Search: "{product.name}{product.description ? ` ${product.description}` : ''} food dish restaurant"
                                </p>
                              </div>
                              <div className="w-full">
                                <button
                                  onClick={() => openGoogleImageSearch(urls[0], product.name)}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-lg border-2 border-red-800"
                                  style={{minHeight: '60px'}}
                                >
                                  🔍 OPEN GOOGLE SEARCH FOR {product.name.toUpperCase()}
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-blue-800 bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
                              <strong>INSTRUCTIONS:</strong> Click the red button above to open Google Images. Right-click any image → "Save image as..." → Then use the Upload tab to assign images.
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No search results yet</p>
                        <p className="text-sm mt-1">Select products and click "Generate Searches" to create Google Image searches</p>
                        <div className="mt-4 text-xs text-gray-400">
                          Debug: {Object.keys(searchResults).length} results in state
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </DialogContent>
    </Dialog>
  );
}