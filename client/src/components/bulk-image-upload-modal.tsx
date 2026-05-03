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
  status: "pending" | "assigned" | "uploaded" | "error" | "uploading";
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
    
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) {
        const searchUrl = generateGoogleImageSearchUrl(product.name, product.description);
        results[productId] = [searchUrl];
      }
    });
    
    setSearchResults(results);
    setIsSearching(false);
    
    toast({
      title: "Search ready",
      description: `Generated ${Object.keys(results).length} Google Image searches. Click "Open Google Search" buttons to view results.`,
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk Image Management</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="upload" className="flex flex-col h-[85vh]">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="upload">Upload Images</TabsTrigger>
            <TabsTrigger value="search">Google Image Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="flex-1 mt-4 overflow-y-scroll max-h-[70vh]">
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

        <TabsContent value="search" className="flex-1 mt-4 overflow-y-scroll max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Product Selection */}
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Select Products for Image Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
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

                <div className="max-h-[400px] overflow-y-scroll border-2 border-blue-200 rounded-md p-3 bg-white">
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
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Google Image Search Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-scroll border border-gray-200 rounded-lg p-4">
                  {Object.entries(searchResults).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(searchResults).map(([productId, urls]) => {
                        const product = products.find(p => p.id === parseInt(productId));
                        if (!product) return null;

                        return (
                          <div key={productId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-lg">{product.name}</h3>
                              <button
                                onClick={() => openGoogleImageSearch(urls[0], product.name)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 mr-2 inline" />
                                Open Google Search
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Search: "{product.name}{product.description ? ` ${product.description}` : ''} food dish restaurant"
                            </p>
                            <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                              <strong>Instructions:</strong> Click "Open Google Search" above → Right-click images → "Save image as..." → Use Upload tab to assign to products
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                      <Search className="h-12 w-12 mb-4 opacity-50" />
                      <p className="font-medium mb-2">No search results yet</p>
                      <p className="text-sm">Select products and click "Generate Searches"</p>
                    </div>
                  )}
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