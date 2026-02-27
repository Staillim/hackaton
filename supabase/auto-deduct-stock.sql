-- ============================================
-- AUTO-DEDUCCIÓN DE STOCK: Trigger para descontar ingredientes automáticamente
-- ============================================
-- PROBLEMA: Cuando se crea una orden, el stock NO se descuenta automáticamente
-- SOLUCIÓN: Trigger que escucha INSERT en order_items y descuenta stock
-- ============================================

-- 🔥 FUNCIÓN: Descontar stock automáticamente cuando se crea un order_item
CREATE OR REPLACE FUNCTION auto_deduct_ingredient_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_ingredient_record RECORD;
  v_quantity_to_deduct DECIMAL;
  v_current_stock DECIMAL;
BEGIN
  -- Log para debugging
  RAISE NOTICE '[AUTO-DEDUCT] Procesando order_item: product_id=%, quantity=%', 
    NEW.product_id, NEW.quantity;
  
  -- 1. DESCONTAR INGREDIENTES BASE DEL PRODUCTO
  -- Para cada ingrediente requerido por este producto
  FOR v_ingredient_record IN
    SELECT 
      pi.ingredient_id,
      pi.quantity as ingredient_qty_per_product,
      i.name as ingredient_name,
      i.stock_quantity as current_stock
    FROM product_ingredients pi
    JOIN ingredients i ON i.id = pi.ingredient_id
    WHERE pi.product_id = NEW.product_id
      AND pi.is_required = true
  LOOP
    -- Calcular cuánto descontar (ingredientes por producto * cantidad de productos pedidos)
    v_quantity_to_deduct := v_ingredient_record.ingredient_qty_per_product * NEW.quantity;
    
    RAISE NOTICE '[AUTO-DEDUCT] Ingrediente: % - Stock actual: % - A descontar: %',
      v_ingredient_record.ingredient_name,
      v_ingredient_record.current_stock,
      v_quantity_to_deduct;
    
    -- Descontar del stock
    UPDATE ingredients
    SET stock_quantity = GREATEST(stock_quantity - v_quantity_to_deduct, 0)
    WHERE id = v_ingredient_record.ingredient_id;
    
    -- Obtener stock actualizado
    SELECT stock_quantity INTO v_current_stock
    FROM ingredients
    WHERE id = v_ingredient_record.ingredient_id;
    
    RAISE NOTICE '[AUTO-DEDUCT] Stock actualizado: %', v_current_stock;
  END LOOP;
  
  -- 2. DESCONTAR EXTRAS (customizaciones agregadas)
  -- Si el order_item tiene customizaciones en formato JSON
  IF NEW.customizations IS NOT NULL AND NEW.customizations::text != '{}' THEN
    -- Parsear las adiciones (extras)
    -- Formato esperado: {"added": ["Aguacate", "Queso Extra"], "removed": ["Pepinillos"]}
    
    -- Aquí iría la lógica para parsear el JSON y descontar extras
    -- Por ahora se puede hacer manualmente en la aplicación
    RAISE NOTICE '[AUTO-DEDUCT] Customizaciones detectadas: %', NEW.customizations;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🎯 TRIGGER: Ejecutar la función después de cada INSERT en order_items
DROP TRIGGER IF EXISTS trigger_auto_deduct_stock ON order_items;

CREATE TRIGGER trigger_auto_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION auto_deduct_ingredient_stock();

-- ============================================
-- VERIFICACIÓN: Comprobar que el trigger existe
-- ============================================
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- ============================================
-- TEST: Probar el trigger
-- ============================================
-- NOTA: Este test es solo un ejemplo. NO ejecutar sin datos de prueba.
-- 
-- 1. Ver stock actual:
-- SELECT id, name, stock_quantity FROM ingredients WHERE name LIKE '%Carne%' LIMIT 1;
-- 
-- 2. Crear una orden de prueba:
-- INSERT INTO orders (user_id, total, status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 5.99, 'pending')
-- RETURNING id;
-- 
-- 3. Crear un order_item (esto debería descontar stock automáticamente):
-- INSERT INTO order_items (order_id, product_id, quantity, unit_price)
-- VALUES (
--   '[ID_DE_ORDEN_DEL_PASO_2]',
--   (SELECT id FROM products WHERE name = 'SmartBurger Clásica' LIMIT 1),
--   2,
--   5.99
-- );
-- 
-- 4. Verificar que el stock se descontó:
-- SELECT id, name, stock_quantity FROM ingredients WHERE name LIKE '%Carne%' LIMIT 1;
-- 
-- ============================================

-- ============================================
-- ROLLBACK: Si necesitas deshacer este cambio
-- ============================================
-- DROP TRIGGER IF EXISTS trigger_auto_deduct_stock ON order_items;
-- DROP FUNCTION IF EXISTS auto_deduct_ingredient_stock();
-- ============================================

-- ============================================
-- SIGUIENTE PASO: Verificar en logs
-- ============================================
-- Después de ejecutar este script:
-- 1. Crear una orden desde el chat
-- 2. En Supabase Dashboard → SQL Editor, ejecutar:
--    SELECT * FROM pg_stat_activity WHERE query LIKE '%AUTO-DEDUCT%';
-- 3. O verificar en los logs del servidor:
--    - Deberías ver: "Stock actualizado: [cantidad]"
-- ============================================
