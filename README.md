# 🍔 SmartBurger - Sistema Inteligente de Restaurante

<div align="center">

![SmartBurger](https://img.shields.io/badge/SmartBurger-Sistema%20Inteligente-red?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)

**Sistema autónomo de ventas para restaurante con IA integrada**

[Demo](#) • [Documentación](SETUP.md) • [API Docs](API_DOCS.md) • [Características](FEATURES.md)

</div>

---

## ✨ Características Principales

### 🎨 Landing Page Moderna
- Hero section con animaciones fluidas (Framer Motion)
- Sección de productos con filtros interactivos
- Sistema de reseñas y testimonios
- Diseño responsive optimizado para móviles

### 🤖 Chat Inteligente con IA
- Asistente conversacional powered by GPT-4
- Personalización de pedidos en lenguaje natural
- Recomendaciones inteligentes contextuales
- Cálculo automático de precios
- Sistema de upselling automático

### 🛒 Carrito de Compras
- Gestión de pedidos en tiempo real
- Personalización de productos
- Aplicación automática de promociones
- Cálculo de descuentos dinámico

### 📊 Panel Administrativo
- Dashboard con métricas en tiempo real
- Gestión de inventario con alertas automáticas
- Control de promociones y descuentos
- Visualización de pedidos activos
- Estadísticas de ventas

### 🗄️ Base de Datos Robusta
- PostgreSQL via Supabase
- 9 tablas optimizadas con relaciones
- Triggers y funciones automáticas
- Sistema de alertas de inventario
- Row Level Security (RLS)

### 💡 Sistema de Recomendaciones
- Upselling inteligente basado en el carrito
- Sugerencias de combos para ahorro
- Promociones por horario (Happy Hour)
- Alertas de umbral de descuento

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18 con TypeScript
- **Estilos**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Estado**: Zustand
- **Iconos**: Lucide React
- **Notificaciones**: React Hot Toast

### Backend
- **API**: Next.js API Routes
- **Base de Datos**: PostgreSQL (Supabase)
- **ORM**: Supabase Client
- **IA**: Google Gemini Pro

### DevOps
- **Deployment**: Vercel (recomendado)
- **Database Hosting**: Supabase
- **Version Control**: Git

---

## 🚀 Inicio Rápido

### Opción 1: Setup Automático (Windows)

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd smartburger

# Ejecutar script de setup
.\setup.ps1
```

### Opción 2: Setup Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local

# 3. Editar .env.local con tus credenciales

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

**📖 Para instrucciones detalladas, consulta [SETUP.md](SETUP.md)**

---

## 📁 Estructura del Proyecto

```
smartburger/
├── app/                     # Next.js App Router
│   ├── page.tsx            # 🏠 Landing Page
│   ├── admin/              # 👨‍💼 Panel administrativo
│   │   └── page.tsx        # Dashboard
│   ├── api/                # 🔌 API Routes
│   │   ├── chat/           # Chat con IA
│   │   ├── orders/         # Gestión de pedidos
│   │   └── recommendations/ # Sistema de recomendaciones
│   ├── layout.tsx          # Layout global
│   └── globals.css         # Estilos globales
│
├── components/             # 🧩 Componentes React
│   ├── landing/           # Landing page components
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductsSection.tsx
│   │   └── ReviewsSection.tsx
│   ├── chat/              # Chat inteligente
│   │   └── ChatWidget.tsx
│   ├── cart/              # Carrito de compras
│   │   └── CartWidget.tsx
│   └── admin/             # Componentes admin
│
├── lib/                   # 📚 Utilidades
│   ├── supabase.ts       # Cliente Supabase + helpers
│   └── store.ts          # Estado global (Zustand)
│
├── types/                # 📝 TypeScript definitions
│   └── index.ts
│
├── supabase/             # 🗄️ Database
│   ├── schema.sql        # Esquema de tablas
│   └── seed.sql          # Datos de ejemplo
│
├── public/               # 📦 Archivos estáticos
│
├── SETUP.md             # 📖 Guía de instalación
├── API_DOCS.md          # 📡 Documentación de API
├── FEATURES.md          # ✨ Lista de características
└── setup.ps1            # 🚀 Script de setup automático
```

---

## 🗄️ Modelo de Base de Datos

```
categories
├── products (1:N)
│   └── product_ingredients (N:M) → ingredients
│       
orders
├── order_items (1:N) → products
└── chat_conversations (1:1)

promotions (standalone)
inventory_alerts (N:1) → ingredients
analytics (standalone)
```

**Ver esquema completo en:** `supabase/schema.sql`

---

## 🤖 Capacidades del Chat IA

El asistente inteligente utiliza **Google Gemini API** para potenciar sus capacidades conversacionales y de recomendación. Puede:

- ✅ Tomar pedidos en lenguaje natural
- ✅ Personalizar hamburguesas ("sin cebolla", "doble carne")
- ✅ Calcular precios con extras
- ✅ Recomendar combos y ofertas basadas en historial y preferencias
- ✅ Responder preguntas sobre el menú
- ✅ Sugerir adicionales (upselling)
- ✅ Aplicar promociones automáticamente
- ✅ Manejar solicitudes complejas

**Ejemplo de conversación:**
```
Usuario: "Quiero una hamburguesa sin cebolla con bacon extra"
IA: "¡Perfecto! Te recomiendo nuestra SmartBurger Clásica:
     - Sin cebolla ✓
     - + Bacon ($1.50)
     Precio total: $7.49

     ¿Te gustaría agregar papas fritas? Tenemos una oferta..."
```

---

## 📊 Panel Administrativo

El panel administrativo también utiliza **Google Gemini API** para generar insights avanzados basados en métricas reales. Accede a: `http://localhost:3000/admin`

### Métricas Disponibles
- 💰 Ventas del día
- 📦 Pedidos activos
- 📈 Productos más vendidos
- ⚠️ Alertas de inventario
- 📊 Estadísticas en tiempo real

**Ejemplo de insight generado:**
```
Max: "5 productos con stock crítico:
      - Burger Clásica (5 unidades)
      - Papas Fritas (2 unidades).
      Considera reabastecer antes del pico de ventas."
```

---

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Google Gemini
GEMINI_API_KEY=tu_gemini_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📚 Documentación

- 📖 **[Guía de Setup](SETUP.md)** - Instrucciones detalladas de instalación
- 📡 **[API Documentation](API_DOCS.md)** - Endpoints y ejemplos
- ✨ **[Features](FEATURES.md)** - Lista completa de características

---

## 🎯 Roadmap

### ✅ Fase 1: Core (Completado)
- [x] Landing page con productos
- [x] Chat inteligente con IA
- [x] Sistema de carrito
- [x] Panel administrativo
- [x] Base de datos completa
- [x] Sistema de recomendaciones

### 🚧 Fase 2: En Desarrollo
- [ ] Sistema de pagos (Stripe/MercadoPago)
- [ ] Autenticación de usuarios
- [ ] Notificaciones push
- [ ] Email confirmaciones

### 🔮 Fase 3: Futuro
- [ ] App móvil nativa
- [ ] Sistema de delivery con tracking
- [ ] Programa de lealtad
- [ ] Analytics avanzado
- [ ] Multi-ubicación

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: amazing feature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más información.

---

## 👨‍💻 Autor

Desarrollado para hackathon de sistemas inteligentes

**SmartBurger** - Ordena Inteligente. Come Mejor. 🍔🤖

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - Framework de React
- [Supabase](https://supabase.com/) - Backend as a Service
- [Google AI](https://ai.google.dev/) - Gemini API
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animaciones

---

## 🏗️ Arquitectura de Software

El sistema SmartBurger está diseñado con una arquitectura modular y escalable, utilizando tecnologías modernas para garantizar rendimiento y flexibilidad.

### Componentes Principales

1. **Frontend**
   - **Framework**: Next.js (App Router)
   - **Librerías**: React, Tailwind CSS, Framer Motion
   - **Estado Global**: Zustand
   - **Notificaciones**: React Hot Toast

2. **Backend**
   - **API**: Next.js API Routes
   - **Base de Datos**: Supabase (PostgreSQL)
   - **IA**: Google Gemini API para generación de texto y recomendaciones
   - **ORM**: Supabase Client

3. **DevOps**
   - **Hosting**: Vercel para frontend y backend
   - **Base de Datos**: Supabase (DBaaS)
   - **Control de Versiones**: Git

### Flujo de Datos

1. **Interacción del Usuario**: Los usuarios interactúan con el sistema a través de la landing page o el chat inteligente.
2. **Procesamiento**: Las solicitudes se procesan en el backend, donde se integran datos de la base de datos y respuestas generadas por la IA.
3. **Respuesta**: El sistema devuelve respuestas personalizadas o actualiza el estado del cliente (carrito, historial, etc.).

### Tecnologías Clave

- **Frontend**: Next.js, React, Tailwind CSS, Zustand
- **Backend**: Supabase, Google Gemini API
- **DevOps**: Vercel, Git
- **Base de Datos**: PostgreSQL con triggers y RLS
- **IA**: Modelos de lenguaje grande (LLMs) para recomendaciones y análisis

---

<div align="center">

**[⬆ Volver arriba](#-smartburger---sistema-inteligente-de-restaurante)**

Made with ❤️ and 🍔

</div>
