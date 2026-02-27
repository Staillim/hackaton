# 🚨 SOLUCIÓN URGENTE: Órdenes sin items en cocina

## 📋 Problema
- Las órdenes se crean correctamente
- Pero llegan vacías a cocina (sin productos, sin adicciones)
- El carrito muestra error al confirmar desde el chat

## 🔍 Causa Raíz
**Supabase RLS bloquea INSERT en `order_items`**

La tabla tiene Row Level Security habilitado pero SIN política de INSERT, por lo que:
- ✅ La orden se crea (tabla `orders` funciona)
- ❌ Los items no se guardan (tabla `order_items` bloqueada)
- ❌ La cocina no ve qué ordenó el cliente

## ✅ SOLUCIÓN (3 pasos)

### 1️⃣ Ejecutar SQL en Supabase (URGENTE)

1. Ir a: https://supabase.com/dashboard
2. Seleccionar tu proyecto **tmbot**
3. Ir a: **SQL Editor** (menú izquierdo)
4. Copiar y pegar TODO el contenido de: `supabase/fix-order-items-rls.sql`
5. Click en **RUN** (▶️)

**Resultado esperado:**
```
Success. No rows returned.
```

### 2️⃣ Reiniciar servidor Next.js

```powershell
# Detener servidor
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar con logs mejorados
npm run dev
```

### 3️⃣ Probar orden de prueba

1. Abrir el chat de María
2. Hacer un pedido (ej: "Quiero una hamburguesa sin cebolla")
3. Confirmar la orden
4. **Abrir consola del navegador (F12)**

**Logs esperados (si funciona):**
```
🎯 [Chat] Iniciando creación de orden desde chat
📋 [Chat] Items en carrito: 1
📝 [Chat] Creando orden principal...
✅ [Chat] Orden creada: SB202602270XXX
📦 [Chat] Guardando items de la orden...
📦 [createOrderItems] Intentando insertar items: {...}
✅ [createOrderItems] Items insertados exitosamente: 1
✅ [Chat] Items guardados: 1
```

**Si sigue fallando:**
```
❌ [createOrderItems] Error al insertar:
   message: "RLS bloqueando INSERT"
```
→ Contactar inmediatamente (hay problema en Supabase)

### 4️⃣ Verificar en cocina

1. Ir a: http://localhost:3000/cocina
2. Buscar la orden recién creada
3. **Debe mostrar:**
   - ✅ Número de orden
   - ✅ Productos ordenados
   - ✅ Adicciones/remociones (si las hay)

## 🔬 Verificación en Base de Datos

Ejecutar en Supabase SQL Editor: `supabase/test-order-creation.sql`

**Resultado correcto:**
```sql
order_number | quantity | product_name        | customizations
-------------+----------+--------------------+-----------------------------
SB202602...  | 1        | Combo Deluxe       | {"removed":["Cebolla"],...}
```

**Resultado incorrecto (problema persiste):**
```sql
order_number | quantity | product_name        | customizations
-------------+----------+--------------------+-----------------------------
SB202602...  | NULL     | NULL               | NULL
```

## 📊 ¿Qué hace el fix?

El script `fix-order-items-rls.sql` crea estas políticas:

### Para `orders`:
- ✅ Anyone can create orders (INSERT)
- ✅ Anyone can view orders (SELECT)
- ✅ Anyone can update orders (UPDATE)
- 🔒 Only admins can delete (DELETE)

### Para `order_items`:
- ✅ Anyone can insert items (INSERT) ← **ESTE ERA EL QUE FALTABA**
- ✅ Anyone can view items (SELECT)
- ✅ Anyone can update items (UPDATE)
- 🔒 Only admins can delete (DELETE)

## 🎯 Mejoras del código

También se agregaron:
- 📝 **Logs detallados** en cada paso del proceso
- 🎯 **Mensajes de error específicos** (distingue entre RLS y otros errores)
- 🔍 **Tracking completo** desde carrito hasta DB

## ⚠️ Nota de Seguridad

Las políticas permiten INSERT público porque:
1. Es necesario para usuarios NO autenticados (chat sin login)
2. La cocina necesita ver todas las órdenes sin restricciones
3. Los datos no son sensibles (solo órdenes de comida)

**Si en el futuro quieres restringir:** Cambiar `WITH CHECK (true)` por políticas basadas en `auth.uid()`.

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:
1. Compartir los logs de la consola (F12)
2. Compartir resultado de `test-order-creation.sql`
3. Verificar que el SQL se ejecutó sin errores
