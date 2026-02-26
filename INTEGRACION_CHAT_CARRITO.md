# 🛒 Integración Chat-Carrito - SmartBurger

## 📋 Descripción General

El sistema de chat de SmartBurger ahora está completamente integrado con el carrito de compras. María (la asesora de ventas IA) puede agregar productos automáticamente al carrito mientras conversa con los clientes.

## ✨ Características

### 1. **Detección Automática de Pedidos**
- María detecta cuando el cliente confirma que quiere ordenar algo
- Automáticamente agrega los productos al carrito
- Mantiene el contexto completo de la conversación

### 2. **Integración Transparente**
- Los productos se agregan sin recargar la página
- El carrito se abre automáticamente después de agregar
- Notificaciones visuales confirman cada producto agregado
- El cliente puede ver el carrito en tiempo real

### 3. **Continuidad de la Conversación**
- María mantiene el hilo completo de la conversación
- Recuerda todos los productos pedidos
- Puede sugerir complementos y personalizaciones
- Calcula totales y aplica descuentos

## 🔧 Cómo Funciona (Técnico)

### Backend (API del Chat)

1. **Prompt Mejorado**: María recibe instrucciones sobre cómo indicar productos para agregar
2. **Sintaxis Especial**: Usa marcadores `[ADD_TO_CART:ProductName:Quantity]` internos
3. **Parseo de Respuesta**: El backend extrae estos marcadores automáticamente
4. **Búsqueda en BD**: Obtiene información completa de productos desde Supabase
5. **Respuesta Estructurada**: Retorna tanto el mensaje como las acciones del carrito

### Frontend (ChatWidget)

1. **Recibe Acciones**: Detecta el campo `cartActions` en la respuesta
2. **Agrega al Carrito**: Usa el store de Zustand para agregar productos
3. **Notificaciones**: Muestra toasts de confirmación
4. **Abre Carrito**: Dispara evento para abrir el carrito automáticamente

## 📝 Ejemplo de Flujo

### Cliente:
> "Quiero una SmartBurger Clásica con papas grandes"

### María (responde):
> "¡Perfecto! Agregué a tu carrito:
> - 1x SmartBurger Clásica ($5.99)
> - 1x Papas Fritas Grandes ($3.49)
> 
> Total: $9.48
> 
> ¿Quieres agregar alguna bebida? 🥤"

### Sistema (automático):
1. ✅ Agrega SmartBurger Clásica al carrito
2. ✅ Agrega Papas Fritas Grandes al carrito
3. 🛒 Abre el carrito automáticamente
4. 🔔 Muestra notificaciones de confirmación

## 🎯 Productos Disponibles para Agregar

María puede agregar estos productos automáticamente:

### Hamburguesas
- SmartBurger Clásica
- Doble Queso Deluxe
- Crispy Chicken Burger
- Veggie Supreme

### Combos
- Combo SmartBurger
- Combo Deluxe

### Acompañamientos
- Papas Fritas Medianas
- Papas Fritas Grandes
- Aros de Cebolla

### Bebidas
- Coca-Cola 500ml
- Sprite 500ml
- Fanta 500ml
- Agua Mineral

## 💡 Uso para el Cliente

1. **Conversa naturalmente** con María
2. **Dile qué quieres** ordenar
3. **Confirma el pedido** cuando María te pregunte
4. **Revisa el carrito** que se abre automáticamente
5. **Procede al checkout** cuando estés listo

## 🚀 Ventajas

### Para el Cliente
- ✅ Experiencia conversacional natural
- ✅ No necesita navegar por menús
- ✅ Pedidos más rápidos y precisos
- ✅ Sugerencias personalizadas en tiempo real
- ✅ Todo integrado en una sola interfaz

### Para el Negocio
- 📈 Mayor tasa de conversión
- 💰 Upselling automático inteligente
- 🎯 Recomendaciones personalizadas
- 📊 Datos sobre preferencias del cliente
- ⚡ Procesos de pedido más eficientes

## 🔄 Arquitectura

```
Cliente (ChatWidget)
    ↓
    📤 Envía mensaje
    ↓
API Chat (/api/chat)
    ↓
    🤖 Procesa con Gemini AI
    ↓
    🔍 Detecta productos [ADD_TO_CART:...]
    ↓
    🗃️ Busca en Supabase
    ↓
    📦 Retorna {mensaje, cartActions}
    ↓
Cliente (ChatWidget)
    ↓
    ➕ Agrega al carrito (Zustand)
    ↓
    🔔 Muestra notificaciones
    ↓
    🛒 Abre carrito automáticamente
```

## 📂 Archivos Modificados

### Nuevos
- `app/api/products/search/route.ts` - Búsqueda de productos

### Modificados
- `app/api/chat/route.ts` - Lógica de parseo y carrito
- `components/chat/ChatWidget.tsx` - Integración con carrito
- `components/cart/CartWidget.tsx` - Listener para abrir carrito

## 🧪 Testing

Para probar la integración:

1. Inicia el servidor: `npm run dev`
2. Abre el chat (botón flotante inferior derecho)
3. Conversa con María:
   - "Quiero una hamburguesa clásica"
   - "Dame un combo deluxe"
   - "Agrégame papas grandes"
4. Observa cómo se agregan automáticamente al carrito
5. Revisa el carrito que se abre solo

## 🐛 Debugging

Si algo no funciona:

1. Abre la consola del navegador (F12)
2. Busca logs con emoji 🛒 (acciones del carrito)
3. Verifica que los productos existen en la BD
4. Confirma que los nombres coincidan exactamente
5. Revisa los logs del servidor

## 🔐 Seguridad

- ✅ Los productos se validan en el servidor
- ✅ Solo se pueden agregar productos existentes
- ✅ Las cantidades se validan
- ✅ No se puede manipular precios desde el cliente

## 🎨 Personalización

Para agregar más productos al sistema:

1. Agrégalos a la base de datos (Supabase)
2. Actualiza la lista en el prompt de María (route.ts línea ~75)
3. Los nombres deben coincidir EXACTAMENTE

## 📊 Métricas

El sistema registra:
- Todos los mensajes en la tabla `chat_messages`
- Productos agregados desde el chat
- Preferencias del usuario
- Historial completo de conversación

---

**Versión**: 1.0
**Última actualización**: Febrero 2026
**Desarrollado con**: Next.js 14, Gemini AI, Supabase, Zustand
