-- ============================================
-- PRUEBA TRIGGER STOCK - PASO A PASO
-- ============================================
-- Este script se ejecuta por PARTES
-- Copia y ejecuta cada sección una por una
-- ============================================

-- ============================================
-- PASO 1: Verificar estructura de la tabla orders
-- ============================================
-- Ejecuta esto PRIMERO para ver qué columnas son obligatorias

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- ❓ Busca columnas con is_nullable = 'NO'
-- Esas son las columnas OBLIGATORIAS que debemos llenar

-- ============================================
-- PASO 2: Ver un ejemplo de orden existente
-- ============================================
-- Ejecuta esto para ver cómo están estructuradas las órdenes reales

SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;

-- ✅ Anota qué valores tienen las columnas NOT NULL


-- ============================================
-- PASO 3: Ver stock ACTUAL de productos
-- ============================================
-- Ejecuta esto para ver el stock antes de la prueba

SELECT 
  id,
  name,
  stock_quantity,
  CASE 
    WHEN stock_quantity IS NULL THEN '⚠️ NULL'
    WHEN stock_quantity = 0 THEN '❌ AGOTADO'
    ELSE '✅ ' || stock_quantity::text
  END as estado
FROM products
ORDER BY name
LIMIT 5;

-- ✅ Anota el stock del primer producto


-- ============================================
-- PASO 4: Verificar que el trigger existe
-- ============================================

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- ❓ Si NO muestra nada: El trigger NO está instalado
-- ✅ Si muestra el trigger: Continúa al siguiente paso


-- ============================================
-- PASO 5: PRUEBA COMPLETA DEL TRIGGER
-- ============================================
-- Copia y ejecuta este bloque completo

DO $$
DECLARE
  v_product_id UUID;
  v_product_name TEXT;
  v_order_id UUID;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
BEGIN
  -- Paso 5.1: Seleccionar producto
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧪 PRUEBA DE TRIGGER DE STOCK';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  SELECT id, name INTO v_product_id, v_product_name
  FROM products
  LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION '❌ No hay productos en la base de datos';
  END IF;
  
  RAISE NOTICE '📦 Producto: %', v_product_name;
  
  -- Paso 5.2: Ver stock ANTES
  SELECT stock_quantity INTO v_stock_before
  FROM products
  WHERE id = v_product_id;
  
  IF v_stock_before IS NULL THEN
    RAISE NOTICE '⚠️  Stock es NULL. Inicializando a 100...';
    UPDATE products SET stock_quantity = 100 WHERE id = v_product_id;
    v_stock_before := 100;
  END IF;
  
  RAISE NOTICE '📊 Stock ANTES: %', v_stock_before;
  
  -- Paso 5.3: Crear orden con TODAS las columnas obligatorias
  INSERT INTO orders (
    order_number,
    status,
    total_amount,
    final_amount,
    discount_amount
  )
  VALUES (
    'TEST-' || floor(random() * 10000)::text,
    'pending',
    15.00,    -- total_amount (price before discount)
    15.00,    -- final_amount (price after discount)
    0.00      -- discount_amount
  )
  RETURNING id INTO v_order_id;
  
  RAISE NOTICE '✅ Orden creada: %', v_order_id;
  
  -- Paso 5.4: Insertar item (AQUÍ SE DISPARA EL TRIGGER)
  RAISE NOTICE '🔥 Insertando item (trigger se ejecutará ahora)...';
  
  INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    unit_price,
    total_price
  )
  VALUES (
    v_order_id,
    v_product_id,
    3,
    5.00,
    15.00
  );
  
  RAISE NOTICE '✅ Item insertado';
  
  -- Esperar un poquito
  PERFORM pg_sleep(0.1);
  
  -- Paso 5.5: Ver stock DESPUÉS
  SELECT stock_quantity INTO v_stock_after
  FROM products
  WHERE id = v_product_id;
  
  RAISE NOTICE '📊 Stock DESPUÉS: %', v_stock_after;
  
  -- Paso 5.6: RESULTADO
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '   Producto: %', v_product_name;
  RAISE NOTICE '   Ordenado: 3 unidades';
  RAISE NOTICE '   Stock ANTES: %', v_stock_before;
  RAISE NOTICE '   Stock DESPUÉS: %', v_stock_after;
  RAISE NOTICE '   Diferencia: %', v_stock_before - v_stock_after;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF v_stock_after = v_stock_before - 3 THEN
    RAISE NOTICE '✅✅✅ ÉXITO: Trigger funcionando correctamente';
    RAISE NOTICE '✅ Stock descontado: -3 unidades';
  ELSIF v_stock_after = v_stock_before THEN
    RAISE NOTICE '❌❌❌ FALLO: Trigger NO funcionó';
    RAISE NOTICE '❌ Stock NO cambió';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CAUSAS POSIBLES:';
    RAISE NOTICE '   1. Trigger no está instalado';
    RAISE NOTICE '   2. Función tiene errores';
    RAISE NOTICE '   3. RLS bloquea el UPDATE';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUCIÓN:';
    RAISE NOTICE '   Ejecuta: add-product-stock.sql completo';
  ELSE
    RAISE NOTICE '⚠️  PARCIAL: Stock cambió %', v_stock_before - v_stock_after;
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Paso 5.7: Limpieza
  DELETE FROM order_items WHERE order_id = v_order_id;
  DELETE FROM orders WHERE id = v_order_id;
  
  RAISE NOTICE '🧹 Orden de prueba eliminada';
  RAISE NOTICE '✅ Prueba completada';
  
END $$;


-- ============================================
-- PASO 6: Verificar stock después de la prueba
-- ============================================
-- Ejecuta esto para confirmar que el stock volvió a su valor original

SELECT 
  name,
  stock_quantity
FROM products
ORDER BY name
LIMIT 5;

-- ✅ El stock debe ser el MISMO que antes de la prueba
-- (porque eliminamos la orden de prueba)


-- ============================================
-- 📋 INTERPRETACIÓN DE RESULTADOS
-- ============================================

-- ✅✅✅ ÉXITO: El trigger funcionó
--   → Tu sistema está OK
--   → Si el stock no se descuenta en producción, 
--     el problema está en el frontend (ChatWidget o CartWidget)

-- ❌❌❌ FALLO: El trigger NO funcionó
--   → El trigger no está instalado o tiene errores
--   → SOLUCIÓN: Ejecuta add-product-stock.sql completo

-- ⚠️ PARCIAL: Stock cambió pero no exactamente 3
--   → El trigger funciona pero con lógica incorrecta
--   → Revisa la función auto_deduct_stock_on_order()
