-- ============================================================================
-- TABLAS PARA CONFIGURACIÓN DINÁMICA DE SMARTBURGER
-- Todo configurable desde Max (sin JSON hardcodeado)
-- ============================================================================

-- ============================================================================
-- 1. CONFIGURACIÓN GENERAL DEL RESTAURANTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL, -- 'number', 'boolean', 'string', 'json'
  description TEXT,
  category VARCHAR(50), -- 'general', 'inventory', 'pricing', 'orders', 'notifications'
  editable_by_max BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100) -- 'max-auto', 'admin-manual'
);

-- Configuraciones iniciales
INSERT INTO restaurant_settings (setting_key, setting_value, setting_type, description, category) VALUES
-- General
('restaurant_name', 'SmartBurger', 'string', 'Nombre del restaurante', 'general'),
('timezone', 'America/Chicago', 'string', 'Zona horaria', 'general'),
('currency', 'USD', 'string', 'Moneda', 'general'),

-- Horarios
('opening_time', '09:00', 'string', 'Hora de apertura', 'general'),
('closing_time', '23:00', 'string', 'Hora de cierre', 'general'),
('peak_hours_start', '12:00', 'string', 'Inicio hora pico', 'general'),
('peak_hours_end', '14:00', 'string', 'Fin hora pico', 'general'),
('evening_peak_start', '19:00', 'string', 'Inicio hora pico noche', 'general'),
('evening_peak_end', '21:00', 'string', 'Fin hora pico noche', 'general'),

-- Inventario
('auto_restock_enabled', 'true', 'boolean', 'Habilitar reposición automática', 'inventory'),
('low_stock_threshold_multiplier', '1.5', 'number', 'Multiplicador para calcular stock bajo', 'inventory'),
('critical_stock_days', '1', 'number', 'Días de stock considerados críticos', 'inventory'),
('auto_restock_approval_required', 'false', 'boolean', 'Requiere confirmación para reponer', 'inventory'),

-- Precios
('dynamic_pricing_enabled', 'true', 'boolean', 'Habilitar precios dinámicos', 'pricing'),
('max_discount_percentage', '15', 'number', 'Descuento máximo permitido (%)', 'pricing'),
('min_profit_margin', '30', 'number', 'Margen mínimo de ganancia (%)', 'pricing'),
('discount_approval_threshold', '10', 'number', 'Descuentos >% requieren confirmación', 'pricing'),

-- Pedidos
('order_timeout_minutes', '15', 'number', 'Tiempo máximo de preparación', 'orders'),
('auto_cancel_unpaid_minutes', '30', 'number', 'Auto-cancelar pedidos sin pagar', 'orders'),
('compensation_threshold_minutes', '20', 'number', 'Minutos de retraso para compensar', 'orders'),
('compensation_discount_percentage', '10', 'number', 'Descuento por compensación', 'orders'),

-- Notificaciones
('notify_low_stock', 'true', 'boolean', 'Notificar stock bajo', 'notifications'),
('notify_high_sales', 'true', 'boolean', 'Notificar ventas altas', 'notifications'),
('notify_order_delays', 'true', 'boolean', 'Notificar pedidos retrasados', 'notifications'),
('admin_email', 'admin@smartburger.com', 'string', 'Email del administrador', 'notifications')
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================================================
-- 2. REGLAS DE PRECIOS DINÁMICOS (POR PRODUCTO Y HORARIO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'time_based', 'demand_based', 'inventory_based', 'combo'
  
  -- Para reglas basadas en tiempo
  hour_start INT, -- 0-23
  hour_end INT, -- 0-23
  day_of_week INT[], -- 0=domingo, 6=sábado, NULL=todos
  
  -- Para reglas basadas en demanda
  demand_threshold INT, -- Pedidos/hora para activar
  
  -- Para reglas basadas en inventario
  inventory_threshold INT, -- Stock mínimo para activar
  
  -- Acción de precio
  discount_percentage DECIMAL(5,2), -- Si es descuento
  price_multiplier DECIMAL(5,2), -- O multiplicador de precio
  fixed_price DECIMAL(10,2), -- O precio fijo
  
  -- Control
  active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- Mayor prioridad se aplica primero
  max_daily_applications INT, -- Límite de veces por día
  requires_confirmation BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ejemplo: Descuento en horas valle
INSERT INTO pricing_rules (rule_name, rule_type, hour_start, hour_end, discount_percentage, active, created_by) VALUES
('Happy Hour Tarde', 'time_based', 15, 18, 10.00, true, 'max-auto'),
('Happy Hour Noche', 'time_based', 21, 23, 15.00, true, 'max-auto');


-- ============================================================================
-- 3. REGLAS DE STOCK E INVENTARIO (POR INGREDIENTE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  
  -- Niveles de stock
  optimal_stock_level DECIMAL(10,2) NOT NULL, -- Stock óptimo
  min_stock_level DECIMAL(10,2) NOT NULL, -- Mínimo antes de alerta
  critical_stock_level DECIMAL(10,2) NOT NULL, -- Crítico - requiere acción
  max_stock_level DECIMAL(10,2), -- Máximo para evitar desperdicio
  
  -- Reposición automática
  auto_reorder_quantity DECIMAL(10,2), -- Cantidad a ordenar automáticamente
  reorder_frequency_days INT DEFAULT 7, -- Cada cuántos días revisar
  last_reorder_date DATE,
  
  -- Proveedores
  preferred_supplier VARCHAR(200),
  supplier_lead_time_hours INT DEFAULT 24,
  cost_per_unit DECIMAL(10,2),
  
  -- Alertas
  expires_in_days INT, -- Días antes de caducidad para alertar
  waste_threshold_percentage INT DEFAULT 10, -- % de desperdicio aceptable
  
  -- Control
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear reglas de stock para ingredientes existentes
-- (Ajusta los valores según tus necesidades)
INSERT INTO stock_rules (ingredient_id, optimal_stock_level, min_stock_level, critical_stock_level, auto_reorder_quantity)
SELECT 
  id,
  min_stock_alert * 3 as optimal_stock_level,
  min_stock_alert as min_stock_level,
  min_stock_alert * 0.5 as critical_stock_level,
  min_stock_alert * 2 as auto_reorder_quantity
FROM ingredients
WHERE NOT EXISTS (SELECT 1 FROM stock_rules WHERE stock_rules.ingredient_id = ingredients.id);


-- ============================================================================
-- 4. HISTORIAL DE ACCIONES AUTÓNOMAS DE MAX
-- ============================================================================
CREATE TABLE IF NOT EXISTS autonomous_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) NOT NULL, -- 'restock', 'discount', 'price_change', 'promotion', 'alert'
  entity_type VARCHAR(50), -- 'ingredient', 'product', 'order', 'promotion'
  entity_id UUID, -- ID del objeto afectado
  
  -- Detalles de la acción
  action_description TEXT NOT NULL,
  action_data JSONB, -- Datos estructurados de la acción
  
  -- Resultado
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Confirmación
  requires_confirmation BOOLEAN DEFAULT false,
  confirmed BOOLEAN,
  confirmed_by VARCHAR(100),
  confirmed_at TIMESTAMP,
  
  -- Impacto estimado
  estimated_cost DECIMAL(10,2),
  estimated_revenue_impact DECIMAL(10,2),
  
  -- Auditoría
  executed_at TIMESTAMP DEFAULT NOW(),
  executed_by VARCHAR(100) DEFAULT 'max-auto'
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_autonomous_actions_type ON autonomous_actions(action_type);
CREATE INDEX idx_autonomous_actions_date ON autonomous_actions(executed_at DESC);
CREATE INDEX idx_autonomous_actions_entity ON autonomous_actions(entity_type, entity_id);


-- ============================================================================
-- 5. ÓRDENES DE REPOSICIÓN (GENERADAS POR MAX)
-- ============================================================================
CREATE TABLE IF NOT EXISTS restock_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Proveedor
  supplier_name VARCHAR(200) NOT NULL,
  supplier_contact VARCHAR(200),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'ordered', 'in_transit', 'delivered', 'cancelled'
  
  -- Costos
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Fechas
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Control
  created_by VARCHAR(100) DEFAULT 'max-auto',
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Items de la orden de reposición
CREATE TABLE IF NOT EXISTS restock_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restock_order_id UUID REFERENCES restock_orders(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  
  received_quantity DECIMAL(10,2) DEFAULT 0,
  quality_check_passed BOOLEAN,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================================
-- 6. ALERTAS Y NOTIFICACIONES (GESTIONADAS POR MAX)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(50) NOT NULL, -- 'stock', 'sales', 'order', 'system', 'financial'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical', 'urgent'
  
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB, -- Datos adicionales estructurados
  
  -- Relacionado a
  related_entity_type VARCHAR(50), -- 'ingredient', 'product', 'order'
  related_entity_id UUID,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'dismissed', 'snoozed'
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(100),
  
  -- Acción recomendada
  recommended_action TEXT,
  action_taken BOOLEAN DEFAULT false,
  action_details TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  snoozed_until TIMESTAMP
);

CREATE INDEX idx_alerts_status ON system_alerts(status, severity);
CREATE INDEX idx_alerts_date ON system_alerts(created_at DESC);


-- ============================================================================
-- 7. REGLAS DE PROMOCIONES AUTOMÁTICAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL,
  
  -- Trigger (cuándo activar)
  trigger_type VARCHAR(50) NOT NULL, -- 'low_sales', 'overstock', 'time_based', 'competitor', 'weather'
  trigger_threshold JSONB, -- Condiciones específicas
  
  -- Acción (qué promoción crear)
  promotion_template JSONB NOT NULL, -- Template de promoción a crear
  
  -- Productos aplicables
  applies_to_category UUID REFERENCES categories(id),
  applies_to_products UUID[], -- Array de IDs de productos
  
  -- Control
  active BOOLEAN DEFAULT true,
  auto_create BOOLEAN DEFAULT true, -- Crear promoción automáticamente sin confirmación
  max_activations_per_week INT DEFAULT 1,
  last_activated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);


-- ============================================================================
-- 8. ANÁLISIS Y MÉTRICAS (PARA IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_type VARCHAR(50) NOT NULL, -- 'prediction', 'recommendation', 'anomaly', 'optimization'
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  insight_data JSONB NOT NULL, -- Datos del análisis
  
  -- Confianza y precisión
  confidence_score DECIMAL(3,2), -- 0.00 a 1.00
  impact_score DECIMAL(3,2), -- Impacto estimado
  
  -- Estado
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'reviewed', 'implemented', 'rejected'
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  
  -- Seguimiento
  implemented BOOLEAN DEFAULT false,
  actual_result JSONB, -- Resultado real vs predicción
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);


-- ============================================================================
-- 9. VISTA CONSOLIDADA PARA MAX
-- ============================================================================

-- Vista de inventario crítico con reglas
CREATE OR REPLACE VIEW v_critical_inventory AS
SELECT 
  i.id,
  i.name,
  i.stock_quantity,
  i.unit,
  i.min_stock_alert,
  i.available,
  sr.optimal_stock_level,
  sr.critical_stock_level,
  sr.auto_reorder_quantity,
  sr.preferred_supplier,
  CASE 
    WHEN i.stock_quantity <= sr.critical_stock_level THEN 'critical'
    WHEN i.stock_quantity <= sr.min_stock_level THEN 'low'
    WHEN i.stock_quantity >= sr.max_stock_level THEN 'overstock'
    ELSE 'ok'
  END as stock_status,
  CASE 
    WHEN i.stock_quantity > 0 THEN ROUND(i.stock_quantity / NULLIF(sr.optimal_stock_level, 0) * 100, 2)
    ELSE 0
  END as stock_percentage
FROM ingredients i
LEFT JOIN stock_rules sr ON i.id = sr.ingredient_id
WHERE i.available = true
ORDER BY stock_status DESC, stock_percentage ASC;


-- Vista de productos con reglas de precio activas
CREATE OR REPLACE VIEW v_products_with_pricing AS
SELECT 
  p.id,
  p.name,
  p.base_price,
  p.active,
  p.featured,
  COUNT(pr.id) as active_pricing_rules,
  MIN(pr.discount_percentage) as max_discount_available
FROM products p
LEFT JOIN pricing_rules pr ON p.id = pr.product_id AND pr.active = true
GROUP BY p.id, p.name, p.base_price, p.active, p.featured;


-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pricing_rules_product ON pricing_rules(product_id, active);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_time ON pricing_rules(hour_start, hour_end) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_stock_rules_ingredient ON stock_rules(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_restock_orders_status ON restock_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restock_items_order ON restock_order_items(restock_order_id);


-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para generar número de orden de reposición
CREATE OR REPLACE FUNCTION generate_restock_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  prefix VARCHAR(10) := 'RO-';
  year_month VARCHAR(6);
  sequence_num INT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 11) AS INT)), 0) + 1
  INTO sequence_num
  FROM restock_orders
  WHERE order_number LIKE prefix || year_month || '%';
  
  new_number := prefix || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;


-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON restaurant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_rules_updated_at BEFORE UPDATE ON stock_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restock_orders_updated_at BEFORE UPDATE ON restock_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Verificar tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'restaurant_settings',
    'pricing_rules',
    'stock_rules',
    'autonomous_actions',
    'restock_orders',
    'restock_order_items',
    'system_alerts',
    'promotion_rules',
    'ai_insights'
  )
ORDER BY table_name;
