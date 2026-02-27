-- ============================================
-- PRUEBA SIMPLE: ¿Funciona el trigger de stock?
-- ============================================
-- Copia todo este bloque y pégalo en Supabase SQL Editor
-- Ejecútalo TODO DE UNA VEZ (Ctrl+Enter)
-- ============================================

DO $$
DECLARE
  v_product_id UUID;
  v_order_id UUID;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_product_name TEXT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧪 INICIANDO PRUEBA DE TRIGGER DE STOCK';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- ============================================
  -- PASO 1: Seleccionar un producto para probar
  -- ============================================
  -- Buscar cualquier producto disponible (sin filtrar por categoría)
  SELECT id, name INTO v_product_id, v_product_name
  FROM products
  LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: No hay productos en la base de datos';
  END IF;
  
  RAISE NOTICE '📦 Producto seleccionado: %', v_product_name;
  RAISE NOTICE '   ID: %', v_product_id;
  
  -- ============================================
  -- PASO 2: Verificar stock ANTES
  -- ============================================
  SELECT stock_quantity INTO v_stock_before
  FROM products
  WHERE id = v_product_id;
  
  IF v_stock_before IS NULL THEN
    RAISE NOTICE '⚠️  Stock es NULL. Inicializando a 100...';
    UPDATE products SET stock_quantity = 100 WHERE id = v_product_id;
    v_stock_before := 100;
  END IF;
  
  RAISE NOTICE '📊 Stock ANTES de la prueba: %', v_stock_before;
  
  -- ============================================
  -- PASO 3: Crear orden de prueba
  -- ============================================
  INSERT INTO orders (order_number, status, total_amount, final_amount, discount_amount)
  VALUES ('TEST-TRIGGER-' || floor(random() * 10000)::text, 'pending', 15.00, 15.00, 0.00)
  RETURNING id INTO v_order_id;
  
  RAISE NOTICE '✅ Orden de prueba creada: %', v_order_id;
  
  -- ============================================
  -- PASO 4: Insertar item (AQUÍ SE DISPARA EL TRIGGER)
  -- ============================================
  RAISE NOTICE '🔥 Insertando item en order_items...';
  RAISE NOTICE '   (El trigger debe ejecutarse AHORA)';
  
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
    3,  -- Ordenar 3 unidades
    5.00,
    15.00
  );
  
  RAISE NOTICE '✅ Item insertado';
  
  -- Esperar un momento (el trigger es instantáneo pero por si acaso)
  PERFORM pg_sleep(0.1);
  
  -- ============================================
  -- PASO 5: Verificar stock DESPUÉS
  -- ============================================
  SELECT stock_quantity INTO v_stock_after
  FROM products
  WHERE id = v_product_id;
  
  RAISE NOTICE '📊 Stock DESPUÉS de la prueba: %', v_stock_after;
  
  -- ============================================
  -- PASO 6: RESULTADO DE LA PRUEBA
  -- ============================================
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '   Producto: %', v_product_name;
  RAISE NOTICE '   Cantidad ordenada: 3 unidades';
  RAISE NOTICE '   Stock ANTES: %', v_stock_before;
  RAISE NOTICE '   Stock DESPUÉS: %', v_stock_after;
  RAISE NOTICE '   Diferencia: %', v_stock_before - v_stock_after;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF v_stock_after = v_stock_before - 3 THEN
    RAISE NOTICE '✅✅✅ PRUEBA EXITOSA: El trigger SÍ está funcionando';
    RAISE NOTICE '✅ El stock se descontó correctamente (- 3 unidades)';
  ELSIF v_stock_after = v_stock_before THEN
    RAISE NOTICE '❌❌❌ PRUEBA FALLIDA: El trigger NO está funcionando';
    RAISE NOTICE '❌ El stock NO cambió (sigue igual)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 POSIBLES CAUSAS:';
    RAISE NOTICE '   1. El trigger no está instalado';
    RAISE NOTICE '   2. El trigger tiene un error y falla silenciosamente';
    RAISE NOTICE '   3. Las políticas RLS bloquean el UPDATE';
    RAISE NOTICE '   4. La función auto_deduct_stock_on_order() no existe';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SIGUIENTE PASO:';
    RAISE NOTICE '   Ejecuta: DIAGNOSTICO-STOCK-NO-DESCUENTA.sql';
  ELSE
    RAISE NOTICE '⚠️  RESULTADO INESPERADO: Stock cambió pero no en 3 unidades';
    RAISE NOTICE '⚠️  Cambio real: %', v_stock_before - v_stock_after;
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- ============================================
  -- LIMPIEZA: Eliminar orden de prueba
  -- ============================================
  DELETE FROM order_items WHERE order_id = v_order_id;
  DELETE FROM orders WHERE id = v_order_id;
  
  RAISE NOTICE '🧹 Orden de prueba eliminada';
  RAISE NOTICE '✅ Prueba completada';
  
END $$;

-- ============================================
-- Si ves "✅✅✅ PRUEBA EXITOSA":
--   - El trigger funciona correctamente
--   - El problema está en otro lado (tal vez en el frontend)
--
-- Si ves "❌❌❌ PRUEBA FALLIDA":
--   - El trigger NO está funcionando
--   - Ejecuta: add-product-stock.sql completo
--   - O ejecuta: DIAGNOSTICO-STOCK-NO-DESCUENTA.sql para más detalles
-- ============================================
