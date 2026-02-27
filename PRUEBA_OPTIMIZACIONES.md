# 🚀 GUÍA RÁPIDA: Probar las Optimizaciones

## ✅ Paso 1: Verificar que el modo DEBUG está activo

En tu `.env.local`, asegúrate de tener:
```bash
ENABLE_FULL_CONTEXT=false
```

Si no tienes este archivo, créalo copiando de `.env.local.example`.

## 🔄 Paso 2: Reiniciar el servidor

```powershell
# Detener el servidor actual (Ctrl+C)
# Luego reiniciar:
npm run dev
```

## 📊 Paso 3: Observar los logs de costos

Abre la consola del servidor y busca líneas como estas:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 CHAT API - Nueva solicitud
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐛 DEBUG MODE: Usando prompt reducido (ahorra ~70% tokens)  ← DEBE APARECER
💰 Tokens estimados (input): 427  ← DEBE SER BAJO (~400-600)
📊 Modelo usado: gemini-2.0-flash
💵 Costo estimado esta request: $ 0.0006  ← DEBE SER BAJO
📈 TOTAL ACUMULADO:
   - Costo total: $ 0.09  ← MONITOREA ESTO
```

## ✅ Indicadores de que funciona correctamente:

### Modo DEBUG activado ✅
```
🐛 DEBUG MODE: Usando prompt reducido (ahorra ~70% tokens)
```

### Tokens bajos ✅
```
💰 Tokens estimados (input): 400-600  (antes: 2500-3000)
```

### Historial limitado ✅
Si tienes más de 10 mensajes en la conversación:
```
⚠️ Historial truncado: 25 → 10 mensajes (ahorro de ~1500 tokens)
```

### Costo bajo por mensaje ✅
```
💵 Costo estimado esta request: $ 0.0004 - 0.001  (antes: $0.010)
```

### Total acumulado razonable ✅
Después de 50 mensajes de prueba:
```
📈 TOTAL ACUMULADO:
   - Costo total: $ 0.50 - 2.00  (antes: $15-30)
```

## 🧪 Paso 4: Hacer pruebas

### Test 1: Conversación simple
```
Cliente: Hola
María: ¡Hola! ¿Qué te provoca hoy?

Cliente: Quiero una hamburguesa
María: ¡Perfecto! Tenemos...
```

**Observa:**
- Costo de cada mensaje debe ser ~$0.0005
- Debe aparecer "DEBUG MODE" en logs

### Test 2: Conversación larga (20+ mensajes)
Haz una conversación con más de 10 mensajes y verifica:

```
⚠️ Historial truncado: 15 → 10 mensajes
```

Esto confirma que NO está enviando TODO el historial.

### Test 3: Usuario registrado
Si tienes un usuario con email:
- Primera consulta: query a DB (más lento)
- Siguientes 5 minutos: desde cache (instantáneo)

## 📈 Comparación de Resultados

### ANTES (sin optimizaciones)
```
💰 Tokens estimados (input): 2847
💵 Costo estimado esta request: $ 0.0142
📈 Costo total (50 msgs): $ 0.71
```

### DESPUÉS (con optimizaciones)
```
💰 Tokens estimados (input): 427
💵 Costo estimado esta request: $ 0.0006
📈 Costo total (50 msgs): $ 0.03
```

**Ahorro: 95%** 🎉

## ⚠️ Si NO ves mejoras:

### 1. Verificar DEBUG MODE
Si ves esto:
```
🐛 Modo DEBUG: DESACTIVADO (contexto completo)
```

**Solución:**
```bash
# En .env.local
ENABLE_FULL_CONTEXT=false

# Reiniciar servidor
npm run dev
```

### 2. Verificar modelo usado
Si ves esto:
```
📊 Modelo usado: gemini-2.5-pro
```

Y quieres ahorrar MÁS, cambia la prioridad en `app/api/chat/route.ts` línea 290:
```typescript
const modelPriority = [
  'gemini-2.0-flash',    // ← ESTE PRIMERO (más barato)
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-pro-latest',
];
```

### 3. Cache no funciona
Si ves queries repetitivas, verifica que el servidor no se haya reiniciado.
El cache se limpia cada vez que reinicias `npm run dev`.

## 🎯 Meta de ahorro

### Testing (100 mensajes)
- **Objetivo:** < $0.10 USD
- **Con gemini-2.0-flash:** ~$0.04
- **Con gemini-2.5-pro:** ~$0.10

### Demo (20 mensajes, FULL context)
```bash
# .env.local
ENABLE_FULL_CONTEXT=true
```
- **Objetivo:** < $0.10 USD
- **Costo esperado:** ~$0.05-0.08

## ✅ Checklist final

- [ ] DEBUG MODE aparece en logs
- [ ] Tokens de entrada < 600
- [ ] Costo por mensaje < $0.001
- [ ] Historial se trunca a 10 mensajes
- [ ] Total de 50 mensajes < $0.50

## 🎉 ¡Todo listo!

Si todos los indicadores están ✅, tus optimizaciones están funcionando.

**Ahorro estimado:** De $33 a $2-3 por sesión de testing (90% menos) 💰

---

**Para el demo:**
1. Cambia `ENABLE_FULL_CONTEXT=true`
2. Reinicia servidor
3. Prueba 2-3 veces
4. Después vuelve a `false`
