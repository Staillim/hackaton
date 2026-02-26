# 🤖 Sistema de Chat Conversacional Inteligente

## Descripción General

SmartBurger utiliza un sistema de chat avanzado con **Google Gemini Pro** que simula una conversación real con María, una asesora de ventas experta. El sistema mantiene contexto completo, aprende preferencias y toma pedidos de forma natural.

---

## 🌟 Características Principales

### 1. **Conversación Natural con Memoria**
- **Historial Completo**: Cada mensaje se guarda y el asistente recuerda TODO lo conversado
- **Contexto Persistente**: Las conversaciones se guardan en la base de datos por sesión
- **Personalidad Definida**: María tiene una personalidad cálida, amigable y profesional

### 2. **Aprendizaje de Preferencias**
- Detecta y recuerda gustos del cliente (picante, vegetariano, etc.)
- Identifica alergias mencionadas
- Guarda preferencias para futuras conversaciones
- Hace recomendaciones basadas en lo aprendido

### 3. **Toma de Pedidos Inteligente**
- Confirma cada detalle antes de procesar
- Calcula precios en tiempo real
- Sugiere complementos relevantes (upselling natural)
- Resume el pedido completo antes de confirmar

### 4. **Recomendaciones Personalizadas**
- Muestra los productos más vendidos en tiempo real
- Sugiere combos para ahorrar dinero
- Recomienda basándose en preferencias del cliente
- Adapta sugerencias según el contexto

---

## 🏗️ Arquitectura del Sistema

### Componentes

```
┌─────────────────────────────────────────────────┐
│          ChatWidget (Frontend)                   │
│  - Mantiene historial en sessionStorage         │
│  - Genera sessionId único por usuario           │
│  - UI conversacional mejorada                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│       API Route: /api/chat (Backend)            │
│  - Recibe historial completo                    │
│  - Obtiene preferencias del usuario             │
│  - Obtiene productos más vendidos               │
│  - Construye prompt con contexto                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Google Gemini Pro                       │
│  - Procesa conversación completa                │
│  - Genera respuestas naturales                  │
│  - Mantiene personalidad consistente            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│       Supabase Database                         │
│  - Guarda cada mensaje (chat_conversations)     │
│  - Almacena preferencias (analytics)            │
│  - Rastrea productos más vendidos               │
└─────────────────────────────────────────────────┘
```

---

## 💾 Estructura de Datos

### Session ID
```typescript
// Generado automáticamente y guardado en sessionStorage
const sessionId = `session_${timestamp}_${random}`;
```

### Mensaje de Chat
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

### Preferencias del Usuario
```typescript
interface UserPreferences {
  likes: string[];       // "picante", "queso", etc.
  dislikes: string[];    // "cebolla", etc.
  allergies: string[];   // "gluten", "lactosa", etc.
  notes: string;         // Notas adicionales
}
```

---

## 🎯 System Prompt Dinámico

El prompt del sistema se construye dinámicamente con:

1. **Personalidad Base**: María, asesora de ventas experta
2. **Menú Completo**: Con precios, descripciones y recomendaciones
3. **Productos Más Vendidos**: Top 3 en tiempo real
4. **Preferencias del Usuario**: Si existen en la BD
5. **Instrucciones Conversacionales**: Cómo mantener contexto y tomar pedidos

### Ejemplo de Construcción

```typescript
const systemPrompt = `
Eres María, una asesora de ventas...

MENÚ COMPLETO:
[Menú con precios...]

⭐ LOS MÁS VENDIDOS HOY:
1. SmartBurger Clásica - 45 pedidos
2. Doble Queso Deluxe - 38 pedidos
3. Combo SmartBurger - 32 pedidos

PREFERENCIAS DEL CLIENTE:
- Le gusta: Picante, queso
- No le gusta: Cebolla
- Alergias: Ninguna

INSTRUCCIONES:
[Cómo mantener conversación natural...]
`;
```

---

## 🔄 Flujo de Conversación

### 1. **Inicio de Sesión**
```javascript
// Se genera sessionId único
const sessionId = getSessionId();

// Se carga historial previo (si existe)
const history = loadChatHistory();

// Si no hay historial, mensaje de bienvenida
if (history.length === 0) {
  welcomeMessage = "¡Hola! Soy María...";
}
```

### 2. **Envío de Mensaje**
```javascript
// Usuario escribe mensaje
const userMessage = { role: 'user', content: input };

// Se agrega al historial local
messages.push(userMessage);

// Se guarda en sessionStorage
saveChatHistory(messages);

// Se envía a la API con todo el historial
fetch('/api/chat', {
  body: JSON.stringify({
    messages: messages,  // Historial completo
    sessionId: sessionId
  })
});
```

### 3. **Procesamiento en Backend**
```javascript
// Obtener contexto
const bestSellers = await getBestSellingProducts(3);
const preferences = await getUserPreferences(sessionId);

// Construir prompt con contexto
const systemPrompt = getEnhancedSystemPrompt(sessionId);

// Construir historial para Gemini
const conversationHistory = messages
  .map(msg => `${msg.role}: ${msg.content}`)
  .join('\n\n');

// Generar respuesta
const response = await gemini.generateContent(fullPrompt);

// Guardar en BD (async, no bloquea respuesta)
saveChatMessage(sessionId, 'user', userMessage);
saveChatMessage(sessionId, 'assistant', response);
```

### 4. **Actualización de UI**
```javascript
// Respuesta llega al frontend
const assistantMessage = {
  role: 'assistant',
  content: response.message
};

// Se agrega al historial
messages.push(assistantMessage);

// Se guarda localmente
saveChatHistory(messages);

// Se actualiza UI
setMessages(messages);
```

---

## 📊 Ejemplos de Interacción

### Ejemplo 1: Primera Conversación

**Usuario**: "Hola, quiero una hamburguesa"

**María**: "¡Hola! Soy María, tu asesora en SmartBurger 😊 ¿Es tu primera vez con nosotros? Cuéntame, ¿qué tipo de hamburguesa te gusta? ¿Te va más la carne de res, pollo, o prefieres algo vegetariano?"

**Usuario**: "Me gusta la carne y el queso"

**María**: "¡Perfecto! Entonces te va a encantar nuestra **Doble Queso Deluxe** 🍔 Es nuestra hamburguesa más popular hoy. Lleva doble carne jugosa, doble queso cheddar derretido y bacon crujiente con salsa BBQ por $8.99.

También tengo la **SmartBurger Clásica** por $5.99 si quieres algo más ligero pero igual de deliciosa.

¿Cuál te llama más la atención? Y te puedo ofrecer un combo con papas y bebida para que ahorres $1 😉"

### Ejemplo 2: Recordar Preferencias

**Usuario**: "¿Qué me recomiendas?"

**María**: "Como sé que te encanta el queso y el picante, te recomendaría la **Doble Queso Deluxe** con jalapeños extra (+$0.25). Sería $9.24 y te va a volar la cabeza 🔥

¿Le entramos? También puedo agregarte papas y una bebida en combo por solo $2 más"

### Ejemplo 3: Toma de Pedido Completo

**Usuario**: "Sí, dame ese combo con jalapeños"

**María**: "¡Perfecto! 🎉 Déjame confirmar tu pedido:

📝 **Tu Pedido:**

1. **Combo Deluxe Personalizado** - $14.99
   - Doble Queso Deluxe
   - Jalapeños extra (+$0.25)
   - Papas grandes
   - Bebida grande

💰 **Total: $15.24**

¿Qué bebida prefieres? Tenemos Coca-Cola, Sprite o Fanta.

Y una pregunta más: ¿para comer aquí o para llevar? 🚀"

---

## 🎨 Personalización de UI

### Header del Chat
- Avatar personalizado con ícono de estrella
- Estado "En línea" con indicador pulsante
- Nombre "María - Asesora de Ventas"
- Botón para limpiar conversación

### Mensajes
- Mensajes del usuario: Fondo azul, alineados a la derecha
- Mensajes de María: Fondo oscuro con borde, avatar visible, nombre arriba
- Timestamp en cada mensaje
- Indicador "María está escribiendo..." durante carga

### Acciones Rápidas
- Se muestran solo al inicio
- 4 opciones predefinidas
- Se ocultan después de usar

### Input
- Placeholder personalizado: "Escribe tu mensaje a María..."
- Indicación de presionar Enter
- Botón de envío con gradiente
- Deshabilitado durante carga

---

## 🔧 Configuración Técnica

### Variables de Entorno
```env
GEMINI_API_KEY=tu_api_key
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

### Parámetros de Gemini
```javascript
generationConfig: {
  temperature: 0.9,      // Alto para respuestas naturales
  maxOutputTokens: 800,  // Respuestas detalladas
  topP: 0.95,
  topK: 40,
}
```

---

## 📈 Métricas y Analytics

El sistema rastrea automáticamente:

1. **Conversaciones**
   - Cada mensaje se guarda en `chat_conversations`
   - Asociado a sessionId único
   - Timestamp preciso

2. **Preferencias**
   - Se guardan en tabla `analytics`
   - Tipo: 'user_preference'
   - Actualizables en cada conversación

3. **Productos Más Vendidos**
   - Calculados desde `order_items`
   - Actualizados en tiempo real
   - Top 3 mostrados en el prompt

---

## 🚀 Próximas Mejoras

### Fase 2
- [ ] Integración directa con carrito de compras
- [ ] Confirmación de pedidos desde el chat
- [ ] Notificaciones push cuando María responde
- [ ] Análisis de sentimiento en tiempo real

### Fase 3
- [ ] Múltiples idiomas
- [ ] Reconocimiento de voz
- [ ] Imágenes de productos en el chat
- [ ] Recomendaciones ML basadas en historial

---

## 💡 Mejores Prácticas

### Para Desarrolladores

1. **Mantener el Contexto**
   - Siempre envía el historial completo
   - No truncar mensajes viejos prematuramente
   - Session ID único y persistente

2. **Optimizar Prompts**
   - Mantener system prompt actualizado
   - Incluir ejemplos de buenas conversaciones
   - Balancear detalles vs. tokens

3. **Manejo de Errores**
   - Fallback amigable si Gemini falla
   - No perder mensajes del usuario en errores
   - Reintentar automáticamente (max 3 veces)

### Para el Negocio

1. **Entrenamiento Continuo**
   - Revisar conversaciones semanalmente
   - Identificar patrones de confusión
   - Actualizar prompt según feedback

2. **Monitoreo**
   - Tasa de conversión de chat → pedidos
   - Tiempo promedio de conversación
   - Satisfacción del cliente (encuestas)

---

## 🆘 Troubleshooting

### Chat no responde
- Verificar GEMINI_API_KEY en .env.local
- Revisar consola del navegador
- Verificar que sessionId se genera correctamente

### Historial no se guarda
- Verificar conexión a Supabase
- Revisar permisos de tabla chat_conversations
- Comprobar que sessionStorage funciona

### Respuestas genéricas
- Verificar que todo el historial se envía
- Revisar que sessionId es consistente
- Aumentar maxOutputTokens si respuestas muy cortas

---

## 📚 Referencias

- [Google Gemini API](https://ai.google.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Hecho con ❤️ por el equipo de SmartBurger**
