-- ============================================
-- MIGRATION: Agregar campos para decisiones autónomas
-- Fecha: 2026-02-26
-- Propósito: Habilitar optimización de rentabilidad y gestión de stock
-- ============================================

-- Agregar campos a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5, 2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50; -- 1-100, usado para ordenar sugerencias

-- Comentarios sobre los nuevos campos
COMMENT ON COLUMN products.margin_percentage IS 'Porcentaje de margen de ganancia (0-100)';
COMMENT ON COLUMN products.stock_quantity IS 'Cantidad disponible en stock';
COMMENT ON COLUMN products.min_stock_alert IS 'Nivel mínimo para alerta de stock bajo';
COMMENT ON COLUMN products.priority_score IS 'Puntaje de prioridad para sugerencias IA (1-100)';

-- Actualizar productos existentes con valores iniciales realistas
UPDATE products 
SET 
  margin_percentage = CASE 
    WHEN name LIKE '%Combo%' THEN 45.00  -- Combos tienen mejor margen
    WHEN name LIKE '%Deluxe%' THEN 40.00 -- Items premium
    WHEN name LIKE '%Bebida%' OR name LIKE '%Coca%' OR name LIKE '%Sprite%' OR name LIKE '%Fanta%' THEN 70.00 -- Bebidas = alto margen
    WHEN name LIKE '%Papas%' OR name LIKE '%Aros%' THEN 60.00 -- Sides = buen margen
    ELSE 35.00
  END,
  stock_quantity = CASE
    WHEN name LIKE '%Agua%' THEN 200  -- Agua abundante
    WHEN name LIKE '%Bebida%' OR name LIKE '%Coca%' OR name LIKE '%Sprite%' OR name LIKE '%Fanta%' THEN 150
    WHEN name LIKE '%Papas%' THEN 50
    WHEN name LIKE '%Aros%' THEN 40
    ELSE 80  -- Hamburguesas y combos
  END,
  min_stock_alert = CASE
    WHEN name LIKE '%Combo%' THEN 15
    WHEN name LIKE '%Bebida%' THEN 30
    ELSE 10
  END,
  priority_score = CASE
    -- Priorizamos productos con mejor margen y disponibilidad
    WHEN name LIKE '%Bebida%' OR name LIKE '%Coca%' OR name LIKE '%Sprite%' THEN 85
    WHEN name LIKE '%Combo Deluxe%' THEN 80
    WHEN name LIKE '%Combo%' THEN 75
    WHEN name LIKE '%Aros%' THEN 70
    WHEN name LIKE '%Papas%' THEN 65
    ELSE 50
  END
WHERE margin_percentage IS NULL OR stock_quantity IS NULL;

-- Crear índice para consultas optimizadas
CREATE INDEX IF NOT EXISTS idx_products_priority ON products(priority_score DESC, stock_quantity DESC);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- ============================================
-- TABLA DE ANÁLISIS DE COMPORTAMIENTO
-- ============================================
CREATE TABLE IF NOT EXISTS user_behavior_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  total_orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  favorite_products JSONB DEFAULT '[]'::jsonb,
  common_customizations JSONB DEFAULT '{}'::jsonb,
  preferred_order_time VARCHAR(20), -- morning, afternoon, evening, night
  last_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_email)
);

COMMENT ON TABLE user_behavior_analytics IS 'Análisis de comportamiento de usuarios para predicciones';

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_behavior_user_email ON user_behavior_analytics(user_email);

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR ANALÍTICA DE COMPORTAMIENTO
-- ============================================
CREATE OR REPLACE FUNCTION update_user_behavior()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si la orden está completada
  IF NEW.status = 'completed' THEN
    INSERT INTO user_behavior_analytics (
      user_email,
      total_orders,
      average_order_value,
      last_order_date,
      updated_at
    )
    VALUES (
      NEW.customer_email,
      1,
      NEW.total_amount,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (user_email) 
    DO UPDATE SET
      total_orders = user_behavior_analytics.total_orders + 1,
      average_order_value = (
        (user_behavior_analytics.average_order_value * user_behavior_analytics.total_orders + NEW.total_amount) / 
        (user_behavior_analytics.total_orders + 1)
      ),
      last_order_date = NEW.created_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar comportamiento automáticamente
DROP TRIGGER IF EXISTS trigger_update_user_behavior ON orders;
CREATE TRIGGER trigger_update_user_behavior
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_user_behavior();

-- ============================================
-- FUNCIÓN PARA OBTENER RECOMENDACIONES INTELIGENTES
-- ============================================
CREATE OR REPLACE FUNCTION get_smart_recommendations(
  p_user_email VARCHAR DEFAULT NULL,
  p_time_context VARCHAR DEFAULT 'any', -- morning, afternoon, evening, night, any
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR,
  base_price DECIMAL,
  margin_percentage DECIMAL,
  stock_quantity INTEGER,
  priority_score INTEGER,
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.base_price,
    p.margin_percentage,
    p.stock_quantity,
    p.priority_score,
    CASE
      WHEN p.stock_quantity < p.min_stock_alert THEN 'Stock limitado - última oportunidad'
      WHEN p.margin_percentage > 60 THEN 'Excelente relación calidad-precio'
      WHEN p.priority_score > 75 THEN 'Muy popular entre nuestros clientes'
      WHEN p.preparation_time < 10 THEN 'Preparación rápida'
      ELSE 'Recomendado para ti'
    END as recommendation_reason
  FROM products p
  WHERE 
    p.active = true 
    AND p.stock_quantity > 0
  ORDER BY 
    -- Priorizar productos con mejor margen y disponibilidad
    (p.priority_score * 0.4 + 
     p.margin_percentage * 0.3 + 
     LEAST(p.stock_quantity, 100) * 0.3) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA: Dashboard de Métricas en Tiempo Real
-- ============================================
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT 
  -- Órdenes de hoy
  (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as orders_today,
  
  -- Ingresos de hoy
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders 
   WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled') as revenue_today,
  
  -- Ticket promedio de hoy
  (SELECT COALESCE(AVG(total_amount), 0) FROM orders 
   WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled') as avg_ticket_today,
  
  -- Producto más vendido de hoy
  (SELECT p.name FROM products p
   JOIN order_items oi ON p.id = oi.product_id
   JOIN orders o ON oi.order_id = o.id
   WHERE DATE(o.created_at) = CURRENT_DATE
   GROUP BY p.id, p.name
   ORDER BY SUM(oi.quantity) DESC
   LIMIT 1) as top_product_today,
  
  -- Órdenes pendientes
  (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
  
  -- Órdenes en preparación
  (SELECT COUNT(*) FROM orders WHERE status = 'preparing') as preparing_orders,
  
  -- Tiempo promedio de preparación (en minutos)
  (SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
  ), 0) FROM orders 
   WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE) as avg_prep_time_today,
  
  -- Alertas de stock bajo
  (SELECT COUNT(*) FROM products 
   WHERE stock_quantity < min_stock_alert AND active = true) as low_stock_alerts;

COMMENT ON VIEW dashboard_metrics IS 'Métricas en tiempo real para el dashboard admin';

-- ============================================
-- PERMISOS (ajustar según RLS policies existentes)
-- ============================================
-- Asegurarse de que el service role pueda acceder a todo
GRANT ALL ON user_behavior_analytics TO service_role;
GRANT ALL ON products TO service_role;
GRANT SELECT ON dashboard_metrics TO service_role;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
