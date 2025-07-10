import { pgTable, serial, text, timestamp, integer, decimal, boolean, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Staff table - matches existing Staff table structure
export const staff = pgTable("staff", {
  staffId: serial("staff_id").primaryKey(),
  name: text("name").notNull(),
  surName: text("sur_name"),
  password: text("password").notNull(), // PIN for mobile login
  menu: text("menu"),
  pdaToCash: boolean("pda_to_cash").default(false),
  discount: boolean("discount").default(false),
  stats: boolean("stats").default(false),
  admin: boolean("admin").default(false),
  printer: text("printer"),
  role: text("role"),
  displayLanguage: text("display_language"),
  picture: text("picture"),
  freeDrinks: boolean("free_drinks").default(false),
  priceCat: integer("price_cat"),
  printerOn: boolean("printer_on").default(false),
  menuCard: integer("menu_card"),
  orderBy: text("order_by"),
  orderByMenu: text("order_by_menu"),
  startUpMenu: text("start_up_menu"),
  maxDiscount: integer("max_discount"),
});

// Yper_Posts table - restaurant areas/sections
export const yperPosts = pgTable("yper_posts", {
  yperMainId: serial("yper_main_id").primaryKey(),
  description: text("description").notNull(),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts_Main table - restaurant tables/posts
export const postsMain = pgTable("posts_main", {
  postId: serial("post_id").primaryKey(),
  description: text("description"),
  postNumber: integer("post_number"),
  active: boolean("active").default(true),
  heeftPool: boolean("heeft_pool").default(false),
  reserve: boolean("reserve").default(false),
  nameReserve: text("name_reserve"),
  reserveId: integer("reserve_id"),
  time: timestamp("time"),
  checkInTime: timestamp("check_in_time"),
  split: boolean("split").default(false),
  sortNumber: integer("sort_number"),
  top: integer("top"), // Layout positioning
  left: integer("left"), // Layout positioning
  clerkId: integer("clerk_id"),
  activeOrderId: doublePrecision("active_order_id"),
  iconId: integer("icon_id"),
  iconIdOccu: integer("icon_id_occu"),
  yperMainId: integer("yper_main_id").references(() => yperPosts.yperMainId),
});

// ProductGroups table
export const productGroups = pgTable("product_groups", {
  productGroupId: serial("product_group_id").primaryKey(),
  description: text("description").notNull(),
  description2: text("description2"),
  sortNumber: integer("sort_number").default(0),
  printer: text("printer"),
  view: integer("view"),
  viewOrder: integer("view_order"),
  extraId: integer("extra_id"),
  iconId: integer("icon_id"),
  isSub: boolean("is_sub").default(false),
  subFromGroupId: integer("sub_from_group_id"),
  hasSub: boolean("has_sub").default(false),
  options: text("options"),
  rowPrint: integer("row_print"),
  importId: integer("import_id"),
  picturePath: text("picture_path"),
  quickMenu: boolean("quick_menu").default(false),
});

// Products table
export const products = pgTable("products", {
  productId: serial("product_id").primaryKey(),
  description: text("description").notNull(),
  description2: text("description2"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  productType: text("product_type"),
  unit: text("unit"),
  productGroupId: integer("product_group_id").references(() => productGroups.productGroupId),
  printerName: text("printer_name"),
  vat: integer("vat"),
  build: boolean("build").default(false),
  extraId: integer("extra_id"),
  rowPrint: integer("row_print"),
  iconId: integer("icon_id"),
  autoExtra: boolean("auto_extra").default(false),
  hasOptions: boolean("has_options").default(false),
  extraIdKey: integer("extra_id_key"),
  picturePath: text("picture_path"),
  recipeId: integer("recipe_id"),
  purchased: doublePrecision("purchased").default(0),
  sold: doublePrecision("sold").default(0),
  stock: doublePrecision("stock").default(0),
  stockCorrection: doublePrecision("stock_correction").default(0),
  picture: text("picture"),
  menuNumber: integer("menu_number"), // For Chinese numeric ordering
  options: text("options"),
  includeGroup: boolean("include_group").default(false),
  favorite: boolean("favorite").default(false),
  combo: boolean("combo").default(false),
  partOfCombo: boolean("part_of_combo").default(false),
  drinkOrFood: text("drink_or_food"),
  cPrinter: text("c_printer"),
  portionCount: boolean("portion_count").default(false),
  saleLock: boolean("sale_lock").default(false),
  countPersons: boolean("count_persons").default(false),
});

// Orders table
export const orders = pgTable("orders", {
  orderId: doublePrecision("order_id").primaryKey(),
  timeDate: timestamp("time_date").defaultNow().notNull(),
  clerkId: integer("clerk_id"),
  orderType: text("order_type"),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).default("0.00"),
  receipt: boolean("receipt").default(false),
  history: boolean("history").default(false),
  served: boolean("served").default(false),
  postId: integer("post_id").references(() => postsMain.postId),
  nameId: integer("name_id"),
  customerId: integer("customer_id"),
  hasDiscount: boolean("has_discount").default(false),
  discountPercentage: integer("discount_percentage"),
  closed: boolean("closed").default(false),
  closedDate: timestamp("closed_date"),
  orderDiscountAmount: doublePrecision("order_discount_amount").default(0),
  orderTotalAfterD: doublePrecision("order_total_after_d").default(0),
  splitPayment: decimal("split_payment", { precision: 10, scale: 2 }),
  catIdOpen: integer("cat_id_open"),
  catIdClose: integer("cat_id_close"),
  vatHigh: decimal("vat_high", { precision: 10, scale: 2 }),
  vatLow: decimal("vat_low", { precision: 10, scale: 2 }),
  employeeId: integer("employee_id"),
  numberOfPersons: integer("number_of_persons"),
});

// Orders_Actual table - current order items
export const ordersActual = pgTable("orders_actual", {
  orderIdSub: serial("order_id_sub").primaryKey(),
  orderId: doublePrecision("order_id").references(() => orders.orderId),
  productId: integer("product_id").references(() => products.productId),
  unit: text("unit"),
  quantity: integer("quantity").default(1),
  postId: integer("post_id"),
  nameId: integer("name_id"),
  postP2Id: integer("post_p2_id"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  descriptionEx: text("description_ex"),
  descriptionExUk: text("description_ex_uk"),
  printer: boolean("printer").default(false),
  receipt: boolean("receipt").default(false),
  orderTime: timestamp("order_time").defaultNow().notNull(),
  staffId: text("staff_id"),
  personelClosed: boolean("personel_closed").default(false),
  free: boolean("free").default(false),
  priceFree: decimal("price_free", { precision: 10, scale: 2 }),
  cancelled: boolean("cancelled").default(false),
  orderBy: text("order_by"),
  servingRow: integer("serving_row"),
  hasExtra: boolean("has_extra").default(false),
  served: boolean("served").default(false),
  ecrVoidLine: integer("ecr_void_line"),
});

// Sessions for mobile authentication
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.staffId),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for forms
export const insertStaffSchema = createInsertSchema(staff).omit({
  staffId: true,
});

export const insertYperPostsSchema = createInsertSchema(yperPosts).omit({
  yperMainId: true,
  createdAt: true,
});

export const insertPostsMainSchema = createInsertSchema(postsMain).omit({
  postId: true,
});

export const insertProductGroupSchema = createInsertSchema(productGroups).omit({
  productGroupId: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  productId: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  orderId: true,
  timeDate: true,
});

export const insertOrdersActualSchema = createInsertSchema(ordersActual).omit({
  orderIdSub: true,
  orderTime: true,
});

// Type exports
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type YperPosts = typeof yperPosts.$inferSelect;
export type InsertYperPosts = z.infer<typeof insertYperPostsSchema>;

export type PostsMain = typeof postsMain.$inferSelect;
export type InsertPostsMain = z.infer<typeof insertPostsMainSchema>;

export type ProductGroup = typeof productGroups.$inferSelect;
export type InsertProductGroup = z.infer<typeof insertProductGroupSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrdersActual = typeof ordersActual.$inferSelect;
export type InsertOrdersActual = z.infer<typeof insertOrdersActualSchema>;

// Extended types for API responses
export type OrderWithItems = Order & {
  items: OrdersActual[];
  table?: PostsMain;
  staff?: Staff;
};

export type ProductWithGroup = Product & {
  group?: ProductGroup;
};

export type TableWithOrder = PostsMain & {
  currentOrder?: Order;
};

// Login response type
export type LoginResponse = {
  success: boolean;
  staff?: Staff;
  token?: string;
  message?: string;
};

// Cache data structure for mobile app
export type CacheData = {
  products: ProductWithGroup[];
  groups: ProductGroup[];
  tables: TableWithOrder[];
};