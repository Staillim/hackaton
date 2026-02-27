# ⚡ SOLUCIÓN RÁPIDA: Stock no se descuenta

## 🔴 Problema
El stock NO se descuenta en `products.stock_quantity` ni en `ingredients.stock_quantity` al crear pedidos.

## ✅ Solución en 2 pasos

### **PASO 1: Ejecutar script en Supabase** (OBLIGATORIO)

1. Abre tu proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor**
3. Copia y pega **TODO** el contenido de: `supabase/add-product-stock.sql`
4. Haz clic en **RUN** (o presiona `Ctrl+Enter`)
5. Espera los checkmarks verdes ✅

**¿Qué hace el script?**
- ✅ Agrega columna `stock_quantity` a tabla `products` (si no existe)
- ✅ Inicializa stock en 100 unidades para todos los productos
- ✅ Crea función `auto_deduct_stock_on_order()`
- ✅ Crea trigger `trigger_auto_deduct_stock` en tabla `order_items`

### **PASO 2: Verificar que funcionó**

Ejecuta estas queries en Supabase SQL Editor:

```sql
-- 1. Ver que la columna existe
SELECT name, stock_quantity, available 
FROM products 
LIMIT 5;

-- 2. Ver que el trigger existe
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';
```

**Resultado esperado:**
- Query 1: Debe mostrar `stock_quantity` con valores (100 por defecto)
- Query 2: Debe mostrar 1 fila: `trigger_auto_deduct_stock | order_items`

---

## 🧪 Prueba: Verificar descuento funciona

### **Test 1: Producto simple (bebida)**

```sql
-- ANTES del pedido:
SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%';
-- Anota el stock (ejemplo: 100)
```

Haz un pedido de **3 bebidas** desde el carrito o chat.

```sql
-- DESPUÉS del pedido:
SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%';
-- Debe mostrar: 97 (100 - 3) ✅
```

### **Test 2: Producto compuesto (burger)**

```sql
-- ANTES del pedido:
SELECT name, stock_quantity FROM ingredients WHERE name LIKE '%Carne%';
-- Anota el stock (ejemplo: 150)
```

Haz un pedido de **1 burger** desde el carrito o chat.

```sql
-- DESPUÉS del pedido:
SELECT name, stock_quantity FROM ingredients WHERE name LIKE '%Carne%';
-- Debe mostrar: 149 (150 - 1) ✅
```

### **Ver logs en tiempo real**

1. Supabase Dashboard → **SQL Editor** → **Logs** (pestaña inferior)
2. Busca: `[AUTO-DEDUCT]`
3. Deberías ver:
   ```
   🛒 [AUTO-DEDUCT] Nueva orden: Coca-Cola 500ml x3
   📦 [AUTO-DEDUCT] Producto simple - Descontando 3 unidades
      📊 Stock ANTES: 100
      📊 Stock DESPUÉS: 97 (descontado: 3)
   ✅ [AUTO-DEDUCT] Stock actualizado exitosamente
   ```

---

## 🐛 Troubleshooting

### ❌ "Columna stock_quantity no existe"
**Solución:** Ejecuta nuevamente `add-product-stock.sql` completo en Supabase.

### ❌ "Trigger no existe"
```sql
-- Verificar:
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- Si está vacío, ejecuta solo la parte del trigger:
-- Líneas 47-213 de add-product-stock.sql
```

### ❌ Stock NO cambia después del pedido
1. Verifica que el pedido SÍ se creó:
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM order_items WHERE order_id = 'ID-DE-ORDEN';
   ```

2. Si el pedido existe pero stock no cambió:
   - Ve a Supabase → Logs
   - Busca errores o `[AUTO-DEDUCT]`
   - Si no hay logs: El trigger NO se está ejecutando

3. Re-crear trigger:
   ```sql
   DROP TRIGGER IF EXISTS trigger_auto_deduct_stock ON order_items;
   DROP FUNCTION IF EXISTS auto_deduct_stock_on_order();
   -- Luego ejecuta add-product-stock.sql completo
   ```

### ❌ Stock en NULL
```sql
-- Inicializar manualmente:
UPDATE products 
SET stock_quantity = 100 
WHERE stock_quantity IS NULL;

UPDATE ingredients 
SET stock_quantity = 50 
WHERE stock_quantity IS NULL;
```

---

## 📋 Cómo funciona

### **Flujo automático:**
```
Usuario hace pedido
   ↓
INSERT en order_items (con product_id + quantity)
   ↓
TRIGGER se activa automáticamente
   ↓
¿Producto tiene ingredientes?
   ├─ NO → Descuenta de products.stock_quantity
   └─ SÍ → Descuenta de cada ingredients.stock_quantity
   ↓
¿Tiene extras (aguacate, queso)?
   └─ SÍ → Descuenta extras de ingredients.stock_quantity
   ↓
Logs detallados en Supabase
   ↓
✅ Stock actualizado
```

### **Productos simples** (bebidas, papas, aros):
- Se descuenta directo de `products.stock_quantity`
- Ejemplo: 3 Coca-Colas → `stock_quantity: 100 → 97`

### **Productos compuestos** (burgers):
- Se descuenta de cada `ingredients.stock_quantity`
- Ejemplo: 1 Burger → Pan: 200→199, Carne: 150→149, etc.

### **Customizaciones** (extras):
- Se descuenta de `ingredients.stock_quantity`
- Ejemplo: Burger + aguacate → Aguacate: 50→49

---

## 🎯 Resumen ejecutivo

| Acción | Estado |
|--------|--------|
| Script actualizado | ✅ Listo |
| Trigger corregido (sin DECLARE anidados) | ✅ Listo |
| Manejo de NULL automático | ✅ Listo |
| Logs detallados (ANTES/DESPUÉS) | ✅ Listo |
| EXCEPTION handler (no falla órdenes) | ✅ Listo |

**Siguiente paso:** Ejecutar `add-product-stock.sql` en Supabase → Probar pedido → Verificar stock.
