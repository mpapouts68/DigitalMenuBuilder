# 🍽️ Digital Menu Builder - Local Deployment Guide

## 📋 **What This Is**

A **customer-facing digital menu system** for restaurants that allows:
- **Customers**: Browse menu items, prices, and details (no login required)
- **Restaurant Staff**: Login to manage menu items, categories, and prices

## 🚀 **Quick Start (Local Server)**

### **1. Prerequisites**
- Node.js 18+ installed
- Git (optional, for cloning)

### **2. Setup**
```bash
# Install dependencies
npm install

# Populate database with sample data
npm run seed

# Start the server
npm run dev
```

### **3. Access the Application**
- **Customer Menu**: http://localhost:5000
- **Admin Login**: http://localhost:5000/login
- **Default Admin**: `admin` / `admin123`

## 🏗️ **Production Deployment**

### **Option 1: Simple VPS/Server**
```bash
# 1. Upload files to your server
# 2. Install Node.js
# 3. Run setup commands
npm install
npm run seed
npm run build
npm start
```

### **Option 2: Docker (Recommended)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### **Option 3: Static Hosting (Frontend Only)**
```bash
# Build for static hosting
npm run build
# Upload dist/public/ folder to any web host
```

## 📊 **Database Management**

### **Backup**
```bash
# Simply copy the database file
cp menu.db menu-backup.db
```

### **Reset/Reset Data**
```bash
# Delete database and reseed
rm menu.db
npm run seed
```

### **Add Your Own Data**
1. Login as admin
2. Use the web interface to add/edit items
3. Or modify `scripts/seed-data.ts` and run `npm run seed`

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Optional - defaults work fine
PORT=5000                    # Server port
SESSION_SECRET=your-secret   # Session encryption key
NODE_ENV=production          # Environment mode
```

### **Customization**
- **Restaurant Name**: Edit `client/src/pages/landing.tsx`
- **Colors/Theme**: Modify `tailwind.config.ts`
- **Menu Items**: Use admin interface or edit seed data

## 📱 **Features**

### **Customer Features**
- ✅ Browse menu by categories
- ✅ View product details and prices
- ✅ Responsive mobile design
- ✅ Fast loading with images
- ✅ No login required

### **Admin Features**
- ✅ Add/edit/delete categories
- ✅ Add/edit/delete products
- ✅ Manage prices and descriptions
- ✅ Upload product images
- ✅ Bulk import/export data
- ✅ Banner management

## 🛡️ **Security**

- **Admin Access**: Username/password protected
- **Session Management**: Secure session cookies
- **Data Validation**: Input validation on all forms
- **SQL Injection**: Protected by Drizzle ORM

## 📈 **Performance**

- **Database**: SQLite (fast, local file)
- **Frontend**: React with Vite (optimized builds)
- **Images**: External URLs (can be changed to local storage)
- **Caching**: Built-in browser caching

## 🔄 **Updates**

### **Update Menu Items**
1. Login as admin
2. Use web interface
3. Changes appear immediately for customers

### **Update Application**
```bash
# Pull latest changes
git pull
npm install
npm run build
npm start
```

## 📞 **Support**

### **Common Issues**
- **Port 5000 in use**: Change PORT environment variable
- **Database errors**: Delete `menu.db` and run `npm run seed`
- **Login issues**: Default credentials are `admin` / `admin123`

### **Logs**
- Development: Console output
- Production: Check server logs

## 🎯 **Perfect For**

- ✅ Small to medium restaurants
- ✅ Food trucks and cafes
- ✅ Pop-up restaurants
- ✅ Event catering
- ✅ Any business needing a digital menu

## 💰 **Cost**

- **Hosting**: $5-20/month (VPS) or free (static hosting)
- **Domain**: $10-15/year (optional)
- **Maintenance**: Minimal - just update menu items
- **No recurring fees**: One-time setup

---

**Your digital menu is now ready to serve customers! 🎉**
