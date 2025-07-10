# Restaurant POS - Mobile Table Management System

## Overview

This is a mobile-first Point of Sale (POS) system for restaurant table management. The application provides a complete solution for managing tables, orders, and transactions through an intuitive mobile interface with PIN-based authentication.

## System Architecture

The application follows a client-server architecture with:

- **Frontend**: React application optimized for mobile devices (tablets/phones)
- **Backend**: Express.js REST API server  
- **Database**: PostgreSQL (replacing MariaDB for cloud deployment)
- **Cache**: In-memory caching for products and groups after login

### Key Features

1. **PIN-Based Authentication**: Simple numeric login system with user caching
2. **Table Management**: Visual table representation with color coding
3. **Order Management**: Complete order workflow with multiple tabs
4. **Transaction Processing**: Multiple payment methods and history tracking
5. **Statistics**: User-specific performance metrics
6. **Help Forms**: Discount, free price, and weight management

## Pages Structure

### 1. Login Page
- PIN-based authentication (4-6 digit codes)
- Cache products and groups in memory after successful login
- Automatic redirect to Table page

### 2. Table Page
- Visual table grid with color coding:
  - Green: Free tables
  - Red: Occupied tables
- Click interaction for table selection
- Real-time table status updates

### 3. Order Page
- Table-specific order management
- Four main tabs:
  - **PreOrder**: Initial order setup
  - **Extras/Choices**: Additional items and modifications
  - **Numeric Order**: Chinese-style numeric ordering system
  - **Actual Order**: Final order confirmation
- Dynamic order building based on table status

### 4. Statistics Page
- User-specific metrics and performance data
- Sales statistics and transaction history
- Time-based reporting

### 5. Help Forms
- Discount management
- Free price product handling
- Product weight calculations

### 6. Close Transaction Page
- Multiple payment methods:
  - Cash
  - Card
  - Combined payments
  - Voucher system
- Order archival to history
- Table status reset

## Database Schema

### Core Tables
- **users**: User authentication and profiles
- **tables**: Table definitions and status
- **orders**: Order management and history
- **products**: Product catalog with pricing
- **groups**: Product categorization
- **transactions**: Payment processing and history

### Cache Strategy
- Products and groups loaded into memory after login
- Real-time table status synchronization
- Order state management

## Technical Implementation

### Frontend Technologies
- React 18 with TypeScript
- Tailwind CSS for mobile-responsive design
- TanStack Query for state management
- Touch-optimized UI components

### Backend Technologies
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Session management for authentication
- Real-time updates via WebSocket (future enhancement)

### Mobile Optimization
- Touch-friendly interface design
- Optimized for tablet and phone screens
- Offline capability for order management
- Fast loading and responsive interactions

## User Workflow

1. **Login**: Enter PIN → Cache data → Redirect to tables
2. **Table Selection**: Visual table grid → Select table → Check status
3. **Order Management**: Build order → Add items → Process modifications
4. **Transaction**: Complete payment → Archive order → Free table
5. **Statistics**: View performance metrics

## Deployment Strategy

- Cloud deployment with PostgreSQL database
- Mobile-first responsive design
- Production-ready error handling
- Health monitoring and logging

## User Preferences

- Mobile-first design approach
- Simple, intuitive interface
- Fast performance for restaurant operations
- Reliable transaction processing

## Recent Changes

- Project initialization with mobile POS architecture
- Database schema design for restaurant operations
- User authentication with PIN-based system
- Table management with visual representation
- Order processing workflow design