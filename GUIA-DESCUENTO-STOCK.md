# 📦 Sistema de Descuento Automático de Stock

## 🎯 ¿Qué hace?

Cuando un cliente realiza un pedido (desde el chat con María o desde el carrito), el sistema **descuenta automáticamente** las unidades del stock:

- **Productos simples** (bebidas, papas): Descuenta del stock del producto
- **Productos compuestos** (hamburguesas, combos): Descuenta ingredientes individuales
- **Extras/Customizaciones**: Descuenta ingredientes agregados como extras

## 🚀 Instalación (3 pasos)

### Paso 1: Ejecutar el SQL principal

1. Abre **Supabase SQL Editor**
2. Copia y pega TODO el contenido de `supabase/add-product-stock.sql`
3. Ejecuta el script

**¿Qué hace este script?**
- ✅ Agrega columna `stock_quantity` a la tabla `products`
- ✅ Inicializa stock de productos existentes en 100 unidades
- ✅ Crea función para descuento automático
- ✅ Crea trigger que se ejecuta al crear order_items

### Paso 2: Ajustar stock inicial (opcional)

Si quieres stock personalizado para cada producto:

```sql
-- Ejemplo: Ajustar stock de bebidas
UPDATE products SET stock_quantity = 200 WHERE name LIKE '%Coca%';
UPDATE products SET stock_quantity = 150 WHERE name LIKE '%Sprite%';
UPDATE products SET stock_quantity = 300 WHERE name = 'Papas Fritas';
```

### Paso 3: Ejecutar SQL de bebidas

Para que las bebidas funcionen correctamente:

1. Ejecuta `supabase/fix-productos-bebidas.sql`
   - Esto agrega Coca-Cola, Sprite, Fanta, Agua con imágenes
   - Ya incluye stock_quantity = 100 por defecto

## 📊 Cómo funciona

### Flujo automático:

```
Usuario hace pedido
       ↓
Chat/Carrito crea orden
       ↓
Se insertan order_items
       ↓
🔥 TRIGGER se activa automáticamente
       ↓
Descuenta stock según tipo de producto
```

### Tipos de descuento:

#### 1️⃣ Productos simples (bebidas, papas, aros)

```
Producto sin ingredientes → Descuenta del producto directamente

Ejemplo:
- Usuario pide 2 Coca-Colas
- Stock de Coca-Cola: 100 → 98
```

#### 2️⃣ Productos compuestos (hamburguesas, combos)

```
Producto con ingredientes → Descuenta cada ingrediente

Ejemplo:
- Usuario pide 1 SmartBurger
- Ingredientes:
  * Pan Burger: 2 → 1
  * Carne 150g: 1 → 0
  * Lechuga: 20g → 15g
  * Tomate: 20g → 15g
  * Queso: 1 → 0
```

#### 3️⃣ Customizaciones (extras agregados)

```
Usuario agrega extras → Descuenta ingrediente extra

Ejemplo:
- Usuario pide burger + extra aguacate
- Stock de aguacate: 50 → 49
```

## 🧪 Cómo probar

### Test 1: Producto simple (bebida)

```sql
-- 1. Ver stock inicial
SELECT name, stock_quantity 
FROM products 
WHERE name = 'Coca-Cola 500ml';

-- 2. Hacer pedido desde chat o carrito:
--    "Quiero 2 Coca-Colas"

-- 3. Ver stock actualizado (debería bajar en 2)
SELECT name, stock_quantity 
FROM products 
WHERE name = 'Coca-Cola 500ml';
```

### Test 2: Producto compuesto (burger)

```sql
-- 1. Ver ingredientes antes
SELECT name, stock_quantity 
FROM ingredients 
WHERE name IN ('Pan Burger', 'Carne 150g', 'Lechuga');

-- 2. Pedir 1 SmartBurger desde chat

-- 3. Ver ingredientes después (deben bajar según recipe)
SELECT name, stock_quantity 
FROM ingredients 
WHERE name IN ('Pan Burger', 'Carne 150g', 'Lechuga');
```

### Test 3: Con extras

```sql
-- 1. Ver stock de aguacate
SELECT name, stock_quantity 
FROM ingredients 
WHERE name = 'Aguacate';

-- 2. Pedir burger con extra aguacate

-- 3. Ver stock actualizado
SELECT name, stock_quantity 
FROM ingredients 
WHERE name = 'Aguacate';
```

## 📝 Logs del trigger

El trigger escribe logs detallados en Supabase:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 [AUTO-DEDUCT] Nueva orden: Coca-Cola 500ml x2
📦 [AUTO-DEDUCT] Producto simple - Descontando 2 unidades
✅ [AUTO-DEDUCT] Stock de Coca-Cola 500ml actualizado: 98
✅ [AUTO-DEDUCT] Descuento completado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Para ver estos logs:
1. Supabase Dashboard → SQL Editor
2. Tab "Logs" (esquina superior derecha)
3. Buscar: `[AUTO-DEDUCT]`

## 🔍 Verificación de instalación

### 1. Verificar que la columna existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'stock_quantity';
```

**Resultado esperado:**
```
column_name     | data_type
stock_quantity  | integer
```

### 2. Verificar que el trigger existe:

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_deduct_stock';
```

**Resultado esperado:**
```
trigger_name               | event_object_table | action_statement
trigger_auto_deduct_stock | order_items        | EXECUTE FUNCTION auto_deduct_stock_on_order()
```

### 3. Verificar stock de productos:

```sql
SELECT name, stock_quantity 
FROM products 
WHERE stock_quantity IS NOT NULL
ORDER BY name;
```

**Resultado esperado:**
Todos los productos deben tener un valor de stock (ej: 100)

## ⚠️ Consideraciones importantes

### 1. Stock nunca baja de 0

El trigger usa `GREATEST(stock - cantidad, 0)` para evitar valores negativos:

```sql
UPDATE products
SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
-- Si stock = 2 y piden 5 → queda en 0, no en -3
```

### 2. Alertas de inventario

El trigger existente `check_ingredient_stock` sigue funcionando:
- Si un ingrediente baja del mínimo → crea alerta
- Si vuelve a subir → resuelve alerta automáticamente

### 3. Productos vs Ingredientes

- **Bebidas envasadas**: Descuenta del producto (1 unidad = 1 botella)
- **Hamburguesas**: Descuenta ingredientes (1 burger = 1 pan + 1 carne + ...)
- **Sistema detecta automáticamente** qué tipo es según tenga o no ingredientes

## 🔧 Troubleshooting

### ❌ El stock NO se descuenta

**Diagnóstico:**

```sql
-- 1. Verificar que el trigger existe
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_deduct_stock';

-- 2. Ver logs recientes
-- (En Supabase SQL Editor → Logs)
-- Buscar: "[AUTO-DEDUCT]"

-- 3. Hacer pedido de prueba y verificar logs
```

**Posibles causas:**
- Trigger no ejecutado (falta ejecutar `add-product-stock.sql`)
- Error en la función (revisar logs de Supabase)
- RLS bloqueando UPDATE (poco probable, funciones tienen bypass)

### ❌ Stock se descuenta de más

Verifica la tabla `product_ingredients`:

```sql
-- Ver receta de un producto
SELECT 
  p.name as producto,
  i.name as ingrediente,
  pi.quantity as cantidad_por_producto
FROM products p
JOIN product_ingredients pi ON pi.product_id = p.id
JOIN ingredients i ON i.id = pi.ingredient_id
WHERE p.name = 'SmartBurger Clásica';
```

Si las cantidades están mal, ajústalas:

```sql
UPDATE product_ingredients
SET quantity = 1.0
WHERE product_id = (SELECT id FROM products WHERE name = 'SmartBurger Clásica')
  AND ingredient_id = (SELECT id FROM ingredients WHERE name = 'Carne 150g');
```

### ❌ Productos tienen stock NULL

```sql
-- Inicializar stock de productos sin stock
UPDATE products 
SET stock_quantity = 100 
WHERE stock_quantity IS NULL;
```

## 🎯 Próximos pasos

Después de instalar este sistema:

1. ✅ **Ajustar stock inicial** de cada producto según inventario real
2. ✅ **Configurar alertas** (min_stock_alert) para cada ingrediente
3. ✅ **Probar** con pedidos reales desde:
   - Chat con María
   - Carrito directo desde landing
4. ✅ **Monitorear** los logs para verificar descuentos
5. ✅ **Panel de Max** ya mostrará stock actualizado en tiempo real

## 📞 Soporte

Si tienes dudas:
1. Revisa los logs: `[AUTO-DEDUCT]` en Supabase
2. Ejecuta las queries de verificación de arriba
3. Verifica que ejecutaste ambos scripts:
   - `add-product-stock.sql`
   - `fix-productos-bebidas.sql`
