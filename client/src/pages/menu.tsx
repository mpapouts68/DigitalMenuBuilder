import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuHeader } from "@/components/menu-header";
import { CategoryPills } from "@/components/category-pills";
import { AdminControls } from "@/components/admin-controls";
import { MenuSection } from "@/components/menu-section";
import { AdvertisementBanner } from "@/components/advertisement-banner";
import { AddItemModal } from "@/components/add-item-modal";
import { AddCategoryModal } from "@/components/add-category-modal";
import { ImportModal } from "@/components/import-modal";
import { ProductDetailsModal } from "@/components/product-details-modal";
import { AdminPasscodeModal } from "@/components/admin-passcode-modal";
import { BulkImageUploadModal } from "@/components/bulk-image-upload-modal";
import { AdvertisementBanner } from "@/components/advertisement-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Category, Product } from "@shared/schema";

export default function Menu() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState<number | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter categories based on active selection and search
  const filteredCategories = categories.filter(category => {
    if (activeCategory === "all") {
      // Show all categories that have matching products or in admin mode
      const categoryProducts = filteredProducts.filter(product => product.categoryId === category.id);
      return categoryProducts.length > 0 || isAdminMode;
    }
    // Show only the selected category
    return category.id === activeCategory;
  });

  // Group filtered products by category
  const groupedProducts = categories.reduce((acc, category) => {
    acc[category.id] = filteredProducts.filter(product => product.categoryId === category.id);
    return acc;
  }, {} as Record<number, Product[]>);

  const handleAdminModeChange = (checked: boolean) => {
    if (checked) {
      setShowAdminPasscode(true);
    } else {
      setIsAdminMode(false);
      setIsDeleteMode(false);
    }
  };

  const handleAdminPasscodeSuccess = () => {
    setIsAdminMode(true);
  };

  const handleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
  };

  const handleEditItem = (item: Product) => {
    setEditingItem(item);
    setShowAddItemModal(true);
  };

  const handleViewProduct = (item: Product) => {
    setViewingProduct(item);
    setShowProductDetails(true);
  };

  const handleAddItemToCategory = (categoryId: number) => {
    setSelectedCategoryForNewItem(categoryId);
    setEditingItem(null);
    setShowAddItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowAddItemModal(false);
    setEditingItem(null);
    setSelectedCategoryForNewItem(null);
  };

  // Set page title
  useEffect(() => {
    document.title = "Café Restaurant Leiden - Digital Menu";
  }, []);

  if (categoriesLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded mb-2"></div>
                <div className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="h-16 bg-slate-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MenuHeader />

      {isAdminMode && (
        <div className="max-w-sm mx-auto px-4 mb-6 sm:max-w-md sm:px-6">
          <AdminControls 
            onAddCategory={() => setShowAddCategoryModal(true)}
            onImportData={() => setShowImportModal(true)}
            onBulkImageUpload={() => setShowBulkImageModal(true)}
            onDeleteMode={handleDeleteMode}
            isDeleteMode={isDeleteMode}
          />
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 pb-8 sm:max-w-md sm:px-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border-slate-200 focus:border-red-300 focus:ring-red-200 rounded-xl shadow-sm text-base"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-6">
          <CategoryPills
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Menu Content */}
        <div className="space-y-8">
          {filteredCategories.map(category => (
            <MenuSection
              key={category.id}
              category={category}
              products={groupedProducts[category.id] || []}
              isAdminMode={isAdminMode}
              isDeleteMode={isDeleteMode}
              onEditItem={handleEditItem}
              onViewProduct={handleViewProduct}
              onAddItem={() => handleAddItemToCategory(category.id)}
            />
          ))}
          
          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <p className="text-slate-500 text-lg">No menu items found</p>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your search or category filter</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Controls and Advertisement */}
      <footer className="bg-white border-t border-slate-200 sticky bottom-0 z-40">
        <div className="max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6">
          {/* Advertisement Banner */}
          <div className="mb-3">
            <AdvertisementBanner 
              type="promotional"
              isAdminMode={isAdminMode}
            />
          </div>
          
          {/* Controls Section */}
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowQRCode(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border-red-200 text-red-700 hover:bg-red-50"
            >
              <QrCode className="h-3 w-3" />
              <span className="text-xs font-medium">Share</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="admin-mode" className="text-xs text-slate-600 font-medium">
                Admin
              </Label>
              <Switch
                id="admin-mode"
                checked={isAdminMode}
                onCheckedChange={onAdminModeChange}
                className="data-[state=checked]:bg-red-600 scale-75"
              />
            </div>
          </div>
        </div>
        
        {/* QR Code Modal */}
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-center">Share Menu</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center p-6">
              <QRCodeSVG
                value={window.location.href}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
                className="rounded-lg shadow-sm"
              />
              <p className="text-center text-sm text-slate-600 mt-4">
                Scan to access this menu on your device
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </footer>

      {/* Floating Add Button (Admin Mode) */}
      {isAdminMode && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-all"
          onClick={() => {
            setEditingItem(null);
            setSelectedCategoryForNewItem(null);
            setShowAddItemModal(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Modals */}
      <AddItemModal
        open={showAddItemModal}
        onOpenChange={handleCloseItemModal}
        editingItem={editingItem}
        categories={categories}
        selectedCategoryId={selectedCategoryForNewItem}
      />

      <AddCategoryModal
        open={showAddCategoryModal}
        onOpenChange={setShowAddCategoryModal}
        existingCategories={categories}
      />

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />

      <ProductDetailsModal
        open={showProductDetails}
        onOpenChange={setShowProductDetails}
        product={viewingProduct}
        category={categories.find(c => c.id === viewingProduct?.categoryId)}
        isAdminMode={isAdminMode}
        onEdit={() => handleEditItem(viewingProduct!)}
      />

      <AdminPasscodeModal
        open={showAdminPasscode}
        onOpenChange={setShowAdminPasscode}
        onSuccess={handleAdminPasscodeSuccess}
      />

      <BulkImageUploadModal
        open={showBulkImageModal}
        onOpenChange={setShowBulkImageModal}
      />
    </div>
  );
}
