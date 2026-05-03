import { useEffect, useMemo, useState } from "react";
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
import { BulkImageUploadModal } from "@/components/bulk-image-upload-modal";
import { OrderItemCustomizerModal } from "@/components/order-item-customizer-modal";
import { OrderCartSheet } from "@/components/order-cart-sheet";
import { ProductModifiersModal } from "@/components/product-modifiers-modal";
import { AdminOperationsModal } from "@/components/admin-operations-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import type { Category, Product } from "@shared/schema";
import type { BrandingSettingsResponse, CartItem, OrderSourceContext } from "@/types/pos";
import { menuBackdropStyle, menuHeaderBackdropStyle } from "@/lib/menuBackdrop";

interface AuthUser {
  username: string;
  role: "admin" | "printer";
}

export default function Menu() {
  const [location] = useLocation();
  const adminRequested = useMemo(
    () => new URLSearchParams(window.location.search).get("admin") === "1",
    [location],
  );
  const { data: authUser } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user", "menu-admin"],
    enabled: adminRequested && auth.isAuthenticated(),
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });
  const isAdminMode = adminRequested && authUser?.role === "admin";
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showItemCustomizer, setShowItemCustomizer] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showAdminOperations, setShowAdminOperations] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [orderingProduct, setOrderingProduct] = useState<Product | null>(null);
  const [initialOrderQuantity, setInitialOrderQuantity] = useState(1);
  const [modifiersProduct, setModifiersProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderSourceContext, setOrderSourceContext] = useState<OrderSourceContext>({
    serviceMode: "pickup",
    pickupPoint: "bar",
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding"],
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

  const handleOrderProduct = (item: Product, quantity: number) => {
    setOrderingProduct(item);
    setInitialOrderQuantity(Math.max(1, quantity));
    setShowItemCustomizer(true);
  };

  const handleEditModifiers = (item: Product) => {
    setModifiersProduct(item);
    setShowModifierModal(true);
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

  // Keep browser tab title aligned with branding header title.
  useEffect(() => {
    const title = branding?.headerTitle?.trim();
    document.title = title ? `${title} - Digital Menu` : "Digital Menu";
  }, [branding?.headerTitle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const tableParam = params.get("table");
    const tableLabelParam = params.get("tableLabel");
    const pickupPointParam = params.get("point");
    const tokenParam = params.get("token");

    const resolvedMode: "table" | "pickup" = modeParam === "table" ? "table" : "pickup";
    const fallbackToTable = !modeParam && !!tableParam;
    const serviceMode: "table" | "pickup" = fallbackToTable ? "table" : resolvedMode;

    setOrderSourceContext({
      serviceMode,
      tableCode: tableParam || undefined,
      tableLabel: tableLabelParam || undefined,
      pickupPoint: pickupPointParam || "bar",
      sourceToken: tokenParam || undefined,
    });
  }, []);

  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty("--primary", branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty("--secondary", branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty("--accent", branding.accentColor);
    }
  }, [branding]);

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

  const quantityByProductId = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of cartItems) {
      map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
    }
    return map;
  }, [cartItems]);

  const cartQuantityForProduct = (productId: number) => quantityByProductId.get(productId) ?? 0;

  const handleDecrementCartForProduct = (productId: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].productId !== productId) continue;
        const line = next[i];
        if (line.quantity > 1) {
          const newQty = line.quantity - 1;
          const unitTotal = line.lineTotal / line.quantity;
          next[i] = { ...line, quantity: newQty, lineTotal: unitTotal * newQty };
        } else {
          next.splice(i, 1);
        }
        break;
      }
      return next;
    });
  };

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
  };

  const handleAddToCartAndCheckout = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
    setShowCart(true);
  };

  const backgroundImageUrl = branding?.backgroundImageUrl?.trim() || "/backgrnd.PNG";
  const menuSurfaceStyle = menuBackdropStyle(backgroundImageUrl);

  if (categoriesLoading || productsLoading) {
    return (
      <div style={menuSurfaceStyle}>
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
    <div style={menuSurfaceStyle}>
      <MenuHeader
        logoUrl={branding?.logoUrl}
        headerTitle={branding?.headerTitle}
        headerSubtitle={branding?.headerSubtitle}
      />

      {isAdminMode && (
        <div className="max-w-sm mx-auto px-4 mb-6 sm:max-w-md sm:px-6">
          <AdminControls 
            onAddCategory={() => setShowAddCategoryModal(true)}
            onImportData={() => setShowImportModal(true)}
            onBulkImageUpload={() => setShowBulkImageModal(true)}
            onOpenOperations={() => setShowAdminOperations(true)}
            onDeleteMode={handleDeleteMode}
            isDeleteMode={isDeleteMode}
          />
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 pb-8 sm:max-w-md sm:px-6">
        {!isAdminMode && (
          <div className="mb-4 rounded-lg border bg-white p-3 text-sm">
            {orderSourceContext.serviceMode === "table" && orderSourceContext.tableCode ? (
              <p>
                Ordering for table <span className="font-semibold">{orderSourceContext.tableCode}</span>
              </p>
            ) : (
              <p>
                Pickup mode ({orderSourceContext.pickupPoint || "bar"})
              </p>
            )}
          </div>
        )}

        {/* Search + cart (guest): cart always reachable without scrolling to footer */}
        <div className="mb-[14px] flex flex-row items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border-slate-200 bg-white pl-12 pr-4 text-base shadow-sm focus:border-red-300 focus:ring-red-200"
            />
          </div>
          {!isAdminMode && (
            <Button
              type="button"
              variant="default"
              aria-label="Open order"
              onClick={() => setShowCart(true)}
              className="relative h-12 w-12 shrink-0 rounded-xl border border-emerald-700/30 bg-emerald-600 p-0 text-white shadow-md hover:bg-emerald-700"
            >
              <ShoppingCart className="mx-auto h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold tabular-nums leading-none text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Category Pills — left-aligned row */}
        <div className="mb-2 flex w-full justify-start">
          <CategoryPills
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Menu Content */}
        <div className="space-y-6">
          {filteredCategories.map(category => (
            <MenuSection
              key={category.id}
              category={category}
              products={groupedProducts[category.id] || []}
              isAdminMode={isAdminMode}
              isDeleteMode={isDeleteMode}
              cartQuantityForProduct={cartQuantityForProduct}
              onEditItem={handleEditItem}
              onViewProduct={handleViewProduct}
              onAddProductToOrder={handleOrderProduct}
              onDecrementCartForProduct={handleDecrementCartForProduct}
              onEditProductModifiers={handleEditModifiers}
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

        {/* Advertisement Banner - After menu content */}
        <div className="mt-3 mb-1">
          <AdvertisementBanner 
            type="promotional"
            isAdminMode={isAdminMode}
            className="h-20 sm:h-24"
          />
        </div>
      </div>

      {/* Footer: same tiled backdrop as page (no solid white bar) */}
      <footer
        className="border-t border-slate-900/10 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{
          ...menuHeaderBackdropStyle(),
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <div className="max-w-sm mx-auto px-4 py-2 sm:max-w-md sm:px-6 space-y-2">
          {!isAdminMode && (
            <Button
              type="button"
              onClick={() => setShowCart(true)}
              className="w-full h-11 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              Order
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">{cartCount}</span>
              )}
            </Button>
          )}
        </div>
        {branding?.footerText && (
          <div
            className="max-w-sm mx-auto px-4 pb-3 text-center text-xs text-slate-800 sm:max-w-md sm:px-6"
            style={{
              textShadow:
                "0 0 8px rgba(255,255,255,0.95), 0 1px 1px rgba(255,255,255,0.85)",
            }}
          >
            {branding.footerText}
          </div>
        )}
        <div
          className="max-w-sm mx-auto px-4 pb-3 text-center text-xs text-slate-800 sm:max-w-md sm:px-6"
          style={{
            textShadow:
              "0 0 8px rgba(255,255,255,0.95), 0 1px 1px rgba(255,255,255,0.85)",
          }}
        >
          All rights reserved.
        </div>
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

      <BulkImageUploadModal
        open={showBulkImageModal}
        onOpenChange={setShowBulkImageModal}
      />

      <OrderItemCustomizerModal
        open={showItemCustomizer}
        onOpenChange={setShowItemCustomizer}
        product={orderingProduct}
        initialQuantity={initialOrderQuantity}
        onAddToCart={handleAddToCart}
        onAddToCartAndCheckout={handleAddToCartAndCheckout}
      />

      <OrderCartSheet
        open={showCart}
        onOpenChange={setShowCart}
        cartItems={cartItems}
        onRemoveItem={(id) => setCartItems((prev) => prev.filter((item) => item.id !== id))}
        onClear={() => setCartItems([])}
        sourceContext={orderSourceContext}
      />

      <ProductModifiersModal
        open={showModifierModal}
        onOpenChange={setShowModifierModal}
        product={modifiersProduct}
      />

      <AdminOperationsModal
        open={showAdminOperations}
        onOpenChange={setShowAdminOperations}
      />
    </div>
  );
}
