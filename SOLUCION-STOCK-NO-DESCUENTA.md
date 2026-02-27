# 🔧 SOLUCIÓN: Stock no se descuenta al hacer pedido desde carrito

## 📋 Problema
Realizaste un pedido desde el carrito y el stock **NO se descontó**.

## 🎯 Solución Paso a Paso

### **PASO 1: Diagnosticar el problema** ⚕️

Abre Supabase SQL Editor y ejecuta:

```bash
supabase/diagnostica-stock.sql
```

Este script te dirá:
- ✅ Si la columna `stock_quantity` existe
- ✅ Si el trigger `trigger_auto_deduct_stock` está activo
- ✅ Si la función `auto_deduct_stock_on_order()` existe
- ✅ El stock actual de tus productos
- ✅ Las últimas órdenes creadas

### **PASO 2: Aplicar la corrección** 🔨

Ejecuta en Supabase SQL Editor:

```bash
supabase/fix-stock-trigger.sql
```

Este script:
- ✅ Corrige los bloques DECLARE anidados (error de sintaxis)
- ✅ Agrega manejo robusto de errores
- ✅ Inicializa stock a 100 si es NULL
- ✅ Logs más detallados (ANTES/DESPUÉS del descuento)
- ✅ No falla la orden si hay error (usa EXCEPTION handler)

### **PASO 3: Verificar que funcionó** ✅

1. **Ver stock actual:**
   ```sql
   SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%' LIMIT 1;
   ```
   
   📊 Anota el valor (ejemplo: 100)

2. **Hacer un pedido de prueba:**
   - Ve al carrito
   - Agrega producto (ejemplo: 3 Coca-Colas)
   - Confirma la orden

3. **Ver stock después:**
   ```sql
   SELECT name, stock_quantity FROM products WHERE name LIKE '%Coca%' LIMIT 1;
   ```
   
   📊 Debe mostrar: **100 - 3 = 97** ✅

4. **Ver logs del trigger:**
   - Supabase Dashboard → SQL Editor → **Logs**
   - Buscar: `[AUTO-DEDUCT]`
   - Debes ver algo como:
     ```
     🛒 [AUTO-DEDUCT] Nueva orden: Coca-Cola 500ml x3
     📦 [AUTO-DEDUCT] Producto simple - Descontando 3 unidades
        📊 Stock ANTES: 100
        📊 Stock DESPUÉS: 97 (descontado: 3)
     ✅ [AUTO-DEDUCT] Stock de Coca-Cola 500ml actualizado exitosamente
     ```

## 🐛 Problemas Comunes

### 1️⃣ **Trigger no existe**
```
❌ Error: No results from query #2
```

**Solución:**
```sql
-- Ejecutar el script completo:
supabase/add-product-stock.sql
```

### 2️⃣ **Columna stock_quantity no existe**
```
❌ Error: column "stock_quantity" does not exist
```

**Solución:**
```sql
-- Agregar columna manualmente:
ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 100;
UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL;
```

### 3️⃣ **Stock es NULL**
```
📊 Stock muestra: NULL
```

**Solución:**
```sql
UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL;
```

### 4️⃣ **RLS bloquea INSERT en order_items**
```
❌ Error: new row violates row-level security policy
```

**Solución:**
Ejecutar: `supabase/fix-order-items-rls.sql` (de commits anteriores)

### 5️⃣ **Trigger falla silenciosamente**
```
✅ Orden se crea
❌ Stock no cambia
❌ No hay logs de [AUTO-DEDUCT]
```

**Solución:**
1. Ver logs de Supabase (Dashboard → Logs)
2. Buscar errores: `ERROR` o `WARNING`
3. Ejecutar `fix-stock-trigger.sql` (manejo de errores mejorado)

## 📊 Diferencias entre los scripts

| Script | Propósito |
|--------|-----------|
| `add-product-stock.sql` | Script original - Crea columna, función y trigger |
| `diagnostica-stock.sql` | Diagnóstico - Identifica qué está mal |
| `fix-stock-trigger.sql` | Corrección - Trigger mejorado sin errores de sintaxis |

## 🎯 Qué hace el trigger corregido

### **Productos simples** (bebidas, papas, aros):
- Descuenta directo de `products.stock_quantity`
- Ejemplo: Ordenar 3 Coca-Colas → stock: 100 → 97

### **Productos compuestos** (burgers):
- Descuenta de cada ingrediente en `ingredients.stock_quantity`
- Ejemplo: Ordenar 1 SmartBurger → Pan: 200→199, Carne: 150→149, etc.

### **Customizaciones** (extras):
- Descuenta los agregados de `ingredients.stock_quantity`
- Ejemplo: Burger + extra aguacate → Aguacate: 50→49

## 💡 Mejoras del nuevo trigger

1. ✅ **Todas las variables al inicio** (evita errores DECLARE anidado)
2. ✅ **Manejo de NULL** (inicializa a 100 automáticamente)
3. ✅ **Logs ANTES/DESPUÉS** (muestra cuánto se descontó)
4. ✅ **EXCEPTION handler** (no falla la orden si hay error)
5. ✅ **Validaciones** (verifica que producto/ingrediente existe)
6. ✅ **Safe updates** (GREATEST evita stock negativo)

## 📞 Si el problema persiste

Envíame:
1. Resultado de `diagnostica-stock.sql` (queries #1, #2, #3, #4)
2. Captura de logs de Supabase al hacer pedido
3. Mensaje de error exacto (si hay)

---

**Última actualización:** Script corregido con mejor manejo de errores y logs detallados
