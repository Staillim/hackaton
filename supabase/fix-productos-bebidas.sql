-- ============================================
-- FIX: Agregar bebidas correctas a la base de datos
-- ============================================
-- PROBLEMA: Existe "Refresco 500ml" genérico pero no bebidas específicas
-- SOLUCIÓN: Agregar Coca-Cola, Sprite, Fanta, Agua como productos individuales
-- ============================================

-- Primero, obtener el ID de la categoría de Bebidas
DO $$
DECLARE
  bebidas_category_id UUID;
BEGIN
  -- Buscar categoría "Bebidas" (o crearla si no existe)
  SELECT id INTO bebidas_category_id
  FROM categories
  WHERE LOWER(name) LIKE '%bebida%' OR LOWER(name) LIKE '%drink%'
  LIMIT 1;

  -- Si no existe categoría de bebidas, usar la primera categoría disponible
  IF bebidas_category_id IS NULL THEN
    SELECT id INTO bebidas_category_id FROM categories LIMIT 1;
  END IF;

  -- Eliminar el "Refresco 500ml" genérico (opcional)
  -- DELETE FROM products WHERE name = 'Refresco 500ml';

  -- O mejor: actualizar "Refresco 500ml" a "Coca-Cola 500ml"
  UPDATE products 
  SET 
    name = 'Coca-Cola 500ml',
    description = 'Bebida Coca-Cola 500ml',
    base_price = 1.99
  WHERE name = 'Refresco 500ml';

  -- Agregar las demás bebidas (si no existen)
  INSERT INTO products (name, description, base_price, category_id, active, stock_quantity)
  SELECT 'Sprite 500ml', 'Bebida Sprite sabor lima-limón 500ml', 1.99, bebidas_category_id, true, 100
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Sprite 500ml');

  INSERT INTO products (name, description, base_price, category_id, active, stock_quantity)
  SELECT 'Fanta 500ml', 'Bebida Fanta sabor naranja 500ml', 1.99, bebidas_category_id, true, 100
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Fanta 500ml');

  INSERT INTO products (name, description, base_price, category_id, active, stock_quantity)
  SELECT 'Agua 500ml', 'Agua mineral 500ml', 0.99, bebidas_category_id, true, 100
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Agua 500ml');

  RAISE NOTICE '✅ Bebidas agregadas correctamente';
END $$;

-- ============================================
-- VERIFICACIÓN: Ver todas las bebidas
-- ============================================
SELECT 
  name, 
  base_price, 
  active, 
  stock_quantity
FROM products
WHERE 
  name LIKE '%Coca%' 
  OR name LIKE '%Sprite%' 
  OR name LIKE '%Fanta%' 
  OR name LIKE '%Agua%'
  OR name LIKE '%Refresco%'
ORDER BY name;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Coca-Cola 500ml    | $1.99 | active: true | stock: 100
-- ✅ Sprite 500ml       | $1.99 | active: true | stock: 100
-- ✅ Fanta 500ml        | $1.99 | active: true | stock: 100
-- ✅ Agua 500ml         | $0.99 | active: true | stock: 100
