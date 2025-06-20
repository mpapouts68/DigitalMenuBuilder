import { categories, products, type Category, type Product, type InsertCategory, type InsertProduct } from "@shared/schema";

export interface IStorage {
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

  // Bulk operations
  importData(categories: InsertCategory[], products: InsertProduct[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category>;
  private products: Map<number, Product>;
  private categoryIdCounter: number;
  private productIdCounter: number;

  constructor() {
    this.categories = new Map();
    this.products = new Map();
    this.categoryIdCounter = 1;
    this.productIdCounter = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleCategories = [
      { name: "Appetizers", order: 1 },
      { name: "Main Courses", order: 2 },
      { name: "Pasta", order: 3 },
      { name: "Desserts", order: 4 },
      { name: "Beverages", order: 5 }
    ];

    const sampleProducts = [
      { name: "Bruschetta Classica", price: "8.99", description: "Toasted bread topped with fresh tomatoes, basil, and garlic", categoryId: 1 },
      { name: "Antipasto Platter", price: "14.99", description: "Selection of cured meats, cheeses, olives, and vegetables", categoryId: 1 },
      { name: "Arancini", price: "9.99", description: "Crispy risotto balls filled with mozzarella and peas", categoryId: 1 },
      { name: "Osso Buco", price: "28.99", description: "Braised veal shanks with vegetables in white wine sauce", categoryId: 2 },
      { name: "Chicken Parmigiana", price: "22.99", description: "Breaded chicken breast with marinara sauce and mozzarella", categoryId: 2 },
      { name: "Grilled Branzino", price: "26.99", description: "Whole Mediterranean sea bass with herbs and lemon", categoryId: 2 },
      { name: "Spaghetti Carbonara", price: "16.99", description: "Classic Roman pasta with eggs, pecorino, and pancetta", categoryId: 3 },
      { name: "Fettuccine Alfredo", price: "15.99", description: "Rich and creamy pasta with parmesan cheese", categoryId: 3 },
      { name: "Linguine alle Vongole", price: "19.99", description: "Pasta with fresh clams in white wine sauce", categoryId: 3 },
      { name: "Tiramisu", price: "7.99", description: "Classic Italian dessert with coffee and mascarpone", categoryId: 4 },
      { name: "Gelato Trio", price: "6.99", description: "Three scoops of house-made gelato", categoryId: 4 },
      { name: "Espresso", price: "2.99", description: "Strong Italian coffee", categoryId: 5 },
      { name: "Chianti Classico", price: "8.99", description: "Glass of Tuscan red wine", categoryId: 5 }
    ];

    sampleCategories.forEach(cat => {
      const id = this.categoryIdCounter++;
      this.categories.set(id, { id, ...cat });
    });

    sampleProducts.forEach(prod => {
      const id = this.productIdCounter++;
      this.products.set(id, { id, ...prod });
    });
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { id, ...category };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const deleted = this.categories.delete(id);
    if (deleted) {
      // Also delete all products in this category
      for (const [productId, product] of this.products) {
        if (product.categoryId === id) {
          this.products.delete(productId);
        }
      }
    }
    return deleted;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.categoryId === categoryId);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const newProduct: Product = { id, ...product };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async importData(categories: InsertCategory[], products: InsertProduct[]): Promise<void> {
    // Clear existing data
    this.categories.clear();
    this.products.clear();
    this.categoryIdCounter = 1;
    this.productIdCounter = 1;

    // Import categories
    for (const cat of categories) {
      await this.createCategory(cat);
    }

    // Import products
    for (const prod of products) {
      await this.createProduct(prod);
    }
  }
}

export const storage = new MemStorage();
