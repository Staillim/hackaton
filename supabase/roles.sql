-- ============================================
-- SISTEMA DE ROLES - SmartBurger
-- ============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  -- Roles disponibles:
  -- 'customer' - Cliente normal
  -- 'admin' - Administrador (acceso total)
  -- 'cocina' - Personal de cocina (ver órdenes, cambiar estados)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('customer', 'admin', 'cocina'))
);

-- Índices
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(active);

-- ============================================
-- FUNCIÓN: Crear perfil automáticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'customer' -- Por defecto todos son clientes
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCIÓN: Actualizar updated_at
-- ============================================
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIONES DE VERIFICACIÓN DE ROLES
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

-- Verificar si el usuario es cocina
CREATE OR REPLACE FUNCTION is_cocina()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'cocina' AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar si el usuario es admin o cocina
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cocina') AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_admin());

-- Solo admins pueden cambiar roles
CREATE POLICY "Admins can update roles"
  ON user_profiles FOR UPDATE
  USING (is_admin());

-- ============================================
-- POLÍTICAS RLS PARA ORDERS (actualizar)
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow public read" ON orders;

-- Clientes solo ven sus propias órdenes
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_email = (SELECT email FROM user_profiles WHERE id = auth.uid()));

-- Staff (admin + cocina) pueden ver todas las órdenes
CREATE POLICY "Staff can view all orders"
  ON orders FOR SELECT
  USING (is_staff());

-- Clientes pueden crear órdenes
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Staff puede actualizar órdenes (cambiar estados)
CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  USING (is_staff());

-- Solo admins pueden eliminar órdenes
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- ============================================
-- POLÍTICAS RLS PARA PRODUCTS
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver productos activos
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (active = true OR is_staff());

-- Solo admins pueden crear/actualizar/eliminar productos
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin());

-- ============================================
-- POLÍTICAS RLS PARA INGREDIENTS
-- ============================================

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver ingredientes disponibles
CREATE POLICY "Anyone can view available ingredients"
  ON ingredients FOR SELECT
  USING (available = true OR is_staff());

-- Solo admins pueden gestionar ingredientes
CREATE POLICY "Admins can manage ingredients"
  ON ingredients FOR ALL
  USING (is_admin());

-- ============================================
-- VISTA: Órdenes con información de usuario
-- ============================================

CREATE OR REPLACE VIEW orders_with_user AS
SELECT 
  o.*,
  up.full_name as user_full_name,
  up.phone as user_phone,
  up.role as user_role
FROM orders o
LEFT JOIN user_profiles up ON o.customer_email = up.email;

-- ============================================
-- DATOS INICIALES: Crear primer admin
-- ============================================
-- IMPORTANTE: Ejecutar esto DESPUÉS de crear tu primer usuario
-- Reemplaza 'tu-email@ejemplo.com' con el email del admin

-- Ejemplo (descomenta y edita después de crear tu usuario):
/*
UPDATE user_profiles 
SET role = 'admin', full_name = 'Administrador'
WHERE email = 'admin@smartburger.com';
*/

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todos los usuarios y sus roles:
-- SELECT id, email, full_name, role, active, created_at FROM user_profiles;

-- Cambiar rol de un usuario a admin:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'email@ejemplo.com';

-- Cambiar rol de un usuario a cocina:
-- UPDATE user_profiles SET role = 'cocina' WHERE email = 'email@ejemplo.com';

-- Ver todas las órdenes con usuarios:
-- SELECT * FROM orders_with_user;
