-- ============================================
-- MIGRACIÓN: PERFIL DE USUARIO MEJORADO
-- Sistema de aprendizaje automático de preferencias
-- ============================================

-- Agregar nuevos campos a user_behavior_analytics
ALTER TABLE user_behavior_analytics 
ADD COLUMN IF NOT EXISTS favorite_day VARCHAR(20), -- Lunes, Martes, etc.
ADD COLUMN IF NOT EXISTS favorite_time VARCHAR(10), -- 8PM, 2PM, etc.
ADD COLUMN IF NOT EXISTS never_orders TEXT[], -- Array de ingredientes/productos que nunca pide
ADD COLUMN IF NOT EXISTS always_orders TEXT[], -- Array de extras que siempre pide
ADD COLUMN IF NOT EXISTS notes TEXT; -- Notas adicionales del perfil

COMMENT ON COLUMN user_behavior_analytics.favorite_day IS 'Día de la semana con más pedidos';
COMMENT ON COLUMN user_behavior_analytics.favorite_time IS 'Hora preferida para ordenar (ej: 8PM)';
COMMENT ON COLUMN user_behavior_analytics.never_orders IS 'Lista de ingredientes que el usuario nunca pide';
COMMENT ON COLUMN user_behavior_analytics.always_orders IS 'Lista de extras que el usuario siempre agrega';

-- ============================================
-- FUNCIÓN: Analizar y actualizar perfil del usuario
-- Se ejecuta periódicamente para detectar patrones
-- ============================================
CREATE OR REPLACE FUNCTION analyze_and_update_user_profile(p_user_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_profile JSONB;
  v_favorite_day VARCHAR;
  v_favorite_time VARCHAR;
  v_never_orders TEXT[];
  v_always_orders TEXT[];
  v_order_count INTEGER;
BEGIN
  -- Contar órdenes del usuario
  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE customer_email = p_user_email;

  -- Si tiene menos de 3 órdenes, no hay suficientes datos
  IF v_order_count < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient orders for profile analysis',
      'order_count', v_order_count
    );
  END IF;

  -- Detectar día favorito (día con más pedidos)
  SELECT 
    TO_CHAR(created_at, 'Day') as day_name
  INTO v_favorite_day
  FROM orders
  WHERE customer_email = p_user_email
  GROUP BY TO_CHAR(created_at, 'Day')
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Detectar hora favorita (hora más común redondeada)
  SELECT 
    CASE 
      WHEN EXTRACT(HOUR FROM created_at) >= 12 
        THEN (EXTRACT(HOUR FROM created_at) - 12)::TEXT || 'PM'
      ELSE EXTRACT(HOUR FROM created_at)::TEXT || 'AM'
    END as time_slot
  INTO v_favorite_time
  FROM orders
  WHERE customer_email = p_user_email
  GROUP BY time_slot
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Detectar ingredientes que NUNCA pide (removals frecuentes)
  WITH removed_items AS (
    SELECT DISTINCT unnest(
      ARRAY(
        SELECT jsonb_array_elements_text(customizations->'removals')
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.customer_email = p_user_email
        AND customizations ? 'removals'
      )
    ) as removed_item
  )
  SELECT ARRAY_AGG(removed_item) INTO v_never_orders
  FROM removed_items
  WHERE removed_item IS NOT NULL;

  -- Detectar extras que SIEMPRE pide (additions frecuentes)
  WITH added_items AS (
    SELECT unnest(
      ARRAY(
        SELECT jsonb_array_elements_text(customizations->'additions')
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.customer_email = p_user_email
        AND customizations ? 'additions'
      )
    ) as added_item
  )
  SELECT ARRAY_AGG(added_item) INTO v_always_orders
  FROM (
    SELECT added_item, COUNT(*) as frequency
    FROM added_items
    WHERE added_item IS NOT NULL
    GROUP BY added_item
    HAVING COUNT(*) >= 2 -- Mínimo 2 veces para considerarlo "siempre"
  ) frequent_additions;

  -- Actualizar el perfil en user_behavior_analytics
  UPDATE user_behavior_analytics
  SET 
    favorite_day = TRIM(v_favorite_day),
    favorite_time = v_favorite_time,
    never_orders = COALESCE(v_never_orders, ARRAY[]::TEXT[]),
    always_orders = COALESCE(v_always_orders, ARRAY[]::TEXT[]),
    updated_at = NOW()
  WHERE user_email = p_user_email;

  -- Retornar el perfil actualizado
  SELECT jsonb_build_object(
    'success', true,
    'user_email', user_email,
    'total_orders', total_orders,
    'average_order_value', average_order_value,
    'favorite_day', favorite_day,
    'favorite_time', favorite_time,
    'never_orders', never_orders,
    'always_orders', always_orders,
    'preferred_order_time', preferred_order_time,
    'last_order_date', last_order_date
  ) INTO v_profile
  FROM user_behavior_analytics
  WHERE user_email = p_user_email;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Actualizar perfil después de cada orden completada
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si la orden está completada
  IF NEW.status = 'completed' AND NEW.customer_email IS NOT NULL THEN
    -- Actualizar perfil de manera asíncrona (no bloqueante)
    PERFORM analyze_and_update_user_profile(NEW.customer_email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS update_profile_on_order_complete ON orders;
CREATE TRIGGER update_profile_on_order_complete
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trigger_update_user_profile();

-- ============================================
-- FUNCIÓN: Obtener perfil completo del usuario
-- Para usar en el chat
-- ============================================
CREATE OR REPLACE FUNCTION get_user_profile(p_user_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_profile JSONB;
BEGIN
  -- Obtener perfil existente
  SELECT jsonb_build_object(
    'user_email', user_email,
    'total_orders', total_orders,
    'average_order_value', average_order_value,
    'favorite_products', favorite_products,
    'favorite_day', favorite_day,
    'favorite_time', favorite_time,
    'never_orders', COALESCE(never_orders, ARRAY[]::TEXT[]),
    'always_orders', COALESCE(always_orders, ARRAY[]::TEXT[]),
    'preferred_order_time', preferred_order_time,
    'common_customizations', common_customizations,
    'last_order_date', last_order_date,
    'has_history', total_orders > 0
  ) INTO v_profile
  FROM user_behavior_analytics
  WHERE user_email = p_user_email;

  -- Si no existe perfil, retornar perfil vacío
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object(
      'user_email', p_user_email,
      'total_orders', 0,
      'average_order_value', 0,
      'has_history', false
    );
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLO DE USO
-- ============================================
-- SELECT analyze_and_update_user_profile('harry@example.com');
-- SELECT get_user_profile('harry@example.com');

COMMENT ON FUNCTION analyze_and_update_user_profile IS 'Analiza órdenes y actualiza perfil automáticamente';
COMMENT ON FUNCTION get_user_profile IS 'Obtiene perfil completo del usuario para personalización';
