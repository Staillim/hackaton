-- ============================================
-- TEST: Verificar que las órdenes se guardan completas
-- ============================================
-- Ejecuta estas queries DESPUÉS de crear una orden desde el chat

-- 1. Ver las últimas 5 órdenes
SELECT 
  order_number,
  customer_name,
  total_amount,
  status,
  created_at,
  notes
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver los items de la última orden
SELECT 
  o.order_number,
  oi.quantity,
  p.name as product_name,
  oi.unit_price,
  oi.total_price,
  oi.customizations
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
ORDER BY o.created_at DESC
LIMIT 10;

-- 3. Verificar políticas RLS activas en order_items
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Si la orden se guardó correctamente, deberías ver:
-- ✅ La orden en la tabla orders con su order_number
-- ✅ Los items en order_items con product_name visible
-- ✅ El campo customizations con formato JSON:
--    {"removed": ["Queso"], "added": ["Aguacate"], "notes": ""}
--
-- Si ves:
-- ❌ Orden existe pero SIN items → RLS sigue bloqueando
-- ❌ Items con product_name NULL → problema de JOIN (no crítico)
-- ❌ customizations vacío → problema en el frontend
