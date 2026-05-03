import { initializeDatabase } from '../server/db';
import { storage } from '../server/storage';
import fs from 'fs';
import path from 'path';

async function importRealMenu() {
  try {
    console.log('🍽️ Importing real restaurant menu data...');
    
    // Initialize database
    await initializeDatabase();
    
    // Read CSV files
    const groupsPath = path.join(process.cwd(), 'attached_assets', 'groups_1750399519482.csv');
    const productsPath = path.join(process.cwd(), 'attached_assets', 'products_1750399519483.csv');
    
    const groupsCsv = fs.readFileSync(groupsPath, 'utf-8');
    const productsCsv = fs.readFileSync(productsPath, 'utf-8');
    
    // Parse groups (categories)
    const groupLines = groupsCsv.split('\n').slice(1); // Skip header
    const groups = new Map<number, { name: string; order: number }>();
    
    console.log('📝 Processing categories...');
    for (const line of groupLines) {
      if (line.trim()) {
        const [id, name, order] = line.split(',').map(field => field.replace(/"/g, ''));
        if (id && name && order) {
          groups.set(parseInt(id), { 
            name: name.trim(), 
            order: parseInt(order) || 0 
          });
        }
      }
    }
    
    // Create categories in database
    const categoryMap = new Map<number, number>(); // old ID -> new ID
    for (const [oldId, group] of groups) {
      const newCategory = await storage.createCategory({
        name: group.name,
        order: group.order
      });
      categoryMap.set(oldId, newCategory.id);
      console.log(`✅ Created category: ${group.name}`);
    }
    
    // Parse products
    const productLines = productsCsv.split('\n').slice(1); // Skip header
    console.log('🍽️ Processing products...');
    
    for (const line of productLines) {
      if (line.trim()) {
        const [description, price, groupId] = line.split(',').map(field => field.replace(/"/g, ''));
        
        if (description && price && groupId) {
          // Clean price (remove $ and convert to number)
          const cleanPrice = parseFloat(price.replace('$', '').replace(',', '.'));
          const categoryId = categoryMap.get(parseInt(groupId));
          
          if (categoryId && !isNaN(cleanPrice)) {
            await storage.createProduct({
              name: description.trim(),
              price: cleanPrice,
              description: description.trim(),
              details: '', // No details in CSV
              imageUrl: '', // No images in CSV
              categoryId: categoryId
            });
            console.log(`✅ Created product: ${description.trim()} - €${cleanPrice.toFixed(2)}`);
          }
        }
      }
    }
    
    // Create some sample banners for the restaurant
    const banners = [
      { 
        type: 'advertisement', 
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 
        altText: 'Restaurant Interior', 
        isActive: 1 
      },
      { 
        type: 'promotional', 
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 
        altText: 'Daily Specials', 
        isActive: 1 
      }
    ];
    
    console.log('🎯 Creating banners...');
    for (const banner of banners) {
      await storage.createBanner(banner);
      console.log(`✅ Created banner: ${banner.type}`);
    }
    
    console.log('🎉 Real menu import completed successfully!');
    console.log(`📊 Imported ${groups.size} categories and ${productLines.length} products`);
    console.log('🍽️ Your restaurant menu is now ready!');
    
  } catch (error) {
    console.error('❌ Error importing menu:', error);
    process.exit(1);
  }
}

importRealMenu();
