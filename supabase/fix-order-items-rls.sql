-- ============================================
-- FIX: Políticas RLS para order_items y orders
-- ============================================
-- PROBLEMA: Los items de las órdenes no se guardan porque
-- order_items tiene RLS habilitado pero SIN políticas de INSERT
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

-- ============================================
-- TEST: Verificar políticas activas
-- ============================================
-- Ejecuta esto para ver las políticas de orders:
-- SELECT * FROM pg_policies WHERE tablename = 'orders';

-- Ejecuta esto para ver las políticas de order_items:
-- SELECT * FROM pg_policies WHERE tablename = 'order_items';

-- ============================================
-- VERIFICACIÓN: Probar inserción
-- ============================================
-- Después de ejecutar este script, prueba crear una orden desde el chat
-- Revisa la consola del navegador (F12) para ver los logs:
-- ✅ Si ves: "[createOrderItems] Items insertados exitosamente" → FUNCIONA
-- ❌ Si ves: "RLS bloqueando INSERT" → Contacta soporte de Supabase
