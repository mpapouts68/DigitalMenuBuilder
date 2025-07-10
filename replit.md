# Restaurant POS - Mobile Table Management System

## Overview

This is a mobile-first Point of Sale (POS) system for restaurant table management that integrates with an existing PDA database structure. The application provides a complete solution for managing tables, orders, and transactions through an intuitive mobile interface with PIN-based authentication.

## System Architecture

The application follows a client-server architecture with:

- **Frontend**: React application optimized for mobile devices (tablets/phones)
- **Backend**: Express.js REST API server  
- **Database**: PostgreSQL integration with existing PDA database structure
- **Cache**: In-memory caching for products and groups after login

### Key Features

1. **PIN-Based Authentication**: Simple numeric login system with session management
2. **Table Management**: Visual table representation with color coding (free/occupied/reserved)
3. **Order Management**: Complete order workflow with multiple tabs (Menu, Favorites, Numeric, Search)
4. **Transaction Processing**: Multiple payment methods and history tracking
5. **Statistics**: User-specific performance metrics and analytics
6. **Real-time Updates**: Live table status and order synchronization

## Pages Structure

### 1. Login Page (/login)
- PIN-based authentication (up to 6 digits)
- Session token management
- Cache products and groups in memory after successful login
- Automatic redirect to Tables page

### 2. Tables Page (/ and /tables)
- Visual table grid with color-coded status:
  - Green: Free tables
  - Red: Occupied tables  
  - Yellow: Reserved tables
  - Gray: Inactive tables
- Real-time statistics dashboard
- Table click interaction for order management
- Staff controls (refresh, stats, logout)

### 3. Order Page (/order/:postId)
- Table-specific order management
- Four main tabs:
  - **Menu**: Product selection by category
  - **Favorites**: Staff favorite products
  - **Numeric**: Chinese-style numeric ordering system
  - **Search**: Product search functionality
- Real-time order building with quantity controls
- Order total calculation and summary

### 4. Statistics Page (/stats)
- User-specific performance metrics
- Period selection (Today, This Week, This Month)
- Sales statistics and order analytics
- Performance insights and trends

## Database Schema (Existing PDA Integration)

### Core Tables
- **staff**: Staff authentication and profiles (replaces users)
- **posts_main**: Table definitions and status (replaces tables)
- **orders**: Order management and history
- **orders_actual**: Order line items and details
- **products**: Product catalog with pricing and menu numbers
- **product_groups**: Product categorization and organization
- **sessions**: Authentication session management

### Cache Strategy
- Products and groups loaded into memory after login
- Real-time table status synchronization
- Order state management with automatic totals

## Technical Implementation

### Frontend Technologies
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for state management
- Tailwind CSS for mobile-responsive design
- shadcn/ui components for consistent UI
- Touch-optimized interface design

### Backend Technologies
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Session-based authentication with tokens
- RESTful API design
- Real-time data synchronization

### Mobile Optimization
- Touch-friendly interface design (44px minimum touch targets)
- Optimized for tablet and phone screens
- Responsive grid layouts
- Fast loading and smooth interactions
- Offline-capable order management

## API Endpoints

### Authentication
- `POST /api/login` - Staff PIN authentication
- `GET /api/staff/me` - Current staff information
- `GET /api/staff/stats` - Staff performance statistics

### Data Management
- `GET /api/cache` - Load cached products, groups, and tables
- `GET /api/tables` - Get all tables with current status
- `GET /api/products` - Get products (optionally filtered by group)
- `GET /api/groups` - Get product groups

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders/:orderId` - Get order details
- `POST /api/orders/:orderId/items` - Add item to order
- `PUT /api/orders/:orderId` - Update order
- `POST /api/orders/:orderId/close` - Close/complete order

## User Workflow

1. **Login**: Enter PIN → Validate staff → Cache data → Redirect to tables
2. **Table Selection**: Visual table grid → Select table → Check status → Create/continue order
3. **Order Management**: Browse products → Add items → Adjust quantities → Review totals
4. **Order Processing**: Send to kitchen → Track status → Complete transaction
5. **Statistics**: View performance metrics → Analyze trends

## Deployment Strategy

- Cloud deployment with PostgreSQL database
- Mobile-first responsive design
- Production-ready error handling
- Health monitoring and logging
- Integration with existing PDA database structure

## User Preferences

- Mobile-first design approach
- Simple, intuitive interface
- Fast performance for restaurant operations
- Reliable transaction processing
- Integration with existing restaurant systems

## Recent Changes

- **January 2025**: VBA Access form migration systematic approach
- **Order_Actual Form**: Migrated complete 4-tab ordering interface (Menu, Favorites, Numeric, Search)
- **Menu Form Enhancement**: Enhanced table management with professional dark theme
- **Database Integration**: Fixed PostgreSQL schema compatibility with existing structure
- **Table Display**: Added 35 tables to Posts_Main for comprehensive testing
- **UI Improvements**: Removed stats dashboard, enhanced table grid layout
- **Mobile Optimization**: Touch-optimized interface with hover effects and animations
- **Hierarchical Categories**: Implemented parent/child category system with navigation
- **Compact Interface**: Reduced table and product item sizes, removed "ready for new order" text
- **Grid Enhancement**: Updated product grids to 5 columns for better space utilization

## VBA Access Migration Plan

Based on the exported JSON files from the original PDA Access application, implementing systematic migration:

### Forms Analysis
Key forms identified for migration:
- **Login**: PIN-based authentication (already implemented)
- **Menu**: Main POS interface (partial implementation)
- **Order_Actual**: Order management interface
- **Close_Transaction**: Payment processing
- **Daily_Sales_Main/Open/History**: Sales reporting
- **Settings/User_Settings**: Configuration management
- **Favorites**: Quick product access
- **V_keyb**: Virtual keyboard for touch input

### Migration Priority
1. **Core Order Management**: Order_Actual form functionality
2. **Payment Processing**: Close_Transaction workflow
3. **Product Management**: Menu and Favorites forms
4. **Reporting**: Daily sales and history forms
5. **Settings**: Configuration and user preferences
6. **Advanced Features**: Discounts, portions, splits

### Database Compatibility
- Using existing database structure with Posts_Main for tables
- Maintaining compatibility with original PDA schema
- Progressive enhancement of features while preserving data integrity