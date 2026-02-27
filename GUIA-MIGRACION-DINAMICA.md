# 🔄 MIGRACIÓN A CONFIGURACIÓN 100% DINÁMICA

## ❌ QUÉ ELIMINAR (JSON/Código Hardcodeado)

### 1. **Configuraciones Hardcodeadas en Código**

**ANTES (❌ Eliminar esto):**
```typescript
// app/api/admin/chat/route.ts o cualquier archivo
const RESTAURANT_CONFIG = {
  minStockAlert: 10,
  maxDiscount: 15,
  peakHoursStart: '12:00',
  peakHoursEnd: '14:00',
  orderTimeout: 15
};

const PRICING_RULES = [
  { hour: 12, discount: 0 },
  { hour: 15, discount: 10 },
  { hour: 21, discount: 15 }
];
```

**DESPUÉS (✅ Usar esto):**
```typescript
// Obtener de la base de datos
const config = await getRestaurantSettings();
const pricingRules = await getPricingRules();
```

---

## ✅ NUEVAS TABLAS CREADAS

### 📋 Resumen de Tablas

| Tabla | Propósito | Max puede modificar |
|-------|-----------|---------------------|
| `restaurant_settings` | Configuración general del restaurante | ✅ Sí |
| `pricing_rules` | Reglas de precios dinámicos por horario/demanda | ✅ Sí |
| `stock_rules` | Niveles óptimos de stock por ingrediente | ✅ Sí |
| `autonomous_actions` | Historial de todas las acciones de Max | ✅ Solo insertar |
| `restock_orders` | Órdenes de reposición generadas por Max | ✅ Sí |
| `restock_order_items` | Items de cada orden de reposición | ✅ Sí |
| `system_alerts` | Alertas activas (stock, ventas, pedidos) | ✅ Sí |
| `promotion_rules` | Reglas para crear promociones automáticas | ✅ Sí |
| `ai_insights` | Análisis y predicciones de Max | ✅ Solo insertar |

---

## 🚀 CÓMO USAR LAS NUEVAS TABLAS

### 1️⃣ **restaurant_settings** - Configuración General

**Obtener configuración:**
```typescript
// lib/supabase.ts
export const getRestaurantSettings = async () => {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*');
  
  if (error) throw error;
  
  // Convertir a objeto key-value
  const settings: Record<string, any> = {};
  data?.forEach(item => {
    settings[item.setting_key] = parseSettingValue(item.setting_value, item.setting_type);
  });
  
  return settings;
};

function parseSettingValue(value: string, type: string) {
  switch(type) {
    case 'number': return parseFloat(value);
    case 'boolean': return value === 'true';
    case 'json': return JSON.parse(value);
    default: return value;
  }
}
```

**Max puede actualizar:**
```typescript
// Nueva función para Max
export const updateRestaurantSetting = async (key: string, value: any) => {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .update({ 
      setting_value: value.toString(), 
      updated_at: new Date().toISOString(),
      updated_by: 'max-auto'
    })
    .eq('setting_key', key)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Ejemplo de uso por Max:**
```
Admin: "Max, cambia el horario de apertura a las 8am"
Max ejecuta: updateRestaurantSetting('opening_time', '08:00')
Responde: "Horario de apertura actualizado a 8:00 AM"
```

---

### 2️⃣ **pricing_rules** - Precios Dinámicos

**Obtener reglas activas:**
```typescript
export const getActivePricingRules = async (productId?: string) => {
  let query = supabase
    .from('pricing_rules')
    .select('*, product:products(*)')
    .eq('active', true)
    .order('priority', { ascending: false });
  
  if (productId) {
    query = query.eq('product_id', productId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
```

**Max crea regla de descuento:**
```typescript
export const createPricingRule = async (ruleData: any) => {
  const { data, error } = await supabase
    .from('pricing_rules')
    .insert({
      ...ruleData,
      created_by: 'max-auto'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Ejemplo:**
```
Admin: "Max, crea un descuento del 10% de 3pm a 6pm"
Max ejecuta: 
  createPricingRule({
    rule_name: 'Happy Hour Tarde',
    rule_type: 'time_based',
    hour_start: 15,
    hour_end: 18,
    discount_percentage: 10.00,
    active: true
  })
```

---

### 3️⃣ **stock_rules** - Gestión Inteligente de Inventario

**Obtener reglas de stock:**
```typescript
export const getStockRules = async (ingredientId?: string) => {
  let query = supabase
    .from('stock_rules')
    .select('*, ingredient:ingredients(*)');
  
  if (ingredientId) {
    query = query.eq('ingredient_id', ingredientId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
```

**Max actualiza niveles óptimos:**
```typescript
export const updateStockRule = async (ingredientId: string, updates: any) => {
  const { data, error } = await supabase
    .from('stock_rules')
    .update(updates)
    .eq('ingredient_id', ingredientId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Ejemplo:**
```
Admin: "Max, el aguacate debe tener stock óptimo de 50 unidades"
Max ejecuta:
  updateStockRule(aguacateId, {
    optimal_stock_level: 50,
    min_stock_level: 15,
    critical_stock_level: 5,
    auto_reorder_quantity: 40
  })
```

---

### 4️⃣ **restock_orders** - Órdenes de Reposición Automáticas

**Max genera orden de reposición:**
```typescript
export const createRestockOrder = async (orderData: any, items: any[]) => {
  // Generar número de orden
  const { data: orderNumber } = await supabase.rpc('generate_restock_order_number');
  
  // Crear orden
  const { data: order, error: orderError } = await supabase
    .from('restock_orders')
    .insert({
      order_number: orderNumber,
      ...orderData,
      created_by: 'max-auto'
    })
    .select()
    .single();
  
  if (orderError) throw orderError;
  
  // Crear items
  const itemsWithOrder = items.map(item => ({
    ...item,
    restock_order_id: order.id
  }));
  
  const { data: orderItems, error: itemsError } = await supabase
    .from('restock_order_items')
    .insert(itemsWithOrder)
    .select();
  
  if (itemsError) throw itemsError;
  
  return { order, items: orderItems };
};
```

**Ejemplo:**
```
Max detecta: Aguacate en 3 unidades (crítico)
Max ejecuta:
  createRestockOrder(
    {
      supplier_name: 'FreshProduce Inc',
      total: 150.00,
      expected_delivery_date: '2026-02-27'
    },
    [{
      ingredient_id: aguacateId,
      quantity: 30,
      unit_cost: 5.00,
      total_cost: 150.00
    }]
  )
  
Max responde: "Orden RO-202602-0001 generada: 30 aguacates, $150, entrega mañana"
```

---

### 5️⃣ **autonomous_actions** - Auditoría de Acciones

**Registrar cada acción de Max:**
```typescript
export const logAutonomousAction = async (actionData: any) => {
  const { data, error } = await supabase
    .from('autonomous_actions')
    .insert({
      ...actionData,
      executed_at: new Date().toISOString(),
      executed_by: 'max-auto'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Usar en cada función de Max:**
```typescript
async function executeUpdateStock(name: string, quantity: number) {
  // ... código actual ...
  
  // Registrar acción
  await logAutonomousAction({
    action_type: 'update_stock',
    entity_type: 'ingredient',
    entity_id: match.id,
    action_description: `Stock de ${match.name} actualizado a ${quantity} ${match.unit}`,
    action_data: { old_stock: match.stock_quantity, new_stock: quantity },
    success: true,
    requires_confirmation: false
  });
}
```

---

### 6️⃣ **system_alerts** - Alertas Inteligentes

**Max crea alertas:**
```typescript
export const createSystemAlert = async (alertData: any) => {
  const { data, error } = await supabase
    .from('system_alerts')
    .insert(alertData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Ejemplo:**
```typescript
// Max detecta problema
await createSystemAlert({
  alert_type: 'stock',
  severity: 'critical',
  title: 'Stock Crítico: Aguacate',
  message: 'Solo quedan 3 unidades de aguacate. Stock crítico.',
  related_entity_type: 'ingredient',
  related_entity_id: aguacateId,
  recommended_action: 'Reponer 30 unidades urgente',
  status: 'active'
});
```

---

## 🔧 NUEVAS FUNCIONES PARA MAX

### Agregar a MAX_TOOLS:

```typescript
// 1. Configuración del restaurante
{
  name: 'update_restaurant_config',
  description: 'Actualiza configuración general del restaurante',
  parameters: {
    type: 'object',
    properties: {
      setting_key: { type: 'string', description: 'Clave de configuración' },
      value: { type: 'string', description: 'Nuevo valor' }
    },
    required: ['setting_key', 'value']
  }
},

// 2. Crear regla de precio dinámico
{
  name: 'create_pricing_rule',
  description: 'Crea una regla de descuento por horario o demanda',
  parameters: {
    type: 'object',
    properties: {
      rule_name: { type: 'string', description: 'Nombre de la regla' },
      hour_start: { type: 'number', description: 'Hora inicio (0-23)' },
      hour_end: { type: 'number', description: 'Hora fin (0-23)' },
      discount_percentage: { type: 'number', description: 'Descuento en %' }
    },
    required: ['rule_name', 'hour_start', 'hour_end', 'discount_percentage']
  }
},

// 3. Generar orden de reposición
{
  name: 'create_restock_order',
  description: 'Genera una orden de reposición de ingredientes',
  parameters: {
    type: 'object',
    properties: {
      ingredient_name: { type: 'string', description: 'Ingrediente a reponer' },
      quantity: { type: 'number', description: 'Cantidad a ordenar' },
      supplier: { type: 'string', description: 'Proveedor' }
    },
    required: ['ingredient_name', 'quantity']
  }
},

// 4. Actualizar niveles de stock óptimos
{
  name: 'update_stock_levels',
  description: 'Configura niveles óptimos, mínimos y críticos de stock',
  parameters: {
    type: 'object',
    properties: {
      ingredient_name: { type: 'string', description: 'Ingrediente' },
      optimal_level: { type: 'number', description: 'Stock óptimo' },
      min_level: { type: 'number', description: 'Stock mínimo' },
      critical_level: { type: 'number', description: 'Stock crítico' }
    },
    required: ['ingredient_name', 'optimal_level']
  }
}
```

---

## 📊 VISTA CONSOLIDADA PARA MAX

**Query SQL que Max puede usar:**
```sql
-- Stock crítico con toda la info
SELECT * FROM v_critical_inventory WHERE stock_status IN ('critical', 'low');

-- Productos con descuentos activos
SELECT * FROM v_products_with_pricing;

-- Alertas pendientes
SELECT * FROM system_alerts WHERE status = 'active' ORDER BY severity DESC;

-- Órdenes de reposición pendientes
SELECT * FROM restock_orders WHERE status IN ('pending', 'approved');

-- Acciones de Max hoy
SELECT * FROM autonomous_actions 
WHERE executed_at >= CURRENT_DATE 
ORDER BY executed_at DESC;
```

---

## 🎯 FLUJO COMPLETO: Reposición Automática

```
1. Max detecta stock crítico (analyze_stock)
   ↓
2. Consulta stock_rules para ingrediente
   ↓
3. Calcula cantidad óptima a reponer
   ↓
4. Genera restock_order con restock_order_items
   ↓
5. Registra en autonomous_actions
   ↓
6. Crea system_alert si requiere aprobación
   ↓
7. Notifica al admin
```

---

## ✅ PRÓXIMOS PASOS

1. **Ejecutar SQL**: Corre `DYNAMIC-CONFIG-DATABASE.sql` en Supabase
2. **Crear funciones en lib/supabase.ts**: Agregar las funciones mostradas arriba
3. **Actualizar MAX_TOOLS**: Agregar las 4 nuevas funciones
4. **Crear ejecutores**: Implementar `executeUpdateConfig`, `executeCreatePricingRule`, etc.
5. **Eliminar hardcoded**: Buscar y reemplazar cualquier configuración estática
6. **Testear**: Probar flujo completo de reposición automática

---

## 🔍 VERIFICAR SI HAY JSON HARDCODEADO

Buscar en el código:
```bash
# Buscar configuraciones estáticas
grep -r "const.*CONFIG" app/
grep -r "const.*RULES" app/
grep -r "const.*SETTINGS" app/

# Buscar arrays de datos
grep -r "= \[{" app/ | grep -v node_modules
```

¿Encuentras algo? Reemplázalo con llamadas a base de datos.
