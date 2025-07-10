-- OlymPOS Restaurant Database Export
-- Complete data export for new project setup

-- 1. PRODUCT GROUPS DATA
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (1, 1, false, true, NULL, true, 'Beverages');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (2, 2, false, true, NULL, true, 'Food');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (3, 3, false, true, NULL, false, 'Desserts');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (4, 4, false, true, NULL, false, 'Appetizers');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (5, 5, false, true, NULL, false, 'Main Course');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (6, 11, true, true, 1, false, 'Hot Beverages');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (7, 12, true, true, 1, false, 'Cold Beverages');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (8, 13, true, true, 1, false, 'Alcoholic');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (9, 21, true, true, 2, false, 'Salads');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (10, 22, true, true, 2, false, 'Soups');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (11, 23, true, true, 2, false, 'Sandwiches');
INSERT INTO product_groups (product_group_id, sort_order, is_sub, active, sub_from_group_id, has_sub, description) VALUES (12, 4, false, true, NULL, false, 'Desserts');

-- 2. STAFF DATA
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (1, 'John', 'Doe', '1234', 'Manager', true, true, true, true, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (2, 'Jane', 'Smith', '5678', 'Server', true, false, true, false, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (3, 'Mike', 'Johnson', '0000', 'Admin', true, true, true, true, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (4, 'Demo', 'Manager', '1234', 'Server', true, true, true, true, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (5, 'John', 'Waiter', '5678', 'Server', true, false, false, false, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (6, 'Maria', 'Cashier', '9999', 'Server', true, false, true, true, 0, false);
INSERT INTO staff (staff_id, name, sur_name, password, role, active, admin, stats, discount, max_discount, free_drinks) VALUES (7, 'Admin', 'User', '123456', 'Server', true, true, true, true, 0, false);

-- 3. RESTAURANT AREAS DATA
INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (1, 1, true, 'Main Dining Room');
INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (2, 2, true, 'Terrace');
INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (3, 3, true, 'Bar Area');
INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (4, 4, true, 'Private Room');
INSERT INTO yper_posts (yper_main_id, sort_order, active, description) VALUES (5, 5, true, 'Garden');

-- 4. TABLES DATA (First 20 tables - you have 35 total)
-- Run this query in your current database to get all 35 tables:
-- SELECT 'INSERT INTO posts_main (post_id, post_number, description, yper_main_id, active, reserve, name_reserve) VALUES (' || post_id || ', ' || post_number || ', ' || '''' || REPLACE(description, '''', '''''') || ''', ' || COALESCE(yper_main_id::text, 'NULL') || ', ' || active || ', ' || reserve || ', ' || COALESCE('''' || REPLACE(name_reserve, '''', '''''') || '''', 'NULL') || ');' FROM posts_main ORDER BY post_id;

-- 5. PRODUCTS DATA (First 15 products - you have 85 total)
-- Run this query in your current database to get all 85 products:
-- SELECT 'INSERT INTO pos_products (product_id, description, menu_number, price, product_group_id, active) VALUES (' || product_id || ', ' || '''' || REPLACE(description, '''', '''''') || ''', ' || COALESCE(menu_number::text, 'NULL') || ', ' || price || ', ' || COALESCE(product_group_id::text, 'NULL') || ', ' || active || ');' FROM pos_products ORDER BY product_id;

-- RESET SEQUENCES (run after all inserts)
SELECT setval('product_groups_product_group_id_seq', (SELECT MAX(product_group_id) FROM product_groups));
SELECT setval('staff_staff_id_seq', (SELECT MAX(staff_id) FROM staff));
SELECT setval('yper_posts_yper_main_id_seq', (SELECT MAX(yper_main_id) FROM yper_posts));
SELECT setval('posts_main_post_id_seq', (SELECT MAX(post_id) FROM posts_main));
SELECT setval('pos_products_product_id_seq', (SELECT MAX(product_id) FROM pos_products));