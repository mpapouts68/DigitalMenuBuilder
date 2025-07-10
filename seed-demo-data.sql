-- Demo data for OlymPOS testing
-- This creates sample data matching your existing MariaDB structure

-- Insert demo staff members with PINs
INSERT INTO staff (name, sur_name, password, menu, admin, stats, discount) VALUES 
('Demo', 'Manager', '1234', 'ALL', true, true, true),
('John', 'Waiter', '5678', 'ORDERS', false, false, false),
('Maria', 'Cashier', '9999', 'CASH', false, true, true);

-- Insert demo product groups (categories)
INSERT INTO product_groups (description, description2, sort_number, quick_menu) VALUES 
('Beverages', 'Drinks & Coffee', 1, true),
('Appetizers', 'Starters', 2, true),
('Main Dishes', 'Entrees', 3, true),
('Desserts', 'Sweet Treats', 4, false);

-- Insert demo products with Chinese menu numbers for numeric ordering
INSERT INTO products (description, description2, price, product_group_id, menu_number, favorite) VALUES 
-- Beverages
('Coffee', 'Espresso Coffee', 3.50, 1, 1, true),
('Tea', 'Green Tea', 2.50, 1, 2, false),
('Coca Cola', 'Soft Drink', 2.00, 1, 3, true),
('Orange Juice', 'Fresh Squeezed', 4.00, 1, 4, false),

-- Appetizers  
('Greek Salad', 'Traditional Greek', 8.50, 2, 11, true),
('Tzatziki', 'Yogurt Dip', 5.50, 2, 12, false),
('Dolmades', 'Stuffed Vine Leaves', 7.00, 2, 13, false),

-- Main Dishes
('Moussaka', 'Traditional Greek Casserole', 16.50, 3, 21, true),
('Souvlaki', 'Grilled Meat Skewers', 14.00, 3, 22, true),
('Grilled Fish', 'Fresh Daily Fish', 18.50, 3, 23, false),
('Pasta Carbonara', 'Italian Classic', 12.50, 3, 24, false),

-- Desserts
('Baklava', 'Honey Pastry', 6.50, 4, 31, true),
('Ice Cream', 'Vanilla/Chocolate', 4.50, 4, 32, false),
('Tiramisu', 'Italian Dessert', 7.50, 4, 33, false);

-- Insert demo tables/posts with layout positions
INSERT INTO posts_main (post_id, description, post_number, active, sort_number, top, left) VALUES 
(1, 'Table 1', 1, true, 1, 100, 100),
(2, 'Table 2', 2, true, 2, 100, 250),
(3, 'Table 3', 3, true, 3, 100, 400),
(4, 'Table 4', 4, true, 4, 250, 100),
(5, 'Table 5', 5, true, 5, 250, 250),
(6, 'Table 6', 6, true, 6, 250, 400),
(7, 'Table 7', 7, true, 7, 400, 100),
(8, 'Table 8', 8, true, 8, 400, 250),
(9, 'Bar Counter', 9, true, 9, 550, 200),
(10, 'Terrace 1', 10, true, 10, 100, 550);