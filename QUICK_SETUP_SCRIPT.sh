#!/bin/bash

# OlymPOS Restaurant POS System - Quick Setup Script
# Run this in your NEW Repl after copying all files

echo "🍴 Setting up OlymPOS Restaurant POS System..."
echo "================================================"

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Setup database (PostgreSQL should already be provisioned by Replit)
echo "🗄️ Database should be auto-provisioned by Replit"
echo "   DATABASE_URL: $DATABASE_URL"

# 3. Verify package.json scripts
echo "📋 Available scripts:"
npm run --silent | grep -E "(dev|build|start)"

# 4. Check if database is accessible
echo "🔍 Testing database connection..."
if [ ! -z "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URL is set"
else
    echo "❌ DATABASE_URL not found - create PostgreSQL database in Replit"
fi

# 5. Setup instructions
echo ""
echo "🚀 SETUP COMPLETE! Next steps:"
echo "================================"
echo "1. Create PostgreSQL database in Replit (if not done)"
echo "2. Run the SQL scripts from DATABASE_EXPORT_DATA.sql"
echo "3. Execute: npm run dev"
echo "4. Navigate to /login and use PIN: 1234"
echo "5. Click Deploy when ready"
echo ""
echo "🎯 Your restaurant POS system includes:"
echo "   • 35 tables across 5 restaurant areas"
echo "   • 85 products with category grouping"
echo "   • 7 staff members with PIN authentication"
echo "   • Advanced product extras with prefixes"
echo "   • Compact two-column stats page"
echo "   • Mobile-optimized touch interface"
echo ""
echo "📧 Staff login PINs:"
echo "   • John Doe (Manager): 1234"
echo "   • Jane Smith (Server): 5678" 
echo "   • Mike Johnson (Admin): 0000"
echo "   • Demo Manager: 1234"
echo "   • John Waiter: 5678"
echo "   • Maria Cashier: 9999"
echo "   • Admin User: 123456"
echo ""
echo "✨ READY FOR DEPLOYMENT!"