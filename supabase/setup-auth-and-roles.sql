-- ============================================
-- CONFIGURACIÓN COMPLETA DE AUTENTICACIÓN Y ROLES - SmartBurger
-- ============================================
-- Este script debe ejecutarse UNA VEZ en Supabase SQL Editor
-- Crea todo el sistema de usuarios, perfiles y roles

-- ============================================
-- 1. TABLA DE PERFILES DE USUARIO
-- ============================================
-- Extiende auth.users con información adicional y roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('customer', 'admin', 'cocina'))
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);

COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con roles: customer (cliente), admin (administrador), cocina (personal de cocina)';

-- ============================================
-- 2. TRIGGER: Crear perfil automáticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'customer', -- Por defecto todos son clientes
    true
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar duplicados
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. TRIGGER: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. FUNCIONES DE VERIFICACIÓN DE ROLES
-- ============================================

-- Verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar si el usuario es personal de cocina
CREATE OR REPLACE FUNCTION is_cocina()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'cocina' AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar si el usuario es staff (admin o cocina)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cocina') AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) - USER_PROFILES
-- ============================================

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_admin());

-- Admins pueden actualizar cualquier perfil (incluyendo roles)
CREATE POLICY "Admins can update roles"
  ON user_profiles FOR UPDATE
  USING (is_admin());

-- Admins pueden crear perfiles manualmente
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- 6. ACTUALIZAR POLÍTICAS RLS DE ORDERS
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Allow public read" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;

-- Clientes pueden ver sus propias órdenes
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (
    customer_email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    OR is_staff() -- Staff puede ver todas
  );

-- Staff puede ver todas las órdenes
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
CREATE POLICY "Staff can view all orders"
  ON orders FOR SELECT
  USING (is_staff());

-- Cualquiera puede crear órdenes (para permitir órdenes sin autenticación)
DROP POLICY IF EXISTS "Anyone can create orders for now" ON orders;
CREATE POLICY "Anyone can create orders for now"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Staff puede actualizar órdenes (cambiar estados)
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  USING (is_staff());

-- Solo admins pueden eliminar órdenes
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- ============================================
-- 7. POLÍTICAS RLS PARA PRODUCTS (Admin puede editar)
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Everyone can view active products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Cualquiera puede ver productos activos
CREATE POLICY "Everyone can view active products"
  ON products FOR SELECT
  USING (active = true OR is_staff());

-- Admins pueden gestionar productos
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin());

-- ============================================
-- 8. POLÍTICAS RLS PARA INGREDIENTS (Admin/Cocina pueden editar)
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Everyone can view available ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can manage ingredients" ON ingredients;

-- Cualquiera puede ver ingredientes disponibles
CREATE POLICY "Everyone can view available ingredients"
  ON ingredients FOR SELECT
  USING (available = true OR is_staff());

-- Staff puede gestionar ingredientes
CREATE POLICY "Staff can manage ingredients"
  ON ingredients FOR ALL
  USING (is_staff());

-- ============================================
-- 9. CREAR USUARIO ADMINISTRADOR INICIAL
-- ============================================
-- IMPORTANTE: Ejecuta esto DESPUÉS de crear tu primer usuario en Supabase Auth
-- Reemplaza 'tu-email@ejemplo.com' con el email del admin

-- Para hacer admin a un usuario existente:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';

-- Si quieres crear usuarios de cocina:
-- UPDATE user_profiles SET role = 'cocina' WHERE email = 'cocina@ejemplo.com';

-- ============================================
-- 10. VERIFICACIÓN Y TESTING
-- ============================================

-- Ver todos los perfiles existentes
-- SELECT id, email, full_name, role, active, created_at FROM user_profiles ORDER BY created_at DESC;

-- Ver funciones de roles
-- SELECT is_admin(), is_cocina(), is_staff(), get_my_role();

-- Ver políticas RLS activas
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('user_profiles', 'orders', 'products', 'ingredients')
-- ORDER BY tablename, policyname;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- 📋 PRÓXIMOS PASOS:
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Regístrate en /login si no tienes cuenta
-- 3. Convierte tu usuario en admin:
--    UPDATE user_profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
-- 4. Recarga la página y podrás acceder a /admin
-- 5. Desde el panel de admin, puedes gestionar roles de otros usuarios
