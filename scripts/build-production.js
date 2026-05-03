#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🏗️ Building Digital Menu Builder for production...\n');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  
  // 2. Build frontend
  console.log('📦 Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 3. Create production package
  console.log('📋 Creating production package...');
  
  const productionFiles = [
    'dist',
    'package.json',
    'package-lock.json',
    'menu.db',
    'DEPLOYMENT.md',
    'README.md'
  ];
  
  // Create a simple start script for production
  const startScript = `#!/bin/bash
echo "🍽️ Starting Digital Menu Builder..."
echo "📊 Database: menu.db"
echo "🌐 Server: http://localhost:5000"
echo "👤 Admin: http://localhost:5000/login (admin/admin123)"
echo ""
npm start
`;
  
  fs.writeFileSync('start.sh', startScript);
  fs.chmodSync('start.sh', '755');
  
  console.log('✅ Production build completed!');
  console.log('\n📋 To deploy:');
  console.log('1. Upload all files to your server');
  console.log('2. Run: npm install');
  console.log('3. Run: ./start.sh (or npm start)');
  console.log('\n🌐 Your menu will be available at: http://your-server:5000');
  console.log('👤 Admin panel: http://your-server:5000/login');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
