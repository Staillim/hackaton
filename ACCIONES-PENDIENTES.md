# 🚨 ACCIONES PENDIENTES - SmartBurger

## ⚠️ CRÍTICO: Sistema NO funcionará hasta ejecutar esto

---

## 📋 Checklist de Acciones

### ✅ Paso 1: Arreglar RLS (Órdenes Vacías) - **¡CRÍTICO!**

**Problema:** Las órdenes llegan vacías a la cocina porque Row Level Security (RLS) está bloqueando los INSERT en `order_items`.

**Solución:**

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega el contenido de: `supabase/fix-order-items-rls.sql`
4. Haz clic en **Run**

**Resultado esperado:**
```
✅ CREATE POLICY "Anyone can create orders"
✅ CREATE POLICY "Anyone can insert order items"
✅ CREATE POLICY "Anyone can view orders"
✅ CREATE POLICY "Anyone can update orders"
```

**SIN ESTO, LAS ÓRDENES SEGUIRÁN VACÍAS.**

---

### ✅ Paso 2: Activar Sistema de Preferencias - **¡Recomendado!**

**Beneficio:** María recordará lo que le gusta a cada usuario y personalizará sugerencias automáticamente.

**Lo que hace:**
- 📊 Aprende productos favoritos
- ➕ Recuerda customizaciones habituales (agregar aguacate, quitar cebolla, etc.)
- 🚫 Evita sugerir productos que nunca piden
- ⏰ Ajusta recomendaciones según horario y día
- 🎯 Construye confianza progresiva (más pedidos = mejores predicciones)

**Solución:**

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega el contenido de: `supabase/user-preferences-system.sql`
4. Haz clic en **Run**

**Resultado esperado:**
```
✅ CREATE TABLE user_preferences
✅ CREATE FUNCTION analyze_user_preferences
✅ CREATE TRIGGER auto_analyze_user_preferences
✅ CREATE FUNCTION get_user_recommendation
✅ CREATE INDEX idx_user_preferences_email
```

**Documentación completa:** Ver `SISTEMA-PREFERENCIAS-USUARIO.md`

---

### ✅ Paso 3: Probar el Sistema - **¡Importante!**

Una vez ejecutados los archivos SQL, realiza una prueba completa:

#### 3.1 Abrir Consola del Navegador

1. Abre el chat de SmartBurger
2. Presiona **F12** (Chrome/Edge) o **Ctrl+Shift+I**
3. Ve a la pestaña **Console**

#### 3.2 Hacer un Pedido de Prueba

En el chat, escribe:

```
Usuario: "Hola, quiero un Combo Deluxe con aguacate y sin cebolla"
María: [responde confirmando]
Usuario: "confirma"
```

#### 3.3 Verificar Logs en Consola

Deberías ver logs como:

```
🎯 [handleCreateOrderFromChat] INICIO
🛒 Items en carrito: 1
📋 Detalle: [
  {
    producto: "Combo Deluxe",
    cantidad: 1,
    customizaciones: {
      additions: ["Aguacate"],
      removals: ["Cebolla"]
    }
  }
]
✅ [handleCreateOrderFromChat] Llamando createOrder con 1 items
📦 [createOrder] Orden creada con ID: abc123
📦 [createOrderItems] Intentando insertar items: { count: 1, items: [...] }
✅ [createOrderItems] Items guardados exitosamente
```

**Si ves errores de RLS:** Vuelve al Paso 1.

#### 3.4 Verificar en la Cocina

1. Abre `http://localhost:3000/cocina`
2. Deberías ver la orden con:
   - ✅ Número de orden (ej: SB202602270005)
   - ✅ Producto: Combo Deluxe
   - ✅ Cantidad: 1
   - ✅ Customizaciones: +Aguacate, -Cebolla

**Si NO aparecen los productos:** El RLS no se aplicó correctamente. Ejecuta de nuevo `fix-order-items-rls.sql`.

---

### ✅ Paso 4: Probar Sistema de Preferencias (Opcional)

Después de completar 2-3 órdenes con el mismo email:

#### 4.1 Verificar en Base de Datos

En Supabase SQL Editor:

```sql
-- Ver preferencias del usuario
SELECT * FROM user_preferences WHERE user_email = 'test@example.com';
```

Deberías ver:
```json
{
  "user_email": "test@example.com",
  "total_orders": 3,
  "favorite_products": [
    {"name": "Combo Deluxe", "count": 3, "percentage": 100}
  ],
  "always_adds": [
    {"ingredient": "Aguacate", "count": 3, "percentage": 100}
  ],
  "always_removes": [
    {"ingredient": "Cebolla", "count": 3, "percentage": 100}
  ],
  "confidence_level": "low"
}
```

#### 4.2 Probar Personalización en Chat

En el chat, con el mismo email, pregunta:

```
Usuario: "Hola, quiero pedir"
```

**María debería responder:**

```
¡Hola! 😊 Tu Combo Deluxe favorito con:
✅ Aguacate extra
❌ Sin cebolla
¿Lo armamos como siempre?
```

---

## 📊 Resumen de Archivos Importantes

### Archivos SQL (Ejecutar en Supabase)

| Archivo | Prioridad | Propósito |
|---------|-----------|-----------|
| `supabase/fix-order-items-rls.sql` | 🔴 CRÍTICO | Arregla órdenes vacías |
| `supabase/user-preferences-system.sql` | 🟡 Recomendado | Activa sistema de preferencias |
| `supabase/test-order-creation.sql` | 🟢 Opcional | Queries para verificar órdenes |

### Archivos de Documentación

| Archivo | Contenido |
|---------|-----------|
| `ESTRUCTURA-BASE-DATOS.md` | Explicación completa de tablas y relaciones |
| `SOLUCION-ORDENES-VACIAS.md` | Guía paso a paso del problema de RLS |
| `SISTEMA-PREFERENCIAS-USUARIO.md` | Documentación completa del sistema de preferencias |

### Archivos de Código (Ya Actualizados)

| Archivo | Cambios Realizados |
|---------|-------------------|
| `lib/supabase.ts` | ✅ Logging en `createOrderItems()` y `getUserPreferences()` actualizado |
| `components/chat/ChatWidget.tsx` | ✅ Validación de carrito y logging detallado |
| `app/api/chat/route.ts` | ✅ Regex fix, integración de preferencias avanzadas |

---

## 🔍 Cómo Saber Si Todo Funciona

### ✅ Señales de que el RLS está arreglado:

1. En la consola (F12) ves: `✅ [createOrderItems] Items guardados exitosamente`
2. En `/cocina` aparecen productos con customizaciones
3. No hay errores que mencionen "RLS" o "row-level security"

### ✅ Señales de que las Preferencias funcionan:

1. En la tabla `user_preferences` hay datos del usuario
2. María menciona productos favoritos cuando el usuario vuelve
3. En la consola (F12) ves: `✅ Preferencias encontradas: {...}`

### ❌ Señales de problemas:

1. **Consola muestra:** `❌ Error al guardar items: new row violates row-level security`
   - **Solución:** Ejecutar `fix-order-items-rls.sql` de nuevo

2. **Cocina muestra:** "Sin items registrados"
   - **Solución:** Ejecutar `fix-order-items-rls.sql`

3. **María no personaliza sugerencias:**
   - **Verificar:** ¿El usuario tiene email en `chat_conversations`?
   - **Verificar:** ¿Ejecutaste `user-preferences-system.sql`?
   - **Verificar:** ¿Las órdenes están en estado "completed"?

---

## 🚀 Orden de Ejecución Recomendado

```bash
# 1. CRÍTICO: Arreglar RLS (PRIMERO)
Ejecutar en Supabase: supabase/fix-order-items-rls.sql

# 2. Probar que órdenes funcionen
Hacer pedido de prueba en chat → Verificar en /cocina

# 3. RECOMENDADO: Activar preferencias
Ejecutar en Supabase: supabase/user-preferences-system.sql

# 4. Hacer 2-3 pedidos de prueba con mismo email
Completar órdenes (cambiar status a 'completed')

# 5. Verificar preferencias
SELECT * FROM user_preferences WHERE user_email = 'test@example.com';

# 6. Probar personalización en chat
Chatear de nuevo con María usando el mismo email
```

---

## 📞 Si Algo Sale Mal

### Problema: "Órdenes siguen vacías después de ejecutar fix-order-items-rls.sql"

**Diagnóstico:**

```sql
-- Verificar que las políticas se crearon
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items');
```

**Deberías ver:**
```
orders      | Anyone can create orders
orders      | Anyone can view orders
orders      | Anyone can update orders
order_items | Anyone can insert order items
order_items | Anyone can view order items
```

**Si NO aparecen:** Ejecuta el SQL de nuevo, línea por línea.

---

### Problema: "Preferencias no se actualizan automáticamente"

**Diagnóstico:**

```sql
-- Verificar que el trigger existe
SELECT tgname FROM pg_trigger WHERE tgname = 'auto_analyze_user_preferences';
```

**Deberías ver:** `auto_analyze_user_preferences`

**Si NO aparece:** Ejecuta `user-preferences-system.sql` de nuevo.

---

### Problema: "María responde en inglés o con errores"

**Diagnóstico:**

- Revisa la consola del API: `npm run dev` o el terminal donde corre el servidor
- Busca errores de Gemini API o llamadas fallidas

**Posible causa:** 
- Límite de rate de Gemini API
- API key inválida
- Problema de conexión

---

## 📝 Registro de Cambios Realizados

### Archivos Creados:
- ✅ `supabase/fix-order-items-rls.sql` (92 líneas)
- ✅ `supabase/user-preferences-system.sql` (428 líneas)
- ✅ `supabase/test-order-creation.sql` (queries de verificación)
- ✅ `ESTRUCTURA-BASE-DATOS.md` (documentación completa)
- ✅ `SOLUCION-ORDENES-VACIAS.md` (guía paso a paso)
- ✅ `SISTEMA-PREFERENCIAS-USUARIO.md` (sistema de preferencias)

### Archivos Modificados:
- ✅ `lib/supabase.ts` - Logging + getUserPreferences actualizado
- ✅ `components/chat/ChatWidget.tsx` - Validación + logging
- ✅ `app/api/chat/route.ts` - Regex fix + integración de preferencias

### Commits Realizados:
```bash
git add .
git commit -m "Fix: RLS policies + User preferences system + Enhanced logging"
```

---

**¡Todo listo para ejecutar!** 🚀

Una vez ejecutes los archivos SQL en Supabase, el sistema estará completamente funcional con:
- ✅ Órdenes completas con productos y customizaciones
- ✅ Sistema de aprendizaje de preferencias automático
- ✅ Personalización inteligente de María
- ✅ Logging detallado para debugging

**¿Alguna duda antes de ejecutar? ¡Pregunta!** 😊
