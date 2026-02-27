# 🤖 MAX - Agente Autónomo Inteligente para SmartBurger

## 📊 ESTADO ACTUAL (Capacidades Existentes)

### ✅ Ya Implementado

**Ingredientes (2 funciones)**
- ✅ Actualizar stock de ingredientes
- ✅ Marcar ingrediente disponible/no disponible

**Productos (4 funciones)**
- ✅ Activar/desactivar producto en menú
- ✅ Destacar producto
- ✅ Cambiar precio base
- ✅ Editar detalles (nombre, descripción, calorías, tiempo prep)

**Promociones (4 funciones)**
- ✅ Activar/desactivar promoción
- ✅ Modificar valor de descuento
- ✅ Crear nueva promoción
- ✅ Eliminar promoción

**Pedidos (1 función)**
- ✅ Cambiar estado de pedido

**Análisis (4 funciones)**
- ✅ Analizar stock crítico
- ✅ Analizar ventas por período
- ✅ Ver pedidos activos
- ✅ Detalle de ventas por producto

**TOTAL: 15 funciones automáticas**

---

## 🚀 PROPUESTA DE EXPANSIÓN - MAX AUTÓNOMO 2.0

### 🎯 Objetivo
Convertir a Max en un **gerente virtual autónomo** capaz de:
1. **Tomar decisiones operativas** basadas en datos
2. **Optimizar inventario** de forma predictiva
3. **Gestionar precios dinámicamente**
4. **Responder a emergencias** automáticamente
5. **Generar insights** de negocio sin intervención humana

---

## 📋 NUEVAS CAPACIDADES PROPUESTAS

### 🔴 NIVEL 1: OPERACIONES CRÍTICAS (Prioridad Alta)

#### 1.1 Gestión Inteligente de Inventario
```
🎯 Auto-Reposición
- detect_low_stock_critical()
  → Detecta ingredientes críticos basado en velocidad de venta
  → Calcula cantidad óptima de reposición
  → Genera orden de compra automática

🎯 Optimización de Stock
- optimize_stock_levels()
  → Analiza histórico de ventas (30 días)
  → Sugiere niveles mínimos/máximos por ingrediente
  → Ajusta alertas de stock automáticamente

🎯 Prevención de Desperdicios
- predict_expiration_risk()
  → Identifica ingredientes cerca de caducidad
  → Sugiere promociones para acelerar uso
  → Activa alertas de "última oportunidad"
```

#### 1.2 Gestión Autónoma de Productos
```
🎯 Creación/Eliminación Inteligente
- create_product_smart()
  → Crea producto completo con ingredientes
  → Calcula precio automático basado en costos
  → Asigna categoría automáticamente

- delete_product_safe()
  → Verifica si tiene pedidos pendientes
  → Desactiva en lugar de eliminar si hay historial
  → Migra estadísticas a producto reemplazo

🎯 Gestión de Recetas
- update_product_recipe()
  → Agregar/quitar ingredientes de producto
  → Recalcular costos automáticamente
  → Actualizar información nutricional

- clone_product()
  → Duplicar producto existente
  → Útil para crear variantes (ej: "Burger XXL")
```

#### 1.3 Gestión de Pedidos Avanzada
```
🎯 Priorización Inteligente
- prioritize_orders()
  → Ordena pedidos por urgencia (tiempo espera)
  → Detecta pedidos en riesgo de cancelación
  → Sugiere reasignación de cocina

🎯 Cancelaciones y Reembolsos
- cancel_order_with_reason()
  → Cancela y registra motivo
  → Genera reembolso automático
  → Notifica al cliente

🎯 Gestión de Retrasos
- handle_delayed_orders()
  → Detecta pedidos con retraso >15min
  → Aplica compensación automática (descuento, bebida gratis)
  → Envía notificación de disculpa
```

---

### 🟡 NIVEL 2: OPTIMIZACIÓN DE NEGOCIO (Prioridad Media)

#### 2.1 Precios Dinámicos (Solo Descuentos Rentables)
```
🎯 Descuentos Inteligentes por Producto
- smart_discounts()
  → Descuentos 5-15% SOLO en productos con baja demanda
  → Analiza ventas últimas 24h de cada producto
  → Aplica descuento proporcional a la baja en ventas
  → Mantiene precio normal en productos populares
  → NUNCA descuento si afecta rentabilidad mínima (margen <30%)

- optimize_product_price()
  → Analiza elasticidad de precio
  → Sugiere precio base óptimo
  → Compara con competencia (si disponible)
  → Asegura margen de ganancia

🎯 Promociones Estratégicas
- auto_create_promotion()
  → Promo SOLO para productos específicos con <50% ventas normales
  → 2x1 solo si inventario próximo a caducar
  → Combos inteligentes (producto lento + producto popular)
  → Descuentos máximo 10% en horas valle
```

#### 2.2 Análisis Predictivo
```
🎯 Forecasting
- predict_demand()
  → Predice ventas próximas 24h/7d
  → Basado en histórico, día semana, clima
  → Sugiere preparación anticipada

- predict_revenue()
  → Proyección de ingresos mes/trimestre
  → Identifica tendencias al alza/baja
  → Alerta si no se cumplen objetivos

🎯 Detección de Anomalías
- detect_sales_anomaly()
  → Detecta picos/caídas inusuales
  → Identifica posibles causas
  → Sugiere acciones correctivas
```

#### 2.3 Gestión de Usuarios y Clientes
```
🎯 Segmentación Automática
- segment_customers()
  → VIP (>$500/mes)
  → Frecuentes (>8 pedidos/mes)
  → En riesgo (no compran hace 30d)
  → Nuevos (<3 pedidos)

- auto_reward_vip()
  → Aplica descuentos a clientes VIP
  → Envía cupones de cumpleaños
  → Programa de lealtad automático

🎯 Recuperación de Clientes
- win_back_campaign()
  → Detecta clientes inactivos
  → Envía cupón de "te extrañamos"
  → Ofrece su plato favorito con descuento
```

---

### 🟢 NIVEL 3: INTELIGENCIA ESTRATÉGICA (Prioridad Baja)

#### 3.1 Reportes Automáticos
```
🎯 Reportes Diarios/Semanales
- generate_daily_report()
  → Ventas del día
  → Productos más vendidos
  → Alertas críticas
  → Enviado por email automático

- generate_weekly_insights()
  → Comparación semana anterior
  → Tendencias emergentes
  → Recomendaciones de mejora
```

#### 3.2 Optimización de Menú
```
🎯 Análisis de Rentabilidad
- analyze_menu_profitability()
  → Calcula margen real por producto
  → Identifica productos no rentables
  → Sugiere ajustes (precio, ingredientes, eliminación)

- optimize_menu_composition()
  → Sugiere productos a agregar/quitar
  → Basado en popularidad y rentabilidad
  → Equilibrio de categorías
```

#### 3.3 Gestión de Horarios y Turnos
```
🎯 Optimización de Personal
- optimize_staff_schedule()
  → Predice demanda por hora
  → Sugiere turnos óptimos
  → Alerta de sobrecarga/baja ocupación
```

---

## 🛡️ SISTEMA DE SEGURIDAD Y CONFIRMACIONES

### Niveles de Autonomía

**🟢 NIVEL GREEN (Automático)**
- Actualizaciones de stock
- Cambios de estado de pedidos
- Activar/desactivar productos
- Crear promociones temporales
- **NO requiere confirmación**

**🟡 NIVEL YELLOW (Semi-Automático)**
- Cambios de precios >10%
- Eliminación de productos
- Crear productos nuevos
- Cancelar pedidos >$50
- **Requiere confirmación verbal del admin**

**🔴 NIVEL RED (Manual)**
- Eliminar promociones activas
- Cambiar precios de combos
- Modificar ingredientes de productos
- Acceso a datos de clientes sensibles
- **Requiere confirmación + autorización de admin**

### Sistema de Confirmación
```typescript
// Ejemplo de confirmación en chat
Max: "Detecté que las papas están en stock crítico (2kg).
      ¿Quieres que genere una orden de reposición de 20kg?"
      
Admin: "sí" / "confirma" / "adelante"

Max: ✅ "Orden generada. Te envío el PDF por email."
```

---

## 🎯 PRIORIZACIÓN DE IMPLEMENTACIÓN

### FASE 1 - Fundamentos (1-2 semanas)
1. ✅ Gestión completa de productos (crear, editar, eliminar)
2. ✅ Gestión avanzada de inventario (reposición, optimización)
3. ✅ Cancelación y gestión de pedidos problemáticos
4. ✅ Sistema de confirmaciones por nivel de riesgo

### FASE 2 - Inteligencia (2-3 semanas)
5. ⚡ Descuentos inteligentes por producto (5-15%, solo si rentable)
6. ⚡ Promociones automáticas estratégicas (baja venta + margen seguro)
7. ⚡ Análisis predictivo de demanda
8. ⚡ Segmentación de clientes

### FASE 3 - Optimización (3-4 semanas)
9. 🚀 Reportes automáticos
10. 🚀 Optimización de menú
11. 🚀 Detección de anomalías
12. 🚀 Forecasting avanzado

---

## 💡 EJEMPLOS DE USO

### Ejemplo 1: Gestión Automática de Stock
```
Admin: "Max, tenemos poco stock de carne"

Max: 🔍 Analizando inventario...
     
     📊 Estado actual:
     - Carne molida: 3kg (crítico, mín: 10kg)
     - Velocidad de consumo: 2kg/día
     - Stock disponible: 1.5 días
     
     🎯 Recomendación:
     - Ordenar: 25kg
     - Costo estimado: $150
     - Proveedor: CarnesDelSur (entrega 4h)
     
     ¿Genero la orden de compra?
```

### Ejemplo 2: Descuentos Inteligentes por Producto
```
Max: 📊 Análisis de demanda - 3:30 PM
     
     📉 Productos con baja venta hoy:
     - "Aros de Cebolla": 3 vendidos (normal: 15) → -80%
     - "Wrap de Pollo": 8 vendidos (normal: 20) → -60%
     - "Combo Deluxe": 18 vendidos (normal: 25) → -28%
     
     🎯 Acción automática (rentable):
     - Aros de Cebolla: $3.99 → $3.49 (-13%) ✅
       Margen actual: 45% → después: 35% ✅
     
     - Wrap de Pollo: $7.99 → $7.49 (-6%) ✅
       Margen actual: 52% → después: 46% ✅
     
     ❌ Combo Deluxe: Sin descuento
       Razón: Margen muy ajustado (32%), riesgo de pérdida
     
     ✅ Descuentos activos hasta las 18:00
     📈 Objetivo: Mover inventario SIN pérdidas
     💰 Proyección: +$25 vs dejar sin vender
```

### Ejemplo 3: Promoción Inteligente
```
Max: ⚠️ Alerta de bajo rendimiento
     
     📉 "Aros de Cebolla" solo 12 vendidos esta semana
     (promedio normal: 35)
     
     🎯 Propuesta:
     - Crear promo: "2x1 Aros hasta el viernes"
     - Destacar en menú principal
     - Notificar a clientes frecuentes
     
     ¿Activo la promoción?
```

### Ejemplo 4: Recuperación de Cliente
```
Max: 👤 Cliente VIP inactivo detectado
     
     - Juan Pérez (juan@mail.com)
     - Gasto histórico: $450
     - Última compra: hace 45 días
     - Favorito: Combo Deluxe
     
     🎁 Acción sugerida:
     - Enviar cupón 25% descuento
     - Válido en su producto favorito
     - Expira en 7 días
     
     ¿Envío el cupón?
```

---

## 🔧 TECNOLOGÍAS NECESARIAS

### Backend
- ✅ Gemini 2.5 Pro (function calling avanzado)
- ✅ Supabase (base de datos)
- ⚠️ Edge Functions (tareas programadas)
- ⚠️ Cron jobs (reportes automáticos)

### Nuevas Dependencias
```json
{
  "@google/generative-ai": "^0.21.0",  // ✅ Ya instalado
  "node-cron": "^3.0.3",                // Tareas programadas
  "pdf-lib": "^1.17.1",                 // Generar PDFs
  "@sendgrid/mail": "^8.1.0"            // Enviar emails
}
```

### Base de Datos (nuevas tablas)
```sql
-- Órdenes de reposición
CREATE TABLE restock_orders (
  id UUID PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity DECIMAL,
  cost DECIMAL,
  supplier TEXT,
  status TEXT, -- pending, approved, delivered
  created_by TEXT, -- 'max-auto', 'admin-manual'
  created_at TIMESTAMP
);

-- Reglas de precios dinámicos
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  hour_start INT,
  hour_end INT,
  price_multiplier DECIMAL,
  active BOOLEAN
);

-- Historial de decisiones autónomas
CREATE TABLE autonomous_actions (
  id UUID PRIMARY KEY,
  action_type TEXT,
  details JSONB,
  requires_confirmation BOOLEAN,
  confirmed_by TEXT,
  created_at TIMESTAMP
);
```

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs a Medir
1. **Eficiencia Operativa**
   - Tiempo de resolución de alertas: <5 min
   - Stock crítico resuelto automáticamente: >80%
   - Pedidos gestionados sin intervención: >90%

2. **Impacto Financiero**
   - Aumento en ingresos por descuentos estratégicos: +5-10%
   - Reducción de desperdicios: -20%
   - Ahorro en tiempo del admin: 10-15h/semana
   - Mejora en satisfacción del cliente: +15% (nunca cobra más)
   - Margen de ganancia protegido: Siempre >30% después de descuento

3. **Experiencia del Admin**
   - Satisfacción del admin: >8/10
   - Decisiones autónomas correctas: >95%
   - Tiempo de respuesta de Max: <3 segundos

---

## ✅ RECOMENDACIÓN FINAL

### Comenzar con FASE 1 (Core Crítico)

**Prioridad Máxima - Implementar YA:**

1. **Gestión completa de productos**
   - Crear producto con receta
   - Eliminar producto (con verificaciones)
   - Clonar producto para variantes

2. **Auto-reposición de inventario**
   - Detectar stock crítico
   - Calcular cantidad óptima
   - Generar orden de compra (PDF)

3. **Cancelación inteligente de pedidos**
   - Con motivo y compensación
   - Notificación automática

4. **Sistema de confirmaciones**
   - 3 niveles de riesgo
   - Confirmación por chat natural

**Tiempo estimado:** 1-2 semanas
**Impacto:** Alto - Reduce trabajo manual en 60%
**Complejidad:** Media - Usa funciones existentes

---

## 🚀 ¿EMPEZAMOS?

**Siguiente paso:** Implementar las 4 herramientas críticas de FASE 1

¿Quieres que comience con la implementación? 🤖
