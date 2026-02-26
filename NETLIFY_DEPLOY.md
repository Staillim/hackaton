# 🚀 Despliegue en Netlify - SmartServe AI

## Error Actual
```
Error: Missing Supabase environment variables
```

## ✅ Solución: Configurar Variables de Entorno

### Paso 1: Accede a tu proyecto en Netlify
1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Selecciona tu sitio **5palos**
3. Ve a **Site settings** (Configuración del sitio)
4. En el menú lateral, haz clic en **Environment variables** (Variables de entorno)

### Paso 2: Agregar las Variables de Entorno Requeridas

Haz clic en **Add a variable** y agrega las siguientes variables **UNA POR UNA**:

#### 1. NEXT_PUBLIC_SUPABASE_URL
- **Key:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** Tu URL de Supabase (ejemplo: `https://tuproyecto.supabase.co`)
- Scope: **All**

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** Tu Anon Key de Supabase
- Scope: **All**

#### 3. SUPABASE_SERVICE_ROLE_KEY
- **Key:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Tu Service Role Key de Supabase (⚠️ SECRETO - NO compartir)
- Scope: **All**

#### 4. GEMINI_API_KEY
- **Key:** `GEMINI_API_KEY`
- **Value:** Tu API Key de Google Gemini
- Scope: **All**

#### 5. NEXT_PUBLIC_APP_URL (Opcional)
- **Key:** `NEXT_PUBLIC_APP_URL`
- **Value:** URL de tu sitio en Netlify (ejemplo: `https://5palos.netlify.app`)
- Scope: **All**

### Paso 3: Dónde Obtener las Credenciales

#### Supabase:
1. Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **Settings** → **API**
3. Ahí encontrarás:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (⚠️ secreto) → `SUPABASE_SERVICE_ROLE_KEY`

#### Google Gemini:
1. Ya tienes tu API Key: `AIzaSyCpNRc8rhERj4wzulvzh7ArvTHXlYLl8xw`
2. O genera una nueva en [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### Paso 4: Redesplegar
Después de agregar las variables:

**Opción A: Desde Netlify UI**
1. Ve a **Deploys** → **Trigger deploy** → **Deploy site**

**Opción B: Desde Git**
```bash
git add netlify.toml NETLIFY_DEPLOY.md
git commit -m "Add Netlify configuration"
git push
```

Netlify detectará el push y redesplegará automáticamente.

---

## 📋 Checklist de Configuración

- [ ] NEXT_PUBLIC_SUPABASE_URL agregada
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY agregada
- [ ] SUPABASE_SERVICE_ROLE_KEY agregada
- [ ] GEMINI_API_KEY agregada
- [ ] NEXT_PUBLIC_APP_URL agregada (opcional)
- [ ] Redespliegue triggered
- [ ] Sitio funcionando correctamente

---

## 🔧 Troubleshooting

### Si sigue fallando el build:
1. Verifica que todas las variables estén escritas **exactamente** como se indica (distinción de mayúsculas/minúsculas)
2. Asegúrate de que no haya espacios al inicio o final de los valores
3. Verifica que las credenciales de Supabase sean correctas
4. Revisa los logs de build en Netlify para ver errores específicos

### Si el build pasa pero el sitio no funciona:
1. Abre la consola del navegador (F12) y revisa errores
2. Verifica que la base de datos de Supabase tenga las tablas creadas
3. Asegúrate de que RLS (Row Level Security) esté configurado correctamente
4. Verifica que tu dominio de Netlify esté en la lista de orígenes permitidos en Supabase

---

## 🌐 URL de Producción

Después de configurar:
- Tu sitio estará disponible en: `https://5palos.netlify.app` (o tu dominio personalizado)
- Presentación: `https://5palos.netlify.app/presentacion`
- Panel de cocina: `https://5palos.netlify.app/cocina`
- Admin: `https://5palos.netlify.app/admin`

---

## 🔒 Seguridad Post-Deploy

1. **Actualiza las URL permitidas en Supabase:**
   - Ve a Supabase Dashboard → Authentication → URL Configuration
   - Agrega tu dominio de Netlify a **Site URL** y **Redirect URLs**

2. **Configura CORS en Supabase:**
   - Ve a Settings → API → CORS
   - Agrega tu dominio de Netlify

3. **Variables sensibles:**
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` está protegida (solo server-side)
   - ✅ Las variables con `NEXT_PUBLIC_` son públicas (visible en el cliente)
   - ⚠️ Nunca expongas Service Role Key en el frontend

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de build en Netlify
2. Verifica la configuración de Supabase
3. Asegúrate de que todas las variables estén configuradas
4. Revisa la documentación de Next.js con Netlify: https://docs.netlify.com/frameworks/next-js/
