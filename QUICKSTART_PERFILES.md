# 🚀 GUÍA RÁPIDA: Migración Perfiles de Usuario

## ✅ Paso 1: Ejecutar Migración SQL

Tienes dos archivos SQL que ejecutar en orden:

### 1. Migration Autonomous Decisions (si no lo has hecho)
```sql
-- En Supabase SQL Editor, ejecuta:
supabase/migration-autonomous-decisions.sql
```

### 2. Migration User Profile (NUEVO)
```sql
-- En Supabase SQL Editor, ejecuta:
supabase/migration-user-profile.sql
```

**O con script PowerShell:**
```powershell
# Ejecutar ambas migraciones
psql -h <tu-db-host> -U postgres -d postgres -f supabase/migration-autonomous-decisions.sql
psql -h <tu-db-host> -U postgres -d postgres -f supabase/migration-user-profile.sql
```

## ✅ Paso 2: Verificar la Migración

Ejecuta en Supabase SQL Editor:

```sql
-- Ver estructura actualizada
\d user_behavior_analytics

-- Debe mostrar TODOS estos campos:
-- - id
-- - user_email
-- - total_orders
-- - average_order_value
-- - favorite_products
-- - common_customizations
-- - preferred_order_time
-- - favorite_day (NUEVO)
-- - favorite_time (NUEVO)
-- - never_orders (NUEVO)
-- - always_orders (NUEVO)
-- - notes (NUEVO)
-- - last_order_date
-- - created_at
-- - updated_at

-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%user_profile%';

-- Debe mostrar:
-- - get_user_profile
-- - analyze_and_update_user_profile
-- - trigger_update_user_profile
```

## ✅ Paso 3: Crear Datos de Prueba

Vamos a crear un usuario de ejemplo (Harry) con órdenes:

```sql
-- 1. Asegúrate que Harry existe en tus órdenes
-- Si no, crea algunas órdenes de prueba:

INSERT INTO orders (customer_email, customer_name, total_amount, status, created_at)
VALUES 
  ('harry@example.com', 'Harry Potter', 14.50, 'completed', '2026-02-18 19:00:00'),
  ('harry@example.com', 'Harry Potter', 15.00, 'completed', '2026-02-25 20:00:00'),
  ('harry@example.com', 'Harry Potter', 16.00, 'completed', '2026-02-25 20:15:00'),
  ('harry@example.com', 'Harry Potter', 15.50, 'completed', '2026-02-25 21:00:00');

-- 2. Analizar perfil de Harry
SELECT analyze_and_update_user_profile('harry@example.com');

-- 3. Ver el perfil generado
SELECT get_user_profile('harry@example.com');
```

**Resultado esperado:**
```json
{
  "user_email": "harry@example.com",
  "total_orders": 4,
  "average_order_value": 15.25,
  "favorite_day": "Martes",
  "favorite_time": "8PM",
  "never_orders": [],
  "always_orders": [],
  "has_history": true
}
```

## ✅ Paso 4: Agregar Customizaciones de Prueba

Para que Harry tenga preferencias completas:

```sql
-- Primero, obtén los IDs de productos (ej: Combo Deluxe)
SELECT id, name FROM products WHERE name LIKE '%Combo%';

-- Luego, crea order_items con customizaciones
-- Asumiendo order_id = 'uuid-de-alguna-orden-de-harry'
-- y product_id = 'uuid-del-combo-deluxe'

INSERT INTO order_items (order_id, product_id, quantity, customizations)
VALUES 
  (
    'orden-1-uuid',
    'producto-combo-deluxe-uuid',
    1,
    '{"removals": ["Cebolla"], "additions": ["Salsa extra"]}'::jsonb
  ),
  (
    'orden-2-uuid',
    'producto-combo-deluxe-uuid',
    1,
    '{"removals": ["Cebolla"], "additions": ["Bacon"]}'::jsonb
  ),
  (
    'orden-3-uuid',
    'producto-combo-deluxe-uuid',
    1,
    '{"removals": ["Cebolla"], "additions": ["Salsa extra"]}'::jsonb
  );

-- Actualizar órdenes a completadas
UPDATE orders 
SET status = 'completed' 
WHERE customer_email = 'harry@example.com';

-- Volver a analizar perfil
SELECT analyze_and_update_user_profile('harry@example.com');

-- Ver perfil actualizado
SELECT get_user_profile('harry@example.com');
```

**Resultado esperado:**
```json
{
  "user_email": "harry@example.com",
  "total_orders": 4,
  "average_order_value": 15.25,
  "favorite_day": "Martes",
  "favorite_time": "8PM",
  "never_orders": ["Cebolla"],
  "always_orders": ["Salsa extra"],
  "has_history": true
}
```

## ✅ Paso 5: Reiniciar Servidor

```powershell
# Detener servidor (Ctrl+C si está corriendo)
# Reiniciar
npm run dev
```

## ✅ Paso 6: Probar en el Chat

1. Abre la aplicación: http://localhost:3000
2. Haz clic en el chat
3. **Ingresa tu email:** harry@example.com (importante)
4. Conversa con María

**Ejemplo de conversación:**

```
Tú: Hola, quiero una hamburguesa

María: ¡Hola Harry! 😊
       
       Veo que tu promedio de gasto es $15, te recomiendo:
       🍔 Combo Deluxe $12.99 (similar a tus pedidos habituales)
       
       Como veo que no te gusta la Cebolla, 
       ¿lo preparo sin cebolla y con Salsa extra como siempre?

Tú: Sí, perfecto

María: ¡Genial! Entonces:
       • 1 Combo Deluxe
       • Sin cebolla
       • Con salsa extra
       
       Total: $13.74
       
       ¿Confirmo tu orden?
```

## 📊 Verificar Logs del Servidor

En la consola del servidor deberías ver:

```
🤖 CHAT API - Nueva solicitud
👤 UserEmail: harry@example.com
🔄 Obteniendo system prompt con contexto...

👤 PERFIL DEL USUARIO:
- Promedio de gasto: $15.25
- Día favorito: Martes
- Hora favorita: 8PM
- Nunca pide: Cebolla
- Siempre pide: Salsa extra

✅ System prompt generado
💰 Tokens estimados (input): 850
🐛 Modo DEBUG: ACTIVADO
```

## 🎯 Checklist Final

- [ ] Migración SQL ejecutada sin errores
- [ ] Tabla `user_behavior_analytics` tiene nuevos campos
- [ ] Funciones `get_user_profile` y `analyze_and_update_user_profile` existen
- [ ] Usuario de prueba (Harry) tiene perfil generado
- [ ] Perfil muestra: favorite_day, favorite_time, never_orders, always_orders
- [ ] Servidor reiniciado sin errores
- [ ] Chat funciona y muestra perfil en los logs
- [ ] María menciona las preferencias del usuario en la conversación

## ⚠️ Solución de Problemas

### Error: "function get_user_profile does not exist"
```sql
-- Verificar que la migración se ejecutó
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%user_profile%';

-- Si no existe, volver a ejecutar:
\i supabase/migration-user-profile.sql
```

### Error: "column favorite_day does not exist"
```sql
-- Verificar estructura de la tabla
\d user_behavior_analytics

-- Si falta, ejecutar solo los ALTER TABLE:
ALTER TABLE user_behavior_analytics 
ADD COLUMN favorite_day VARCHAR(20),
ADD COLUMN favorite_time VARCHAR(10),
ADD COLUMN never_orders TEXT[],
ADD COLUMN always_orders TEXT[];
```

### Perfil vacío o sin historia
```sql
-- Verificar que el usuario tenga órdenes
SELECT COUNT(*) FROM orders WHERE customer_email = 'harry@example.com';

-- Si tiene menos de 3, el perfil dirá:
-- "Insufficient orders for profile analysis"

-- Crear más órdenes de prueba o usar otro usuario
```

### Cache no funciona
```powershell
# El cache se resetea al reiniciar el servidor
# Para probar cache:
# 1. Primera request → query DB (más lento)
# 2. Segunda request (dentro de 5 min) → desde cache (instantáneo)
```

## 🎉 ¡Listo!

Tu sistema ahora aprende automáticamente de cada usuario y personaliza la experiencia. 

**Documentación completa:** [SISTEMA_PERFILES_USUARIO.md](SISTEMA_PERFILES_USUARIO.md)
