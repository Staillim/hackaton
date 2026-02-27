-- ============================================
-- DIAGNÓSTICO: Por qué NO se descuenta el stock
-- ============================================
-- Ejecuta estas queries en Supabase SQL Editor para identificar el problema

-- ============================================
-- 1. ¿EXISTE la columna stock_quantity en products?
-- ============================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'stock_quantity';

-- ✅ DEBE mostrar: stock_quantity | integer | 100 | YES
-- ❌ Si NO muestra nada: Ejecuta add-product-stock.sql

-- ============================================
-- 2. ¿EXISTE el trigger de auto-descuento?
-- ============================================
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- ✅ DEBE mostrar: trigger_auto_deduct_stock | INSERT | order_items | AFTER
-- ❌ Si NO muestra nada: El trigger NO se creó

-- ============================================
-- 3. ¿EXISTE la función del trigger?
-- ============================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'auto_deduct_stock_on_order';

-- ✅ DEBE mostrar: auto_deduct_stock_on_order | FUNCTION | trigger
-- ❌ Si NO muestra nada: La función NO se creó

-- ============================================
-- 4. Ver stock ACTUAL de productos
-- ============================================
SELECT 
  id,
  name,
  base_price,
  stock_quantity,
  available
FROM products
ORDER BY name
LIMIT 10;

-- 📊 Anota los valores actuales de stock_quantity

-- ============================================
-- 5. Ver últimas órdenes creadas
-- ============================================
SELECT 
  o.id,
  o.order_number,
  o.customer_name,
  o.created_at,
  o.status,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_number, o.customer_name, o.created_at, o.status
ORDER BY o.created_at DESC
LIMIT 5;

-- 📊 Verifica que las órdenes SÍ tengan items (items_count > 0)

-- ============================================
-- 6. Ver items de la última orden
-- ============================================
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  p.name as product_name,
  oi.quantity,
  oi.customizations,
  oi.created_at
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
)
ORDER BY oi.created_at DESC;

-- 📊 Verifica que los items SÍ se insertaron con product_id y quantity

-- ============================================
-- 7. TEST MANUAL: Crear item de prueba y ver si trigger funciona
-- ============================================
-- ⚠️ COPIA el ID de un producto real de la consulta #4
-- ⚠️ COPIA el ID de una orden real de la consulta #5

-- Antes del test, consulta el stock actual:
-- SELECT name, stock_quantity FROM products WHERE id = 'UUID-DEL-PRODUCTO';

-- Luego ejecuta el INSERT:
/*
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, customizations)
VALUES (
  'UUID-DE-UNA-ORDEN',  -- ID de orden existente
  'UUID-DE-UN-PRODUCTO', -- ID de producto existente (de la consulta #4)
  5, -- Cantidad a descontar
  10.0,
  50.0,
  '{"removed": [], "added": [], "notes": ""}'::jsonb
);
*/

-- Después del INSERT, verifica si el stock cambió:
-- SELECT name, stock_quantity FROM products WHERE id = 'UUID-DEL-PRODUCTO';
-- ✅ DEBE mostrar: stock_quantity - 5
-- ❌ Si NO cambió: El trigger NO está funcionando

-- ============================================
-- 8. Ver LOGS del trigger (si hay errores)
-- ============================================
-- No se puede hacer con SQL, debes ir a:
-- Supabase Dashboard → SQL Editor → Logs
-- Buscar: "[AUTO-DEDUCT]" o "ERROR"

-- ============================================
-- 9. SOLUCIÓN si el trigger NO existe
-- ============================================
-- Ejecutar nuevamente: add-product-stock.sql completo
-- Asegúrate de ejecutar TODO el archivo (las 237 líneas)

-- ============================================
-- 10. SOLUCIÓN si el trigger existe pero NO funciona
-- ============================================
-- Puede ser un problema de permisos o RLS
-- Verifica que la política RLS de order_items permita INSERT público

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'order_items';

-- ✅ DEBE tener una política que permita INSERT
-- ❌ Si NO tiene: Ejecuta fix-order-items-rls.sql (de commits anteriores)

-- ============================================
-- RESUMEN DE PROBLEMAS COMUNES:
-- ============================================
-- 1. Columna stock_quantity NO existe → Ejecutar add-product-stock.sql
-- 2. Trigger NO existe → Ejecutar add-product-stock.sql
-- 3. Función NO existe → Ejecutar add-product-stock.sql  
-- 4. RLS bloquea INSERT → Ejecutar fix-order-items-rls.sql
-- 5. Trigger tiene error → Ver logs en Supabase Dashboard
-- 6. Products.stock_quantity es NULL → UPDATE products SET stock_quantity = 100
