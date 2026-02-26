# 🚀 Inicio Rápido - SmartBurger

## ⚡ En 5 Minutos

### 1️⃣ Instalar Dependencias
```bash
npm install
```

### 2️⃣ Configurar Variables de Entorno
```bash
# Copia el archivo de ejemplo
cp .env.local.example .env.local

# Edita .env.local y agrega:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - OPENAI_API_KEY
```

### 3️⃣ Configurar Base de Datos

1. Crea proyecto en [supabase.com](https://supabase.com)
2. Ve a SQL Editor
3. Copia y ejecuta `supabase/schema.sql`
4. Copia y ejecuta `supabase/seed.sql`

### 4️⃣ Obtener API Keys

**Supabase:**
1. Ve a Settings → API
2. Copia Project URL y anon/public key

**OpenAI:**
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea API Key en tu perfil

### 5️⃣ Iniciar Aplicación
```bash
npm run dev
```

Abre: http://localhost:3000

---

## 📱 URLs Disponibles

- `/` - Landing page con menú
- `/admin` - Panel administrativo

---

## 🎯 Probar Funcionalidades

### Chat Inteligente
1. Click en botón flotante (abajo derecha)
2. Escribe: "Quiero una hamburguesa sin cebolla"
3. El asistente responderá con recomendaciones

### Agregar al Carrito
1. Busca productos en la landing
2. Click en "Agregar" en cualquier producto
3. Click en carrito (arriba derecha) para ver items

### Panel Admin
1. Ve a `/admin`
2. Verás dashboard con métricas
3. Lista de pedidos y alertas

---

## ⚠️ Problemas Comunes

**"Module not found"**
```bash
rm -rf node_modules
npm install
```

**"Supabase connection error"**
- Verifica URLs en .env.local
- Asegúrate de ejecutar schema.sql

**"OpenAI not responding"**
- Verifica API key en .env.local
- Asegúrate de tener créditos

---

## 📚 Documentación Completa

- [SETUP.md](SETUP.md) - Guía detallada de instalación
- [README.md](README.md) - Overview del proyecto
- [API_DOCS.md](API_DOCS.md) - Documentación de APIs
- [FEATURES.md](FEATURES.md) - Lista de características
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de deploy a producción

---

## 💡 Tips

1. **Desarrollo sin OpenAI**: El chat tiene fallback automático
2. **Datos de prueba**: seed.sql incluye productos de ejemplo
3. **Hot reload**: Los cambios se aplican automáticamente
4. **Debug**: Revisa la consola del navegador para errores

---

## ✅ Checklist Inicial

- [ ] Node.js instalado
- [ ] Dependencias instaladas
- [ ] .env.local configurado
- [ ] Proyecto Supabase creado
- [ ] Schema SQL ejecutado
- [ ] Seed SQL ejecutado
- [ ] API Keys configuradas
- [ ] Servidor iniciado
- [ ] Landing page carga
- [ ] Chat responde

---

## 🆘 Ayuda

**Si algo no funciona:**

1. Verifica .env.local
2. Revisa la consola del navegador (F12)
3. Revisa la terminal donde corre npm run dev
4. Consulta SETUP.md para detalles
5. Revisa que Supabase tenga los datos

---

## 🎉 ¡Listo!

Tu aplicación SmartBurger está corriendo.

**Siguiente paso**: Personaliza productos en Supabase o modifica componentes en `components/`

---

Made with ❤️ and 🍔
