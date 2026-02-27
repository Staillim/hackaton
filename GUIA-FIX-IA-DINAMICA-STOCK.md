# ✅ FIX COMPLETO - IA DINÁMICA + STOCK AUTOMÁTICO

## 🎯 PROBLEMAS RESUELTOS

### 1. ✅ María ahora usa IA 100% DINÁMICA (no tabla fija)

**ANTES (❌ MALO):**
```
Usuario: "quiero coca"
María: [lookup tabla fija] → "Refresco 500ml"
Código: Busca "Refresco 500ml" en BD
```

**AHORA (✅ BUENO):**
```
Usuario: "quiero coca"
María: [revisa menú completo en prompt] → ve "Coca-Cola 500ml $1.99"
María: [ADD_TO_CART:Coca-Cola 500ml:1:::]
Código: Busca "Coca-Cola 500ml" en BD → ✅ ENCUENTRA
```

**SI HAY MÚLTIPLES OPCIONES:**
```
Usuario: "quiero coca"
María ve: "Coca-Cola 500ml" y "Coca-Cola 1L"
María pregunta: "¿Coca-Cola de 500ml ($1.99) o de 1 litro ($2.99)?"
```

**SI NO EXISTE:**
```
Usuario: "quiero pepsi"
María: "No tenemos Pepsi, pero sí Coca-Cola 500ml, Sprite 500ml o Fanta 500ml. ¿Cuál prefieres?"
```

---

### 2. ✅ Productos actualizados con nombres correctos

**Archivo:** `supabase/fix-productos-bebidas.sql`

```sql
-- Cambia "Refresco 500ml" → "Coca-Cola 500ml"
UPDATE products 
SET name = 'Coca-Cola 500ml'
WHERE name = 'Refresco 500ml';

-- Agrega Sprite, Fanta, Agua si no existen
INSERT INTO products ... 'Sprite 500ml' ...
INSERT INTO products ... 'Fanta 500ml' ...
INSERT INTO products ... 'Agua 500ml' ...
```

---

### 3. ✅ Stock se descuenta AUTOMÁTICAMENTE

**Archivo:** `supabase/auto-deduct-stock.sql`

**ANTES (❌ PROBLEMA):**
```
Usuario confirma orden
→ Order se crea en BD
→ Order_items se crea en BD
→ Stock NO cambia ❌
```

**AHORA (✅ SOLUCIÓN):**
```
Usuario confirma orden
→ Order se crea en BD
→ Order_items se crea en BD
→ TRIGGER auto_deduct_ingredient_stock() se ejecuta
→ Busca ingredientes necesarios en product_ingredients
→ Descuenta: (ingredientes por producto) × (cantidad pedida)
→ Stock se actualiza automáticamente ✅
```

**EJEMPLO:**
```
Pedido: 2 SmartBurger Clásica

Ingredientes necesarios por burger:
- Carne: 1 unidad
- Pan: 1 unidad
- Lechuga: 0.5 unidad
- Tomate: 0.5 unidad

Descuento automático:
- Carne: 1 × 2 = 2 unidades
- Pan: 1 × 2 = 2 unidades
- Lechuga: 0.5 × 2 = 1 unidad
- Tomate: 0.5 × 2 = 1 unidad
```

---

## 🚀 PASOS PARA APLICAR

### PASO 1: Ejecutar SQL de RLS (CRÍTICO)

**Archivo:** `supabase/fix-order-items-rls.sql`

```bash
1. Abrir Supabase Dashboard
2. SQL Editor
3. Copiar TODO el contenido de: supabase/fix-order-items-rls.sql
4. Pegar y RUN
5. Verificar: "CREATE POLICY" en results
```

**Este paso es CRÍTICO** - Sin esto, las órdenes no se guardan en BD.

---

### PASO 2: Actualizar nombres de productos

**Archivo:** `supabase/fix-productos-bebidas.sql`

```bash
1. SQL Editor en Supabase
2. Copiar contenido de: supabase/fix-productos-bebidas.sql
3. Pegar y RUN
4. Verificar resultado:
   ✅ Producto actualizado: Coca-Cola 500ml
   ✅ Bebidas agregadas: Sprite, Fanta, Agua
```

---

### PASO 3: Activar auto-descuento de stock

**Archivo:** `supabase/auto-deduct-stock.sql`

```bash
1. SQL Editor en Supabase
2. Copiar contenido de: supabase/auto-deduct-stock.sql
3. Pegar y RUN
4. Verificar resultado:
   ✅ Función creada: auto_deduct_ingredient_stock()
   ✅ Trigger creado: trigger_auto_deduct_stock
```

---

## ✅ PROBAR EL SISTEMA

### TEST 1: IA Dinámica

```
1. Abrir chat en localhost:3000
2. Decir: "hola quiero una hamburguesa clasica"
3. Decir: "con una cocacola"
4. Confirmar

✅ Esperado:
- María interpreta "cocacola" → "Coca-Cola 500ml"
- Marcador: [ADD_TO_CART:Coca-Cola 500ml:1:::]
- Orden se crea correctamente
```

### TEST 2: Múltiples opciones

```
1. En Supabase, agregar: "Coca-Cola 1L" (si quieres probar)
2. Decir en chat: "quiero coca"

✅ Esperado:
- María pregunta: "¿Coca-Cola 500ml o 1L?"
```

### TEST 3: Producto no existe

```
1. Decir en chat: "quiero pepsi"

✅ Esperado:
- María dice: "No tenemos Pepsi, pero sí Coca-Cola 500ml, Sprite 500ml..."
```

### TEST 4: Stock se descuenta

```bash
# ANTES de hacer pedido
1. Abrir Supabase → Table Editor → ingredients
2. Ver stock de "Carne": supongamos 100 unidades

# Hacer pedido
3. Chat: "quiero 2 hamburguesas clasicas"
4. Confirmar orden

# DESPUÉS de pedido
5. Refrescar tabla ingredients
6. Ver stock de "Carne": ahora debería ser 98 unidades (100 - 2)

✅ Esperado:
- Stock descontado automáticamente
- Sin errores en consola
```

---

## 📊 VERIFICAR EN LOGS

### En Browser (F12 → Console):

```
✅ Deberías ver:
📦 [createOrderItems] Items insertados exitosamente: 2
✅ Items en carrito al confirmar: 2 items
🎯 Orden creada exitosamente
```

### En Supabase (SQL Editor):

```sql
-- Ver logs del trigger
SELECT * FROM pg_stat_activity 
WHERE query LIKE '%AUTO-DEDUCT%'
ORDER BY query_start DESC 
LIMIT 10;
```

---

## 🐛 SI HAY PROBLEMAS

### Problema 1: "Product not found"

```bash
Causa: Producto no existe con ese nombre en BD
Solución:
1. Verificar: SELECT name FROM products WHERE name LIKE '%Coca%';
2. Ejecutar: supabase/fix-productos-bebidas.sql
```

### Problema 2: RLS error "new row violates..."

```bash
Causa: Políticas RLS no están aplicadas
Solución:
1. Ejecutar: supabase/fix-order-items-rls.sql
2. Verificar: SELECT * FROM pg_policies WHERE tablename = 'order_items';
```

### Problema 3: Stock NO se descuenta

```bash
Causa: Trigger no está creado
Solución:
1. Ejecutar: supabase/auto-deduct-stock.sql
2. Verificar:
   SELECT trigger_name 
   FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_auto_deduct_stock';
```

### Problema 4: María escribe nombre incorrecto

```bash
Causa: Prompt de IA necesita más claridad
Solución:
1. Ver en logs (F12) qué marcador escribió María
2. Si escribió mal, verificar que el menú en el prompt está correcto
3. Reintentar (IA aprende del contexto)
```

---

## 📋 RESUMEN DE CAMBIOS

### Archivos modificados:

1. **app/api/chat/route.ts**
   - IA interpreta dinámicamente (no tabla fija)
   - Menú actualizado: "Coca-Cola 500ml", "Sprite 500ml", etc.
   - Ejemplos actualizados

2. **supabase/fix-productos-bebidas.sql**
   - UPDATE 'Refresco 500ml' → 'Coca-Cola 500ml'
   - INSERT bebidas si no existen

3. **supabase/auto-deduct-stock.sql** (NUEVO)
   - Función: auto_deduct_ingredient_stock()
   - Trigger: trigger_auto_deduct_stock
   - Descuenta automáticamente al insertar order_item

---

## ✅ TODO LISTO

El servidor está corriendo con los cambios aplicados.

**PRÓXIMOS PASOS:**
1. ✅ Ejecutar 3 archivos SQL en Supabase (pasos arriba)
2. ✅ Probar en chat: "quiero hamburguesa con cocacola"
3. ✅ Verificar stock se descontó

**RESULTADO ESPERADO:**
- María entiende "coca", "cocacola", "coca-cola" ✅
- María usa nombre exacto: "Coca-Cola 500ml" ✅
- Orden se crea correctamente ✅
- Stock se descuenta automáticamente ✅
- Sin errores RLS ✅

---

## 🎉 BENEFICIOS

1. **IA más inteligente**: No depende de tabla fija, interpreta dinámicamente
2. **Nombres correctos**: "Coca-Cola 500ml" (no genérico "Refresco")
3. **Stock automático**: Trigger descuenta sin código manual
4. **Escalable**: Agregar productos nuevos funciona automáticamente
5. **Mantenible**: Todo en BD, no hardcoded
