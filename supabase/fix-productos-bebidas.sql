-- ============================================
-- FIX: Actualizar bebidas como PRODUCTOS con imágenes correctas
-- ============================================
-- PROBLEMA: Bebidas están sin imagen o con imagen incorrecta
-- SOLUCIÓN: Actualizar productos existentes Y crear nuevos con imágenes
-- ============================================

DO $$
DECLARE
  bebidas_category_id UUID;
BEGIN
  -- 1. Buscar o crear categoría "Bebidas"
  SELECT id INTO bebidas_category_id
  FROM categories
  WHERE LOWER(name) LIKE '%bebida%' OR LOWER(name) LIKE '%drink%'
  LIMIT 1;

  -- Si no existe, crearla
  IF bebidas_category_id IS NULL THEN
    INSERT INTO categories (name, description)
    VALUES ('Bebidas', 'Bebidas y refrescos')
    RETURNING id INTO bebidas_category_id;
    RAISE NOTICE '✅ Categoría "Bebidas" creada';
  END IF;

  -- 2. ACTUALIZAR Coca-Cola SOLO si no tiene imagen, o INSERTAR si no existe
  IF EXISTS (SELECT 1 FROM products WHERE name = 'Coca-Cola 500ml') THEN
    UPDATE products 
    SET 
      image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop'),
      category_id = bebidas_category_id,
      description = 'Bebida Coca-Cola 500ml'
    WHERE name = 'Coca-Cola 500ml';
    RAISE NOTICE '✅ Coca-Cola actualizada (imagen preservada si existía)';
  ELSE
    INSERT INTO products (name, description, base_price, category_id, active, stock_quantity, image_url)
    VALUES ('Coca-Cola 500ml', 'Bebida Coca-Cola 500ml', 1.99, bebidas_category_id, true, 100, 
      'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop');
    RAISE NOTICE '✅ Coca-Cola creada';
  END IF;

  -- 3. ACTUALIZAR Sprite SOLO si no tiene imagen, o INSERTAR si no existe
  IF EXISTS (SELECT 1 FROM products WHERE name = 'Sprite 500ml') THEN
    UPDATE products 
    SET 
      image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop'),
      category_id = bebidas_category_id,
      description = 'Bebida Sprite sabor lima-limón 500ml'
    WHERE name = 'Sprite 500ml';
    RAISE NOTICE '✅ Sprite actualizada (imagen preservada si existía)';
  ELSE
    INSERT INTO products (name, description, base_price, category_id, active, stock_quantity, image_url)
    VALUES ('Sprite 500ml', 'Bebida Sprite sabor lima-limón 500ml', 1.99, bebidas_category_id, true, 100,
      'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=400&fit=crop');
    RAISE NOTICE '✅ Sprite creada';
  END IF;

  -- 4. ACTUALIZAR Fanta SOLO si no tiene imagen, o INSERTAR si no existe
  IF EXISTS (SELECT 1 FROM products WHERE name = 'Fanta 500ml') THEN
    UPDATE products 
    SET 
      image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=400&fit=crop'),
      category_id = bebidas_category_id,
      description = 'Bebida Fanta sabor naranja 500ml'
    WHERE name = 'Fanta 500ml';
    RAISE NOTICE '✅ Fanta actualizada (imagen preservada si existía)';
  ELSE
    INSERT INTO products (name, description, base_price, category_id, active, stock_quantity, image_url)
    VALUES ('Fanta 500ml', 'Bebida Fanta sabor naranja 500ml', 1.99, bebidas_category_id, true, 100,
      'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=400&fit=crop');
    RAISE NOTICE '✅ Fanta creada';
  END IF;

  -- 5. ACTUALIZAR Agua SOLO si no tiene imagen, o INSERTAR si no existe
  IF EXISTS (SELECT 1 FROM products WHERE name = 'Agua 500ml') THEN
    UPDATE products 
    SET 
      image_url = COALESCE(NULLIF(image_url, ''), 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop'),
      category_id = bebidas_category_id,
      description = 'Agua mineral 500ml'
    WHERE name = 'Agua 500ml';
    RAISE NOTICE '✅ Agua actualizada (imagen preservada si existía)';
  ELSE
    INSERT INTO products (name, description, base_price, category_id, active, stock_quantity, image_url)
    VALUES ('Agua 500ml', 'Agua mineral 500ml', 0.99, bebidas_category_id, true, 100,
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop');
    RAISE NOTICE '✅ Agua creada';
  END IF;

  -- 6. Actualizar Refresco genérico si existe (darle imagen de Coca-Cola)
  UPDATE products 
  SET 
    image_url = 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
    category_id = bebidas_category_id
  WHERE name = 'Refresco 500ml' AND (image_url IS NULL OR image_url = '');

  -- 7. OPCIONAL: Desactivar bebidas de ingredients si están allí
  -- UPDATE ingredients SET available = false 
  -- WHERE name IN ('Coca-Cola 500ml', 'Sprite 500ml', 'Fanta 500ml', 'Agua 500ml');

  RAISE NOTICE '✅ Bebidas procesadas correctamente con imágenes';
END $$;

-- ============================================
-- VERIFICACIÓN: Ver todas las bebidas
-- ============================================
SELECT 
  name, 
  base_price, 
  active, 
  stock_quantity,
  image_url
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
-- ✅ Coca-Cola 500ml  | $1.99 | active: true | stock: 100 | image: ✓
-- ✅ Sprite 500ml     | $1.99 | active: true | stock: 100 | image: ✓
-- ✅ Fanta 500ml      | $1.99 | active: true | stock: 100 | image: ✓
-- ✅ Agua 500ml       | $0.99 | active: true | stock: 100 | image: ✓
