# 🎨 Sistema de Personalizaciones - SmartBurger

## 📋 Descripción General

El sistema de chat ahora detecta y procesa automáticamente personalizaciones en los pedidos. Los clientes pueden agregar extras, quitar ingredientes y dejar notas especiales, todo de forma natural en la conversación.

## ✨ Características

### 1. **Detección Automática**
María detecta automáticamente cuando dices:
- "sin cebolla"
- "sin cebolla ni tomate"
- "con bacon extra"
- "doble carne"
- "con aguacate"
- "bien cocida"
- etc.

### 2. **Agregar Extras** (+costo)
```
Ingredientes disponibles:
- doble carne (+$2.00)
- queso extra (+$0.50)
- bacon (+$1.50)
- aguacate (+$1.00)
- huevo frito (+$0.75)
- jalapeños (+$0.25)
```

### 3. **Quitar Ingredientes** (gratis)
```
Puedes quitar:
- cebolla
- tomate
- lechuga
- pepinillos
- mayonesa
- mostaza
- ketchup
```

### 4. **Notas Especiales**
Puedes agregar notas como:
- "bien cocida"
- "término medio"
- "extra crujiente"
- "sin sal"

## 🎯 Ejemplos de Uso

### Ejemplo 1: Quitar Ingredientes
```
Cliente: "quiero una hamburguesa sin cebolla"
María: "¡Perfecto! Agregué 1 SmartBurger Clásica SIN cebolla a tu carrito 🛒"
```

### Ejemplo 2: Múltiples Removales
```
Cliente: "dame una doble queso sin cebolla ni tomate"
María: "¡Entendido! Agregué 1 Doble Queso Deluxe sin cebolla ni tomate 🛒"
```

### Ejemplo 3: Agregar Extras
```
Cliente: "una hamburguesa con bacon extra"
María: "¡Delicioso! Agregué SmartBurger Clásica con bacon extra 🥓
Precio: $5.99 + $1.50 (bacon) = $7.49 🛒"
```

### Ejemplo 4: Combinado (extras + quitar)
```
Cliente: "quiero una clásica con doble carne y sin pepinillos"
María: "¡Excelente! Agregué a tu carrito:
- SmartBurger Clásica
- Con doble carne 🍖
- Sin pepinillos
Total: $7.99 🛒"
```

### Ejemplo 5: Con Notas
```
Cliente: "una hamburguesa bien cocida sin mostaza"
María: "¡Anotado! Agregué:
- SmartBurger Clásica
- Sin mostaza
- Bien cocida (le diré al chef)
$5.99 🛒"
```

### Ejemplo 6: Múltiples Hamburguesas con Diferentes Personalizaciones
```
Cliente: "quiero 2 hamburguesas, una sin cebolla y otra con aguacate"
María: "¡Perfecto! Agregué:
1. SmartBurger Clásica sin cebolla - $5.99
2. SmartBurger Clásica con aguacate 🥑 - $6.99
Total: $12.98 🛒"
```

## 🔧 Cómo Funciona (Técnico)

### Formato Interno
María usa marcadores invisibles para comunicarse con el sistema:
```
[ADD_TO_CART:ProductName:Quantity:Additions:Removals:Notes]
```

**Ejemplo:**
```
[ADD_TO_CART:SmartBurger Clásica:1:bacon:cebolla,tomate:bien cocida]
```

Esto significa:
- Producto: SmartBurger Clásica
- Cantidad: 1
- Agregar: bacon
- Quitar: cebolla, tomate
- Nota: bien cocida

### Flujo del Sistema

```
Cliente envía mensaje
    ↓
María (Gemini AI) analiza el texto
    ↓
Detecta producto + personalizaciones
    ↓
Genera marcador [ADD_TO_CART:...]
    ↓
Backend parsea el marcador
    ↓
Busca producto en base de datos
    ↓
Estructura objeto con personalizaciones
    ↓
Envía al frontend
    ↓
ChatWidget agrega al carrito con customizations
    ↓
CartWidget muestra producto con personalizaciones
```

## 📂 Archivos Modificados

### Backend
- `app/api/chat/route.ts`
  * Nueva función `parseCartActions()` con soporte para personalizaciones
  * Instrucciones actualizadas para María
  * Ejemplos con personalizaciones

### Frontend
- `components/chat/ChatWidget.tsx`
  * Procesa `customizations` del API
  * Pasa personalizaciones a `addItem()`
  * Notificaciones con detalles de personalizaciones

- `components/cart/CartWidget.tsx`
  * Muestra personalizaciones con iconos
  * Formato mejorado (➕ ➖ 📝)
  * Compatible con arrays de strings

### Store
- `lib/store.ts`
  * `addItem()` acepta parámetro `customizations`
  * Items con personalizaciones se guardan por separado
  * No se combinan items personalizados

## 💡 Reglas Importantes

### Para el Cliente:
1. ✅ Habla naturalmente: "sin X", "con Y", "doble Z"
2. ✅ Puedes pedir múltiples personalizaciones
3. ✅ María calculará el precio correcto automáticamente
4. ✅ Todo aparece en el carrito con los detalles

### Para María (IA):
1. ✅ SIEMPRE detectar personalizaciones mencionadas
2. ✅ Usar nombres exactos de ingredientes
3. ✅ Calcular precio incluyendo extras
4. ✅ Confirmar las personalizaciones al cliente
5. ❌ NO olvidar personalizaciones
6. ❌ NO preguntar si quieren agregarlo (hacerlo directamente)

## 🎨 Visualización en el Carrito

Los productos personalizados se muestran con:

```
╔════════════════════════════════════╗
║  SmartBurger Clásica              ║
║  $5.99 c/u                        ║
║  ────────────────────────────     ║
║  ➖ Sin: cebolla, tomate          ║
║  ➕ Extra: bacon, aguacate        ║
║  📝 Nota: bien cocida             ║
╚════════════════════════════════════╝
```

## 🧪 Cómo Probar

1. Inicia el servidor: `npm run dev`
2. Abre el chat
3. Prueba estos mensajes:
   - "quiero una hamburguesa sin cebolla"
   - "dame una con doble carne"
   - "una clásica sin tomate ni pepinillos"
   - "quiero una con bacon y sin mostaza"
   - "una hamburguesa bien cocida"

4. Verifica:
   - ✅ Se agregó al carrito
   - ✅ Muestra las personalizaciones
   - ✅ El precio refleja los extras
   - ✅ Las notificaciones mencionan las personalizaciones

## 🐛 Debugging

### En la consola del servidor:
```
🛒 Acciones de carrito detectadas: 1
🛒 Detalles de acciones: [
  {
    "product": "SmartBurger Clásica",
    "quantity": 1,
    "additions": ["bacon"],
    "removals": ["cebolla"],
    "notes": "bien cocida"
  }
]
✅ Producto encontrado: "SmartBurger Clásica" (ID: xxx)
  ➕ Adiciones: bacon
  ➖ Quitar: cebolla
  📝 Notas: bien cocida
```

### En la consola del navegador:
```
🛒 Procesando acciones del carrito: [...]
➕ Agregando al carrito: SmartBurger Clásica x1
🎨 Con personalizaciones: {...}
```

## 💰 Cálculo de Precios

El sistema calcula automáticamente:
```
Precio Base: $5.99
+ bacon (+$1.50)
+ aguacate (+$1.00)
─────────────────
Total: $8.49
```

❌ Quitar ingredientes NO afecta el precio (son gratis)
✅ Agregar extras SÍ incrementa el precio

## 🔮 Próximas Mejoras

Posibles expansiones futuras:
- [ ] Base de datos de ingredientes con precios dinámicos
- [ ] Personalización de tamaño (pequeño/mediano/grande)
- [ ] Opciones de cocción más detalladas
- [ ] Sugerencias de personalizaciones populares
- [ ] Guardar personalizaciones favoritas del usuario
- [ ] Límites de ingredientes extra

## 📊 Estructura de Datos

### CartItem con Personalizaciones
```typescript
{
  product: Product,
  quantity: number,
  customizations: {
    removed: string[],      // ["cebolla", "tomate"]
    added: string[],        // ["bacon", "aguacate"]
    notes: string           // "bien cocida"
  },
  totalPrice: number
}
```

## ✅ Checklist de Implementación

- [x] Parser de personalizaciones en API
- [x] Instrucciones actualizadas para María
- [x] Ejemplos de conversación con personalizaciones
- [x] ChatWidget procesa personalizaciones
- [x] Store acepta parámetro de personalizaciones
- [x] CartWidget muestra personalizaciones
- [x] Notificaciones incluyen detalles
- [x] Cálculo de precios con extras
- [x] Items personalizados no se combinan
- [x] Documentación completa

---

**Versión**: 1.0  
**Fecha**: Febrero 2026  
**Estado**: ✅ Completamente Funcional

---

<div align="center">

**SmartBurger** - Personaliza tu pedido a tu gusto 🍔🎨

*Tu hamburguesa, tus reglas*

</div>
