# Leidseplein Restaurant - Digital Menu

A modern, mobile-first digital menu application for restaurants featuring comprehensive admin functionality and responsive design.

## Features

- **Public Menu Access**: Clean, mobile-optimized menu viewing
- **Admin Management**: Password-protected admin controls (passcode: 1234)
- **Category Management**: Organize menu items by categories with drag-and-drop ordering
- **Product Management**: Full CRUD operations for menu items with image support
- **Bulk Operations**: Import/export CSV data and bulk image uploads
- **QR Code Sharing**: Generate QR codes for easy menu sharing
- **Advertisement Banners**: Promotional content management
- **Responsive Design**: Optimized for mobile, tablet, and desktop

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OAuth with session management
- **Build Tools**: Vite, ESBuild

## Quick Start

1. **Development**:
   ```bash
   npm run dev
   ```

2. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

3. **Database**:
   ```bash
   npm run db:push
   ```

## Admin Access

- Toggle the "Admin" switch in the footer
- Enter passcode: `1234`
- Access admin features including:
  - Add/edit/delete categories and products
  - Bulk import/export operations
  - Image management
  - Banner management

## Deployment

This application is optimized for Replit Deployments with automatic builds and PostgreSQL integration.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (auto-configured on Replit)
- `SESSION_SECRET`: Session encryption key (auto-configured on Replit)
- `REPL_ID`: Replit environment identifier (auto-configured on Replit)

## API Endpoints

- `GET /api/categories` - Fetch categories
- `GET /api/products` - Fetch products
- `GET /api/banners/type/:type` - Fetch banners
- `POST /api/*` - Admin operations (authentication required)

## Mobile Optimization

- Touch-friendly interface
- Swipeable category navigation
- Footer-based controls for thumb accessibility
- Responsive grid layouts
- Optimized images and loading states

---

Built with ❤️ for modern restaurants