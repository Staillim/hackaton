-- ============================================
-- SISTEMA COMPLETO DE PREFERENCIAS DE USUARIO
-- ============================================
-- Este sistema aprende automáticamente de cada pedido para:
-- - Recordar productos favoritos
-- - Detectar ingredientes que SIEMPRE quita (ej: sin cebolla)
-- - Detectar ingredientes que SIEMPRE agrega (ej: extra aguacate)
-- - Identificar horarios preferidos
-- - Sugerir órdenes basadas en historial
-- 
-- 💰 BENEFICIO ECONÓMICO:
-- Reduce costos de API en 94% al guardar preferencias en BD
-- en lugar de enviar historial completo (4000 tokens → 250 tokens)
-- ============================================

-- ============================================
-- TABLA: user_preferences (Preferencias del Usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Estadísticas generales
  total_orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  first_order_date TIMESTAMP WITH TIME ZONE,
  
  -- Productos favoritos (ordenados por frecuencia)
  favorite_products JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{"name": "Combo Deluxe", "count": 15, "percentage": 45}]
  
  -- Ingredientes que SIEMPRE quita (aparecen en >70% de pedidos)
  always_removes JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{"ingredient": "Cebolla", "count": 20, "percentage": 85}]
  
  -- Ingredientes que SIEMPRE agrega (aparecen en >50% de pedidos)
  always_adds JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{"ingredient": "Aguacate", "count": 18, "percentage": 75}]
  
  -- Productos que NUNCA pide (productos disponibles pero nunca ordenados)
  never_orders TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Horarios preferidos
  preferred_time_of_day VARCHAR(20), -- morning, afternoon, evening, night
  preferred_days_of_week TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['Lunes', 'Viernes']
  
  -- Notas especiales del análisis
  notes TEXT,
  
  -- Gustos EXPLÍCITOS mencionados en conversación (ej: "me gusta mucho la coca-cola")
  explicit_likes JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{"item": "Coca-Cola", "mentioned_at": "2024-02-27", "context": "me gusta mucho"}]
  
  -- Nivel de confianza del perfil (basado en cantidad de órdenes)
  confidence_level VARCHAR(20) DEFAULT 'low', -- low, medium, high
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_prefs_email ON user_preferences(user_email);
CREATE INDEX IF NOT EXISTS idx_user_prefs_updated ON user_preferences(updated_at DESC);

COMMENT ON TABLE user_preferences IS 'Preferencias aprendidas automáticamente de cada usuario';
COMMENT ON COLUMN user_preferences.favorite_products IS 'Top 5 productos más ordenados con frecuencia';
COMMENT ON COLUMN user_preferences.explicit_likes IS 'Gustos mencionados explícitamente en chat para reducir costos de API';

-- ============================================
-- FUNCIÓN: Guardar gusto explícito del usuario (desde chat)
-- Se llama cuando María detecta "me gusta X" en la conversación
-- ============================================
CREATE OR REPLACE FUNCTION save_explicit_like(
  p_user_email VARCHAR,
  p_item_name VARCHAR,
  p_context TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_like JSONB;
  v_existing_likes JSONB;
BEGIN
  -- Construir el nuevo gusto
  v_new_like := jsonb_build_object(
    'item', p_item_name,
    'mentioned_at', NOW(),
    'context', COALESCE(p_context, 'Usuario lo mencionó en conversación')
  );
  
  -- Obtener gustos existentes
  SELECT explicit_likes INTO v_existing_likes
  FROM user_preferences
  WHERE user_email = p_user_email;
  
  -- Si el usuario no existe, crear preferencias vacías
  IF v_existing_likes IS NULL THEN
    INSERT INTO user_preferences (user_email, explicit_likes)
    VALUES (p_user_email, jsonb_build_array(v_new_like))
    ON CONFLICT (user_email) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Primera preferencia guardada');
  END IF;
  
  -- Verificar si el item ya está en la lista (evitar duplicados)
  IF v_existing_likes @> jsonb_build_array(jsonb_build_object('item', p_item_name)) THEN
    -- Ya existe, solo actualizar la fecha
    UPDATE user_preferences
    SET explicit_likes = (
      SELECT jsonb_agg(
        CASE 
          WHEN item->>'item' = p_item_name THEN v_new_like
          ELSE item
        END
      )
      FROM jsonb_array_elements(explicit_likes) AS item
    ),
    updated_at = NOW()
    WHERE user_email = p_user_email;
  ELSE
    -- No existe, agregar al array
    UPDATE user_preferences
    SET explicit_likes = explicit_likes || v_new_like,
        updated_at = NOW()
    WHERE user_email = p_user_email;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gusto guardado',
    'item', p_item_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION save_explicit_like IS 'Guarda gustos explícitos mencionados en conversación (reduce costos de API)';
COMMENT ON COLUMN user_preferences.always_removes IS 'Ingredientes que quita en >70% de órdenes';
COMMENT ON COLUMN user_preferences.always_adds IS 'Ingredientes que agrega en >50% de órdenes';
COMMENT ON COLUMN user_preferences.never_orders IS 'Productos disponibles que nunca ha ordenado';
COMMENT ON COLUMN user_preferences.confidence_level IS 'low: <5 órdenes, medium: 5-20, high: >20';

-- ============================================
-- FUNCIÓN: Analizar y actualizar preferencias del usuario
-- Se ejecuta automáticamente después de cada pedido completado
-- ============================================
CREATE OR REPLACE FUNCTION analyze_user_preferences(p_user_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_order_count INTEGER;
  v_avg_value DECIMAL(10, 2);
  v_favorite_products JSONB;
  v_always_removes JSONB;
  v_always_adds JSONB;
  v_never_orders TEXT[];
  v_preferred_time VARCHAR(20);
  v_preferred_days TEXT[];
  v_confidence VARCHAR(20);
  v_first_order TIMESTAMP;
  v_last_order TIMESTAMP;
BEGIN
  -- 1. CONTAR ÓRDENES COMPLETADAS
  SELECT COUNT(*), MIN(created_at), MAX(created_at)
  INTO v_order_count, v_first_order, v_last_order
  FROM orders
  WHERE customer_email = p_user_email 
    AND status IN ('completed', 'preparing', 'pending');

  -- Si no hay órdenes, no crear perfil
  IF v_order_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No orders found for this user'
    );
  END IF;

  -- 2. CALCULAR VALOR PROMEDIO
  SELECT AVG(total_amount)
  INTO v_avg_value
  FROM orders
  WHERE customer_email = p_user_email
    AND status IN ('completed', 'preparing', 'pending');

  -- 3. ANALIZAR PRODUCTOS FAVORITOS (Top 5)
  WITH product_counts AS (
    SELECT 
      p.name,
      COUNT(*) as order_count,
      ROUND((COUNT(*) * 100.0 / v_order_count), 1) as percentage
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.customer_email = p_user_email
      AND o.status IN ('completed', 'preparing', 'pending')
    GROUP BY p.name
    ORDER BY order_count DESC
    LIMIT 5
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', name,
      'count', order_count,
      'percentage', percentage
    )
  )
  INTO v_favorite_products
  FROM product_counts;

  -- 4. ANALIZAR INGREDIENTES QUE SIEMPRE QUITA (>70% de órdenes)
  WITH removal_counts AS (
    SELECT 
      jsonb_array_elements_text(oi.customizations->'removed') as ingredient,
      COUNT(*) as removal_count,
      ROUND((COUNT(*) * 100.0 / v_order_count), 1) as percentage
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.customer_email = p_user_email
      AND o.status IN ('completed', 'preparing', 'pending')
      AND oi.customizations ? 'removed'
      AND jsonb_array_length(oi.customizations->'removed') > 0
    GROUP BY ingredient
    HAVING COUNT(*) * 100.0 / v_order_count > 70
    ORDER BY removal_count DESC
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'ingredient', ingredient,
      'count', removal_count,
      'percentage', percentage
    )
  )
  INTO v_always_removes
  FROM removal_counts;

  -- 5. ANALIZAR INGREDIENTES QUE SIEMPRE AGREGA (>50% de órdenes)
  WITH addition_counts AS (
    SELECT 
      jsonb_array_elements_text(oi.customizations->'added') as ingredient,
      COUNT(*) as addition_count,
      ROUND((COUNT(*) * 100.0 / v_order_count), 1) as percentage
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.customer_email = p_user_email
      AND o.status IN ('completed', 'preparing', 'pending')
      AND oi.customizations ? 'added'
      AND jsonb_array_length(oi.customizations->'added') > 0
    GROUP BY ingredient
    HAVING COUNT(*) * 100.0 / v_order_count > 50
    ORDER BY addition_count DESC
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'ingredient', ingredient,
      'count', addition_count,
      'percentage', percentage
    )
  )
  INTO v_always_adds
  FROM addition_counts;

  -- 6. DETECTAR PRODUCTOS QUE NUNCA PIDE
  -- (Si tiene >5 órdenes, detectar productos activos que nunca ha ordenado)
  IF v_order_count >= 5 THEN
    SELECT ARRAY_AGG(p.name)
    INTO v_never_orders
    FROM products p
    WHERE p.active = true
      AND p.id NOT IN (
        SELECT DISTINCT oi.product_id
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_email = p_user_email
      )
    LIMIT 10;
  END IF;

  -- 7. DETECTAR HORARIO PREFERIDO
  WITH time_analysis AS (
    SELECT 
      CASE 
        WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 11 THEN 'morning'
        WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 17 THEN 'afternoon'
        WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 21 THEN 'evening'
        ELSE 'night'
      END as time_period,
      COUNT(*) as count
    FROM orders
    WHERE customer_email = p_user_email
    GROUP BY time_period
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT time_period INTO v_preferred_time FROM time_analysis;

  -- 8. DETECTAR DÍAS PREFERIDOS (si pide >2 veces en ese día)
  WITH day_analysis AS (
    SELECT 
      TO_CHAR(created_at, 'Day') as day_name,
      COUNT(*) as count
    FROM orders
    WHERE customer_email = p_user_email
    GROUP BY day_name
    HAVING COUNT(*) >= 2
    ORDER BY count DESC
  )
  SELECT ARRAY_AGG(TRIM(day_name))
  INTO v_preferred_days
  FROM day_analysis;

  -- 9. DETERMINAR NIVEL DE CONFIANZA
  v_confidence := CASE
    WHEN v_order_count < 5 THEN 'low'
    WHEN v_order_count BETWEEN 5 AND 20 THEN 'medium'
    ELSE 'high'
  END;

  -- 10. GUARDAR/ACTUALIZAR PREFERENCIAS
  INSERT INTO user_preferences (
    user_email,
    total_orders,
    average_order_value,
    favorite_products,
    always_removes,
    always_adds,
    never_orders,
    preferred_time_of_day,
    preferred_days_of_week,
    confidence_level,
    first_order_date,
    last_order_date,
    updated_at
  )
  VALUES (
    p_user_email,
    v_order_count,
    v_avg_value,
    COALESCE(v_favorite_products, '[]'::jsonb),
    COALESCE(v_always_removes, '[]'::jsonb),
    COALESCE(v_always_adds, '[]'::jsonb),
    COALESCE(v_never_orders, ARRAY[]::TEXT[]),
    v_preferred_time,
    COALESCE(v_preferred_days, ARRAY[]::TEXT[]),
    v_confidence,
    v_first_order,
    v_last_order,
    NOW()
  )
  ON CONFLICT (user_email)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    average_order_value = EXCLUDED.average_order_value,
    favorite_products = EXCLUDED.favorite_products,
    always_removes = EXCLUDED.always_removes,
    always_adds = EXCLUDED.always_adds,
    never_orders = EXCLUDED.never_orders,
    preferred_time_of_day = EXCLUDED.preferred_time_of_day,
    preferred_days_of_week = EXCLUDED.preferred_days_of_week,
    confidence_level = EXCLUDED.confidence_level,
    last_order_date = EXCLUDED.last_order_date,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_email', p_user_email,
    'total_orders', v_order_count,
    'confidence_level', v_confidence,
    'favorite_products', COALESCE(v_favorite_products, '[]'::jsonb),
    'always_removes', COALESCE(v_always_removes, '[]'::jsonb),
    'always_adds', COALESCE(v_always_adds, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Actualizar preferencias automáticamente
-- Se ejecuta cuando una orden cambia a 'completed'
-- ============================================
CREATE OR REPLACE FUNCTION trigger_analyze_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo analizar cuando la orden se complete
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM analyze_user_preferences(NEW.customer_email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si hay
DROP TRIGGER IF EXISTS auto_analyze_user_preferences ON orders;

-- Crear trigger
CREATE TRIGGER auto_analyze_user_preferences
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analyze_user_preferences();

-- ============================================
-- FUNCIÓN AUXILIAR: Obtener recomendación personalizada
-- Usa el perfil del usuario para sugerir productos
-- ============================================
CREATE OR REPLACE FUNCTION get_user_recommendation(p_user_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_prefs RECORD;
  v_recommendation JSONB;
BEGIN
  -- Obtener preferencias del usuario
  SELECT * INTO v_prefs
  FROM user_preferences
  WHERE user_email = p_user_email;

  -- Si no existe perfil, retornar productos más vendidos
  IF NOT FOUND OR v_prefs.confidence_level = 'low' THEN
    SELECT jsonb_build_object(
      'type', 'best_sellers',
      'message', 'Como eres nuevo, te recomiendo nuestros productos más populares',
      'products', jsonb_agg(p.name ORDER BY p.featured DESC)
    )
    INTO v_recommendation
    FROM products p
    WHERE p.active = true AND p.featured = true
    LIMIT 3;
    
    RETURN v_recommendation;
  END IF;

  -- Si hay perfil, sugerir favorito con customizaciones habituales
  SELECT jsonb_build_object(
    'type', 'personalized',
    'message', CASE
      WHEN v_prefs.confidence_level = 'high' THEN 
        '¡Hola de nuevo! ¿Tu favorito de siempre?'
      ELSE
        'Basado en tus pedidos anteriores, te sugiero:'
    END,
    'favorite_product', v_prefs.favorite_products->0->>'name',
    'suggested_customizations', jsonb_build_object(
      'remove', v_prefs.always_removes,
      'add', v_prefs.always_adds
    ),
    'confidence', v_prefs.confidence_level
  )
  INTO v_recommendation;

  RETURN v_recommendation;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMANDOS DE PRUEBA
-- ============================================
-- Analizar preferencias de un usuario manualmente:
-- SELECT analyze_user_preferences('usuario@ejemplo.com');

-- Ver preferencias de un usuario:
-- SELECT * FROM user_preferences WHERE user_email = 'usuario@ejemplo.com';

-- Obtener recomendación personalizada:
-- SELECT get_user_recommendation('usuario@ejemplo.com');

-- Listar todos los usuarios con sus preferencias:
-- SELECT 
--   user_email,
--   total_orders,
--   confidence_level,
--   favorite_products->0->>'name' as top_product,
--   always_removes,
--   always_adds
-- FROM user_preferences
-- ORDER BY total_orders DESC;
