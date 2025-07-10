# OlymPOS Restaurant POS System - Complete Backup Package

## 1. COMPLETE PROJECT BACKUP INSTRUCTIONS

### Step 1: Create New Repl
1. Go to your Replit dashboard
2. Click "Create Repl"
3. Choose "Node.js" template
4. Name it: "OlymPOS-Restaurant-V2" (or your preferred name)

### Step 2: Copy All Files
Copy all files from this current project to your new Repl. The complete file structure is:

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/ (entire shadcn/ui component library)
│   │   │   ├── add-category-modal.tsx
│   │   │   ├── add-item-modal.tsx
│   │   │   ├── admin-controls.tsx
│   │   │   ├── admin-passcode-modal.tsx
│   │   │   ├── advertisement-banner.tsx
│   │   │   ├── bulk-image-upload-modal.tsx
│   │   │   ├── category-pills.tsx
│   │   │   ├── import-modal.tsx
│   │   │   ├── menu-header.tsx
│   │   │   ├── menu-item.tsx
│   │   │   ├── menu-section.tsx
│   │   │   ├── numeric-keypad.tsx
│   │   │   ├── product-details-modal.tsx
│   │   │   ├── product-extras-modal.tsx
│   │   │   └── protected-route.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-toast.ts
│   │   │   └── useAuth.ts
│   │   ├── lib/
│   │   │   ├── authUtils.ts
│   │   │   ├── qr-code.ts
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── landing.tsx
│   │   │   ├── login.tsx
│   │   │   ├── menu.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── order.tsx
│   │   │   ├── stats.tsx
│   │   │   └── tables.tsx
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── db.ts
│   ├── index.ts
│   ├── replitAuth.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── vite.ts
├── shared/
│   └── schema.ts
├── .gitignore
├── .replit
├── components.json
├── drizzle.config.ts
├── package.json
├── postcss.config.js
├── replit.md
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Step 3: Install Dependencies
In your new Repl terminal, run:
```bash
npm install
```

### Step 4: Setup Database
1. In your new Repl, create a PostgreSQL database
2. Run the database setup scripts (provided below)

## 2. DATABASE EXPORT AND SETUP

### Database Creation Script
```sql
-- Create all tables
CREATE TABLE IF NOT EXISTS product_groups (
    product_group_id SERIAL PRIMARY KEY,
    sort_order INTEGER,
    is_sub BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    sub_from_group_id INTEGER,
    has_sub BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    staff_id INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    total NUMERIC(10,2),
    post_id INTEGER,
    order_type VARCHAR(50) DEFAULT 'dine_in',
    staff_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS yper_posts (
    yper_main_id SERIAL PRIMARY KEY,
    sort_order INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sur_name VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'waiter',
    active BOOLEAN DEFAULT TRUE,
    admin BOOLEAN DEFAULT FALSE,
    stats BOOLEAN DEFAULT TRUE,
    discount BOOLEAN DEFAULT FALSE,
    max_discount INTEGER DEFAULT 0,
    free_drinks BOOLEAN DEFAULT FALSE,
    start_up_menu TEXT,
    display_language TEXT DEFAULT 'en',
    picture TEXT,
    printer TEXT,
    order_by_menu TEXT,
    menu_card INTEGER,
    order_by TEXT,
    menu TEXT,
    price_cat INTEGER DEFAULT 1,
    pda_to_cash BOOLEAN DEFAULT FALSE,
    printer_on BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts_main (
    post_id SERIAL PRIMARY KEY,
    post_number INTEGER UNIQUE NOT NULL,
    description VARCHAR(255),
    yper_main_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    reserve BOOLEAN DEFAULT FALSE,
    name_reserve VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    menu_number INTEGER,
    price NUMERIC(10,2) NOT NULL,
    product_group_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders_actual (
    order_actual_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE posts_main ADD CONSTRAINT fk_posts_yper FOREIGN KEY (yper_main_id) REFERENCES yper_posts(yper_main_id);
ALTER TABLE products ADD CONSTRAINT fk_products_group FOREIGN KEY (product_group_id) REFERENCES product_groups(product_group_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_post FOREIGN KEY (post_id) REFERENCES posts_main(post_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id);
ALTER TABLE orders_actual ADD CONSTRAINT fk_orders_actual_order FOREIGN KEY (order_id) REFERENCES orders(order_id);
ALTER TABLE orders_actual ADD CONSTRAINT fk_orders_actual_product FOREIGN KEY (product_id) REFERENCES products(product_id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id);
```

### Current Data Export (Use this to populate your new database)
```sql
-- Export your current data using these commands in your current database:
-- Then run the INSERT statements in your new database

-- Export Product Groups
SELECT 'INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (' ||
       product_group_id || ', ' ||
       COALESCE(sort_order::text, 'NULL') || ', ' ||
       is_sub || ', ' ||
       active || ', ' ||
       COALESCE(sub_from_group_id::text, 'NULL') || ', ' ||
       has_sub || ', ' ||
       '''' || REPLACE(description, '''', '''''') || '''' ||
       ');' as insert_statements
FROM product_groups;

-- Export Staff
SELECT 'INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (' ||
       staff_id || ', ' ||
       '''' || REPLACE(name, '''', '''''') || ''', ' ||
       COALESCE('''' || REPLACE(sur_name, '''', '''''') || '''', 'NULL') || ', ' ||
       '''' || REPLACE(password, '''', '''''') || ''', ' ||
       COALESCE('''' || REPLACE(role, '''', '''''') || '''', '''waiter''') || ', ' ||
       active || ', ' ||
       admin || ', ' ||
       stats || ', ' ||
       discount || ', ' ||
       COALESCE(max_discount::text, '0') || ', ' ||
       free_drinks ||
       ');' as insert_statements
FROM staff;

-- Export Areas (yper_posts)
SELECT 'INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (' ||
       yper_main_id || ', ' ||
       COALESCE(sort_order::text, '0') || ', ' ||
       active || ', ' ||
       '''' || REPLACE(description, '''', '''''') || '''' ||
       ');' as insert_statements
FROM yper_posts;

-- Export Tables (posts_main)
SELECT 'INSERT INTO posts_main (post_id, post_number, description, yper_main_id, active, reserve, name_reserve) VALUES (' ||
       post_id || ', ' ||
       post_number || ', ' ||
       '''' || REPLACE(description, '''', '''''') || ''', ' ||
       COALESCE(yper_main_id::text, 'NULL') || ', ' ||
       active || ', ' ||
       reserve || ', ' ||
       COALESCE('''' || REPLACE(name_reserve, '''', '''''') || '''', 'NULL') ||
       ');' as insert_statements
FROM posts_main;

-- Export Products
SELECT 'INSERT INTO products (product_id, description, menu_number, price, product_group_id, active) VALUES (' ||
       product_id || ', ' ||
       '''' || REPLACE(description, '''', '''''') || ''', ' ||
       COALESCE(menu_number::text, 'NULL') || ', ' ||
       price || ', ' ||
       COALESCE(product_group_id::text, 'NULL') || ', ' ||
       active ||
       ');' as insert_statements
FROM pos_products;
```

## 3. SETUP INSTRUCTIONS FOR NEW PROJECT

### Environment Setup
1. Create PostgreSQL database in your new Repl
2. The `DATABASE_URL` environment variable will be automatically set

### Run Database Setup
1. Copy the database creation script above
2. Run it in your new PostgreSQL database
3. Copy and run the data export queries from your current database
4. Run the INSERT statements in your new database

### Start the Application
```bash
npm run dev
```

### Verify Setup
1. Navigate to `/login` 
2. Use staff PIN: `1234` (default)
3. Check that all 35 tables appear
4. Verify 85 products are loaded
5. Test the product extras modal
6. Check the compact stats page

## 4. KEY FEATURES INCLUDED

✅ **Authentication System**: PIN-based login with 7 staff members
✅ **Table Management**: 35 tables across 5 restaurant areas
✅ **Product Catalog**: 85 products with category grouping
✅ **Order Management**: Complete order workflow with line items
✅ **Product Extras**: Advanced extras system with color-coded prefixes
✅ **Statistics**: Compact two-column stats page with payment methods
✅ **Mobile Optimized**: Touch-friendly interface for tablets
✅ **Real-time Updates**: Live table status and order synchronization
✅ **Session Management**: Secure token-based authentication

## 5. RECENT ENHANCEMENTS

- **Fixed "Without" prefix pricing**: Now shows "(Free)" instead of adding cost
- **Compact stats layout**: Two-column design for better space utilization 
- **Enhanced product extras**: Click-and-add behavior with tree display
- **Mobile optimization**: Touch-optimized interface design
- **Database integration**: Complete PostgreSQL schema with existing data

## 6. DEPLOYMENT

Once your new project is setup:
1. Click "Deploy" in your new Repl
2. You'll get a fresh `.replit.app` URL
3. Both projects will exist independently

Your new deployment will be completely separate from your original project.