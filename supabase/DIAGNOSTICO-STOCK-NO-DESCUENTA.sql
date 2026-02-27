-- ============================================
-- DIAGNÓSTICO: ¿Por qué NO se descuenta el stock?
-- ============================================
-- Ejecuta estos queries UNO POR UNO en Supabase SQL Editor
-- y copia los resultados para identificar el problema
-- ============================================

-- ============================================
-- PASO 1: Verificar que la columna existe
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name = 'stock_quantity';

-- ❓ RESULTADO ESPERADO: 
-- Debe mostrar: stock_quantity | integer | YES | 100
-- ❌ SI NO MUESTRA NADA: La columna NO existe, ejecuta add-product-stock.sql


-- ============================================
-- PASO 2: Verificar que el trigger está instalado
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- ❓ RESULTADO ESPERADO:
-- trigger_name: trigger_auto_deduct_stock
-- event_manipulation: INSERT
-- event_object_table: order_items
-- action_timing: AFTER
-- ❌ SI NO MUESTRA NADA: El trigger NO está instalado


-- ============================================
-- PASO 3: Verificar que la función existe
-- ============================================
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'auto_deduct_stock_on_order'
  AND n.nspname = 'public';

-- ❓ RESULTADO ESPERADO:
-- Debe mostrar la función completa (220+ líneas)
-- ❌ SI NO MUESTRA NADA: La función NO existe


-- ============================================
-- PASO 4: Ver stock ACTUAL de productos
-- ============================================
SELECT 
  id,
  name,
  stock_quantity,
  CASE 
    WHEN stock_quantity IS NULL THEN '⚠️ NULL (no inicializado)'
    WHEN stock_quantity = 0 THEN '❌ AGOTADO'
    WHEN stock_quantity < 10 THEN '⚠️ BAJO'
    ELSE '✅ OK'
  END as estado
FROM products
ORDER BY name;

-- ❓ RESULTADO ESPERADO:
-- Todos los productos deben tener stock_quantity (no NULL)
-- ❌ SI TODOS SON NULL: No se inicializó el stock


-- ============================================
-- PASO 5: Ver órdenes recientes (últimas 5)
-- ============================================
SELECT 
  o.id as order_id,
  o.order_number,
  o.created_at,
  o.status,
  COUNT(oi.id) as total_items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 5;

-- ❓ RESULTADO ESPERADO:
-- Debe mostrar tus órdenes recientes con más de 0 items
-- ❌ SI total_items = 0: Las órdenes están vacías (problema RLS)


-- ============================================
-- PASO 6: Ver items de la última orden
-- ============================================
SELECT 
  oi.id,
  oi.order_id,
  p.name as product_name,
  oi.quantity,
  oi.customizations,
  oi.created_at
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
);

-- ❓ RESULTADO ESPERADO:
-- Debe mostrar los productos que ordenaste
-- ❌ SI NO MUESTRA NADA: La orden no tiene items


-- ============================================
-- PASO 7: Verificar logs del trigger (PostgreSQL 12+)
-- ============================================
-- Este query busca en los logs recientes mensajes del trigger
-- NOTA: Solo funciona si tienes acceso a pg_stat_statements

SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%auto_deduct_stock%'
ORDER BY last_exec_time DESC
LIMIT 5;

-- ❌ SI DA ERROR: No tienes permisos, ve al siguiente paso


-- ============================================
-- PASO 8: PRUEBA EN VIVO - Crear orden de prueba
-- ============================================
-- Esta prueba crea una orden y verifica si el stock se descuenta

-- A. Ver stock ANTES
SELECT name, stock_quantity as stock_antes 
FROM products 
WHERE name LIKE '%Coca%' OR name LIKE '%Refresco%'
LIMIT 1;

-- Anota el valor aquí: ___________

-- B. Crear orden de prueba (obteniendo un product_id real)
DO $$
DECLARE
  v_product_id UUID;
  v_order_id UUID;
BEGIN
  -- Obtener ID de un producto (cualquiera disponible)
  SELECT id INTO v_product_id 
  FROM products 
  LIMIT 1;
  
  -- Crear orden
  INSERT INTO orders (order_number, status, total_amount, final_amount, discount_amount)
  VALUES ('TEST-' || floor(random() * 10000)::text, 'pending', 15.00, 15.00, 0.00)
  RETURNING id INTO v_order_id;
  
  RAISE NOTICE '✅ Orden creada: %', v_order_id;
  
  -- Insertar item (aquí se dispara el trigger)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  VALUES (v_order_id, v_product_id, 3, 5.00, 15.00);
  
  RAISE NOTICE '✅ Item insertado. Trigger debió ejecutarse.';
  RAISE NOTICE '📊 Verifica el stock con el siguiente query:';
  RAISE NOTICE 'SELECT name, stock_quantity FROM products WHERE id = ''%'';', v_product_id;
END $$;

-- C. Ver stock DESPUÉS
SELECT name, stock_quantity as stock_despues 
FROM products 
WHERE name LIKE '%Coca%' OR name LIKE '%Refresco%'
LIMIT 1;

-- Anota el valor aquí: ___________

-- ❓ COMPARACIÓN:
-- Stock ANTES: ___________
-- Stock DESPUÉS: ___________
-- Diferencia: ___________
-- ❓ ESPERADO: Stock DESPUÉS debe ser 3 unidades MENOS
-- ❌ SI SON IGUALES: El trigger NO se está ejecutando


-- ============================================
-- PASO 9: Verificar políticas RLS en order_items
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'order_items';

-- ❓ RESULTADO ESPERADO:
-- Debe haber políticas que permitan INSERT público
-- ❌ SI NO HAY POLÍTICAS: RLS puede estar bloqueando


-- ============================================
-- PASO 10: Verificar políticas RLS en products
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products';

-- ❓ RESULTADO ESPERADO:
-- Debe haber política UPDATE que permita al trigger actualizar
-- ❌ SI NO PERMITE UPDATE: El trigger no puede modificar stock


-- ============================================
-- DIAGNÓSTICO COMPLETO
-- ============================================
-- Copia TODOS los resultados y compártelos para diagnosticar el problema

-- Checklist:
-- [ ] 1. Columna stock_quantity existe
-- [ ] 2. Trigger está instalado
-- [ ] 3. Función existe
-- [ ] 4. Productos tienen stock inicial (no NULL)
-- [ ] 5. Órdenes recientes existen
-- [ ] 6. Órdenes tienen items
-- [ ] 7. Prueba en vivo: stock se descontó
-- [ ] 8. Políticas RLS permiten INSERT en order_items
-- [ ] 9. Políticas RLS permiten UPDATE en products

-- ============================================
-- SOLUCIONES RÁPIDAS
-- ============================================

-- Si la columna NO existe:
-- Ejecuta: add-product-stock.sql completo

-- Si el trigger NO existe:
-- Ejecuta solo la sección PASO 3 y PASO 4 de add-product-stock.sql

-- Si el stock es NULL:
-- UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL;

-- Si RLS bloquea:
-- Ejecuta: supabase/fix-order-items-rls.sql
-- O crea política UPDATE para products:
/*
CREATE POLICY "Enable UPDATE for trigger on products"
ON products
FOR UPDATE
USING (true)
WITH CHECK (true);
*/
