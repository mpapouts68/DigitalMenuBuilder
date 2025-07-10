import { mysqlTable, int, text, timestamp, decimal, boolean, varchar, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Staff table - matches existing Staff table structure
export const staff = mysqlTable("staff", {
  staffId: int("staff_id").primaryKey().autoincrement(),
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
  priceCat: int("price_cat"),
  printerOn: boolean("printer_on").default(false),
  menuCard: int("menu_card"),
  orderBy: text("order_by"),
  orderByMenu: text("order_by_menu"),
  startUpMenu: text("start_up_menu"),
  maxDiscount: int("max_discount"),
});

// Posts_Main table - restaurant tables/posts
export const postsMain = mysqlTable("posts_main", {
  yperMainId: int("yper_main_id").primaryKey().autoincrement(),
  postId: int("post_id").notNull().unique(),
  description: text("description"),
  postNumber: int("post_number"),
  active: boolean("active").default(true),
  heeftPool: boolean("heeft_pool").default(false),
  reserve: boolean("reserve").default(false),
  nameReserve: text("name_reserve"),
  reserveId: int("reserve_id"),
  time: timestamp("time"),
  checkInTime: timestamp("check_in_time"),
  split: boolean("split").default(false),
  sortNumber: int("sort_number"),
  top: int("top"), // Layout positioning
  left: int("left"), // Layout positioning
  clerkId: int("clerk_id"),
  activeOrderId: double("active_order_id"),
  iconId: int("icon_id"),
  iconIdOccu: int("icon_id_occu"),
});

// ProductGroups table
export const productGroups = mysqlTable("product_groups", {
  productGroupId: int("product_group_id").primaryKey().autoincrement(),
  description: text("description").notNull(),
  description2: text("description2"),
  sortNumber: int("sort_number").default(0),
  printer: text("printer"),
  view: int("view"),
  viewOrder: int("view_order"),
  extraId: int("extra_id"),
  iconId: int("icon_id"),
  isSub: boolean("is_sub").default(false),
  subFromGroupId: int("sub_from_group_id"),
  hasSub: boolean("has_sub").default(false),
  options: text("options"),
  rowPrint: int("row_print"),
  importId: int("import_id"),
  picturePath: text("picture_path"),
  quickMenu: boolean("quick_menu").default(false),
});

// Products table
export const products = mysqlTable("products", {
  productId: int("product_id").primaryKey().autoincrement(),
  description: text("description").notNull(),
  description2: text("description2"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  productType: text("product_type"),
  unit: text("unit"),
  productGroupId: int("product_group_id"),
  printerName: text("printer_name"),
  vat: int("vat"),
  build: boolean("build").default(false),
  extraId: int("extra_id"),
  rowPrint: int("row_print"),
  iconId: int("icon_id"),
  autoExtra: boolean("auto_extra").default(false),
  hasOptions: boolean("has_options").default(false),
  extraIdKey: int("extra_id_key"),
  picturePath: text("picture_path"),
  recipeId: int("recipe_id"),
  purchased: double("purchased").default(0),
  sold: double("sold").default(0),
  stock: double("stock").default(0),
  stockCorrection: double("stock_correction").default(0),
  picture: text("picture"),
  menuNumber: int("menu_number"), // For Chinese numeric ordering
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
export const orders = mysqlTable("orders", {
  orderId: double("order_id").primaryKey(),
  timeDate: timestamp("time_date").defaultNow().notNull(),
  clerkId: int("clerk_id"),
  orderType: text("order_type"),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).default("0.00"),
  receipt: boolean("receipt").default(false),
  history: boolean("history").default(false),
  served: boolean("served").default(false),
  postId: int("post_id"),
  nameId: int("name_id"),
  customerId: int("customer_id"),
  hasDiscount: boolean("has_discount").default(false),
  discountPercentage: int("discount_percentage"),
  closed: boolean("closed").default(false),
  closedDate: timestamp("closed_date"),
  orderDiscountAmount: double("order_discount_amount").default(0),
  orderTotalAfterD: double("order_total_after_d").default(0),
  splitPayment: decimal("split_payment", { precision: 10, scale: 2 }),
  catIdOpen: int("cat_id_open"),
  catIdClose: int("cat_id_close"),
  vatHigh: decimal("vat_high", { precision: 10, scale: 2 }),
  vatLow: decimal("vat_low", { precision: 10, scale: 2 }),
  employeeId: int("employee_id"),
  numberOfPersons: int("number_of_persons"),
});

// Orders_Actual table - current order items
export const ordersActual = mysqlTable("orders_actual", {
  orderIdSub: int("order_id_sub").primaryKey().autoincrement(),
  orderId: double("order_id"),
  productId: int("product_id"),
  unit: text("unit"),
  quantity: int("quantity").default(1),
  postId: int("post_id"),
  nameId: int("name_id"),
  postP2Id: int("post_p2_id"),
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
  servingRow: int("serving_row"),
  hasExtra: boolean("has_extra").default(false),
  served: boolean("served").default(false),
  ecrVoidLine: int("ecr_void_line"),
});

// Sessions for mobile authentication
export const sessions = mysqlTable("sessions", {
  id: text("id").primaryKey(),
  staffId: int("staff_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for forms
export const insertStaffSchema = createInsertSchema(staff).omit({
  staffId: true,
});

export const insertPostsMainSchema = createInsertSchema(postsMain).omit({
  yperMainId: true,
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