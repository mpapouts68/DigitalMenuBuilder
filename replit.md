# Restaurant Menu Management System

## Overview

This is a full-stack restaurant menu management application built with a React frontend and Express.js backend. The system allows restaurant owners to manage their digital menu with categories, products, and promotional banners. It features a modern, mobile-first design optimized for both customer viewing and administrative management.

## System Architecture

The application follows a monorepo structure with three main layers:

- **Frontend (client/)**: React application with Vite bundler
- **Backend (server/)**: Express.js REST API server
- **Shared (shared/)**: Common TypeScript schemas and types

### Directory Structure
```
├── client/           # React frontend application
├── server/           # Express.js backend API
├── shared/           # Shared schemas and types
├── migrations/       # Database migration files
└── attached_assets/  # Static assets (logo, images)
```

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with hot module replacement
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OAuth integration with Passport.js
- **Session Management**: PostgreSQL-backed sessions
- **API Design**: RESTful endpoints with JSON responses

### Database Schema
The application uses PostgreSQL with the following main entities:
- **Users**: User authentication and profile data
- **Categories**: Menu category organization with ordering
- **Products**: Menu items with pricing and descriptions
- **Banners**: Promotional and advertisement banners
- **Sessions**: User session storage

### Authentication & Authorization
- **Provider**: Replit OAuth (OpenID Connect)
- **Session Storage**: PostgreSQL with connect-pg-simple
- **Protected Routes**: Admin functions require authentication
- **Passcode Protection**: Additional layer for sensitive operations

## Data Flow

1. **User Access**: Customers can view the menu without authentication
2. **Admin Access**: Restaurant owners authenticate via Replit OAuth
3. **Menu Management**: Authenticated users can CRUD categories and products
4. **Image Handling**: Support for both URL-based and uploaded images
5. **Real-time Updates**: UI updates immediately via optimistic updates and cache invalidation

### API Endpoints
- `GET/POST /api/categories` - Category management
- `GET/POST/PUT/DELETE /api/products` - Product management  
- `GET/POST/PUT/DELETE /api/banners` - Banner management
- `POST /api/import` - Bulk data import
- `GET /api/export` - Data export functionality
- `GET /api/auth/user` - User authentication status

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **passport**: Authentication middleware
- **express-session**: Session management

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Static type checking
- **ESBuild**: Server-side bundling for production

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx with auto-restart
- **Database**: Neon PostgreSQL (serverless)
- **Environment**: Replit platform integration

### Production Build
1. Frontend builds to `dist/public/` via Vite
2. Backend bundles to `dist/` via ESBuild
3. Single Node.js process serves both static files and API
4. PostgreSQL connection pooling for scalability

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OAuth provider URL (defaults to Replit)

## Deployment Configuration

### Production Readiness
- ✅ Build scripts configured for frontend and backend
- ✅ .replit file set up for Replit Deployments
- ✅ PostgreSQL database integration ready
- ✅ Environment variables auto-configured
- ✅ Static file serving optimized
- ✅ Production error handling implemented

### Deployment Steps
1. Click "Deploy" button in Replit
2. Choose deployment target (Autoscale recommended)
3. Application will build automatically using `npm run build`
4. Production server starts with `npm run start`
5. Database migrations run automatically

### Production Features
- Mobile-first responsive design
- Admin passcode protection (1234)
- QR code sharing functionality
- CSV import/export capabilities
- Image management system
- Session-based authentication
- PostgreSQL data persistence

## Changelog
- July 02, 2025: Initial setup and development
- July 02, 2025: Mobile-first layout optimization
- July 02, 2025: Footer controls and advertisement integration
- July 02, 2025: Deployment preparation completed
- July 02, 2025: Applied deployment fixes for production readiness:
  - Added HTML title and SEO meta tags for deployment validation
  - Implemented robust database connection error handling with production optimizations
  - Added comprehensive server startup error handling and graceful shutdown
  - Configured explicit port binding for Cloud Run deployment compatibility
  - Added health check endpoint (/health) for deployment monitoring
  - Implemented uncaught exception and unhandled rejection handling

## User Preferences

Preferred communication style: Simple, everyday language.