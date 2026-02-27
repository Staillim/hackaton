# 🎯 Sistema de Preferencias de Usuario - SmartBurger

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Cómo Funciona](#cómo-funciona)
4. [Instalación](#instalación)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [API y Funciones](#api-y-funciones)

---

## 🎯 Visión General

El sistema de preferencias aprende **automáticamente** de los pedidos de cada usuario para proporcionar una experiencia personalizada. María (la IA chatbot) usa esta información para:

✅ Sugerir productos favoritos del usuario  
✅ Preparar customizaciones automáticas (agregar/quitar ingredientes)  
✅ Evitar sugerir productos que nunca pide  
✅ Personalizar recomendaciones según horario y días preferidos  
✅ Construir confianza progresiva (más pedidos = mejores predicciones)

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DEL SISTEMA                         │
└─────────────────────────────────────────────────────────────┘

1. Usuario realiza pedido → orden guardada en tabla `orders`
2. Estado de orden cambia a "completed" → trigger automático
3. Trigger ejecuta función `analyze_user_preferences(email)`
4. Función analiza historial y actualiza tabla `user_preferences`
5. María consulta preferencias al iniciar chat
6. María personaliza sugerencias basándose en preferencias
```

### Tablas Involucradas

#### 1. `user_preferences` (Sistema Nuevo - Completo)
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  
  -- Productos favoritos (top 5 con porcentajes)
  favorite_products JSONB DEFAULT '[]',
  
  -- Customizaciones habituales
  always_adds JSONB DEFAULT '[]',      -- Ingredientes que agrega >50% del tiempo
  always_removes JSONB DEFAULT '[]',   -- Ingredientes que quita >70% del tiempo
  
  -- Productos que nunca pide
  never_orders TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Patrones temporales
  preferred_time_of_day VARCHAR(20),  -- 'morning', 'afternoon', 'evening', 'night'
  preferred_days_of_week TEXT[],      -- ['Lunes', 'Viernes', ...]
  
  -- Nivel de confianza
  confidence_level VARCHAR(20),  -- 'low' (<5 pedidos), 'medium' (5-20), 'high' (>20)
  
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ejemplo de datos:**
```json
{
  "user_email": "juan@example.com",
  "total_orders": 15,
  "favorite_products": [
    {"name": "Combo Deluxe", "count": 8, "percentage": 53},
    {"name": "SmartBurger Clásica", "count": 5, "percentage": 33}
  ],
  "always_adds": [
    {"ingredient": "Aguacate", "count": 12, "percentage": 80}
  ],
  "always_removes": [
    {"ingredient": "Cebolla", "count": 14, "percentage": 93}
  ],
  "never_orders": ["Aros de Cebolla", "Sprite"],
  "preferred_time_of_day": "evening",
  "preferred_days_of_week": ["Viernes", "Sábado"],
  "confidence_level": "medium"
}
```

#### 2. `user_behavior_analytics` (Sistema Viejo - Básico)
```sql
CREATE TABLE user_behavior_analytics (
  user_email VARCHAR(255) PRIMARY KEY,
  total_orders INTEGER,
  average_order_value DECIMAL(10,2),
  favorite_products TEXT[],
  favorite_day VARCHAR(20),
  favorite_time VARCHAR(20),
  never_orders TEXT[],
  always_orders TEXT[]
);
```

---

## ⚙️ Cómo Funciona

### 🔄 Análisis Automático (Trigger-Based)

Cada vez que una orden se completa, el sistema analiza automáticamente:

```sql
-- Trigger que ejecuta análisis después de cada orden completada
CREATE TRIGGER auto_analyze_user_preferences
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION analyze_user_preferences_trigger();
```

### 📊 Qué Se Analiza

La función `analyze_user_preferences()` examina:

1. **Productos Favoritos**: Top 5 productos más pedidos con porcentajes
2. **Customizaciones Recurrentes**:
   - Items agregados en >50% de los pedidos
   - Items removidos en >70% de los pedidos
3. **Productos Nunca Pedidos**: Productos disponibles que el usuario nunca ordenó
4. **Patrones Temporales**:
   - Horario preferido (mañana/tarde/noche/madrugada)
   - Días de la semana más frecuentes
5. **Nivel de Confianza**:
   - `low`: <5 pedidos (muy preliminar)
   - `medium`: 5-20 pedidos (confiable)
   - `high`: >20 pedidos (muy confiable)

### 🤖 Cómo María Usa Las Preferencias

Cuando un usuario inicia un chat, María recibe este contexto:

```typescript
// Preferencias avanzadas del nuevo sistema
🎯 PREFERENCIAS AVANZADAS DEL USUARIO:
📊 Productos favoritos: Combo Deluxe (53%), SmartBurger Clásica (33%)
➕ Siempre agrega: Aguacate
➖ Siempre quita: Cebolla
🚫 Nunca pide: Aros de Cebolla, Sprite
⏰ Horario preferido: evening
📅 Días favoritos: Viernes, Sábado

💡 NIVEL DE CONFIANZA: medium (15 pedidos)

🎁 USA ESTAS PREFERENCIAS PARA:
1. Ofrecer automáticamente sus productos favoritos
2. Preparar customizaciones por defecto (agregar/quitar ingredientes)
3. EVITAR sugerir productos que nunca pide
4. Personalizar según horario y día de la semana
```

**Ejemplo de conversación personalizada:**

```
Usuario: "Hola, quiero pedir algo"

María (sin preferencias):
"¡Hola! 😊 ¿Qué te gustaría pedir hoy? Tenemos hamburguesas, combos..."

María (con preferencias):
"¡Hola Juan! 😊 Tu Combo Deluxe favorito como siempre, 
sin cebolla y con aguacate extra? (Como te gusta)"
```

---

## 🚀 Instalación

### Paso 1: Ejecutar SQL del Nuevo Sistema

```bash
# En Supabase SQL Editor, ejecuta:
supabase/user-preferences-system.sql
```

Esto creará:
- ✅ Tabla `user_preferences`
- ✅ Función `analyze_user_preferences(email)`
- ✅ Función `get_user_recommendation(email)`
- ✅ Trigger automático en tabla `orders`
- ✅ Índices optimizados

### Paso 2: Verificar Integración

El código de `app/api/chat/route.ts` ya está actualizado para usar el nuevo sistema:

```typescript
// Consulta preferencias del usuario
const userPreferences = await getUserPreferences(userEmail);

// María recibe el contexto automáticamente
const systemPrompt = await getEnhancedSystemPrompt(sessionId, userEmail);
```

### Paso 3: Probar el Sistema

```sql
-- 1. Crear orden de prueba
INSERT INTO orders (customer_email, total, status) 
VALUES ('test@example.com', 12.99, 'pending') RETURNING id;

-- 2. Agregar items a la orden
INSERT INTO order_items (order_id, product_id, quantity, customizations)
VALUES (
  '<orden_id>', 
  (SELECT id FROM products WHERE name = 'Combo Deluxe' LIMIT 1),
  1,
  '{"additions": ["Aguacate"], "removals": ["Cebolla"]}'
);

-- 3. Completar la orden (trigger ejecutará análisis)
UPDATE orders SET status = 'completed' WHERE id = '<orden_id>';

-- 4. Ver preferencias generadas
SELECT * FROM user_preferences WHERE user_email = 'test@example.com';
```

---

## 📚 API y Funciones

### Funciones de Base de Datos

#### 1. `analyze_user_preferences(p_user_email VARCHAR)`
Analiza el historial completo del usuario y actualiza preferencias.

```sql
-- Ejecutar manualmente
SELECT analyze_user_preferences('usuario@example.com');
```

**Retorna:** void (actualiza tabla `user_preferences`)

#### 2. `get_user_recommendation(p_user_email VARCHAR)`
Obtiene recomendación personalizada basada en preferencias.

```sql
-- Obtener recomendación
SELECT get_user_recommendation('usuario@example.com');
```

**Retorna:** 
```json
{
  "recommended_product": "Combo Deluxe",
  "reason": "Es tu producto favorito (53%)",
  "suggested_customizations": {
    "add": ["Aguacate"],
    "remove": ["Cebolla"]
  },
  "confidence": "medium"
}
```

### Funciones TypeScript

#### 1. `getUserPreferences(userEmail: string)`
```typescript
import { getUserPreferences } from '@/lib/supabase';

const preferences = await getUserPreferences('usuario@example.com');
```

**Retorna:**
```typescript
{
  user_email: string;
  total_orders: number;
  favorite_products: Array<{name: string, count: number, percentage: number}>;
  always_adds: Array<{ingredient: string, count: number, percentage: number}>;
  always_removes: Array<{ingredient: string, count: number, percentage: number}>;
  never_orders: string[];
  preferred_time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  preferred_days_of_week: string[];
  confidence_level: 'low' | 'medium' | 'high';
}
```

---

## 🎯 Ejemplos de Uso

### Caso 1: Usuario Nuevo (Sin Historial)

```typescript
const preferences = await getUserPreferences('nuevo@example.com');
// Resultado:
{
  total_orders: 0,
  confidence_level: 'low',
  favorite_products: [],
  // ... todos los campos vacíos
}
```

**María:** Saludo genérico sin personalización.

---

### Caso 2: Usuario con 5 Pedidos (Confianza Media)

```typescript
{
  total_orders: 5,
  confidence_level: 'medium',
  favorite_products: [
    {name: "SmartBurger Clásica", count: 3, percentage: 60}
  ],
  always_removes: [
    {ingredient: "Tomate", count: 4, percentage: 80}
  ],
  preferred_time_of_day: 'afternoon'
}
```

**María:** 
> "¡Hola! Perfecto timing para tu SmartBurger Clásica (sin tomate como te gusta) 😊"

---

### Caso 3: Usuario Frecuente (Confianza Alta)

```typescript
{
  total_orders: 25,
  confidence_level: 'high',
  favorite_products: [
    {name: "Combo Deluxe", count: 15, percentage: 60},
    {name: "Papas Fritas", count: 10, percentage: 40}
  ],
  always_adds: [
    {ingredient: "Aguacate", count: 20, percentage: 80},
    {ingredient: "Bacon", count: 18, percentage: 72}
  ],
  always_removes: [
    {ingredient: "Cebolla", count: 24, percentage: 96}
  ],
  never_orders: ["Aros de Cebolla", "Sprite", "Fanta"],
  preferred_time_of_day: 'evening',
  preferred_days_of_week: ['Viernes', 'Sábado']
}
```

**María:**
> "¡Juan! 🎉 Es viernes por la noche, tu momento favorito 😊  
> Tu Combo Deluxe de siempre con:  
> ✅ Aguacate extra  
> ✅ Bacon  
> ❌ Sin cebolla  
> ¿Lo armo así?"

---

## 🔧 Mantenimiento

### Análisis Manual de Usuario

Si necesitas forzar un análisis:

```sql
SELECT analyze_user_preferences('usuario@example.com');
```

### Resetear Preferencias de Usuario

```sql
DELETE FROM user_preferences WHERE user_email = 'usuario@example.com';
-- El próximo pedido completado regenerará las preferencias
```

### Ver Estadísticas Generales

```sql
SELECT 
  confidence_level,
  COUNT(*) as usuarios,
  AVG(total_orders) as promedio_pedidos
FROM user_preferences
GROUP BY confidence_level
ORDER BY 
  CASE confidence_level
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END;
```

---

## ⚠️ Notas Importantes

1. **Privacidad**: Las preferencias solo se usan para mejorar la experiencia. No se comparten.

2. **Actualización Automática**: El trigger actualiza preferencias **solo cuando una orden se completa**, no en cada cambio de estado.

3. **Performance**: 
   - Las consultas usan índices en `user_email`
   - El cache en la API reduce llamadas a BD (5 minutos)
   - El análisis es asíncrono (no bloquea el flujo)

4. **Compatibilidad**: 
   - Sistema viejo (`user_behavior_analytics`) sigue funcionando
   - María usa **ambos sistemas** para máxima información
   - Migración gradual recomendada

---

## 📞 Soporte

Si tienes preguntas sobre el sistema de preferencias:

1. Verifica que el archivo SQL se ejecutó correctamente
2. Revisa logs en la consola del navegador (F12)
3. Consulta las preferencias directamente en la tabla `user_preferences`

---

**Sistema desarrollado para SmartBurger** 🍔  
**Versión:** 1.0  
**Última actualización:** Febrero 2025
