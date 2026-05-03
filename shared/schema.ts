import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  order: integer("order").notNull(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: real("price").notNull(),
  description: text("description").notNull(),
  details: text("details"),
  imageUrl: text("image_url"),
  categoryId: integer("category_id").notNull(),
  isSpecialOffer: integer("is_special_offer").notNull().default(0),
  isTopSelling: integer("is_top_selling").notNull().default(0),
  specialOfferDiscountPercent: integer("special_offer_discount_percent").notNull().default(0),
});

export const productOptionGroups = sqliteTable("product_option_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  isRequired: integer("is_required").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productOptions = sqliteTable("product_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull(),
  name: text("name").notNull(),
  priceDelta: real("price_delta").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  isDefault: integer("is_default").notNull().default(0),
});

export const productExtras = sqliteTable("product_extras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  priceDelta: real("price_delta").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("new"),
  printStatus: text("print_status").notNull().default("pending"),
  serviceMode: text("service_mode").notNull().default("pickup"),
  tableCode: text("table_code"),
  tableLabel: text("table_label"),
  pickupPoint: text("pickup_point"),
  sourceToken: text("source_token"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  notes: text("notes"),
  subtotal: real("subtotal").notNull().default(0),
  extrasTotal: real("extras_total").notNull().default(0),
  total: real("total").notNull().default(0),
  /** not_required | pending | authorized | succeeded | failed — card/POS settlement */
  paymentStatus: text("payment_status").notNull().default("not_required"),
  paymentProvider: text("payment_provider"),
  paymentIntentId: text("payment_intent_id"),
  createdAt: integer("created_at").notNull().default(Date.now()),
  printedAt: integer("printed_at"),
  closedAt: integer("closed_at"),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  basePrice: real("base_price").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  lineTotal: real("line_total").notNull(),
});

export const orderItemModifiers = sqliteTable("order_item_modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderItemId: integer("order_item_id").notNull(),
  modifierType: text("modifier_type").notNull(),
  modifierGroupName: text("modifier_group_name"),
  modifierName: text("modifier_name").notNull(),
  priceDelta: real("price_delta").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
});

export const printJobs = sqliteTable("print_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull().default(Date.now()),
  processedAt: integer("processed_at"),
});

export const dailyClosures = sqliteTable("daily_closures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessDate: text("business_date").notNull(),
  totalOrders: integer("total_orders").notNull().default(0),
  grossRevenue: real("gross_revenue").notNull().default(0),
  purgeBeforeDate: text("purge_before_date"),
  createdAt: integer("created_at").notNull().default(Date.now()),
});

export const brandingSettings = sqliteTable("branding_settings", {
  id: integer("id").primaryKey(),
  logoUrl: text("logo_url"),
  footerLogoUrl: text("footer_logo_url"),
  footerText: text("footer_text"),
  headerTitle: text("header_title"),
  headerSubtitle: text("header_subtitle"),
  backgroundImageUrl: text("background_image_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

export const printerSettings = sqliteTable("printer_settings", {
  id: integer("id").primaryKey(),
  enabled: integer("enabled").notNull().default(0),
  printerIp: text("printer_ip"),
  printerPort: integer("printer_port").notNull().default(9100),
  pollIntervalMs: integer("poll_interval_ms").notNull().default(3000),
  printerProfile: text("printer_profile").notNull().default("generic_escpos"),
  printerBeepMode: text("printer_beep_mode").notNull().default("auto"),
  printerBeepCount: integer("printer_beep_count").notNull().default(4),
  printerBeepTiming: integer("printer_beep_timing").notNull().default(3),
  printerRetryMaxAttempts: integer("printer_retry_max_attempts").notNull().default(5),
  printerRetryCooldownMs: integer("printer_retry_cooldown_ms").notNull().default(15000),
  lastSeenAt: integer("last_seen_at"),
  lastStatus: text("last_status"),
  lastError: text("last_error"),
  lockToken: text("lock_token"),
  lockHolder: text("lock_holder"),
  lockAcquiredAt: integer("lock_acquired_at"),
  lockExpiresAt: integer("lock_expires_at"),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'advertisement' or 'promotional'
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isActive: integer("is_active").notNull().default(1), // 1 for active, 0 for inactive
});

// Session storage table.
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(), // JSON stored as text in SQLite
    expire: integer("expire").notNull(), // Unix timestamp
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const adminSecurity = sqliteTable("admin_security", {
  id: integer("id").primaryKey(),
  passcodeHash: text("passcode_hash"),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

// User storage table.
export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
}).extend({
  details: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isSpecialOffer: z.number().min(0).max(1).default(0),
  isTopSelling: z.number().min(0).max(1).default(0),
  specialOfferDiscountPercent: z.number().min(0).max(100).default(0),
});

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
}).extend({
  altText: z.string().optional(),
  isActive: z.number().min(0).max(1).default(1),
});

export const insertProductOptionGroupSchema = createInsertSchema(productOptionGroups).omit({
  id: true,
}).extend({
  isRequired: z.number().min(0).max(1).default(0),
});

export const insertProductOptionSchema = createInsertSchema(productOptions).omit({
  id: true,
}).extend({
  isActive: z.number().min(0).max(1).default(1),
  isDefault: z.number().min(0).max(1).default(0),
});

export const insertProductExtraSchema = createInsertSchema(productExtras).omit({
  id: true,
}).extend({
  isActive: z.number().min(0).max(1).default(1),
});

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).pick({
  logoUrl: true,
  footerLogoUrl: true,
  footerText: true,
  headerTitle: true,
  headerSubtitle: true,
  backgroundImageUrl: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
});

export const insertPrinterSettingsSchema = createInsertSchema(printerSettings).pick({
  enabled: true,
  printerIp: true,
  printerPort: true,
  pollIntervalMs: true,
  printerProfile: true,
  printerBeepMode: true,
  printerBeepCount: true,
  printerBeepTiming: true,
  printerRetryMaxAttempts: true,
  printerRetryCooldownMs: true,
}).extend({
  enabled: z.number().min(0).max(1),
  printerProfile: z
    .enum([
      "generic_escpos",
      "samsung_srp",
      "samsung_srp_font_b",
      "samsung_srp_legacy",
      "gprinter_escpos",
    ])
    .optional(),
  printerBeepMode: z.enum(["auto", "off", "bel", "esc_b", "esc_p", "both", "both_plus_p"]).optional(),
  printerBeepCount: z.number().min(1).max(9).optional(),
  printerBeepTiming: z.number().min(1).max(9).optional(),
  printerRetryMaxAttempts: z.number().min(1).max(20).optional(),
  printerRetryCooldownMs: z.number().min(1000).max(300000).optional(),
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertProductOptionGroup = z.infer<typeof insertProductOptionGroupSchema>;
export type ProductOptionGroup = typeof productOptionGroups.$inferSelect;
export type InsertProductOption = z.infer<typeof insertProductOptionSchema>;
export type ProductOption = typeof productOptions.$inferSelect;
export type InsertProductExtra = z.infer<typeof insertProductExtraSchema>;
export type ProductExtra = typeof productExtras.$inferSelect;
export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;
export type InsertPrinterSettings = z.infer<typeof insertPrinterSettingsSchema>;
export type PrinterSettings = typeof printerSettings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;
export type InsertOrderItemModifier = typeof orderItemModifiers.$inferInsert;
export type PrintJob = typeof printJobs.$inferSelect;
export type InsertPrintJob = typeof printJobs.$inferInsert;
export type DailyClosure = typeof dailyClosures.$inferSelect;
export type InsertDailyClosure = typeof dailyClosures.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;



