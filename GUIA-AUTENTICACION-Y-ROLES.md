# 🔐 GUÍA COMPLETA: SISTEMA DE AUTENTICACIÓN Y ROLES

## 📋 RESUMEN DEL PROBLEMA

**Tu problema:**
- ❌ No existe perfil del cliente
- ❌ Los roles (admin, cocina, cliente) no están reconocidos
- ❌ No hay acceso controlado a los paneles

**La causa:**
El código del sistema de autenticación YA EXISTE en tu proyecto, pero el script SQL con las tablas y funciones **NO SE HA EJECUTADO** en la base de datos de Supabase.

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. **Script SQL Consolidado Creado**
   - 📄 Archivo: `supabase/setup-auth-and-roles.sql`
   - ✨ Contiene TODO lo necesario:
     * Tabla `user_profiles` (perfiles de usuario con roles)
     * Triggers automáticos (crear perfil al registrarse)
     * Funciones de verificación (`is_admin()`, `is_cocina()`, `is_staff()`)
     * Políticas RLS actualizadas para todos los perfiles y recursos
     * Permisos configurados correctamente

### 2. **Página de Perfil de Usuario**
   - 📄 Archivo: `app/profile/page.tsx`
   - 🎨 Características:
     * Ver y editar información personal
     * Mostrar rol actual del usuario
     * Información de cuenta detallada
     * Diseño moderno con UI consistente

### 3. **Sistema de Autenticación Completo**
   - ✅ AuthProvider configurado en layout raíz
   - ✅ Guards de roles funcionando (AdminGuard, StaffGuard)
   - ✅ Navbar con menú de usuario integrado
   - ✅ Página de login/registro existente (`/login`)

---

## 🚀 PASOS PARA ACTIVAR EL SISTEMA

### **PASO 1: Ejecutar el Script SQL en Supabase**

1. **Abre Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql
   ```

2. **Copia TODO el contenido del archivo:**
   ```
   supabase/setup-auth-and-roles.sql
   ```

3. **Pégalo en el SQL Editor**

4. **Click en "Run" (▶️)** para ejecutar todo el script

5. **Verifica que no haya errores:**
   - Deberías ver: `Success. No rows returned`
   - Si hay errores, léelos cuidadosamente y repórtalos

---

### **PASO 2: Crear Tu Usuario Administrador**

#### Opción A: Si NO tienes cuenta aún

1. Ve a: `http://localhost:3000/login`
2. Click en "Regístrate" (tab superior)
3. Completa el formulario:
   - Nombre completo
   - Email (usa tu email real)
   - Contraseña
4. Click en "Crear Cuenta"
5. Revisa tu email y confirma la cuenta (Supabase envía un email)

#### Opción B: Si YA tienes cuenta

1. Ve a: `http://localhost:3000/login`
2. Ingresa tu email y contraseña
3. Click en "Iniciar Sesión"

---

### **PASO 3: Convertir Tu Usuario en Administrador**

1. **Vuelve a Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql
   ```

2. **Ejecuta este comando** (reemplaza con tu email):
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE email = 'tu-email@ejemplo.com';
   ```

3. **Verifica el cambio:**
   ```sql
   SELECT email, full_name, role, active FROM user_profiles;
   ```

4. **Deberías ver tu usuario con role = 'admin'**

---

### **PASO 4: Verificar que Funciona**

1. **Recarga la página** de tu aplicación
2. **Deberías ver tu nombre** en la esquina superior derecha
3. **Click en tu nombre** → Menú desplegable con:
   - 🛡️ Panel Admin (si eres admin)
   - ⚙️ Mi Perfil
   - 🚪 Cerrar Sesión
4. **Ve a `/admin`** y deberías tener acceso
5. **Ve a `/profile`** para editar tu perfil

---

## 👥 ROLES DISPONIBLES

### 📦 **Customer (Cliente)** - Rol por defecto
- ✅ Ver y ordenar productos
- ✅ Chat con María
- ✅ Ver historial de pedidos propios
- ✅ Editar su perfil
- ❌ No accede a paneles de administración

### 🛡️ **Admin (Administrador)** - Acceso total
- ✅ TODO lo que hace un cliente
- ✅ Acceso a `/admin` (panel administrativo)
- ✅ Gestionar productos, ingredientes, promociones
- ✅ Ver todas las órdenes
- ✅ Cambiar roles de otros usuarios
- ✅ Ver reportes y métricas
- ✅ Chat con Max (asistente AI admin)

### 👨‍🍳 **Cocina (Personal de Cocina)**
- ✅ Ver todas las órdenes
- ✅ Cambiar estados de órdenes (en preparación, listo)
- ✅ Ver y actualizar stock de ingredientes
- ❌ No puede gestionar productos ni precios
- ❌ No puede ver reportes financieros

---

## 🔧 GESTIÓN DE USUARIOS

### **Crear Usuario de Cocina**

1. El usuario se registra en `/login`
2. Tú (como admin) ejecutas en SQL:
   ```sql
   UPDATE user_profiles 
   SET role = 'cocina' 
   WHERE email = 'cocina@ejemplo.com';
   ```

### **Ver Todos los Usuarios**

```sql
SELECT 
  email, 
  full_name, 
  role, 
  active,
  created_at 
FROM user_profiles 
ORDER BY created_at DESC;
```

### **Desactivar un Usuario**

```sql
UPDATE user_profiles 
SET active = false 
WHERE email = 'usuario@ejemplo.com';
```

### **Reactivar un Usuario**

```sql
UPDATE user_profiles 
SET active = true 
WHERE email = 'usuario@ejemplo.com';
```

---

## 🛡️ SEGURIDAD IMPLEMENTADA

### **Row Level Security (RLS) Activado:**

✅ **user_profiles:**
- Usuarios solo ven su propio perfil
- No pueden cambiar su propio rol
- Admins ven y editan todo

✅ **orders:**
- Clientes solo ven sus propias órdenes
- Staff (admin + cocina) ven todas las órdenes
- Solo admins pueden eliminar órdenes

✅ **products:**
- Todos ven productos activos
- Solo admins pueden crear/editar/eliminar

✅ **ingredients:**
- Todos ven ingredientes disponibles
- Staff (admin + cocina) pueden editar stock

---

## 🔍 TROUBLESHOOTING

### **Problema: "No puedo acceder a /admin"**
**Solución:**
1. Verifica que ejecutaste el script SQL
2. Verifica que tu usuario sea admin:
   ```sql
   SELECT role FROM user_profiles WHERE email = 'tu-email';
   ```
3. Cierra sesión y vuelve a iniciar sesión
4. Limpia la caché del navegador (Ctrl + Shift + R)

### **Problema: "La tabla user_profiles no existe"**
**Solución:**
1. NO ejecutaste el script SQL
2. Ve a: `https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql`
3. Ejecuta `supabase/setup-auth-and-roles.sql` COMPLETO

### **Problema: "Error: role check failed"**
**Solución:**
1. Verifica que las funciones existen:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'is_admin';
   ```
2. Si no existe, ejecuta de nuevo el script SQL

### **Problema: "No me deja iniciar sesión"**
**Solución:**
1. Verifica que Supabase Auth está habilitado
2. Ve a: `https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/auth/users`
3. Verifica que tu usuario existe
4. Intenta resetear la contraseña desde el login

---

## 📊 VERIFICACIÓN POST-INSTALACIÓN

Ejecuta estos comandos en Supabase SQL Editor para verificar:

```sql
-- 1. Verificar tabla user_profiles existe
SELECT COUNT(*) as total_users FROM user_profiles;

-- 2. Verificar funciones de roles existen
SELECT proname FROM pg_proc 
WHERE proname IN ('is_admin', 'is_cocina', 'is_staff', 'get_my_role');

-- 3. Verificar políticas RLS activas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Ver tus usuarios actuales
SELECT email, role, active, created_at 
FROM user_profiles 
ORDER BY created_at DESC;
```

**Resultados esperados:**
- ✅ Total de usuarios: > 0
- ✅ 4 funciones encontradas (is_admin, is_cocina, is_staff, get_my_role)
- ✅ 5 políticas en user_profiles
- ✅ Tu usuario aparece en la lista

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Crear usuarios de prueba** para cada rol:
   - 1 cliente normal
   - 1 usuario de cocina
   - 1 administrador (ya lo tienes)

2. **Probar el flujo completo:**
   - Cliente hace pedido → Cocina ve la orden → Admin ve reportes

3. **Personalizar la página de perfil** si lo deseas:
   - Agregar foto de perfil
   - Historial de pedidos del usuario
   - Preferencias de notificaciones

4. **OPCIONAL: Panel de gestión de usuarios** desde el admin panel:
   - Ver lista de usuarios
   - Cambiar roles desde la UI
   - Activar/desactivar usuarios

---

## 📞 SOPORTE

Si tienes problemas ejecutando el script o configurando los roles:

1. **Verifica los logs** de Supabase
2. **Revisa la consola** del navegador (F12)
3. **Comparte el error específico** que ves

---

## ✨ LO QUE YA FUNCIONA

- ✅ Sistema de autenticación completo (Supabase Auth)
- ✅ Página de login/registro funcional
- ✅ AuthProvider configurado globalmente
- ✅ Guards de roles implementados y listos
- ✅ Navbar con menú de usuario integrado
- ✅ Página de perfil creada y funcional
- ✅ Verificación de roles en tiempo real
- ✅ Políticas RLS definidas y listas

**Solo falta:** Ejecutar el script SQL en Supabase 🎯
