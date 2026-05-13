import {
  categories,
  products,
  banners,
  productOptionGroups,
  productOptions,
  productExtras,
  orders,
  orderItems,
  orderItemModifiers,
  printJobs,
  dailyClosures,
  brandingSettings,
  printerSettings,
  paymentSettings,
  qrGroups,
  users,
  type Category,
  type Product,
  type Banner,
  type ProductOptionGroup,
  type ProductOption,
  type ProductExtra,
  type Order,
  type OrderItem,
  type OrderItemModifier,
  type PrintJob,
  type DailyClosure,
  type BrandingSettings,
  type PrinterSettings,
  type PaymentSettings,
  type User,
  type QrGroup,
  type InsertCategory,
  type InsertProduct,
  type InsertBanner,
  type InsertProductOptionGroup,
  type InsertProductOption,
  type InsertProductExtra,
  type InsertBrandingSettings,
  type InsertPrinterSettings,
  type InsertPaymentSettings,
  type InsertQrGroup,
  type UpsertUser,
} from "@shared/schema";
import { db, sqlite } from "./db";
import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  /** Deletes all categories, products, option groups, options, and extras (menu catalog only). */
  clearMenuCatalog(): Promise<void>;

  // Bulk operations
  importData(categories: InsertCategory[], products: InsertProduct[]): Promise<void>;

  // Banners
  getBanners(): Promise<Banner[]>;
  getBannerByType(type: string): Promise<Banner | undefined>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: number): Promise<boolean>;

  // Product modifiers
  getProductModifiers(productId: number): Promise<ProductModifierConfig>;
  replaceProductModifiers(
    productId: number,
    optionGroups: ModifierOptionGroupInput[],
    extras: ModifierExtraInput[],
  ): Promise<ProductModifierConfig>;

  // Orders / print queue
  createOrder(input: CreateOrderInput): Promise<OrderDetails>;
  getOrders(status?: string): Promise<Order[]>;
  getOrderDetails(orderId: number): Promise<OrderDetails | undefined>;
  getOpenOrderDetails(): Promise<OrderDetails[]>;
  getServedOrderDetails(limit?: number): Promise<OrderDetails[]>;
  markOrderPaid(orderId: number): Promise<Order | undefined>;
  updateOrderStatus(orderId: number, status: string): Promise<Order | undefined>;
  markOrderServed(orderId: number): Promise<Order | undefined>;
  createPrintJobForOrder(orderId: number): Promise<PrintJob | undefined>;
  getPendingPrintJobs(limit?: number): Promise<PrintJob[]>;
  getDispatchablePrintJobs(limit?: number): Promise<PrintJob[]>;
  getFailedPrintJobs(limit?: number): Promise<PrintJob[]>;
  completePrintJob(jobId: number): Promise<PrintJob | undefined>;
  failPrintJob(jobId: number, errorMessage: string): Promise<PrintJob | undefined>;

  // Revenue / close day
  getDailyRevenueStats(businessDate: string): Promise<DailyRevenueStats>;
  closeDay(businessDate: string, purgeBeforeDate?: string): Promise<DailyClosure>;

  // Branding
  getBrandingSettings(): Promise<BrandingSettings | undefined>;
  upsertBrandingSettings(settings: InsertBrandingSettings): Promise<BrandingSettings>;
  getPrinterSettings(): Promise<PrinterSettings | undefined>;
  upsertPrinterSettings(settings: InsertPrinterSettings): Promise<PrinterSettings>;
  updatePrinterHeartbeat(status: string, errorMessage?: string): Promise<PrinterSettings | undefined>;
  acquirePrinterLock(lockToken: string, holder: string, leaseMs: number): Promise<{ acquired: boolean; settings?: PrinterSettings }>;
  renewPrinterLock(lockToken: string, leaseMs: number): Promise<boolean>;
  releasePrinterLock(lockToken: string): Promise<boolean>;
  hasValidPrinterLock(lockToken: string): Promise<boolean>;
  getPaymentSettings(): Promise<PaymentSettings | undefined>;
  upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings>;

  // QR groups
  getQrGroups(): Promise<QrGroup[]>;
  getQrGroup(id: number): Promise<QrGroup | undefined>;
  createQrGroup(group: InsertQrGroup): Promise<QrGroup>;
  updateQrGroup(id: number, group: Partial<InsertQrGroup>): Promise<QrGroup | undefined>;
  deleteQrGroup(id: number): Promise<boolean>;
}

export interface ModifierOptionInput {
  name: string;
  priceDelta: number;
  sortOrder?: number;
  isActive?: number;
  isDefault?: number;
  imageUrl?: string | null;
}

export interface ModifierOptionGroupInput {
  name: string;
  isRequired?: number;
  sortOrder?: number;
  options: ModifierOptionInput[];
}

export interface ModifierExtraInput {
  name: string;
  priceDelta: number;
  sortOrder?: number;
  isActive?: number;
  imageUrl?: string | null;
  groupName?: string | null;
  maxQuantity?: number;
}

export interface ProductModifierConfig {
  optionGroups: Array<ProductOptionGroup & { options: ProductOption[] }>;
  extras: ProductExtra[];
}

export interface CreateOrderInput {
  payment?: {
    method?: "cash" | "card";
    status?: "not_required" | "pending" | "authorized" | "succeeded" | "failed";
    provider?: string;
    intentId?: string;
  };
  serviceMode?: "table" | "pickup";
  tableCode?: string;
  tableLabel?: string;
  pickupPoint?: string;
  sourceToken?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: Array<{
    productId: number;
    quantity: number;
    notes?: string;
    selectedOptions?: Array<{ groupName?: string; name: string; priceDelta?: number }>;
    selectedExtras?: Array<{ name: string; priceDelta?: number; quantity?: number; groupName?: string }>;
  }>;
}

export interface OrderDetails {
  order: Order;
  items: Array<OrderItem & { modifiers: OrderItemModifier[] }>;
}

export interface DailyRevenueStats {
  businessDate: string;
  totalOrders: number;
  grossRevenue: number;
  openOrders: number;
}

export class DatabaseStorage implements IStorage {
  private orderColumnsCache: Set<string> | null = null;

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toDateWindow(businessDate: string): { start: number; end: number } {
    const start = new Date(`${businessDate}T00:00:00`).getTime();
    const end = new Date(`${businessDate}T23:59:59.999`).getTime();
    return { start, end };
  }

  private formatOrderNumber(timestamp: number, orderId: number): string {
    const datePrefix = new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, "");
    return `${datePrefix}-${String(orderId).padStart(5, "0")}`;
  }

  private getOrderColumns(): Set<string> {
    if (this.orderColumnsCache) {
      return this.orderColumnsCache;
    }
    const rows = sqlite.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
    this.orderColumnsCache = new Set(rows.map((row) => row.name));
    return this.orderColumnsCache;
  }

  private setIfColumnExists(
    target: Record<string, unknown>,
    columns: Set<string>,
    column: string,
    key: string,
    value: unknown,
  ): void {
    if (columns.has(column)) {
      target[key] = value;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: Date.now(),
        },
      })
      .returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.order);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Delete all modifier rows for products in this category first.
    const categoryProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id));
    const productIds = categoryProducts.map((product) => product.id);

    if (productIds.length > 0) {
      const groups = await db
        .select({ id: productOptionGroups.id })
        .from(productOptionGroups)
        .where(inArray(productOptionGroups.productId, productIds));
      const groupIds = groups.map((group) => group.id);

      if (groupIds.length > 0) {
        await db.delete(productOptions).where(inArray(productOptions.groupId, groupIds));
      }

      await db.delete(productOptionGroups).where(inArray(productOptionGroups.productId, productIds));
      await db.delete(productExtras).where(inArray(productExtras.productId, productIds));
    }

    // Delete all products in this category, then category itself.
    await db.delete(products).where(eq(products.categoryId, id));
    
    // Then delete the category
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const groups = await db.select({ id: productOptionGroups.id }).from(productOptionGroups).where(eq(productOptionGroups.productId, id));
    const groupIds = groups.map((group) => group.id);
    if (groupIds.length > 0) {
      await db.delete(productOptions).where(inArray(productOptions.groupId, groupIds));
    }
    await db.delete(productOptionGroups).where(eq(productOptionGroups.productId, id));
    await db.delete(productExtras).where(eq(productExtras.productId, id));

    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    
    return result.length > 0;
  }

  async clearMenuCatalog(): Promise<void> {
    await db.delete(productOptions);
    await db.delete(productOptionGroups);
    await db.delete(productExtras);
    await db.delete(products);
    await db.delete(categories);
  }

  async importData(categoriesData: InsertCategory[], productsData: InsertProduct[]): Promise<void> {
    await this.clearMenuCatalog();

    // Import categories
    if (categoriesData.length > 0) {
      await db.insert(categories).values(categoriesData);
    }

    // Import products
    if (productsData.length > 0) {
      await db.insert(products).values(productsData);
    }
  }

  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners);
  }

  async getBannerByType(type: string): Promise<Banner | undefined> {
    const result = await db.select().from(banners).where(eq(banners.type, type)).limit(1);
    return result[0];
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [newBanner] = await db.insert(banners).values(banner).returning();
    return newBanner;
  }

  async updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [updated] = await db.update(banners).set(banner).where(eq(banners.id, id)).returning();
    return updated;
  }

  async deleteBanner(id: number): Promise<boolean> {
    const result = await db.delete(banners).where(eq(banners.id, id)).returning();
    return result.length > 0;
  }

  async getProductModifiers(productId: number): Promise<ProductModifierConfig> {
    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, productId))
      .orderBy(productOptionGroups.sortOrder, productOptionGroups.id);

    const groupIds = groups.map((group) => group.id);
    const options = groupIds.length > 0
      ? await db
          .select()
          .from(productOptions)
          .where(inArray(productOptions.groupId, groupIds))
          .orderBy(productOptions.sortOrder, productOptions.id)
      : [];

    const extras = await db
      .select()
      .from(productExtras)
      .where(eq(productExtras.productId, productId))
      .orderBy(productExtras.sortOrder, productExtras.id);

    const groupedOptions = groups.map((group) => ({
      ...group,
      options: options.filter((option) => option.groupId === group.id),
    }));

    return { optionGroups: groupedOptions, extras };
  }

  async replaceProductModifiers(
    productId: number,
    optionGroups: ModifierOptionGroupInput[],
    extras: ModifierExtraInput[],
  ): Promise<ProductModifierConfig> {
    await db.transaction(async (tx) => {
      const existingGroups = await tx
        .select({ id: productOptionGroups.id })
        .from(productOptionGroups)
        .where(eq(productOptionGroups.productId, productId));

      const existingGroupIds = existingGroups.map((group) => group.id);
      if (existingGroupIds.length > 0) {
        await tx.delete(productOptions).where(inArray(productOptions.groupId, existingGroupIds));
      }
      await tx.delete(productOptionGroups).where(eq(productOptionGroups.productId, productId));
      await tx.delete(productExtras).where(eq(productExtras.productId, productId));

      for (let groupIndex = 0; groupIndex < optionGroups.length; groupIndex += 1) {
        const group = optionGroups[groupIndex];
        const groupPayload: InsertProductOptionGroup = {
          productId,
          name: group.name,
          isRequired: group.isRequired ?? 0,
          sortOrder: group.sortOrder ?? groupIndex,
        };
        const [newGroup] = await tx.insert(productOptionGroups).values(groupPayload).returning();

        if (group.options.length > 0) {
          // Default only when admin explicitly marks one active option as default.
          const explicitDefaultIdx = group.options.findIndex(
            (option) => (option.isDefault ?? 0) === 1 && (option.isActive ?? 1) === 1,
          );
          const defaultIdx = explicitDefaultIdx >= 0 ? explicitDefaultIdx : -1;

          // Every row must include the same keys so Drizzle batch insert maps columns correctly.
          const optionPayload: InsertProductOption[] = group.options.map((option: ModifierOptionInput, optionIndex: number) => {
            const trimmed = option.imageUrl?.trim() ?? "";
            return {
              groupId: newGroup.id,
              name: option.name,
              priceDelta: option.priceDelta ?? 0,
              sortOrder: option.sortOrder ?? optionIndex,
              isActive: option.isActive ?? 1,
              isDefault: defaultIdx >= 0 && optionIndex === defaultIdx ? 1 : 0,
              imageUrl: trimmed.length > 0 ? trimmed : "",
            };
          });
          await tx.insert(productOptions).values(optionPayload);
        }
      }

      if (extras.length > 0) {
        const extraPayload: InsertProductExtra[] = extras.map((extra, extraIndex) => {
          const trimmed = extra.imageUrl?.trim() ?? "";
          const gn = extra.groupName?.trim();
          return {
            productId,
            name: extra.name,
            priceDelta: extra.priceDelta ?? 0,
            sortOrder: extra.sortOrder ?? extraIndex,
            isActive: extra.isActive ?? 1,
            imageUrl: trimmed.length > 0 ? trimmed : "",
            groupName: gn && gn.length > 0 ? gn : null,
            maxQuantity: Math.max(1, Math.min(99, Math.round(Number(extra.maxQuantity ?? 1)))),
          };
        });
        await tx.insert(productExtras).values(extraPayload);
      }
    });

    return this.getProductModifiers(productId);
  }

  private assertOptionSelections(
    catalog: ProductModifierConfig,
    selectedOptions: NonNullable<CreateOrderInput["items"][number]["selectedOptions"]>,
  ) {
    const groupsByName = new Map(
      catalog.optionGroups.map((g) => [g.name.trim(), g] as const),
    );
    const pickedByGroup = new Map<string, (typeof selectedOptions)[number]>();
    for (const sel of selectedOptions) {
      const key = (sel.groupName ?? "").trim();
      if (!key) {
        throw new Error("Each selected option must include its group name.");
      }
      if (pickedByGroup.has(key)) {
        throw new Error(`Multiple selections for option group "${key}".`);
      }
      pickedByGroup.set(key, sel);
    }

    for (const group of catalog.optionGroups) {
      const gname = group.name.trim();
      if (Number(group.isRequired) === 1 && !pickedByGroup.has(gname)) {
        throw new Error(`Required option group not selected: "${group.name}".`);
      }
    }

    for (const [gname, sel] of Array.from(pickedByGroup.entries())) {
      const group = groupsByName.get(gname);
      if (!group) {
        throw new Error(`Unknown option group "${gname}".`);
      }
      const opt = group.options.find(
        (o) => o.name === sel.name && Number(o.isActive ?? 1) === 1,
      );
      if (!opt) {
        throw new Error(`Invalid option "${sel.name}" for group "${gname}".`);
      }
      const expectedDelta = Number(opt.priceDelta ?? 0);
      const sentDelta = Number(sel.priceDelta ?? 0);
      if (Math.abs(expectedDelta - sentDelta) > 0.001) {
        throw new Error(`Option price mismatch for "${sel.name}" in group "${gname}".`);
      }
    }
  }

  private assertExtraSelectionLimits(
    selectedProduct: Product,
    catalog: ProductModifierConfig,
    selectedExtras: NonNullable<CreateOrderInput["items"][number]["selectedExtras"]>,
  ) {
    const extrasDef = catalog.extras;
    const maxF = Math.max(0, Math.round(Number((selectedProduct as any).maxFlavourSelections ?? 0)));
    const maxA = Math.max(0, Math.round(Number((selectedProduct as any).maxAddonSelections ?? 0)));

    if (extrasDef.length > 0) {
      for (const sel of selectedExtras) {
        if (!extrasDef.some((e) => e.name === sel.name)) {
          throw new Error(`Unknown extra "${sel.name}" for this product.`);
        }
      }
    }

    if (maxF === 0 && maxA === 0) return;

    let flavours = 0;
    let addons = 0;
    for (const sel of selectedExtras) {
      const q = Math.max(1, sel.quantity ?? 1);
      const row = extrasDef.find((e) => e.name === sel.name);
      if (!row) continue;
      const maxPerExtra = Math.max(1, Math.min(99, Math.round(Number((row as { maxQuantity?: number }).maxQuantity ?? 1))));
      if (q > maxPerExtra) {
        throw new Error(`"${sel.name}" allows at most ${maxPerExtra} per item.`);
      }
      if ((row.sortOrder ?? 999) < 500) flavours += q;
      else addons += q;
    }
    if (maxF > 0 && flavours > maxF) {
      throw new Error(`Too many flavours selected (maximum ${maxF}).`);
    }
    if (maxA > 0 && addons > maxA) {
      throw new Error(`Too many add-ons selected (maximum ${maxA}).`);
    }
  }

  async createOrder(input: CreateOrderInput): Promise<OrderDetails> {
    return db.transaction(async (tx) => {
      const now = Date.now();
      const serviceMode = input.serviceMode === "table" ? "table" : "pickup";
      const paymentMethod = input.payment?.method === "card" ? "card" : "cash";
      // Safe default: if client sends no payment payload, treat as unpaid cash.
      const resolvedPaymentStatus =
        paymentMethod === "card" ? input.payment?.status ?? "pending" : input.payment?.status ?? "pending";
      const initialPrintStatus =
        resolvedPaymentStatus === "succeeded" || resolvedPaymentStatus === "not_required"
          ? "pending"
          : "payment_pending";
      const orderColumns = this.getOrderColumns();
      const orderInsertValues: Record<string, unknown> = {
        orderNumber: `TMP-${now}`,
        status: "new",
        printStatus: initialPrintStatus,
        serviceMode,
        tableCode: serviceMode === "table" ? input.tableCode || null : null,
        tableLabel: serviceMode === "table" ? input.tableLabel || null : null,
        pickupPoint: serviceMode === "pickup" ? input.pickupPoint || "bar" : null,
        sourceToken: input.sourceToken || null,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        notes: input.notes || null,
        createdAt: now,
        subtotal: 0,
        extrasTotal: 0,
        total: 0,
      };
      this.setIfColumnExists(orderInsertValues, orderColumns, "payment_status", "paymentStatus", resolvedPaymentStatus);
      this.setIfColumnExists(
        orderInsertValues,
        orderColumns,
        "payment_provider",
        "paymentProvider",
        paymentMethod === "card" ? input.payment?.provider || "simulated_terminal" : input.payment?.provider || "cash_counter",
      );
      this.setIfColumnExists(
        orderInsertValues,
        orderColumns,
        "payment_intent_id",
        "paymentIntentId",
        paymentMethod === "card" ? input.payment?.intentId || null : null,
      );

      const [createdOrder] = await tx
        .insert(orders)
        .values(orderInsertValues as any)
        .returning();

      let subtotal = 0;
      let extrasTotal = 0;
      const createdItems: Array<OrderItem & { modifiers: OrderItemModifier[] }> = [];

      for (const orderItemInput of input.items) {
        const product = await tx.select().from(products).where(eq(products.id, orderItemInput.productId)).limit(1);
        const selectedProduct = product[0];
        if (!selectedProduct) {
          throw new Error(`Product not found: ${orderItemInput.productId}`);
        }

        const selectedOptions = orderItemInput.selectedOptions ?? [];
        const selectedExtras = orderItemInput.selectedExtras ?? [];

        const modifiersConfig = await this.getProductModifiers(selectedProduct.id);
        this.assertOptionSelections(modifiersConfig, selectedOptions);
        this.assertExtraSelectionLimits(selectedProduct, modifiersConfig, selectedExtras);

        const qtyLocked = Number((selectedProduct as { disableQuantityControl?: number }).disableQuantityControl ?? 0) === 1;
        const qty = qtyLocked ? 1 : Math.max(1, orderItemInput.quantity);

        const optionTotal = this.roundMoney(
          selectedOptions.reduce((sum, option) => sum + (option.priceDelta ?? 0), 0) * qty,
        );
        const extraTotal = this.roundMoney(
          selectedExtras.reduce(
          (sum, extra) => sum + (extra.priceDelta ?? 0) * (extra.quantity ?? 1),
          0,
          ) * qty,
        );

        const isSpecialOffer = Number((selectedProduct as any).isSpecialOffer ?? 0) === 1;
        const rawDiscount = Number((selectedProduct as any).specialOfferDiscountPercent ?? 0);
        const discountPercent = isSpecialOffer ? Math.max(0, Math.min(100, Math.round(rawDiscount))) : 0;
        const effectiveBasePrice = this.roundMoney(selectedProduct.price * (1 - discountPercent / 100));
        const baseTotal = this.roundMoney(effectiveBasePrice * qty);
        const lineTotal = this.roundMoney(baseTotal + optionTotal + extraTotal);

        subtotal += baseTotal;
        extrasTotal += optionTotal + extraTotal;

        const [createdItem] = await tx
          .insert(orderItems)
          .values({
            orderId: createdOrder.id,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            basePrice: effectiveBasePrice,
            quantity: qty,
            notes: orderItemInput.notes || null,
            lineTotal,
          })
          .returning();

        const modifierPayload = [
          ...selectedOptions.map((option) => ({
            orderItemId: createdItem.id,
            modifierType: "option",
            modifierGroupName: option.groupName ?? null,
            modifierName: option.name,
            priceDelta: option.priceDelta ?? 0,
            quantity: 1,
          })),
          ...selectedExtras.map((extra) => ({
            orderItemId: createdItem.id,
            modifierType: "extra",
            modifierGroupName: extra.groupName?.trim() ? extra.groupName.trim() : null,
            modifierName: extra.name,
            priceDelta: extra.priceDelta ?? 0,
            quantity: extra.quantity ?? 1,
          })),
        ];

        const createdModifiers = modifierPayload.length > 0
          ? await tx.insert(orderItemModifiers).values(modifierPayload).returning()
          : [];

        createdItems.push({ ...createdItem, modifiers: createdModifiers });
      }

      const total = this.roundMoney(subtotal + extrasTotal);
      const orderNumber = this.formatOrderNumber(now, createdOrder.id);
      const [updatedOrder] = await tx
        .update(orders)
        .set({ orderNumber, subtotal, extrasTotal, total })
        .where(eq(orders.id, createdOrder.id))
        .returning();

      const shouldQueuePrintImmediately =
        (updatedOrder as any).paymentStatus === "succeeded" ||
        (updatedOrder as any).paymentStatus === "not_required";
      if (shouldQueuePrintImmediately) {
        await tx
          .insert(printJobs)
          .values({
            orderId: updatedOrder.id,
            status: "pending",
            attempts: 0,
            payload: JSON.stringify({ order: updatedOrder, items: createdItems }),
            createdAt: now,
          });
      } else if ((updatedOrder as any).paymentProvider === "cash_counter") {
        await tx
          .insert(printJobs)
          .values({
            orderId: updatedOrder.id,
            status: "pending",
            attempts: 0,
            payload: JSON.stringify({
              type: "cash_payment_notice",
              order: updatedOrder,
              message: "Cash order received. Awaiting payment confirmation.",
            }),
            createdAt: now,
          });
      }

      return { order: updatedOrder, items: createdItems };
    });
  }

  async getOrders(status?: string): Promise<Order[]> {
    if (status) {
      return db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.id));
    }
    return db.select().from(orders).orderBy(desc(orders.id));
  }

  async getOrderDetails(orderId: number): Promise<OrderDetails | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const itemIds = items.map((item) => item.id);
    const modifiers = itemIds.length > 0
      ? await db.select().from(orderItemModifiers).where(inArray(orderItemModifiers.orderItemId, itemIds))
      : [];

    const itemDetails = items.map((item) => ({
      ...item,
      modifiers: modifiers.filter((modifier) => modifier.orderItemId === item.id),
    }));

    return { order, items: itemDetails };
  }

  async getOpenOrderDetails(): Promise<OrderDetails[]> {
    const openStatuses = ["new", "accepted", "printing", "preparing", "ready"] as const;
    const openOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, [...openStatuses]))
      .orderBy(desc(orders.id));

    const results: OrderDetails[] = [];
    for (const order of openOrders) {
      const details = await this.getOrderDetails(order.id);
      if (details) {
        results.push(details);
      }
    }
    return results;
  }

  async getServedOrderDetails(limit = 100): Promise<OrderDetails[]> {
    const servedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "served"))
      .orderBy(desc(orders.id))
      .limit(limit);

    const results: OrderDetails[] = [];
    for (const order of servedOrders) {
      const details = await this.getOrderDetails(order.id);
      if (details) {
        results.push(details);
      }
    }
    return results;
  }

  async markOrderServed(orderId: number): Promise<Order | undefined> {
    return this.updateOrderStatus(orderId, "served");
  }

  async markOrderPaid(orderId: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return undefined;

    if ((order as any).paymentStatus === "succeeded") {
      return order;
    }

    const [updated] = await db
      .update(orders)
      .set({
        paymentStatus: "succeeded",
        paymentProvider: (order as any).paymentProvider || "cash_counter",
      } as any)
      .where(eq(orders.id, orderId))
      .returning();

    const existingPendingJob = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(and(eq(printJobs.orderId, orderId), eq(printJobs.status, "pending")))
      .limit(1);
    if (existingPendingJob.length === 0) {
      await this.createPrintJobForOrder(orderId);
    }
    return updated;
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async createPrintJobForOrder(orderId: number): Promise<PrintJob | undefined> {
    const orderDetails = await this.getOrderDetails(orderId);
    if (!orderDetails) {
      return undefined;
    }

    const [job] = await db
      .insert(printJobs)
      .values({
        orderId,
        status: "pending",
        attempts: 0,
        payload: JSON.stringify(orderDetails),
        createdAt: Date.now(),
      })
      .returning();

    await db.update(orders).set({ printStatus: "queued" }).where(eq(orders.id, orderId));
    return job;
  }

  async getPendingPrintJobs(limit = 20): Promise<PrintJob[]> {
    return db
      .select()
      .from(printJobs)
      .where(eq(printJobs.status, "pending"))
      .orderBy(printJobs.id)
      .limit(limit);
  }

  async getDispatchablePrintJobs(limit = 20): Promise<PrintJob[]> {
    const [settings] = await db.select().from(printerSettings).where(eq(printerSettings.id, 1)).limit(1);
    const maxAttempts = Math.max(
      1,
      Number(settings?.printerRetryMaxAttempts ?? process.env.PRINTER_RETRY_MAX_ATTEMPTS ?? 5) || 5,
    );
    const retryCooldownMs = Math.max(
      1000,
      Number(settings?.printerRetryCooldownMs ?? process.env.PRINTER_RETRY_COOLDOWN_MS ?? 15000) || 15000,
    );
    const now = Date.now();
    const retryBefore = now - retryCooldownMs;
    return db
      .select()
      .from(printJobs)
      .where(
        or(
          eq(printJobs.status, "pending"),
          and(
            eq(printJobs.status, "failed"),
            lt(printJobs.attempts, maxAttempts),
            lt(sql<number>`coalesce(${printJobs.processedAt}, 0)`, retryBefore),
          ),
        ),
      )
      .orderBy(printJobs.id)
      .limit(limit);
  }

  async getFailedPrintJobs(limit = 20): Promise<PrintJob[]> {
    return db
      .select()
      .from(printJobs)
      .where(eq(printJobs.status, "failed"))
      .orderBy(desc(printJobs.processedAt), desc(printJobs.id))
      .limit(limit);
  }

  async completePrintJob(jobId: number): Promise<PrintJob | undefined> {
    const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
    if (!job) return undefined;
    let isCashNotice = false;
    try {
      const parsed = JSON.parse(job.payload) as { type?: string };
      isCashNotice = parsed?.type === "cash_payment_notice";
    } catch {
      isCashNotice = false;
    }

    const now = Date.now();
    const [updated] = await db
      .update(printJobs)
      .set({
        status: "completed",
        processedAt: now,
      })
      .where(eq(printJobs.id, jobId))
      .returning();

    await db
      .update(orders)
      .set(
        isCashNotice
          ? ({ printStatus: "payment_pending" } as any)
          : ({ printStatus: "printed", printedAt: now } as any),
      )
      .where(eq(orders.id, job.orderId));
    return updated;
  }

  async failPrintJob(jobId: number, errorMessage: string): Promise<PrintJob | undefined> {
    const [existing] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
    if (!existing) return undefined;

    const now = Date.now();
    const [updated] = await db
      .update(printJobs)
      .set({
        status: "failed",
        attempts: existing.attempts + 1,
        lastError: errorMessage,
        processedAt: now,
      })
      .where(eq(printJobs.id, jobId))
      .returning();

    await db.update(orders).set({ printStatus: "failed" }).where(eq(orders.id, existing.orderId));
    return updated;
  }

  async getDailyRevenueStats(businessDate: string): Promise<DailyRevenueStats> {
    const { start, end } = this.toDateWindow(businessDate);
    const [stats] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        grossRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)));

    const [openResult] = await db
      .select({
        openOrders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          inArray(orders.status, ["new", "accepted", "printing", "preparing", "ready"]),
        ),
      );

    return {
      businessDate,
      totalOrders: Number(stats?.totalOrders ?? 0),
      grossRevenue: Number(stats?.grossRevenue ?? 0),
      openOrders: Number(openResult?.openOrders ?? 0),
    };
  }

  async closeDay(businessDate: string, purgeBeforeDate?: string): Promise<DailyClosure> {
    const stats = await this.getDailyRevenueStats(businessDate);
    const now = Date.now();

    await db
      .update(orders)
      .set({ status: "closed", closedAt: now })
      .where(
        and(
          gte(orders.createdAt, this.toDateWindow(businessDate).start),
          lt(orders.createdAt, this.toDateWindow(businessDate).end),
        ),
      );

    const [closure] = await db
      .insert(dailyClosures)
      .values({
        businessDate,
        totalOrders: stats.totalOrders,
        grossRevenue: stats.grossRevenue,
        purgeBeforeDate: purgeBeforeDate ?? null,
        createdAt: now,
      })
      .returning();

    if (purgeBeforeDate) {
      const purgeBeforeTs = this.toDateWindow(purgeBeforeDate).start;
      const oldOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(lt(orders.createdAt, purgeBeforeTs));

      const orderIds = oldOrders.map((order) => order.id);
      if (orderIds.length > 0) {
        const oldOrderItems = await db
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds));
        const orderItemIds = oldOrderItems.map((item) => item.id);

        if (orderItemIds.length > 0) {
          await db.delete(orderItemModifiers).where(inArray(orderItemModifiers.orderItemId, orderItemIds));
        }
        await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
        await db.delete(printJobs).where(inArray(printJobs.orderId, orderIds));
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }
    }

    return closure;
  }

  async getBrandingSettings(): Promise<BrandingSettings | undefined> {
    const [settings] = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1)).limit(1);
    return settings;
  }

  async upsertBrandingSettings(settings: InsertBrandingSettings): Promise<BrandingSettings> {
    const [updated] = await db
      .insert(brandingSettings)
      .values({
        id: 1,
        logoUrl: settings.logoUrl ?? null,
        footerLogoUrl: settings.footerLogoUrl ?? null,
        footerText: settings.footerText ?? null,
        headerTitle: settings.headerTitle ?? null,
        headerSubtitle: settings.headerSubtitle ?? null,
        backgroundImageUrl: settings.backgroundImageUrl ?? null,
        primaryColor: settings.primaryColor ?? null,
        secondaryColor: settings.secondaryColor ?? null,
        accentColor: settings.accentColor ?? null,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: brandingSettings.id,
        set: {
          logoUrl: settings.logoUrl ?? null,
          footerLogoUrl: settings.footerLogoUrl ?? null,
          footerText: settings.footerText ?? null,
          headerTitle: settings.headerTitle ?? null,
          headerSubtitle: settings.headerSubtitle ?? null,
          backgroundImageUrl: settings.backgroundImageUrl ?? null,
          primaryColor: settings.primaryColor ?? null,
          secondaryColor: settings.secondaryColor ?? null,
          accentColor: settings.accentColor ?? null,
          updatedAt: Date.now(),
        },
      })
      .returning();

    return updated;
  }

  async getPrinterSettings(): Promise<PrinterSettings | undefined> {
    const [settings] = await db.select().from(printerSettings).where(eq(printerSettings.id, 1)).limit(1);
    return settings;
  }

  async upsertPrinterSettings(settings: InsertPrinterSettings): Promise<PrinterSettings> {
    const [current] = await db.select().from(printerSettings).where(eq(printerSettings.id, 1)).limit(1);
    const isValidProfile = (value: string | null | undefined) =>
      value === "generic_escpos" ||
      value === "samsung_srp" ||
      value === "samsung_srp_font_b" ||
      value === "samsung_srp_legacy" ||
      value === "gprinter_escpos";
    const normalizedProfile =
      isValidProfile(settings.printerProfile)
        ? settings.printerProfile
        : isValidProfile(current?.printerProfile)
            ? current.printerProfile
            : "generic_escpos";
    const isValidBeepMode = (value: string | null | undefined) =>
      value === "auto" ||
      value === "off" ||
      value === "bel" ||
      value === "esc_b" ||
      value === "esc_p" ||
      value === "both" ||
      value === "both_plus_p";
    const normalizedBeepMode =
      isValidBeepMode(settings.printerBeepMode)
        ? settings.printerBeepMode
        : isValidBeepMode(current?.printerBeepMode)
            ? current.printerBeepMode
            : "auto";
    const normalizedBeepCount = Math.max(
      1,
      Math.min(9, Number(settings.printerBeepCount ?? current?.printerBeepCount ?? 4) || 4),
    );
    const normalizedBeepTiming = Math.max(
      1,
      Math.min(9, Number(settings.printerBeepTiming ?? current?.printerBeepTiming ?? 3) || 3),
    );
    const normalizedRetryMaxAttempts = Math.max(
      1,
      Math.min(20, Number(settings.printerRetryMaxAttempts ?? current?.printerRetryMaxAttempts ?? 5) || 5),
    );
    const normalizedRetryCooldownMs = Math.max(
      1000,
      Math.min(300000, Number(settings.printerRetryCooldownMs ?? current?.printerRetryCooldownMs ?? 15000) || 15000),
    );

    const [updated] = await db
      .insert(printerSettings)
      .values({
        id: 1,
        enabled: settings.enabled ?? 0,
        printerIp: settings.printerIp ?? null,
        printerPort: settings.printerPort ?? 9100,
        pollIntervalMs: settings.pollIntervalMs ?? 3000,
        printerProfile: normalizedProfile,
        printerBeepMode: normalizedBeepMode,
        printerBeepCount: normalizedBeepCount,
        printerBeepTiming: normalizedBeepTiming,
        printerRetryMaxAttempts: normalizedRetryMaxAttempts,
        printerRetryCooldownMs: normalizedRetryCooldownMs,
        lastError: null,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: printerSettings.id,
        set: {
          enabled: settings.enabled ?? 0,
          printerIp: settings.printerIp ?? null,
          printerPort: settings.printerPort ?? 9100,
          pollIntervalMs: settings.pollIntervalMs ?? 3000,
          printerProfile: normalizedProfile,
          printerBeepMode: normalizedBeepMode,
          printerBeepCount: normalizedBeepCount,
          printerBeepTiming: normalizedBeepTiming,
          printerRetryMaxAttempts: normalizedRetryMaxAttempts,
          printerRetryCooldownMs: normalizedRetryCooldownMs,
          lastError: null,
          updatedAt: Date.now(),
        },
      })
      .returning();

    return updated;
  }

  async updatePrinterHeartbeat(status: string, errorMessage?: string): Promise<PrinterSettings | undefined> {
    const [updated] = await db
      .update(printerSettings)
      .set({
        lastSeenAt: Date.now(),
        lastStatus: status,
        lastError: errorMessage ?? null,
      })
      .where(eq(printerSettings.id, 1))
      .returning();

    return updated;
  }

  async acquirePrinterLock(
    lockToken: string,
    holder: string,
    leaseMs: number,
  ): Promise<{ acquired: boolean; settings?: PrinterSettings }> {
    const now = Date.now();
    const expiresAt = now + Math.max(5000, leaseMs);
    const [current] = await db.select().from(printerSettings).where(eq(printerSettings.id, 1)).limit(1);

    if (!current) {
      return { acquired: false };
    }

    const lockExpired = !current.lockExpiresAt || current.lockExpiresAt < now;
    const sameToken = current.lockToken === lockToken;
    const lockAvailable = !current.lockToken || lockExpired || sameToken;

    if (!lockAvailable) {
      return { acquired: false, settings: current };
    }

    const [updated] = await db
      .update(printerSettings)
      .set({
        lockToken,
        lockHolder: holder,
        lockAcquiredAt: sameToken && current.lockAcquiredAt ? current.lockAcquiredAt : now,
        lockExpiresAt: expiresAt,
      })
      .where(eq(printerSettings.id, 1))
      .returning();

    return { acquired: true, settings: updated };
  }

  async renewPrinterLock(lockToken: string, leaseMs: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + Math.max(5000, leaseMs);
    const [updated] = await db
      .update(printerSettings)
      .set({
        lockExpiresAt: expiresAt,
      })
      .where(and(eq(printerSettings.id, 1), eq(printerSettings.lockToken, lockToken)))
      .returning();

    return !!updated;
  }

  async releasePrinterLock(lockToken: string): Promise<boolean> {
    const [updated] = await db
      .update(printerSettings)
      .set({
        lockToken: null,
        lockHolder: null,
        lockAcquiredAt: null,
        lockExpiresAt: null,
      })
      .where(and(eq(printerSettings.id, 1), eq(printerSettings.lockToken, lockToken)))
      .returning();

    return !!updated;
  }

  async hasValidPrinterLock(lockToken: string): Promise<boolean> {
    const now = Date.now();
    const [current] = await db.select().from(printerSettings).where(eq(printerSettings.id, 1)).limit(1);
    if (!current?.lockToken || !current.lockExpiresAt) return false;
    return current.lockToken === lockToken && current.lockExpiresAt >= now;
  }

  async getPaymentSettings(): Promise<PaymentSettings | undefined> {
    const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1);
    return settings;
  }

  async upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings> {
    const [updated] = await db
      .insert(paymentSettings)
      .values({
        id: 1,
        cardEnabled: settings.cardEnabled ?? 1,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: paymentSettings.id,
        set: {
          cardEnabled: settings.cardEnabled ?? 1,
          updatedAt: Date.now(),
        },
      })
      .returning();
    return updated;
  }

  async getQrGroups(): Promise<QrGroup[]> {
    return db.select().from(qrGroups).orderBy(desc(qrGroups.updatedAt), desc(qrGroups.id));
  }

  async getQrGroup(id: number): Promise<QrGroup | undefined> {
    const [group] = await db.select().from(qrGroups).where(eq(qrGroups.id, id)).limit(1);
    return group;
  }

  async createQrGroup(group: InsertQrGroup): Promise<QrGroup> {
    const now = Date.now();
    const [created] = await db
      .insert(qrGroups)
      .values({
        name: group.name.trim(),
        baseUrl: group.baseUrl.trim(),
        pickupPoint: (group.pickupPoint || "bar").trim(),
        tablePrefix: (group.tablePrefix || "T").trim(),
        tableStart: Math.max(1, group.tableStart ?? 1),
        tableEnd: Math.max(group.tableStart ?? 1, group.tableEnd ?? 20),
        tableLabelsText: group.tableLabelsText ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  async updateQrGroup(id: number, group: Partial<InsertQrGroup>): Promise<QrGroup | undefined> {
    const patch: Partial<InsertQrGroup> & { updatedAt: number } = {
      ...group,
      updatedAt: Date.now(),
    };
    if (typeof patch.name === "string") patch.name = patch.name.trim();
    if (typeof patch.baseUrl === "string") patch.baseUrl = patch.baseUrl.trim();
    if (typeof patch.pickupPoint === "string") patch.pickupPoint = patch.pickupPoint.trim();
    if (typeof patch.tablePrefix === "string") patch.tablePrefix = patch.tablePrefix.trim();

    const [updated] = await db
      .update(qrGroups)
      .set(patch as any)
      .where(eq(qrGroups.id, id))
      .returning();
    return updated;
  }

  async deleteQrGroup(id: number): Promise<boolean> {
    const deleted = await db.delete(qrGroups).where(eq(qrGroups.id, id)).returning();
    return deleted.length > 0;
  }
}

export const storage = new DatabaseStorage();

