import { db } from "./db";
import { 
  staff, 
  postsMain, 
  productGroups, 
  products, 
  orders, 
  ordersActual,
  sessions,
  yperPosts,
  type Staff,
  type PostsMain,
  type ProductGroup,
  type Product,
  type Order,
  type OrdersActual,
  type YperPosts,
  type InsertStaff,
  type InsertPostsMain,
  type InsertProductGroup,
  type InsertProduct,
  type InsertOrder,
  type InsertOrdersActual,
  type LoginResponse,
  type CacheData,
  type ProductWithGroup,
  type TableWithOrder,
  type OrderWithItems
} from "@shared/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Authentication
  authenticateStaff(password: string): Promise<LoginResponse>;
  createSession(staffId: number): Promise<string>;
  validateSession(sessionId: string): Promise<Staff | null>;
  
  // Cache data loading
  getCacheData(): Promise<CacheData>;
  
  // Staff operations
  getStaff(staffId: number): Promise<Staff | undefined>;
  
  // Table operations
  getTables(): Promise<TableWithOrder[]>;
  getTable(postId: number): Promise<PostsMain | undefined>;
  updateTableStatus(postId: number, activeOrderId?: number): Promise<boolean>;
  
  // Areas operations
  getAreas(): Promise<YperPosts[]>;
  
  // Product operations
  getProducts(): Promise<ProductWithGroup[]>;
  getProductsByGroup(groupId: number): Promise<ProductWithGroup[]>;
  getProduct(productId: number): Promise<Product | undefined>;
  
  // Group operations
  getGroups(): Promise<ProductGroup[]>;
  getGroup(groupId: number): Promise<ProductGroup | undefined>;
  
  // Order operations
  getOrder(orderId: number): Promise<OrderWithItems | undefined>;
  getOrdersByTable(postId: number): Promise<OrderWithItems[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(orderId: number, updates: Partial<InsertOrder>): Promise<Order | undefined>;
  closeOrder(orderId: number): Promise<boolean>;
  
  // Order item operations
  getOrderItems(orderId: number): Promise<OrdersActual[]>;
  addOrderItem(item: InsertOrdersActual): Promise<OrdersActual>;
  updateOrderItem(itemId: number, updates: Partial<InsertOrdersActual>): Promise<OrdersActual | undefined>;
  removeOrderItem(itemId: number): Promise<boolean>;
  
  // Statistics
  getStaffStatistics(staffId: number, dateFrom?: Date, dateTo?: Date): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async authenticateStaff(password: string): Promise<LoginResponse> {
    try {
      const [user] = await db
        .select()
        .from(staff)
        .where(eq(staff.password, password))
        .limit(1);
      
      if (!user) {
        return { success: false, message: "Invalid PIN" };
      }
      
      const token = await this.createSession(user.staffId);
      
      return {
        success: true,
        staff: user,
        token,
        message: "Login successful"
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return { success: false, message: "Authentication failed" };
    }
  }
  
  async createSession(staffId: number): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await db.insert(sessions).values({
      id: sessionId,
      staffId,
      expiresAt
    });
    
    return sessionId;
  }
  
  async validateSession(sessionId: string): Promise<Staff | null> {
    try {
      const [session] = await db
        .select({
          staff: staff,
          expiresAt: sessions.expiresAt
        })
        .from(sessions)
        .innerJoin(staff, eq(sessions.staffId, staff.staffId))
        .where(eq(sessions.id, sessionId))
        .limit(1);
      
      if (!session || session.expiresAt < new Date()) {
        return null;
      }
      
      return session.staff;
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }
  
  async getCacheData(): Promise<CacheData> {
    const [productsData, groupsData, tablesData] = await Promise.all([
      this.getProducts(),
      this.getGroups(),
      this.getTables()
    ]);
    
    return {
      products: productsData,
      groups: groupsData,
      tables: tablesData
    };
  }
  
  async getStaff(staffId: number): Promise<Staff | undefined> {
    const [user] = await db
      .select()
      .from(staff)
      .where(eq(staff.staffId, staffId))
      .limit(1);
    
    return user;
  }
  
  async getTables(): Promise<TableWithOrder[]> {
    try {
      // Use raw query to match the actual table structure
      const result = await db.execute(`
        SELECT post_id, post_number, description, active, reserve, name_reserve
        FROM posts_main
        ORDER BY post_number ASC
      `);
      
      return (result.rows as any[]).map((row, index) => {
        // Assign areas based on table numbers for demonstration
        let areaId = 1; // Default to Main Dining
        const tableNum = row.post_number || row.post_id;
        
        if (tableNum >= 1 && tableNum <= 7) areaId = 1;      // Main Dining
        else if (tableNum >= 8 && tableNum <= 14) areaId = 2;  // Terrace
        else if (tableNum >= 15 && tableNum <= 21) areaId = 3; // Bar Area
        else if (tableNum >= 22 && tableNum <= 28) areaId = 4; // Private Room
        else if (tableNum >= 29 && tableNum <= 35) areaId = 5; // Garden
        
        return {
          yperMainId: areaId,
          postId: row.post_id,
          description: row.description || `Table ${row.post_number}`,
          postNumber: row.post_number,
          active: row.active !== false, // Default to true if null
          heeftPool: false,
          reserve: row.reserve || false,
          nameReserve: row.name_reserve,
          reserveId: null,
          time: null,
          checkInTime: null,
          split: false,
          sortNumber: row.post_number || row.post_id,
          top: null,
          left: null,
          clerkId: null,
          activeOrderId: null,
          iconId: null,
          iconIdOccu: null,
          currentOrder: undefined
        };
      });
    } catch (error) {
      console.error("Error getting tables:", error);
      return [];
    }
  }
  
  async getTable(postId: number): Promise<PostsMain | undefined> {
    const [table] = await db
      .select()
      .from(postsMain)
      .where(eq(postsMain.postId, postId))
      .limit(1);
    
    return table;
  }
  
  async updateTableStatus(postId: number, activeOrderId?: number): Promise<boolean> {
    try {
      await db
        .update(postsMain)
        .set({
          activeOrderId: activeOrderId || null,
          time: new Date()
        })
        .where(eq(postsMain.postId, postId));
      
      return true;
    } catch (error) {
      console.error("Error updating table status:", error);
      return false;
    }
  }
  
  async getProducts(): Promise<ProductWithGroup[]> {
    try {
      // Use raw query for existing products table structure
      const result = await db.execute(`
        SELECT p.id, p.name, p.description, p.details, p.price, p.category_id, p.image_url,
               c.description as category_name
        FROM products p
        LEFT JOIN product_groups c ON p.category_id = c.product_group_id
        ORDER BY p.id
      `);
      
      return (result.rows as any[]).map((row) => ({
        productId: row.id,
        description: row.name || row.description || '',
        description2: row.details,
        price: row.price?.toString() || '0.00',
        productType: null,
        unit: null,
        productGroupId: row.category_id,
        printerName: null,
        vat: null,
        build: false,
        extraId: null,
        rowPrint: null,
        iconId: null,
        autoExtra: false,
        hasOptions: false,
        extraIdKey: null,
        picturePath: null,
        recipeId: null,
        purchased: 0,
        sold: 0,
        stock: 0,
        stockCorrection: 0,
        picture: row.image_url,
        menuNumber: row.id,
        options: null,
        favorite: false,
        saleLock: false,
        countPersons: false,
        includeGroup: false,
        combo: false,
        partOfCombo: false,
        drinkOrFood: null,
        cPrinter: null,
        portionCount: false,
        group: row.category_name ? {
          productGroupId: row.category_id,
          description: row.category_name,
          description2: null,
          sortNumber: 0,
          printer: null,
          view: null,
          viewOrder: null,
          extraId: null,
          iconId: null,
          isSub: false,
          subFromGroupId: null,
          hasSub: false,
          options: null,
          rowPrint: null,
          importId: null,
          picturePath: null,
          quickMenu: false
        } : undefined
      }));
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }
  
  async getProductsByGroup(groupId: number): Promise<ProductWithGroup[]> {
    try {
      // Return empty array for now while we fix the database schema
      return [];
    } catch (error) {
      console.error("Error getting products by group:", error);
      return [];
    }
  }
  
  async getProduct(productId: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.productId, productId))
      .limit(1);
    
    return product;
  }
  
  async getGroups(): Promise<ProductGroup[]> {
    try {
      // Use raw query for existing product_groups table with hierarchical support
      const result = await db.execute(`
        SELECT product_group_id, description, sort_order, active, created_at, has_sub, is_sub, sub_from_group_id
        FROM product_groups
        WHERE active = true
        ORDER BY 
          CASE WHEN is_sub = false THEN sort_order ELSE 999 END ASC,
          sub_from_group_id ASC,
          sort_order ASC,
          product_group_id ASC
      `);
      
      return (result.rows as any[]).map((row) => ({
        productGroupId: row.product_group_id,
        description: row.description || '',
        description2: null,
        sortNumber: row.sort_order || 0,
        printer: null,
        view: null,
        viewOrder: null,
        extraId: null,
        iconId: null,
        isSub: row.is_sub || false,
        subFromGroupId: row.sub_from_group_id || null,
        hasSub: row.has_sub || false,
        options: null,
        rowPrint: null,
        importId: null,
        picturePath: null,
        quickMenu: false
      }));
    } catch (error) {
      console.error("Error getting groups:", error);
      return [];
    }
  }
  
  async getGroup(groupId: number): Promise<ProductGroup | undefined> {
    const [group] = await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.productGroupId, groupId))
      .limit(1);
    
    return group;
  }
  
  async getOrder(orderId: number): Promise<OrderWithItems | undefined> {
    const [orderData] = await db
      .select({
        order: orders,
        table: postsMain,
        staff: staff
      })
      .from(orders)
      .leftJoin(postsMain, eq(orders.postId, postsMain.postId))
      .leftJoin(staff, eq(orders.employeeId, staff.staffId))
      .where(eq(orders.orderId, orderId))
      .limit(1);
    
    if (!orderData) return undefined;
    
    const items = await this.getOrderItems(orderId);
    
    return {
      ...orderData.order,
      items,
      table: orderData.table || undefined,
      staff: orderData.staff || undefined
    };
  }
  
  async getOrdersByTable(postId: number): Promise<OrderWithItems[]> {
    const ordersData = await db
      .select({
        order: orders,
        table: postsMain,
        staff: staff
      })
      .from(orders)
      .leftJoin(postsMain, eq(orders.postId, postsMain.postId))
      .leftJoin(staff, eq(orders.employeeId, staff.staffId))
      .where(and(
        eq(orders.postId, postId),
        eq(orders.closed, false)
      ))
      .orderBy(desc(orders.timeDate));
    
    const result: OrderWithItems[] = [];
    
    for (const orderData of ordersData) {
      const items = await this.getOrderItems(orderData.order.orderId);
      result.push({
        ...orderData.order,
        items,
        table: orderData.table || undefined,
        staff: orderData.staff || undefined
      });
    }
    
    return result;
  }
  
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const orderId = Date.now(); // Use timestamp as order ID
    
    const [order] = await db
      .insert(orders)
      .values({
        ...orderData,
        orderId
      })
      .returning();
    
    // Update table status
    if (orderData.postId) {
      await this.updateTableStatus(orderData.postId, orderId);
    }
    
    return order;
  }
  
  async updateOrder(orderId: number, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.orderId, orderId))
      .returning();
    
    return order;
  }
  
  async closeOrder(orderId: number): Promise<boolean> {
    try {
      const [order] = await db
        .update(orders)
        .set({
          closed: true,
          closedDate: new Date(),
          history: true
        })
        .where(eq(orders.orderId, orderId))
        .returning();
      
      // Free the table
      if (order?.postId) {
        await this.updateTableStatus(order.postId);
      }
      
      return true;
    } catch (error) {
      console.error("Error closing order:", error);
      return false;
    }
  }
  
  async getOrderItems(orderId: number): Promise<OrdersActual[]> {
    return await db
      .select()
      .from(ordersActual)
      .where(eq(ordersActual.orderId, orderId))
      .orderBy(asc(ordersActual.servingRow));
  }
  
  async addOrderItem(item: InsertOrdersActual): Promise<OrdersActual> {
    const [orderItem] = await db
      .insert(ordersActual)
      .values(item)
      .returning();
    
    // Update order total
    await this.updateOrderTotal(item.orderId!);
    
    return orderItem;
  }
  
  async updateOrderItem(itemId: number, updates: Partial<InsertOrdersActual>): Promise<OrdersActual | undefined> {
    const [orderItem] = await db
      .update(ordersActual)
      .set(updates)
      .where(eq(ordersActual.orderIdSub, itemId))
      .returning();
    
    if (orderItem && orderItem.orderId) {
      await this.updateOrderTotal(orderItem.orderId);
    }
    
    return orderItem;
  }
  
  async removeOrderItem(itemId: number): Promise<boolean> {
    try {
      const [orderItem] = await db
        .select()
        .from(ordersActual)
        .where(eq(ordersActual.orderIdSub, itemId))
        .limit(1);
      
      if (!orderItem) return false;
      
      await db
        .delete(ordersActual)
        .where(eq(ordersActual.orderIdSub, itemId));
      
      if (orderItem.orderId) {
        await this.updateOrderTotal(orderItem.orderId);
      }
      
      return true;
    } catch (error) {
      console.error("Error removing order item:", error);
      return false;
    }
  }
  
  private async updateOrderTotal(orderId: number): Promise<void> {
    try {
      // Calculate total from order items
      const items = await this.getOrderItems(orderId);
      const total = items.reduce((sum, item) => {
        const price = parseFloat(item.price?.toString() || '0');
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
      }, 0);
      
      await db
        .update(orders)
        .set({
          orderTotal: total.toFixed(2),
          orderTotalAfterD: total
        })
        .where(eq(orders.orderId, orderId));
    } catch (error) {
      console.error("Error updating order total:", error);
    }
  }
  
  async getAreas(): Promise<YperPosts[]> {
    try {
      const result = await db.execute(`
        SELECT yper_main_id, description, active, sort_order, created_at
        FROM yper_posts
        WHERE active = true
        ORDER BY sort_order ASC, yper_main_id ASC
      `);
      
      return (result.rows as any[]).map((row) => ({
        yperMainId: row.yper_main_id,
        description: row.description || '',
        active: row.active || true,
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at ? new Date(row.created_at) : new Date()
      }));
    } catch (error) {
      console.error("Error getting areas:", error);
      return [];
    }
  }

  async getStaffStatistics(staffId: number, dateFrom?: Date, dateTo?: Date): Promise<any> {
    // Basic implementation - can be expanded based on requirements
    const fromDate = dateFrom || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = dateTo || new Date();
    
    const ordersData = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.employeeId, staffId),
        eq(orders.closed, true)
      ));
    
    const totalSales = ordersData.reduce((sum, order) => {
      return sum + parseFloat(order.orderTotal?.toString() || '0');
    }, 0);
    
    return {
      totalOrders: ordersData.length,
      totalSales,
      averageOrderValue: ordersData.length > 0 ? totalSales / ordersData.length : 0,
      period: { from: fromDate, to: toDate }
    };
  }
}

export const storage = new DatabaseStorage();