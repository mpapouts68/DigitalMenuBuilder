import express, { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertOrdersActualSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express) {
  const server = createServer(app);
  
  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No session token provided' });
    }
    
    const staff = await storage.validateSession(sessionId);
    if (!staff) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.staff = staff;
    next();
  };
  
  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin) {
        return res.status(400).json({ error: 'PIN is required' });
      }
      
      const result = await storage.authenticateStaff(pin);
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  
  // Get cache data after login
  app.get('/api/cache', requireAuth, async (req, res) => {
    try {
      const cacheData = await storage.getCacheData();
      res.json(cacheData);
    } catch (error) {
      console.error('Cache data error:', error);
      res.status(500).json({ error: 'Failed to load cache data' });
    }
  });
  
  // Get current staff info
  app.get('/api/staff/me', requireAuth, async (req, res) => {
    res.json(req.staff);
  });

  // Get areas
  app.get('/api/areas', requireAuth, async (req, res) => {
    try {
      const areas = await storage.getAreas();
      res.json(areas);
    } catch (error) {
      console.error('Areas error:', error);
      res.status(500).json({ error: 'Failed to load areas' });
    }
  });
  
  // Get staff statistics
  app.get('/api/staff/stats', requireAuth, async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
      
      const stats = await storage.getStaffStatistics(req.staff.staffId, fromDate, toDate);
      res.json(stats);
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to load statistics' });
    }
  });
  
  // Table operations
  app.get('/api/tables', requireAuth, async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      console.error('Tables error:', error);
      res.status(500).json({ error: 'Failed to load tables' });
    }
  });
  
  app.get('/api/tables/:postId', requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const table = await storage.getTable(postId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      res.json(table);
    } catch (error) {
      console.error('Table error:', error);
      res.status(500).json({ error: 'Failed to load table' });
    }
  });
  
  // Product operations
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const { groupId } = req.query;
      
      let products;
      if (groupId) {
        products = await storage.getProductsByGroup(parseInt(groupId as string));
      } else {
        products = await storage.getProducts();
      }
      
      res.json(products);
    } catch (error) {
      console.error('Products error:', error);
      res.status(500).json({ error: 'Failed to load products' });
    }
  });
  
  app.get('/api/products/:productId', requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      console.error('Product error:', error);
      res.status(500).json({ error: 'Failed to load product' });
    }
  });
  
  // Group operations
  app.get('/api/groups', requireAuth, async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      console.error('Groups error:', error);
      res.status(500).json({ error: 'Failed to load groups' });
    }
  });
  
  // Order operations
  app.get('/api/orders/:orderId', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Order error:', error);
      res.status(500).json({ error: 'Failed to load order' });
    }
  });
  
  app.get('/api/tables/:postId/orders', requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const orders = await storage.getOrdersByTable(postId);
      res.json(orders);
    } catch (error) {
      console.error('Table orders error:', error);
      res.status(500).json({ error: 'Failed to load table orders' });
    }
  });
  
  app.post('/api/orders', requireAuth, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse({
        ...req.body,
        employeeId: req.staff.staffId,
        clerkId: req.staff.staffId
      });
      
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error('Create order error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid order data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create order' });
    }
  });
  
  app.put('/api/orders/:orderId', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const updates = req.body;
      
      const order = await storage.updateOrder(orderId, updates);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });
  
  app.post('/api/orders/:orderId/close', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const success = await storage.closeOrder(orderId);
      
      if (!success) {
        return res.status(404).json({ error: 'Order not found or already closed' });
      }
      
      res.json({ success: true, message: 'Order closed successfully' });
    } catch (error) {
      console.error('Close order error:', error);
      res.status(500).json({ error: 'Failed to close order' });
    }
  });
  
  // Order item operations
  app.get('/api/orders/:orderId/items', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      console.error('Order items error:', error);
      res.status(500).json({ error: 'Failed to load order items' });
    }
  });
  
  app.post('/api/orders/:orderId/items', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemData = insertOrdersActualSchema.parse({
        ...req.body,
        orderId,
        staffId: req.staff.staffId.toString()
      });
      
      const item = await storage.addOrderItem(itemData);
      res.json(item);
    } catch (error) {
      console.error('Add order item error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid item data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to add order item' });
    }
  });
  
  app.put('/api/order-items/:itemId', requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const updates = req.body;
      
      const item = await storage.updateOrderItem(itemId, updates);
      if (!item) {
        return res.status(404).json({ error: 'Order item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Update order item error:', error);
      res.status(500).json({ error: 'Failed to update order item' });
    }
  });
  
  app.delete('/api/order-items/:itemId', requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const success = await storage.removeOrderItem(itemId);
      
      if (!success) {
        return res.status(404).json({ error: 'Order item not found' });
      }
      
      res.json({ success: true, message: 'Order item removed successfully' });
    } catch (error) {
      console.error('Remove order item error:', error);
      res.status(500).json({ error: 'Failed to remove order item' });
    }
  });
  
  // Utility endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: 'OlymPOS Mobile API'
    });
  });
  
  return server;
}