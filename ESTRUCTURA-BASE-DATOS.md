# 📊 Estructura de Base de Datos - Sistema de Pedidos

## ❓ ¿Por qué hay 2 "orders"?

### `orders` (TABLA REAL)
- Es donde se **GUARDAN** las órdenes
- Columnas principales:
  - `id` → UUID del pedido
  - `order_number` → Número visible (ej: SB202602270005)
  - `customer_name` → Nombre del cliente
  - `customer_email` → Email del cliente
  - `total_amount` → Total del pedido
  - `status` → Estado: pending, preparing, completed
  - `notes` → Notas generales

### `orders_with_user` (VISTA, NO TABLA)
- Es solo una **CONSULTA AUTOMATIZADA** que combina:
  - Todo de `orders` +
  - Datos de `user_profiles` (rol, teléfono, etc.)
- NO guarda datos, solo los muestra juntos
- Es útil para ver órdenes con info del usuario

## 📦 ¿Dónde se guardan los productos y adiciones?

### `order_items` (TABLA DE ITEMS)
Cada **PRODUCTO** del pedido es una fila separada:

```sql
CREATE TABLE order_items (
  id UUID,
  order_id UUID,              -- ¿De qué orden es?
  product_id UUID,             -- ¿Qué producto?
  quantity INTEGER,            -- ¿Cuántos?
  unit_price DECIMAL,          -- Precio unitario
  total_price DECIMAL,         -- Precio total
  customizations JSONB,        -- 🎯 AQUÍ VAN LAS ADICIONES
  created_at TIMESTAMP
);
```

### Formato de `customizations` (JSONB)
```json
{
  "removed": ["Cebolla", "Tomate"],
  "added": ["Aguacate", "Queso extra"],
  "notes": "Sin salsas picantes"
}
```

## 🔴 PROBLEMA ACTUAL

**La tabla `order_items` tiene RLS BLOQUEANDO los INSERT**

### ✅ Lo que funciona:
1. Chat crea orden → `orders` tabla ✅
2. Genera order_number → Trigger SQL ✅
3. Código envía items con customizations ✅

### ❌ Lo que falla:
4. Supabase **RECHAZA** el INSERT a `order_items` ❌
   - Razón: RLS habilitado SIN política de INSERT
   - Resultado: Orden existe pero SIN items

## 🛠️ SOLUCIÓN

**Ejecutar:** `supabase/fix-order-items-rls.sql`

Este script agrega las políticas faltantes para que:
- ✅ Chat pueda insertar items
- ✅ Cocina pueda ver items
- ✅ Staff pueda actualizar si es necesario

## 📝 Flujo Completo (después del fix)

```
Usuario hace pedido desde chat
    ↓
María procesa: "Quiero hamburguesa sin cebolla"
    ↓
Frontend envía:
    {
      product: "Hamburguesa Clásica",
      quantity: 1,
      customizations: {
        removed: ["Cebolla"],
        added: [],
        notes: ""
      }
    }
    ↓
createOrder() → inserta en tabla `orders`
    ↓
createOrderItems() → inserta en tabla `order_items`
    ↓
Supabase Realtime → notifica a cocina
    ↓
Cocina ve:
    - Orden #SB202602270005
    - Hamburguesa Clásica x1
    - 🔴 Sin: Cebolla
```

## 🔍 Verificar en Supabase

Después de ejecutar el SQL, verifica:

```sql
-- Ver estructura de order_items
SELECT * FROM order_items LIMIT 5;

-- Ver una orden completa con sus items
SELECT 
  o.order_number,
  o.customer_name,
  oi.quantity,
  p.name as product_name,
  oi.customizations
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_number = 'SB202602270005';
```

Si ves `customizations` → **TODO FUNCIONA** ✅
Si `order_items` está vacío → **RLS sigue bloqueando** ❌
