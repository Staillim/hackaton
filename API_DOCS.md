# 📡 Documentación de API

## Base URL
```
http://localhost:3000/api
```

---

## 🤖 Chat Endpoint

### POST `/api/chat`

Envía un mensaje al asistente inteligente y recibe una respuesta.

#### Request Body
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Quiero una hamburguesa sin cebolla",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### Response
```json
{
  "message": "¡Perfecto! Te recomiendo nuestra SmartBurger Clásica sin cebolla...",
  "timestamp": "2024-01-01T12:00:01Z",
  "fallback": false
}
```

#### Campos
- `messages` (array, required): Historial de mensajes de la conversación
  - `role` (string): "user" o "assistant"
  - `content` (string): Contenido del mensaje
  - `timestamp` (string): ISO 8601 timestamp
- `message` (string): Respuesta del asistente
- `fallback` (boolean): true si usa respuesta de emergencia (sin IA)

#### Status Codes
- `200`: Éxito
- `500`: Error del servidor o API key no configurada

---

## 🛒 Orders Endpoint

### POST `/api/orders`

Crea un nuevo pedido en el sistema.

#### Request Body
```json
{
  "customer": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+52 123 456 7890"
  },
  "items": [
    {
      "product_id": "uuid-here",
      "quantity": 2,
      "unit_price": 5.99,
      "customizations": {
        "removed": ["cebolla"],
        "added": [
          {
            "ingredient": {
              "id": "uuid",
              "name": "Bacon",
              "price": 1.50
            },
            "quantity": 1
          }
        ],
        "notes": "Bien cocida por favor"
      }
    }
  ],
  "notes": "Entregar en recepción"
}
```

#### Response
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "order_number": "SB202401010001",
    "customer_name": "Juan Pérez",
    "customer_email": "juan@example.com",
    "customer_phone": "+52 123 456 7890",
    "total_amount": 11.98,
    "discount_amount": 2.40,
    "final_amount": 9.58,
    "status": "pending",
    "payment_status": "pending",
    "notes": "Entregar en recepción",
    "created_at": "2024-01-01T12:00:00Z",
    "items": [...],
    "appliedPromotion": {
      "name": "Happy Hour",
      "discount_value": 15
    }
  }
}
```

#### Campos
**Customer:**
- `name` (string, optional): Nombre del cliente
- `email` (string, optional): Email del cliente
- `phone` (string, optional): Teléfono del cliente

**Items:**
- `product_id` (string, required): UUID del producto
- `quantity` (integer, required): Cantidad
- `unit_price` (number, required): Precio unitario
- `customizations` (object, optional):
  - `removed` (array): Ingredientes removidos
  - `added` (array): Ingredientes adicionales
  - `notes` (string): Notas especiales

#### Status Codes
- `200`: Pedido creado exitosamente
- `400`: Datos inválidos
- `500`: Error del servidor

---

## 💡 Recommendations Endpoint

### POST `/api/recommendations`

Obtiene recomendaciones inteligentes basadas en el contexto.

#### Request Body
```json
{
  "context": {
    "currentCart": [
      {
        "product": {
          "id": "uuid",
          "name": "SmartBurger Clásica",
          "base_price": 5.99,
          "category": {
            "name": "Hamburguesas"
          }
        },
        "quantity": 1
      }
    ],
    "customerPreferences": ["spicy", "cheese"],
    "timeOfDay": "14:30"
  }
}
```

#### Response
```json
{
  "success": true,
  "recommendations": [
    {
      "type": "upsell",
      "reason": "Complementa tu hamburguesa",
      "message": "🍟 ¿Qué tal unas papas fritas con tu hamburguesa?",
      "products": [
        {
          "id": "uuid",
          "name": "Papas Fritas",
          "base_price": 2.99,
          "image_url": "..."
        }
      ]
    },
    {
      "type": "promotion",
      "reason": "Happy Hour",
      "message": "🎉 Happy Hour: 15% de descuento (2pm-4pm)",
      "discount": 15,
      "products": [...]
    }
  ],
  "timestamp": "2024-01-01T14:30:00Z"
}
```

#### Tipos de Recomendaciones
- `upsell`: Sugiere productos complementarios
- `savings`: Sugiere combos para ahorrar
- `promotion`: Promoción activa aplicable
- `popular`: Productos más vendidos
- `threshold`: Cerca de alcanzar un descuento

#### Status Codes
- `200`: Recomendaciones generadas
- `500`: Error del servidor

---

## 📊 Supabase Database Functions

### Funciones disponibles en `lib/supabase.ts`

#### `getProducts(featured?: boolean)`
Obtiene todos los productos o solo los destacados.

```typescript
const products = await getProducts();
const featuredProducts = await getProducts(true);
```

#### `getProductById(id: string)`
Obtiene un producto específico por ID.

```typescript
const product = await getProductById('uuid-here');
```

#### `getProductIngredients(productId: string)`
Obtiene los ingredientes de un producto.

```typescript
const ingredients = await getProductIngredients('uuid-here');
```

#### `getActivePromotions()`
Obtiene las promociones activas.

```typescript
const promotions = await getActivePromotions();
```

#### `createOrder(orderData: any)`
Crea una nueva orden.

```typescript
const order = await createOrder({
  customer_name: 'Juan',
  total_amount: 10.99,
  ...
});
```

#### `createOrderItems(items: any[])`
Crea los items de una orden.

```typescript
const items = await createOrderItems([
  { order_id: 'uuid', product_id: 'uuid', quantity: 2, ... }
]);
```

#### `getOrders(status?: string)`
Obtiene órdenes, opcionalmente filtradas por estado.

```typescript
const allOrders = await getOrders();
const pendingOrders = await getOrders('pending');
```

#### `getInventoryAlerts(resolved?: boolean)`
Obtiene alertas de inventario.

```typescript
const unresolvedAlerts = await getInventoryAlerts(false);
```

#### `updateIngredientStock(id: string, quantity: number)`
Actualiza el stock de un ingrediente.

```typescript
await updateIngredientStock('uuid', 50);
```

#### `trackAnalytics(eventType: string, eventData: any, sessionId?: string)`
Registra un evento de analytics.

```typescript
await trackAnalytics('product_view', { productId: 'uuid' }, sessionId);
```

---

## 🔐 Autenticación

Actualmente el sistema **no requiere autenticación** para las operaciones públicas (ver productos, hacer pedidos).

### Para Implementar Autenticación:

1. **Usar Supabase Auth:**
```typescript
import { supabase } from '@/lib/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

2. **Proteger rutas de admin:**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}
```

---

## 📈 Rate Limiting

**Recomendado para producción:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier);
  return success;
}
```

---

## 🐛 Error Handling

Todos los endpoints siguen este formato de error:

```json
{
  "error": "Descripción del error",
  "details": "Detalles técnicos (solo en desarrollo)",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🧪 Testing endpoints

### Usando cURL:

```bash
# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola","timestamp":"2024-01-01T12:00:00Z"}]}'

# Test order creation
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name": "Test User", "email": "test@example.com"},
    "items": [{"product_id": "uuid", "quantity": 1, "unit_price": 5.99}]
  }'
```

### Usando Postman:

1. Importa esta colección: `postman_collection.json` (crear si es necesario)
2. Configura el environment con `BASE_URL=http://localhost:3000`
3. Ejecuta las peticiones

---

## 📚 Recursos Adicionales

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

## 🆘 Soporte

Para issues o preguntas sobre la API, abre un issue en el repositorio.
