import { initializeDatabase } from '../server/db';
import { storage } from '../server/storage';

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');
    
    // Initialize database
    await initializeDatabase();
    
    // Sample categories
    const categories = [
      { name: 'Appetizers', order: 1 },
      { name: 'Main Courses', order: 2 },
      { name: 'Desserts', order: 3 },
      { name: 'Beverages', order: 4 },
      { name: 'Specials', order: 5 }
    ];
    
    // Sample products
    const products = [
      // Appetizers
      { name: 'Caesar Salad', price: 8.50, description: 'Fresh romaine lettuce with parmesan cheese and croutons', details: 'Served with our house-made Caesar dressing', categoryId: 1, imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400' },
      { name: 'Bruschetta', price: 7.00, description: 'Toasted bread with fresh tomatoes and basil', details: 'Drizzled with extra virgin olive oil', categoryId: 1, imageUrl: 'https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400' },
      { name: 'Garlic Bread', price: 5.50, description: 'Crusty bread with garlic butter and herbs', details: 'Perfect as a starter or side', categoryId: 1, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400' },
      
      // Main Courses
      { name: 'Grilled Salmon', price: 18.50, description: 'Fresh Atlantic salmon with lemon herb butter', details: 'Served with seasonal vegetables and rice pilaf', categoryId: 2, imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
      { name: 'Beef Tenderloin', price: 24.00, description: '8oz center-cut beef tenderloin', details: 'Cooked to perfection with red wine reduction', categoryId: 2, imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
      { name: 'Chicken Parmesan', price: 16.50, description: 'Breaded chicken breast with marinara sauce', details: 'Topped with mozzarella and served with pasta', categoryId: 2, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
      { name: 'Vegetarian Pasta', price: 14.00, description: 'Penne pasta with seasonal vegetables', details: 'In a light olive oil and herb sauce', categoryId: 2, imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400' },
      
      // Desserts
      { name: 'Tiramisu', price: 7.50, description: 'Classic Italian dessert with coffee and mascarpone', details: 'Dusted with cocoa powder', categoryId: 3, imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400' },
      { name: 'Chocolate Lava Cake', price: 8.00, description: 'Warm chocolate cake with molten center', details: 'Served with vanilla ice cream', categoryId: 3, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400' },
      { name: 'Cheesecake', price: 6.50, description: 'New York style cheesecake', details: 'With berry compote', categoryId: 3, imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400' },
      
      // Beverages
      { name: 'House Wine (Glass)', price: 6.00, description: 'Red or white wine selection', details: 'Ask server for current selection', categoryId: 4, imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400' },
      { name: 'Craft Beer', price: 5.50, description: 'Local craft beer selection', details: 'Rotating selection of local brews', categoryId: 4, imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400' },
      { name: 'Fresh Lemonade', price: 3.50, description: 'Freshly squeezed lemonade', details: 'Made daily with fresh lemons', categoryId: 4, imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400' },
      
      // Specials
      { name: 'Chef\'s Special', price: 22.00, description: 'Today\'s chef recommendation', details: 'Ask your server for details', categoryId: 5, imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400' },
      { name: 'Soup of the Day', price: 6.50, description: 'Fresh soup made daily', details: 'Ask server for today\'s selection', categoryId: 5, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' }
    ];
    
    // Sample banners
    const banners = [
      { type: 'advertisement', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', altText: 'Restaurant Interior', isActive: 1 },
      { type: 'promotional', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', altText: 'Happy Hour Special', isActive: 1 }
    ];
    
    console.log('📝 Creating categories...');
    for (const category of categories) {
      await storage.createCategory(category);
      console.log(`✅ Created category: ${category.name}`);
    }
    
    console.log('🍽️ Creating products...');
    for (const product of products) {
      await storage.createProduct(product);
      console.log(`✅ Created product: ${product.name} - €${product.price}`);
    }
    
    console.log('🎯 Creating banners...');
    for (const banner of banners) {
      await storage.createBanner(banner);
      console.log(`✅ Created banner: ${banner.type}`);
    }
    
    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Created ${categories.length} categories, ${products.length} products, and ${banners.length} banners`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
