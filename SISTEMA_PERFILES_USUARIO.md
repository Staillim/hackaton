# 👤 SISTEMA DE PERFILES DE USUARIO - Aprendizaje Automático

## 🎯 Concepto

En lugar de un historial de chat limitado, el sistema **aprende y guarda automáticamente** los gustos y preferencias de cada usuario en un perfil persistente.

## 📊 Qué Aprende el Sistema

Cada vez que un usuario completa una orden, el sistema analiza y actualiza automáticamente:

### 1. Promedio de Gasto
```
Usuario Harry:
- Promedio de gasto: $15
```
Calculado en base a todas sus órdenes históricas.

### 2. Día Favorito
```
- Día favorito: Martes
```
El día de la semana donde más pedidos realiza.

### 3. Hora Favorita
```
- Hora favorita: 8PM
```
La hora en la que más frecuentemente ordena.

### 4. Nunca Pide
```
- Nunca pide: Cebolla
```
Lista de ingredientes que el usuario **siempre quita** de sus pedidos.

### 5. Siempre Pide
```
- Siempre pide: Salsa extra
```
Lista de extras que el usuario **frecuentemente agrega** (mínimo 2 veces).

## 🔄 Actualización Automática

El perfil se actualiza automáticamente en dos momentos:

### 1. Al Completar una Orden
Trigger automático que:
- Detecta cuando `order.status = 'completed'`
- Analiza las customizaciones (additions/removals)
- Actualiza el perfil del usuario
- Sin intervención manual

### 2. Cache Inteligente (5 minutos)
- Primera llamada: query a base de datos
- Siguientes 5 minutos: desde cache (instantáneo)
- Ahorra queries y mejora velocidad

## 💬 Cómo lo Usa María (IA)

En cada conversación, María recibe el perfil del usuario:

```
👤 PERFIL DEL USUARIO:
- Promedio de gasto: $15
- Día favorito: Martes
- Hora favorita: 8PM
- Nunca pide: Cebolla
- Siempre pide: Salsa extra

💡 USA ESTE PERFIL PARA:
1. Sugerir productos en su rango de gasto
2. Mencionar "veo que no te gusta Cebolla" cuando sea relevante
3. Ofrecer automáticamente "Salsa extra" en sus pedidos
4. Personalizar recomendaciones según sus gustos
```

### Ejemplos de Conversación

**Usuario sin historial (nuevo):**
```
Cliente: Quiero una hamburguesa
María: ¡Perfecto! Te recomiendo nuestra SmartBurger Clásica ($5.99) 
       o el Combo SmartBurger ($9.99) que incluye papas y bebida.
```

**Usuario con perfil (Harry):**
```
Cliente: Quiero una hamburguesa
María: ¡Perfecto Harry! Veo que tu promedio es $15, te recomiendo 
       el Combo Deluxe ($12.99) que es similar a tus pedidos habituales.
       
       Como siempre, ¿lo preparo con salsa extra y sin cebolla? 😊
```

## 🗄️ Estructura de Base de Datos

### Tabla: `user_behavior_analytics`

```sql
CREATE TABLE user_behavior_analytics (
  id UUID PRIMARY KEY,
  user_email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Estadísticas básicas
  total_orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  
  -- NUEVOS CAMPOS (perfil personalizado)
  favorite_day VARCHAR(20),        -- Martes
  favorite_time VARCHAR(10),       -- 8PM
  never_orders TEXT[],             -- [Cebolla, Tomate]
  always_orders TEXT[],            -- [Salsa extra, Bacon]
  
  -- Otros campos
  favorite_products JSONB,
  common_customizations JSONB,
  preferred_order_time VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Funciones SQL Disponibles

### 1. `get_user_profile(email)`
Obtiene el perfil completo del usuario.

```sql
SELECT get_user_profile('harry@example.com');
```

**Resultado:**
```json
{
  "user_email": "harry@example.com",
  "total_orders": 12,
  "average_order_value": 15.50,
  "favorite_day": "Martes",
  "favorite_time": "8PM",
  "never_orders": ["Cebolla"],
  "always_orders": ["Salsa extra"],
  "has_history": true
}
```

### 2. `analyze_and_update_user_profile(email)`
Analiza todas las órdenes y actualiza el perfil.

```sql
SELECT analyze_and_update_user_profile('harry@example.com');
```

Se ejecuta automáticamente con trigger, pero puedes llamarlo manualmente.

## 📈 Algoritmo de Detección

### Día Favorito
```sql
-- Día con más pedidos
SELECT TO_CHAR(created_at, 'Day') as day_name
FROM orders
WHERE customer_email = 'harry@example.com'
GROUP BY day_name
ORDER BY COUNT(*) DESC
LIMIT 1;
```

### Hora Favorita
```sql
-- Hora más común (redondeada)
SELECT 
  CASE 
    WHEN EXTRACT(HOUR FROM created_at) >= 12 
      THEN (EXTRACT(HOUR FROM created_at) - 12)::TEXT || 'PM'
    ELSE EXTRACT(HOUR FROM created_at)::TEXT || 'AM'
  END as time_slot
FROM orders
WHERE customer_email = 'harry@example.com'
GROUP BY time_slot
ORDER BY COUNT(*) DESC
LIMIT 1;
```

### Nunca Pide (removals frecuentes)
```sql
-- Ingredientes que siempre quita
SELECT DISTINCT unnest(
  SELECT jsonb_array_elements_text(customizations->'removals')
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.customer_email = 'harry@example.com'
) as removed_item;
```

### Siempre Pide (additions frecuentes ≥2)
```sql
-- Extras que agrega frecuentemente (mínimo 2 veces)
SELECT added_item, COUNT(*) as frequency
FROM (
  SELECT jsonb_array_elements_text(customizations->'additions') as added_item
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.customer_email = 'harry@example.com'
) subquery
GROUP BY added_item
HAVING COUNT(*) >= 2;
```

## 🚀 Implementación en TypeScript

### lib/supabase.ts

```typescript
// Obtener perfil del usuario
export const getUserProfile = async (userEmail: string) => {
  const { data, error } = await supabase
    .rpc('get_user_profile', { p_user_email: userEmail });
  
  if (error) return null;
  return data;
};

// Actualizar perfil manualmente (opcional)
export const analyzeAndUpdateUserProfile = async (userEmail: string) => {
  const { data, error } = await supabase
    .rpc('analyze_and_update_user_profile', { p_user_email: userEmail });
  
  return data;
};
```

### app/api/chat/route.ts

```typescript
// En getEnhancedSystemPrompt()
if (userEmail) {
  const userProfile = await getUserProfile(userEmail);
  
  if (userProfile && userProfile.has_history) {
    const userContext = `
👤 PERFIL DEL USUARIO:
- Promedio de gasto: $${userProfile.average_order_value}
- Día favorito: ${userProfile.favorite_day}
- Hora favorita: ${userProfile.favorite_time}
- Nunca pide: ${userProfile.never_orders.join(', ')}
- Siempre pide: ${userProfile.always_orders.join(', ')}
    `;
  }
}
```

## ✅ Requisitos Mínimos

Para que el perfil se genere, el usuario debe tener:
- **Mínimo 3 órdenes completadas**
- Al menos una orden con `customer_email` válido

Si tiene menos de 3 órdenes:
```json
{
  "success": false,
  "message": "Insufficient orders for profile analysis",
  "order_count": 2
}
```

## 🎯 Ventajas vs Historial de Chat

| Historial de Chat | Perfil Persistente |
|-------------------|-------------------|
| ❌ Se pierde al limpiar | ✅ Guardado permanentemente |
| ❌ Crece infinitamente | ✅ Tamaño fijo y eficiente |
| ❌ Difícil de analizar | ✅ Datos estructurados |
| ❌ Solo texto | ✅ Datos cuantificables |
| ❌ Tokens costosos | ✅ Cache eficiente |
| ❌ No aprende patrones | ✅ Aprendizaje automático |

## 📊 Ejemplo Real: Usuario Harry

### Órdenes Históricas
```
Orden 1 (Lunes 7PM):  Combo Deluxe - Quita cebolla, agrega salsa extra - $14.50
Orden 2 (Martes 8PM): Combo SmartBurger - Quita cebolla, agrega bacon - $15.00
Orden 3 (Martes 8PM): Combo Deluxe - Quita cebolla, agrega salsa extra - $16.00
Orden 4 (Martes 9PM): Doble Queso - Quita cebolla, agrega salsa extra, agrega bacon - $15.50
```

### Perfil Generado Automáticamente
```
Usuario Harry:
- Promedio de gasto: $15.25
- Día favorito: Martes (3 de 4 órdenes)
- Hora favorita: 8PM (2 de 4 órdenes)
- Nunca pide: Cebolla (4 de 4 órdenes)
- Siempre pide: Salsa extra (3 de 4 órdenes), Bacon (2 de 4 órdenes)
```

### Próxima Conversación
```
Harry: Quiero una hamburguesa

María: ¡Hola de nuevo Harry! 😊
       
       Veo que tu promedio es $15, te recomiendo:
       🍔 Combo Deluxe $12.99 (tu favorito)
       
       Como siempre, ¿lo preparo sin cebolla y con salsa extra? 
       ¿Te gustaría agregar bacon también? (+$1.50)
```

## 🔄 Migración

### Paso 1: Ejecutar SQL
```bash
# En Supabase SQL Editor
\i supabase/migration-user-profile.sql
```

### Paso 2: Verificar
```sql
-- Ver estructura
\d user_behavior_analytics

-- Analizar un usuario de prueba
SELECT analyze_and_update_user_profile('test@example.com');

-- Ver perfil
SELECT get_user_profile('test@example.com');
```

### Paso 3: Reiniciar Servidor
```bash
npm run dev
```

## 🎉 Resultado

- ✅ **Perfil de usuario persistente** (no se pierde)
- ✅ **Aprendizaje automático** de preferencias
- ✅ **Actualización automática** con cada orden
- ✅ **Cache inteligente** (5 min)
- ✅ **Personalización real** en conversaciones
- ✅ **Sin historial de chat** limitado

El sistema ahora **aprende de verdad** de cada usuario y **personaliza** la experiencia automáticamente. 🚀
