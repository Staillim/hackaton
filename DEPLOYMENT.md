# 🚀 Guía de Deployment - SmartBurger

Esta guía te ayudará a deployar SmartBurger a producción.

---

## 📋 Pre-requisitos

Antes de deployar, asegúrate de tener:

- ✅ Proyecto funcionando localmente
- ✅ Cuenta en Vercel (gratuita)
- ✅ Proyecto de Supabase configurado
- ✅ API Key de OpenAI activa
- ✅ Código en un repositorio Git (GitHub, GitLab, etc.)

---

## 🎯 Opción 1: Deploy a Vercel (Recomendado)

Vercel es la plataforma creada por el equipo de Next.js y ofrece la mejor integración.

### Paso 1: Preparar el Repositorio

```bash
# Si aún no tienes Git inicializado
git init
git add .
git commit -m "Initial commit - SmartBurger"

# Crear repositorio en GitHub y pushearlo
git remote add origin <tu-repo-url>
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en **"Add New..."** → **"Project"**
4. Importa tu repositorio de SmartBurger
5. Vercel detectará automáticamente que es un proyecto Next.js

### Paso 3: Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# OpenAI
OPENAI_API_KEY=sk-tu_key_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

### Paso 4: Deploy

1. Haz clic en **"Deploy"**
2. Vercel construirá y desplegará tu proyecto (2-3 minutos)
3. Recibirás una URL (e.g., `smartburger.vercel.app`)

### Paso 5: Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS
4. Espera propagación DNS (5-60 minutos)

---

## 🗄️ Configurar Base de Datos en Producción

### Actualizar URLs Permitidas en Supabase

1. Ve a tu proyecto en Supabase
2. Navega a **Authentication** → **URL Configuration**
3. Agrega tu URL de producción a **Site URL**:
   ```
   https://tu-dominio.vercel.app
   ```
4. Agrega también a **Redirect URLs**

### Verificar Conexión

```bash
# Desde tu URL de producción, abre la consola del navegador
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

---

## 🎯 Opción 2: Deploy a Netlify

### Paso 1: Preparar el Proyecto

Netlify también soporta Next.js, pero necesita configuración adicional.

1. Ve a [netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configura build settings:
   ```
   Build command: npm run build
   Publish directory: .next
   ```

### Paso 2: Variables de Entorno

Agrega las mismas variables que en Vercel en:
**Site settings** → **Environment variables**

### Paso 3: Deploy

Haz clic en **Deploy site**

---

## 🎯 Opción 3: Deploy a Railway

Railway es excelente si necesitas más control sobre el servidor.

### Paso 1: Crear Proyecto

1. Ve a [railway.app](https://railway.app)
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Elige tu repositorio

### Paso 2: Configurar

Railway detectará Next.js automáticamente.

Agrega variables de entorno en la sección **Variables**

### Paso 3: Deploy

El deploy inicia automáticamente. Railway te dará una URL pública.

---

## 🔧 Optimizaciones Pre-Deploy

### 1. Optimizar Imágenes

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['images.unsplash.com', 'tu-supabase-storage.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

### 2. Configurar Headers de Seguridad

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}
```

### 3. Habilitar Analytics

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 📊 Monitoreo Post-Deploy

### 1. Configurar Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'tu-sentry-dsn',
  tracesSampleRate: 1.0,
});
```

### 2. Configurar Google Analytics

```typescript
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-TU-ID`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TU-ID');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Configurar Uptime Monitoring

Servicios gratuitos:
- [UptimeRobot](https://uptimerobot.com)
- [StatusCake](https://www.statuscake.com)
- [Pingdom](https://www.pingdom.com)

---

## 🔐 Seguridad en Producción

### 1. Proteger Rutas de Admin

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Implementar autenticación
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

### 2. Rate Limiting

```typescript
// lib/rate-limit.ts
const rateLimits = new Map<string, number[]>();

export function rateLimit(ip: string, limit = 10, window = 60000) {
  const now = Date.now();
  const timestamps = rateLimits.get(ip) || [];
  
  const recent = timestamps.filter(time => now - time < window);
  
  if (recent.length >= limit) {
    return false;
  }
  
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}
```

### 3. CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://tu-dominio.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
}
```

---

## 📈 Performance Optimization

### 1. Configurar CDN

Vercel incluye CDN global automáticamente.

### 2. Habilitar ISR (Incremental Static Regeneration)

```typescript
// app/page.tsx
export const revalidate = 60; // Revalidar cada 60 segundos

export default async function Page() {
  const products = await getProducts();
  return <ProductsSection products={products} />;
}
```

### 3. Lazy Loading

```typescript
// Importar componentes pesados con lazy loading
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), {
  loading: () => <p>Cargando chat...</p>,
  ssr: false,
});
```

---

## 🧪 Testing en Producción

### Checklist de Verificación

- [ ] Landing page carga correctamente
- [ ] Imágenes se muestran
- [ ] Productos se cargan desde Supabase
- [ ] Chat responde (verifica créditos OpenAI)
- [ ] Carrito funciona
- [ ] Panel admin es accesible
- [ ] Formularios funcionan
- [ ] Responsive en móvil
- [ ] Performance > 90 en Lighthouse
- [ ] No hay errores en consola

### Herramientas de Testing

```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=https://tu-dominio.vercel.app

# Test de carga
npm install -g artillery
artillery quick --count 10 --num 100 https://tu-dominio.vercel.app
```

---

## 🔄 CI/CD (Opcional)

### GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📊 Monitoreo de Costos

### Estimación Mensual

**Free Tier (Desarrollo)**
- Vercel: Gratis
- Supabase: Gratis (hasta 500MB + 2GB bandwidth)
- OpenAI: $5 crédito inicial

**Producción Pequeña** (< 10k usuarios/mes)
- Vercel Pro: $20/mes
- Supabase Pro: $25/mes
- OpenAI: ~$20-50/mes
- **Total**: ~$65-95/mes

**Producción Mediana** (10k-100k usuarios/mes)
- Vercel Team: $100/mes
- Supabase Pro: $25-50/mes
- OpenAI: $100-200/mes
- CDN/Storage: $20-50/mes
- **Total**: ~$245-400/mes

---

## 🆘 Troubleshooting Común

### Error: "Module not found"
```bash
# Limpiar cache y reinstalar
rm -rf .next node_modules
npm install
npm run build
```

### Error: "OpenAI API key not configured"
- Verifica que la variable esté en Vercel
- No uses `NEXT_PUBLIC_` para keys privadas
- Redeploya después de agregar variables

### Error: Database connection
- Verifica URLs en Supabase settings
- Agrega tu dominio a allowed origins
- Verifica RLS policies

### Error: Images not loading
- Agrega dominios a `next.config.js`
- Usa Next.js Image component
- Verifica CORS

---

## ✅ Post-Deploy Checklist

### Inmediato
- [ ] URL funciona
- [ ] SSL activo (HTTPS)
- [ ] Variables de entorno configuradas
- [ ] Base de datos conectada
- [ ] Chat IA responde

### Primera Semana
- [ ] Monitoreo configurado
- [ ] Analytics activo
- [ ] Backups de DB configurados
- [ ] Dominio personalizado
- [ ] SEO básico

### Primer Mes
- [ ] Performance optimizado
- [ ] Security audit
- [ ] User testing
- [ ] Marketing materials
- [ ] Documentation actualizada

---

## 📚 Recursos Adicionales

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Production](https://supabase.com/docs/guides/platform)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

---

## 🎉 ¡Felicidades!

Tu aplicación SmartBurger está ahora en producción 🚀

**Siguiente paso**: Comparte tu proyecto y obtén feedback de usuarios reales.

---

<div align="center">

**SmartBurger** en producción 🍔

*De desarrollo a producción en minutos*

</div>
