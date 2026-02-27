-- ============================================
-- FIX: Políticas RLS para orders, order_items y chat_conversations
-- ============================================
-- PROBLEMA: Tablas tienen RLS habilitado pero SIN políticas de INSERT
-- RESULTADO: Inserciones fallan con "row-level security policy violation"
-- ============================================

-- ======== ÓRDENES PRINCIPALES (orders) ========

-- Eliminar políticas obsoletas
DROP POLICY IF EXISTS "Allow public read" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- Políticas para ORDERS (tabla principal)
-- Cualquiera puede CREAR órdenes (necesario para usuarios no autenticados)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Cualquiera puede VER órdenes (necesario para cocina sin login)
CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

-- Cualquiera puede ACTUALIZAR órdenes (necesario para cambiar estado en cocina)
CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  USING (true);

-- Solo admins pueden ELIMINAR órdenes
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ======== ITEMS DE ÓRDENES (order_items) ========

-- Eliminar políticas obsoletas
DROP POLICY IF EXISTS "Allow public read" ON order_items;

-- Cualquiera puede INSERTAR items (necesario para chat y carrito)
CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Cualquiera puede VER items (necesario para cocina)
CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (true);

-- Cualquiera puede ACTUALIZAR items (por si necesitan corregir algo)
CREATE POLICY "Anyone can update order items"
  ON order_items FOR UPDATE
  USING (true);

-- Solo admins pueden ELIMINAR items
CREATE POLICY "Admins can delete order items"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ======== CONVERSACIONES DE CHAT (chat_conversations) ========

-- Eliminar políticas obsoletas
DROP POLICY IF EXISTS "Allow public insert" ON chat_conversations;
DROP POLICY IF EXISTS "Allow public select" ON chat_conversations;
DROP POLICY IF EXISTS "Allow public update" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON chat_conversations;

-- Cualquiera puede CREAR conversaciones (necesario para chat sin login)
CREATE POLICY "Anyone can create conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (true);

-- Cualquiera puede VER conversaciones (necesario para admin)
CREATE POLICY "Anyone can view conversations"
  ON chat_conversations FOR SELECT
  USING (true);

-- Cualquiera puede ACTUALIZAR conversaciones (UPSERT pattern)
CREATE POLICY "Anyone can update conversations"
  ON chat_conversations FOR UPDATE
  USING (true);

-- Solo admins pueden ELIMINAR conversaciones
CREATE POLICY "Admins can delete conversations"
  ON chat_conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- TEST: Verificar políticas activas
-- ============================================
-- Ejecuta esto para ver las políticas de orders:
-- SELECT * FROM pg_policies WHERE tablename = 'orders';

-- Ejecuta esto para ver las políticas de order_items:
-- SELECT * FROM pg_policies WHERE tablename = 'order_items';

-- Ejecuta esto para ver las políticas de chat_conversations:
-- SELECT * FROM pg_policies WHERE tablename = 'chat_conversations';

-- ============================================
-- VERIFICACIÓN: Probar inserciones
-- ============================================
-- Después de ejecutar este script:
-- 
-- Test 1: Crear orden desde el chat
-- ✅ Si ves: "[createOrderItems] Items insertados exitosamente" → FUNCIONA
-- ❌ Si ves: "RLS bloqueando INSERT" → Algo salió mal
-- 
-- Test 2: Enviar mensaje en el chat
-- ✅ Si ves: "✅ Mensajes guardados en BD" → FUNCIONA
-- ❌ Si ves: "new row violates row-level security policy" → Algo salió mal
