-- ============================================
-- Seed Data - SmartBurger
-- ============================================

-- CATEGORÍAS
INSERT INTO categories (name, description, icon) VALUES
('Hamburguesas', 'Nuestras deliciosas hamburguesas artesanales', '🍔'),
('Combos', 'Combos especiales con descuento', '🎁'),
('Bebidas', 'Refrescos y bebidas', '🥤'),
('Acompañamientos', 'Papas, aros de cebolla y más', '🍟'),
('Postres', 'Dulces delicias', '🍰');

-- INGREDIENTES
INSERT INTO ingredients (name, price, stock_quantity, min_stock_alert, is_allergen) VALUES
-- Pan y base
('Pan de hamburguesa', 0, 200, 50, true),
('Pan integral', 0.50, 100, 30, true),
('Pan sin gluten', 1.50, 50, 20, false),

-- Carnes
('Carne de res (simple)', 0, 150, 40, false),
('Carne de res (doble)', 2.00, 150, 40, false),
('Pollo crispy', 1.50, 100, 30, false),
('Carne vegana', 2.50, 80, 25, false),

-- Quesos
('Queso cheddar', 0.50, 200, 50, true),
('Queso americano', 0.50, 200, 50, true),
('Queso suizo', 0.75, 150, 40, true),

-- Vegetales
('Lechuga fresca', 0, 300, 80, false),
('Tomate', 0, 250, 70, false),
('Cebolla', 0, 200, 60, false),
('Pepinillos', 0.25, 150, 40, false),
('Aguacate', 1.00, 100, 30, false),

-- Salsas
('Salsa especial', 0, 400, 100, false),
('Mayonesa', 0, 400, 100, true),
('Mostaza', 0, 400, 100, false),
('Ketchup', 0, 400, 100, false),
('Salsa BBQ', 0.25, 300, 80, false),
('Salsa picante', 0.25, 300, 80, false),

-- Adicionales
('Bacon', 1.50, 150, 40, false),
('Huevo frito', 0.75, 120, 35, true),
('Jalapeños', 0.25, 200, 50, false),
('Aros de cebolla', 0.50, 100, 30, false),

-- Papas
('Papas fritas medianas', 0, 200, 50, false),
('Papas fritas grandes', 0.75, 200, 50, false),

-- Bebidas
('Coca-Cola 500ml', 0, 300, 80, false),
('Sprite 500ml', 0, 300, 80, false),
('Fanta 500ml', 0, 300, 80, false),
('Agua mineral', 0, 400, 100, false);

-- PRODUCTOS (Hamburguesas)
INSERT INTO products (category_id, name, description, base_price, featured, calories, image_url) 
SELECT 
    c.id,
    'SmartBurger Clásica',
    'Hamburguesa con carne de res, lechuga, tomate, cebolla y nuestra salsa especial',
    5.99,
    true,
    650,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'
FROM categories c WHERE c.name = 'Hamburguesas';

INSERT INTO products (category_id, name, description, base_price, featured, calories, image_url)
SELECT 
    c.id,
    'Doble Queso Deluxe',
    'Doble carne, doble queso cheddar, bacon y salsa BBQ',
    8.99,
    true,
    920,
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800'
FROM categories c WHERE c.name = 'Hamburguesas';

INSERT INTO products (category_id, name, description, base_price, featured, calories, image_url)
SELECT 
    c.id,
    'Crispy Chicken Burger',
    'Pollo crispy, lechuga, tomate, mayonesa y pepinillos',
    6.99,
    false,
    580,
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800'
FROM categories c WHERE c.name = 'Hamburguesas';

INSERT INTO products (category_id, name, description, base_price, featured, calories, image_url)
SELECT 
    c.id,
    'Veggie Supreme',
    'Hamburguesa vegana con aguacate, lechuga, tomate y salsa especial',
    7.99,
    false,
    450,
    'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800'
FROM categories c WHERE c.name = 'Hamburguesas';

-- PRODUCTOS (Combos)
INSERT INTO products (category_id, name, description, base_price, featured, image_url)
SELECT 
    c.id,
    'Combo SmartBurger',
    'SmartBurger Clásica + Papas medianas + Bebida',
    9.99,
    true,
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800'
FROM categories c WHERE c.name = 'Combos';

INSERT INTO products (category_id, name, description, base_price, featured, image_url)
SELECT 
    c.id,
    'Combo Deluxe',
    'Doble Queso Deluxe + Papas grandes + Bebida grande',
    12.99,
    true,
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800'
FROM categories c WHERE c.name = 'Combos';

-- PRODUCTOS (Bebidas)
INSERT INTO products (category_id, name, description, base_price, image_url)
SELECT 
    c.id,
    'Refresco 500ml',
    'Coca-Cola, Sprite o Fanta',
    1.99,
    'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=800'
FROM categories c WHERE c.name = 'Bebidas';

-- PRODUCTOS (Acompañamientos)
INSERT INTO products (category_id, name, description, base_price, image_url)
SELECT 
    c.id,
    'Papas Fritas',
    'Crujientes papas fritas',
    2.99,
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800'
FROM categories c WHERE c.name = 'Acompañamientos';

INSERT INTO products (category_id, name, description, base_price, image_url)
SELECT 
    c.id,
    'Aros de Cebolla',
    'Deliciosos aros de cebolla empanizados',
    3.49,
    'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800'
FROM categories c WHERE c.name = 'Acompañamientos';

-- RELACIÓN PRODUCTOS-INGREDIENTES (SmartBurger Clásica)
INSERT INTO product_ingredients (product_id, ingredient_id, is_required, is_removable)
SELECT p.id, i.id, true, false
FROM products p, ingredients i
WHERE p.name = 'SmartBurger Clásica' AND i.name = 'Pan de hamburguesa';

INSERT INTO product_ingredients (product_id, ingredient_id, is_required, is_removable)
SELECT p.id, i.id, true, false
FROM products p, ingredients i
WHERE p.name = 'SmartBurger Clásica' AND i.name = 'Carne de res (simple)';

INSERT INTO product_ingredients (product_id, ingredient_id, is_required, is_removable)
SELECT p.id, i.id, false, true
FROM products p, ingredients i
WHERE p.name = 'SmartBurger Clásica' AND i.name IN ('Lechuga fresca', 'Tomate', 'Cebolla', 'Salsa especial', 'Queso cheddar');

-- PROMOCIONES
INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date, start_time, end_time, max_uses)
VALUES
('Happy Hour', 'Descuento del 15% de 2pm a 4pm', 'percentage', 15.00, NOW(), NOW() + INTERVAL '30 days', '14:00:00', '16:00:00', 1000),
('Combo Familiar', '$5 de descuento en combos sobre $20', 'fixed', 5.00, NOW(), NOW() + INTERVAL '30 days', NULL, NULL, 500),
('First Order', '20% de descuento en tu primer pedido', 'percentage', 20.00, NOW(), NOW() + INTERVAL '90 days', NULL, NULL, NULL);
