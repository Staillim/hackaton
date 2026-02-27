# 🔧 SOLUCIÓN RÁPIDA - API Key de Gemini Bloqueada

## ⚠️ Problema Actual
Tu API key de Gemini está bloqueada por Google. El chat NO funcionará hasta que generes una nueva.

---

## ✅ Solución (5 minutos)

### Paso 1: Genera Nueva API Key
1. **Ve a:** https://aistudio.google.com/app/apikey
2. **Haz clic en:** "Create API Key" o "Get API key"
3. **Selecciona:** Tu proyecto de Google Cloud (o crea uno nuevo)
4. **Copia** la nueva API key completa (empieza con `AIza...`)

### Paso 2: Actualiza .env.local
1. **Abre el archivo:** `.env.local` (en la raíz del proyecto)
2. **Encuentra la línea 20:**
   ```bash
   GEMINI_API_KEY=AIzaSyCpNRc8rhERj4wzulvzh7ArvTHXlYLl8xw
   ```
3. **Reemplázala con tu nueva API key:**
   ```bash
   GEMINI_API_KEY=AIza_TU_NUEVA_API_KEY_AQUI
   ```
4. **Guarda el archivo** (Ctrl+S)

### Paso 3: Prueba la API Key
Ejecuta este comando en PowerShell:
```powershell
$apiKey = "TU_NUEVA_API_KEY"; $body = @{ contents = @(@{ parts = @(@{ text = "Di funciona" }) }) } | ConvertTo-Json -Depth 10; $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey" -Method Post -Body $body -ContentType "application/json"; Write-Host "✅ API funciona: $($response.candidates[0].content.parts[0].text)" -ForegroundColor Green
```

Deberías ver: **✅ API funciona: funciona**

### Paso 4: Inicia el Servidor
```powershell
npm run dev
```

Abre: **http://localhost:3000**

---

## 🧪 Prueba el Chat Completo

### Escenario 1: Orden Simple
```
Tú: Hola María
María: [saludo]

Tú: Quiero una hamburguesa clásica sin cebolla
María: [agrega al carrito + sugiere bebida]

Tú: Sí, dame una coca-cola
María: [agrega coca-cola]

Tú: Confirma mi orden
María: ✅ ¡Orden #ORD-XXX confirmada y enviada a cocina!
```

**Resultado esperado:**
- ✅ Orden creada en Supabase
- ✅ NO se abre el carrito automáticamente
- ✅ Toast de confirmación visible

### Escenario 2: Verificar en Cocina
1. **Login con usuario cocina**
2. **Ve a:** http://localhost:3000/cocina
3. **Verás la orden con:**
   - ✅ Nombre del producto (no solo ID)
   - ✅ Customizaciones formateadas:
     - ➖ Sin: cebolla
     - ➕ Extra: (si hay)
     - 📝 Nota: (si hay)

---

## ✅ Cambios Implementados

### 1. **Carrito NO se abre automáticamente**
- Antes: Se abría después de confirmar orden
- Ahora: El usuario decide cuándo abrir el carrito

### 2. **Panel de Cocina Mejorado**
- Antes: Mostraba `product_id` y JSON crudo
- Ahora:
  - ✅ Nombre del producto
  - ✅ Customizaciones formateadas
  - ✅ Visual mejorado con iconos (➖➕📝)

### 3. **Visualización de Customizaciones**
```
1x Hamburguesa Clásica
  ➖ Sin: cebolla, tomate
  ➕ Extra: queso, salsa BBQ
  📝 Nota: Bien cocida
```

---

## 📋 Archivos Modificados

1. **components/chat/ChatWidget.tsx**
   - Eliminado: Auto-open del carrito (líneas 107-111)
   - Toast mejorado: "enviada a cocina"

2. **app/cocina/page.tsx**
   - Mejorado: Visualización de items con nombres
   - Agregado: Formato detallado de customizaciones
   - Mejorado: UI con tarjetas y bordes

3. **test-gemini.ps1** (NUEVO)
   - Script de prueba para API key

---

## 🚨 Si Algo Falla

### Chat no responde:
1. Verifica que la API key esté actualizada en `.env.local`
2. Reinicia el servidor: `npm run dev`
3. Abre consola del navegador (F12) y busca errores

### Cocina no muestra productos:
1. Verifica que la base de datos tenga productos
2. Revisa que las órdenes tengan `order_items` con `product_id` válido
3. Asegúrate de estar logueado con rol `cocina` o `admin`

### Customizaciones no aparecen:
1. Verifica que la orden se creó con `customizations` en `order_items`
2. Revisa la estructura en Supabase: `order_items.customizations` debe ser JSONB

---

## 📞 Checklist Final

- [ ] Nueva API key generada
- [ ] `.env.local` actualizado
- [ ] API key probada con script
- [ ] Servidor iniciado: `npm run dev`
- [ ] Chat funciona correctamente
- [ ] Orden se crea sin abrir carrito
- [ ] Panel cocina muestra nombres de productos
- [ ] Customizaciones visibles en cocina
- [ ] Iconos ➖➕📝 aparecen correctamente

---

**¡Listo! Ahora tu flujo pedido→cocina está completo con todas las customizaciones visibles.** 🎉
