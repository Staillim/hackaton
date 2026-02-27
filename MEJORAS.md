# Plan de Mejoras — SmartBurger

> Análisis del estado actual vs lo que se necesita para tener un sistema diferenciado.
> Prioridad: **Alta / Media / Baja**

---

## 0. Configuración del Proyecto

### 0.1 Variables de entorno no configuradas `[Alta — Bloquea producción]`
**Problema:** No existe ningún archivo `.env.local`. Sin él, Supabase usa `placeholder.supabase.co` y el chat no funciona.

**Solución:** Se creó `.env.local.example` como plantilla. Para arrancar:
```bash
cp .env.local.example .env.local
# Editar .env.local con los valores reales
```

Variables requeridas:

| Variable | Visibilidad | Dónde conseguirla |
|----------|------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (browser) | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (browser) | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privada (solo servidor)** | Supabase → Settings → API |
| `GEMINI_API_KEY` | **Privada (solo servidor)** | aistudio.google.com |
| `NEXT_PUBLIC_APP_URL` | Pública (browser) | URL de la app |

> **IMPORTANTE:** `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` nunca deben tener prefijo `NEXT_PUBLIC_`. Si se exponen al browser, cualquier persona puede ver y usar las claves.

---

### 0.2 `gitignore.txt` es un duplicado inútil `[Baja]`
**Problema:** Existe un archivo `gitignore.txt` en la raíz. Git solo lee `.gitignore` (ya existe y está correcto). El `.txt` no hace nada.

**Solución:** Eliminar `gitignore.txt`.
```bash
rm gitignore.txt
```

---

### 0.3 `netlify.toml` tiene redirects que rompen las API routes `[Media]`
**Problema:** En `netlify.toml` hay un redirect genérico:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
Esto intercepta todas las rutas, incluyendo `/api/*`, y las convierte en una SPA clásica. En un proyecto Next.js con App Router esto puede hacer que las API routes no funcionen.

**Solución:** El redirect `/*` debe ser el último y tener una condición de fallback, o eliminarse si `@netlify/plugin-nextjs` ya maneja el routing.

---

## 1. Chat Inteligente — Diferenciación vs chatbot tradicional

### 1.1 Menú hardcodeado en el prompt `[Alta]`
**Problema:** El menú completo en [`app/api/chat/route.ts:95-120`](app/api/chat/route.ts#L95-L120) está escrito como texto fijo. Si se cambia un precio en la base de datos, el chat sigue mostrando el precio viejo hasta el próximo deploy.

**Solución:** Construir el system prompt dinámicamente consultando `products` y `categories` desde Supabase en cada request, igual que ya hace `getBestSellingProducts`. El menú siempre estaría sincronizado con la BD.

---

### 1.2 La IA no sabe qué hay en el carrito `[Alta]`
**Problema:** En [`app/api/chat/route.ts:261`](app/api/chat/route.ts#L261) el `fullPrompt` nunca incluye el contenido actual del carrito. Si el usuario dice "quiero otro igual" o "¿cuánto va hasta ahora?", la IA no tiene esa información.

**Solución:** `ChatWidget` debe pasar `cart.items` en el body del request. El backend los incluye en el prompt:
```
CARRITO ACTUAL:
- 1x SmartBurger Clásica ($5.99)
- 1x Coca-Cola ($1.99)
Subtotal: $7.98
```

---

### 1.3 Parsing por regex frágil — sin Tool Calling real `[Alta]`
**Problema:** El sistema depende de que Gemini genere exactamente `[ADD_TO_CART:SmartBurger Clásica:1:::]`. Si escribe el nombre con diferente capitalización o sin acento, la búsqueda `.in('name', productNames)` en [`route.ts:62-66`](app/api/chat/route.ts#L62-L66) falla silenciosamente: el producto no se agrega al carrito y el usuario no recibe ningún error.

**Solución:** Migrar a **Gemini Function Calling** con un schema tipado donde la IA devuelve IDs de producto, no nombres en texto libre:
```ts
tools: [{
  functionDeclarations: [{
    name: "add_to_cart",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID del producto en BD" },
        quantity: { type: "number" },
        additions: { type: "array", items: { type: "string" } },
        removals: { type: "array", items: { type: "string" } }
      },
      required: ["product_id", "quantity"]
    }
  }]
}]
```

---

### 1.4 Sin memoria real entre sesiones `[Alta]`
**Problema:** El historial vive en `sessionStorage` ([`ChatWidget.tsx:13-41`](components/chat/ChatWidget.tsx#L13-L41)). Al cerrar el navegador se pierde todo. La función `saveUserPreference` guarda en la tabla `analytics` como evento genérico (no en una tabla dedicada de preferencias), y `getUserPreferences` también lee desde `analytics`, lo que no es semánticamente correcto.

**Solución:**
- Persistir el historial en `chat_conversations` vinculado al `user.id` autenticado.
- Crear tabla `user_preferences` dedicada con campos: `user_id`, `allergies`, `likes`, `dislikes`.
- Cargar preferencias antes de cada conversación e incluirlas en el prompt:
  ```
  PREFERENCIAS DEL CLIENTE:
  - Siempre pide: sin cebolla
  - Alergias: maní
  - Pedido anterior: Combo Deluxe
  ```

---

### 1.5 Respuestas solo en texto — sin UI contextual en el chat `[Media]`
**Problema:** El widget solo renderiza texto plano en [`ChatWidget.tsx:433`](components/chat/ChatWidget.tsx#L433). No hay imágenes de producto, botones de acción directa ni resumen visual del pedido dentro del chat.

**Solución:** El API debe devolver un `responseType` y el widget renderizar componentes distintos:
```ts
// Respuesta del API
{
  message: "Te recomiendo estas opciones:",
  responseType: "product_cards",  // | "text" | "order_summary"
  products: [{ id, name, price, image_url }]
}
```
El widget mostraría tarjetas con imagen y botón "Agregar" directamente en el hilo del chat, sin abrir el carrito lateral.

---

## 2. Panel Administrativo — Funcionalidad faltante

### 2.1 Los botones de "Acciones Rápidas" no hacen nada `[Alta]` ✅ Parcialmente resuelto
**"Reportes"** navega a `/admin/reports` con gráficas reales. Los otros 3 muestran badge "Próximamente".

**Pendiente (próxima fase):**
| Ruta | Contenido |
|------|-----------|
| `/admin/products` | CRUD: listar, editar, toggle activo/destacado |
| `/admin/inventory` | Tabla de ingredientes con stock editable inline |
| `/admin/promotions` | Toggle activo/inactivo + crear/editar promociones |

---

### 2.2 El trend "+12%" estaba hardcodeado `[Alta]` ✅ Resuelto
Ahora usa `getYesterdaySales()` para calcular el delta real hoy vs ayer. Muestra flecha verde/roja.

---

### 2.3 Sin actualización en tiempo real `[Media]` ✅ Resuelto
Suscripción Supabase Realtime activa en `app/admin/page.tsx`. El dashboard se actualiza automáticamente ante cualquier cambio en `orders`.

---

### 2.4 Sin gestión de usuarios/roles `[Media]`
**Pendiente:** `/admin/users` — requiere SUPABASE_SERVICE_ROLE_KEY para UPDATE en `user_profiles` sin restricciones de RLS.

---

### 2.5 Reportes con Recharts `[Media]` ✅ Resuelto
[`app/admin/reports/page.tsx`](app/admin/reports/page.tsx) implementado con:
- KPI cards: ventas hoy, ingresos semana, producto #1
- `LineChart`: ventas y pedidos por hora del día (hoy)
- `BarChart` horizontal: top 5 productos más vendidos (últimos 7 días)
- Estado vacío si no hay datos

---

### 2.6 Agente de Inteligencia con IA `[Media]` ✅ Estructura lista — GPT-4o pendiente conexión
[`app/api/admin/analyze/route.ts`](app/api/admin/analyze/route.ts) implementado:
- Recopila métricas reales de Supabase: ventas por producto, por hora, alertas de stock, promociones
- Devuelve insights parcialmente reales sin modelo IA
- UI completo en el dashboard con secciones de resumen, top productos, stock crítico, recomendaciones

**Para activar GPT-4o completo:**
1. `npm install openai`
2. Agregar `OPENAI_API_KEY` en `.env.local`
3. Descomentar bloque `TODO: GPT-4o` en [`app/api/admin/analyze/route.ts`](app/api/admin/analyze/route.ts)

---

## 3. Panel de Cocina — Bugs críticos

### 3.1 Muestra UUID en lugar del nombre del producto `[Alta — Bug visual]`
**Problema:** En [`app/cocina/page.tsx:222`](app/cocina/page.tsx#L222):
```tsx
<p className="text-white">{item.quantity}x {item.product_id}</p>
```
La cocina ve `2x 3f8a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c` en lugar de `2x SmartBurger Clásica`.

**Solución:** La query `getOrders` en [`lib/supabase.ts:91`](lib/supabase.ts#L91) ya hace join con `product:products(*)`, por lo que `item.product` está disponible. Solo hay que usar `item.product?.name` en lugar de `item.product_id`.

---

### 3.2 Personalizaciones mostradas como JSON crudo `[Alta — Bug visual]`
**Problema:** En [`app/cocina/page.tsx:228`](app/cocina/page.tsx#L228):
```tsx
<p className="text-gray-400 text-xs ml-4">{JSON.stringify(item.customizations)}</p>
```
La cocina ve `{"added":["bacon"],"removed":["cebolla"]}` en lugar de instrucciones legibles.

**Solución:** Formatear en etiquetas de color:
```tsx
<p className="text-green-400 text-xs">+ {item.customizations.added.join(', ')}</p>
<p className="text-red-400 text-xs">- {item.customizations.removed.join(', ')}</p>
```

---

### 3.3 Sin temporizador por pedido `[Media]`
**Problema:** La cocina solo ve la hora de creación como texto estático. No hay indicación de urgencia ni cuánto tiempo lleva esperando cada pedido.

**Solución:** Contador activo en tiempo real que cambie de color según urgencia:
- Verde: < 5 min
- Amarillo: 5–10 min
- Rojo: > 10 min (con animación de pulso)

---

### 3.4 Sin alerta sonora para pedidos nuevos `[Media]`
**Problema:** Si la cocina tiene el monitor en reposo, no hay aviso cuando llega un pedido nuevo. La suscripción Realtime existe pero solo recarga silenciosamente la lista.

**Solución:** Al detectar un INSERT en Realtime, reproducir un sonido (`new Audio('/sounds/order.mp3').play()`) y mostrar un toast prominente con el número de orden y los items.

---

## 4. Store / Carrito

### 4.1 Precios de extras hardcodeados en el store `[Media]`
**Problema:** En [`lib/store.ts:16-28`](lib/store.ts#L16-L28) el objeto `EXTRA_PRICES` con los precios de personalizaciones está escrito en el código. Si cambia el precio del bacon, se necesita un deploy.

```ts
const EXTRA_PRICES: { [key: string]: number } = {
  'bacon': 1.50,
  'aguacate': 1.00,
  // ...
};
```

**Solución:** Cargar los precios desde la tabla `ingredients` de Supabase al iniciar la app y almacenarlos en el store de Zustand. El store ya importa `Ingredient` desde types, así que la estructura existe.

---

## 5. Mejoras Futuras

### 5.1 Sin concepto de mesa `[Baja]`
El `sessionId` es solo un timestamp + random. Para un restaurante físico sería útil asignar un número de mesa al inicio, que aparezca en el panel de cocina y en los pedidos del admin.

### 5.2 Sin flujo de pago `[Baja]`
El campo `payment_status` existe en el schema pero siempre es `'pending'`. No hay integración con ningún gateway. Opciones: **Stripe** (internacional) o **MercadoPago** (LATAM).

### 5.3 Sin notificaciones push `[Baja]`
No hay sistema para notificar al cliente cuando su pedido está listo. Se podría implementar con Web Push API o con SMS via Twilio.

---

## Resumen de prioridades

| # | Mejora | Área | Prioridad |
|---|--------|------|-----------|
| 0.1 | Crear `.env.local` desde el ejemplo | Config | **Bloquea producción** |
| 1.3 | Migrar a Gemini Function Calling | Chat | Alta |
| 1.1 | Menú dinámico desde BD | Chat | Alta |
| 1.2 | Estado del carrito en el prompt | Chat | Alta |
| 1.4 | Memoria persistente entre sesiones | Chat | Alta |
| 2.1 | Implementar CRUD de productos/inventario/promo | Admin | Alta |
| 2.2 | Calcular trend real de ventas | Admin | Alta |
| 3.1 | Mostrar nombre de producto (no UUID) en cocina | Cocina | Alta |
| 3.2 | Formatear personalizaciones en cocina | Cocina | Alta |
| 0.3 | Fix redirects en netlify.toml | Config | Media |
| 2.3 | Realtime en panel admin | Admin | Media |
| 2.4 | Gestión de usuarios/roles | Admin | Media |
| 2.5 | Página de reportes con Recharts | Admin | Media |
| 3.3 | Temporizador por pedido en cocina | Cocina | Media |
| 3.4 | Alerta sonora para pedidos nuevos | Cocina | Media |
| 1.5 | UI contextual (product cards) en el chat | Chat | Media |
| 4.1 | Precios de extras desde BD | Store | Media |
| 0.2 | Eliminar `gitignore.txt` duplicado | Config | Baja |
| 5.1 | Concepto de mesa | General | Baja |
| 5.2 | Integración de pagos | General | Baja |
| 5.3 | Notificaciones push | General | Baja |
