# 🔥 SOLUCIÓN URGENTE - 2 Problemas Críticos

## ❌ Problema 1: Coca-Cola no se encuentra en BD
```
❌ Sin match para: "coca-cola"
```

### Causa probable:
El producto "Coca-Cola" **NO EXISTE** en tu base de datos o tiene otro nombre.

### 🔍 Diagnóstico:
Cuando ejecutes el servidor de nuevo (`npm run dev`) y hagas un pedido, verás en los logs:
```
🗂️ TODOS los productos activos en BD: SmartBurger Clásica, Doble Queso Deluxe, ...
```

**Esto te dirá exactamente qué productos tienes.**

### ✅ Soluciones:

#### Opción 1: Agregar Coca-Cola a la BD (recomendado)

```sql
-- Ejecutar en Supabase SQL Editor:

-- Primero, obtener el ID de la categoría "Bebidas"
SELECT id FROM categories WHERE name = 'Bebidas';

-- Agregar Coca-Cola (reemplaza 'CATEGORIA_ID' con el ID obtenido arriba)
INSERT INTO products (name, description, base_price, category_id, active, stock_quantity)
VALUES 
  ('Coca-Cola', 'Bebida Coca-Cola 500ml', 1.99, 'CATEGORIA_ID', true, 100),
  ('Sprite', 'Bebida Sprite 500ml', 1.99, 'CATEGORIA_ID', true, 100),
  ('Fanta', 'Bebida Fanta 500ml', 1.99, 'CATEGORIA_ID', true, 100),
  ('Agua', 'Agua mineral 500ml', 0.99, 'CATEGORIA_ID', true, 100);
```

#### Opción 2: Actualizar el prompt de María

Si NO quieres bebidas por separado (solo en combos):

```typescript
// En app/api/chat/route.ts
// Actualizar MENÚ COMPLETO para remover bebidas individuales
```

---

## ❌ Problema 2: RLS bloqueando chat_conversations

```
❌ Error: new row violates row-level security policy for table "chat_conversations"
```

### ✅ Solución: Ejecutar SQL

**Ejecuta UNO de estos archivos en Supabase SQL Editor:**

**Opción A (recomendada):** Fix completo
```bash
supabase/fix-order-items-rls.sql
```
Este archivo incluye:
- ✅ Políticas para `orders`
- ✅ Políticas para `order_items`
- ✅ Políticas para `chat_conversations` ← **NUEVO**

**Opción B:** Solo chat
```bash
supabase/fix-chat-conversations-rls.sql
```
Este archivo solo arregla `chat_conversations`.

---

## 🚀 Pasos a Seguir (En Orden)

### 1️⃣ Ejecutar SQL para RLS (CRÍTICO - 1 min)

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega: `supabase/fix-order-items-rls.sql`
4. Click **Run**

**Resultado esperado:**
```
✅ CREATE POLICY "Anyone can create conversations"
✅ CREATE POLICY "Anyone can view conversations"
✅ CREATE POLICY "Anyone can update conversations"
```

---

### 2️⃣ Verificar productos en BD (IMPORTANTE - 2 min)

```sql
-- Ejecutar en Supabase SQL Editor:

-- Ver todos los productos activos
SELECT 
  name,
  base_price,
  category_id,
  active,
  stock_quantity
FROM products
WHERE active = true
ORDER BY name;
```

**¿Ves "Coca-Cola" en la lista?**

- ✅ **SÍ** → El problema se resolverá solo con los logs mejorados
- ❌ **NO** → Ejecuta el INSERT de la Opción 1 arriba

---

### 3️⃣ Reiniciar servidor (30 seg)

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

---

### 4️⃣ Probar flujo completo (1 min)

En el chat:
```
Tú: "hamburguesa y coca-cola"
```

**Verificar en consola (F12):**

✅ **Debe aparecer:**
```
🗂️ TODOS los productos activos en BD: SmartBurger Clásica, Coca-Cola, ...
✅ Match: "coca-cola" → "Coca-Cola"
✅ [createOrderItems] Items insertados exitosamente
✅ Mensajes guardados en BD
```

❌ **Si todavía aparece:**
```
❌ Sin match para: "coca-cola" | Disponibles: SmartBurger Clásica, ...
```
→ **Significa que Coca-Cola NO está en tu BD.** Agrégala con el INSERT del Paso 2.

---

## 🐛 Troubleshooting

### "Sin match para coca-cola" persiste

**Diagnóstico:**
```
🗂️ TODOS los productos activos en BD: SmartBurger Clásica, Doble Queso Deluxe
```

**Solución:** El log te muestra EXACTAMENTE qué productos tienes. Si no ves "Coca-Cola", agrégala:

```sql
INSERT INTO products (name, description, base_price, category_id, active)
SELECT 
  'Coca-Cola', 
  'Bebida Coca-Cola 500ml', 
  1.99, 
  id, 
  true
FROM categories 
WHERE name = 'Bebidas'
LIMIT 1;
```

---

### "RLS policy violation" persiste

**Diagnóstico:**
```sql
-- Verificar que las políticas existen:
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'chat_conversations';
```

**Resultado esperado:**
```
chat_conversations | Anyone can create conversations
chat_conversations | Anyone can view conversations
chat_conversations | Anyone can update conversations
```

**Si NO aparecen:** Ejecuta `fix-order-items-rls.sql` de nuevo.

---

## ✅ Checklist Final

Antes de considerar resuelto:

- [ ] SQL ejecutado (fix-order-items-rls.sql)
- [ ] Servidor reiniciado
- [ ] Log muestra: "🗂️ TODOS los productos activos en BD: ..."
- [ ] Coca-Cola aparece en la lista de productos (o fue agregada)
- [ ] Test de pedido: Hamburguesa + Coca-Cola
- [ ] Sin error de RLS en chat_conversations
- [ ] Orden se crea con items completos

---

## 📊 Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `supabase/fix-order-items-rls.sql` | + Políticas para chat_conversations |
| `supabase/fix-chat-conversations-rls.sql` | Nuevo (standalone fix) |
| `app/api/chat/route.ts` | + Log de productos disponibles |

---

## 🎯 Resultado Final Esperado

```
Usuario: "hamburguesa y coca-cola"

[Logs en servidor]
🗂️ TODOS los productos activos en BD: SmartBurger Clásica, Coca-Cola, Sprite, Fanta, Agua
✅ Match: "smartburger clásica" → "SmartBurger Clásica"
✅ Match: "coca-cola" → "Coca-Cola"
📦 Productos encontrados en BD: 2
✅ [createOrderItems] Items insertados exitosamente
✅ Mensajes guardados en BD

[María responde]
"¡Perfecto! Tu orden va directo a cocina 🎉"

[Cocina muestra]
• SmartBurger Clásica x1
• Coca-Cola x1
```

---

**¿Sigues teniendo problemas después de estos pasos?**  
Comparte el output completo de:
```
🗂️ TODOS los productos activos en BD: ...
```

Esto me dirá exactamente qué productos tienes y podré ayudarte mejor.
