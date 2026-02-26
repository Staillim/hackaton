# 🚀 Guía de Configuración - SmartBurger

Esta guía te ayudará a configurar y ejecutar el proyecto SmartBurger en tu máquina local.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **npm** o **yarn**
- Una cuenta en **Supabase** (gratuita)
- Una API Key de **Google Gemini** (para el chat inteligente)

## 🔧 Paso 1: Instalar Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

O si usas yarn:

```bash
yarn install
```

Esto instalará todas las dependencias necesarias definidas en `package.json`.

## 🗄️ Paso 2: Configurar Supabase

### 2.1 Crear un Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en "New Project"
4. Completa los detalles:
   - **Name**: SmartBurger
   - **Database Password**: Guarda esta contraseña en un lugar seguro
   - **Region**: Elige la más cercana a tu ubicación
5. Espera a que el proyecto se cree (toma unos 2 minutos)

### 2.2 Ejecutar el Esquema de Base de Datos

1. En tu proyecto de Supabase, ve a **SQL Editor** en el menú lateral
2. Haz clic en **New Query**
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia todo el contenido y pégalo en el editor SQL de Supabase
5. Haz clic en **Run** para ejecutar el script
6. Repite el proceso con `supabase/seed.sql` para cargar datos de ejemplo

### 2.3 Obtener las Credenciales

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Encontrarás:
   - **Project URL**: Tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: Tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: Tu `SUPABASE_SERVICE_ROLE_KEY` (mantén esta privada)

## 🤖 Paso 3: Configurar OpenAI

1. Ve a [platform.openai.com](https://platform.openai.com)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys** en tu perfil
4. Haz clic en **Create new secret key**
5. Copia la clave (solo se mostrará una vez)
6. Esta será tu `OPENAI_API_KEY`

**Nota**: Necesitarás tener créditos en tu cuenta de OpenAI para usar el chat. 
La primera vez recibes créditos gratuitos de prueba.

## 🔐 Paso 4: Configurar Variables de Entorno

1. En la raíz del proyecto, copia el archivo de ejemplo:

```bash
cp .env.local.example .env.local
```

2. Abre `.env.local` y completa con tus credenciales:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Google Gemini API
GEMINI_API_KEY=tu_gemini_key_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**: Nunca subas el archivo `.env.local` a Git. Ya está incluido en `.gitignore`.

## ▶️ Paso 5: Ejecutar el Proyecto

Inicia el servidor de desarrollo:

```bash
npm run dev
```

O con yarn:

```bash
yarn dev
```

El proyecto estará disponible en: **http://localhost:3000**

## 🎯 Verificar que Todo Funciona

### Landing Page
- Abre http://localhost:3000
- Deberías ver el Hero con la imagen de hamburguesa
- La sección de productos debería cargar los productos de la base de datos

### Chat Inteligente
- Haz clic en el botón flotante de chat (esquina inferior derecha)
- Escribe un mensaje como "Quiero una hamburguesa"
- El asistente IA debería responder con recomendaciones

### Panel Administrativo
- Ve a http://localhost:3000/admin
- Deberías ver el dashboard con estadísticas
- Las alertas de inventario se mostrarán si hay stock bajo

## 🐛 Solución de Problemas Comunes

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env.local` existe
- Asegúrate de que las variables están correctamente escritas
- Reinicia el servidor de desarrollo

### Error en el Chat: "API key not configured"
- Verifica que `GEMINI_API_KEY` está en `.env.local`
- Asegúrate de que la key es válida
- Verifica en Google AI Studio que la API key está activa

### Productos no se cargan
- Verifica que ejecutaste ambos scripts SQL (schema.sql y seed.sql)
- Revisa la consola del navegador para errores
- Verifica las credenciales de Supabase

### Error de CORS
- Asegúrate de estar usando `http://localhost:3000` (no otra URL)
- En Supabase, ve a Authentication → URL Configuration
- Agrega `http://localhost:3000` a las Site URLs permitidas

## 📦 Estructura del Proyecto

```
smartburger/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing Page
│   ├── admin/             # Panel administrativo
│   │   └── page.tsx       # Dashboard del admin
│   ├── api/               # API Routes
│   │   ├── chat/          # Endpoint del chat IA
│   │   ├── orders/        # Gestión de pedidos
│   │   └── recommendations/ # Sistema de recomendaciones
│   ├── layout.tsx         # Layout principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── landing/          # Componentes del landing
│   │   ├── Hero.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductsSection.tsx
│   │   └── ReviewsSection.tsx
│   ├── chat/             # Chat inteligente
│   │   └── ChatWidget.tsx
│   ├── cart/             # Carrito de compras
│   │   └── CartWidget.tsx
│   └── admin/            # Componentes del admin
├── lib/                  # Utilidades
│   ├── supabase.ts       # Cliente y funciones de Supabase
│   └── store.ts          # Estado global con Zustand
├── types/                # TypeScript types
│   └── index.ts
├── supabase/             # Scripts de base de datos
│   ├── schema.sql        # Esquema de tablas
│   └── seed.sql          # Datos de ejemplo
└── public/               # Archivos estáticos
```

## 🚀 Próximos Pasos

Una vez que todo funciona:

1. **Personaliza el menú**: Edita productos en Supabase o crea una interfaz de administración
2. **Configura pagos**: Integra Stripe o MercadoPago
3. **Deploy**: Sube el proyecto a Vercel o Netlify
4. **Dominio personalizado**: Configura tu propio dominio

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Google AI](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💡 Consejos

- **Desarrollo**: Gemini tiene un plan gratuito generoso. No hay costo por uso durante desarrollo.
- **Producción**: Implementa autenticación para el panel admin antes de deployar.
- **Performance**: Las imágenes de productos deberían subirse a Supabase Storage en producción.

## 🆘 ¿Necesitas Ayuda?

Si encuentras algún problema:

1. Revisa esta guía nuevamente
2. Verifica la consola del navegador y la terminal
3. Asegúrate de que todas las dependencias están instaladas
4. Verifica que las variables de entorno están correctas

---

¡Disfruta construyendo tu sistema inteligente de restaurante! 🍔🤖
