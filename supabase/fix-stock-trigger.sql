-- ============================================
-- CORRECCIÓN: Trigger de auto-descuento mejorado
-- ============================================
-- PROBLEMA: Bloques DECLARE anidados causan errores
-- SOLUCIÓN: Declarar todas las variables al inicio
-- ============================================

-- ============================================
-- Función mejorada con mejor manejo de errores
-- ============================================
CREATE OR REPLACE FUNCTION auto_deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ingredient_record RECORD;
  v_quantity_to_deduct DECIMAL;
  v_product_name VARCHAR(200);
  v_has_ingredients BOOLEAN;
  v_new_stock INTEGER;
  v_updated_stock DECIMAL;
  v_extra_name TEXT;
  v_extra_ingredient_id UUID;
  v_extra_new_stock DECIMAL;
  v_product_stock_before INTEGER;
  v_product_stock_after INTEGER;
BEGIN
  -- Obtener nombre del producto para logs
  SELECT name INTO v_product_name 
  FROM products 
  WHERE id = NEW.product_id;
  
  -- Si el producto no existe, salir (no fallar)
  IF v_product_name IS NULL THEN
    RAISE NOTICE '⚠️ [AUTO-DEDUCT] Producto no encontrado (ID: %)', NEW.product_id;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🛒 [AUTO-DEDUCT] Nueva orden: % x% (Order ID: %)', 
    v_product_name, NEW.quantity, NEW.order_id;
  
  -- ============================================
  -- A. DESCONTAR STOCK DEL PRODUCTO (si aplica)
  -- ============================================
  -- Verificar si el producto tiene ingredientes
  SELECT EXISTS(
    SELECT 1 FROM product_ingredients 
    WHERE product_id = NEW.product_id
  ) INTO v_has_ingredients;
  
  IF NOT v_has_ingredients THEN
    -- Producto simple: descontar del stock del producto directamente
    RAISE NOTICE '📦 [AUTO-DEDUCT] Producto simple - Descontando % unidades', NEW.quantity;
    
    -- Obtener stock ANTES
    SELECT stock_quantity INTO v_product_stock_before
    FROM products 
    WHERE id = NEW.product_id;
    
    IF v_product_stock_before IS NULL THEN
      RAISE NOTICE '⚠️ [AUTO-DEDUCT] Producto % NO tiene stock_quantity (NULL). Inicializando a 100...', v_product_name;
      
      UPDATE products
      SET stock_quantity = 100
      WHERE id = NEW.product_id;
      
      v_product_stock_before := 100;
    END IF;
    
    RAISE NOTICE '   📊 Stock ANTES: %', v_product_stock_before;
    
    -- Descontar
    UPDATE products
    SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
    WHERE id = NEW.product_id;
    
    -- Verificar stock DESPUÉS
    SELECT stock_quantity INTO v_product_stock_after
    FROM products 
    WHERE id = NEW.product_id;
    
    RAISE NOTICE '   📊 Stock DESPUÉS: % (descontado: %)', 
      v_product_stock_after, 
      v_product_stock_before - v_product_stock_after;
    RAISE NOTICE '✅ [AUTO-DEDUCT] Stock de % actualizado exitosamente', v_product_name;
    
  ELSE
    -- ============================================
    -- B. DESCONTAR INGREDIENTES (productos compuestos)
    -- ============================================
    RAISE NOTICE '🍔 [AUTO-DEDUCT] Producto compuesto - Descontando ingredientes...';
    
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
      -- Calcular cuánto descontar
      v_quantity_to_deduct := v_ingredient_record.ingredient_qty_per_product * NEW.quantity;
      
      RAISE NOTICE '   🥬 [AUTO-DEDUCT] Ingrediente: %', v_ingredient_record.ingredient_name;
      RAISE NOTICE '      Stock actual: % | A descontar: %', 
        v_ingredient_record.current_stock, v_quantity_to_deduct;
      
      -- Descontar del stock
      UPDATE ingredients
      SET stock_quantity = GREATEST(stock_quantity - v_quantity_to_deduct, 0)
      WHERE id = v_ingredient_record.ingredient_id;
      
      -- Verificar stock actualizado
      SELECT stock_quantity INTO v_updated_stock
      FROM ingredients
      WHERE id = v_ingredient_record.ingredient_id;
      
      RAISE NOTICE '      ✅ Nuevo stock: %', v_updated_stock;
    END LOOP;
  END IF;
  
  -- ============================================
  -- C. DESCONTAR EXTRAS (customizaciones agregadas)
  -- ============================================
  IF NEW.customizations IS NOT NULL AND 
     NEW.customizations::jsonb ? 'added' AND 
     jsonb_array_length(NEW.customizations::jsonb -> 'added') > 0 THEN
    
    RAISE NOTICE '🌟 [AUTO-DEDUCT] Customizaciones detectadas...';
    
    -- Iterar sobre cada extra agregado
    FOR v_extra_name IN 
      SELECT jsonb_array_elements_text(NEW.customizations::jsonb -> 'added')
    LOOP
      -- Buscar el ingrediente por nombre
      SELECT id INTO v_extra_ingredient_id
      FROM ingredients
      WHERE LOWER(name) = LOWER(v_extra_name)
      LIMIT 1;
      
      IF v_extra_ingredient_id IS NOT NULL THEN
        RAISE NOTICE '   🌟 [AUTO-DEDUCT] Extra: % - Descontando % unidades', 
          v_extra_name, NEW.quantity;
        
        UPDATE ingredients
        SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
        WHERE id = v_extra_ingredient_id;
        
        SELECT stock_quantity INTO v_extra_new_stock
        FROM ingredients
        WHERE id = v_extra_ingredient_id;
        
        RAISE NOTICE '      ✅ Stock de % actualizado: %', v_extra_name, v_extra_new_stock;
      ELSE
        RAISE NOTICE '   ⚠️ [AUTO-DEDUCT] Extra % no encontrado en ingredientes', v_extra_name;
      END IF;
    END LOOP;
  END IF;
  
  RAISE NOTICE '✅ [AUTO-DEDUCT] Descuento completado para %', v_product_name;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay cualquier error, no fallar la inserción de order_items
    RAISE WARNING '❌ [AUTO-DEDUCT] ERROR en trigger: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE NOTICE '⚠️ [AUTO-DEDUCT] La orden se creó pero el stock NO se descontó';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Recrear el trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_auto_deduct_stock ON order_items;

CREATE TRIGGER trigger_auto_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION auto_deduct_stock_on_order();

-- ============================================
-- Verificación
-- ============================================
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- ✅ Debe mostrar el trigger activo

-- ============================================
-- TEST: Crear órden de prueba
-- ============================================
-- 1. Ver stock actual:
SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%' LIMIT 1;

-- 2. Hacer pedido desde el carrito con ese producto

-- 3. Ver stock después:
SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%' LIMIT 1;

-- 4. Ver logs en Supabase Dashboard → SQL Editor → Logs
-- Buscar: "[AUTO-DEDUCT]"

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- ✅ Todas las variables declaradas al inicio (evita errores)
-- ✅ Manejo de NULL: Si stock_quantity es NULL, lo inicializa a 100
-- ✅ Logs detallados: Muestra stock ANTES y DESPUÉS
-- ✅ EXCEPTION handler: Si hay error, no falla la orden, solo avisa
-- ✅ Validación: Verifica que el producto existe antes de procesar
-- ✅ Safe: USA GREATEST(..., 0) para evitar stock negativo
