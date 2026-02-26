# 🔐 Sistema de Roles - SmartBurger

## Roles Disponibles

### 1. 👤 **customer** (Cliente)
- **Acceso**: Página principal, chat, carrito, perfil
- **Permisos**: 
  - Ver productos
  - Hacer pedidos
  - Ver sus propias órdenes
  - Chatear con María

### 2. 🛡️ **admin** (Administrador)
- **Acceso**: Todo el sistema + panel de administración
- **Permisos**:
  - Ver y gestionar todos los usuarios
  - Cambiar roles de usuarios
  - Gestionar productos e ingredientes
  - Ver todas las órdenes
  - Acceso a estadísticas y reportes
  - Acceso completo a configuración

### 3. 👨‍🍳 **cocina** (Personal de Cocina)
- **Acceso**: Panel de cocina
- **Permisos**:
  - Ver órdenes en tiempo real
  - Cambiar estado de órdenes (pendiente → preparando → completado)
  - Cancelar órdenes
  - Ver detalles de productos y personalizaciones

---

## 📋 Instrucciones de Configuración

### Paso 1: Ejecutar SQL en Supabase

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql/new

2. **Ejecuta el schema principal** (si no lo has hecho):
   - Copia todo el contenido de `supabase/schema.sql`
   - Pega en el editor SQL
   - Click en **RUN**

3. **Ejecuta el schema de roles**:
   - Copia todo el contenido de `supabase/roles.sql`
   - Pega en el editor SQL
   - Click en **RUN**

4. **Ejecuta los datos iniciales** (si no lo has hecho):
   - Copia todo el contenido de `supabase/seed.sql`
   - Pega en el editor SQL
   - Click en **RUN**

### Paso 2: Crear tu Primer Usuario

1. Ve a http://localhost:3000/login
2. Haz click en **Registrarse**
3. Completa el formulario:
   - Nombre: Tu nombre
   - Email: tu-email@ejemplo.com
   - Contraseña: mínimo 6 caracteres
4. Click en **Registrarse**

### Paso 3: Convertir tu Usuario en Admin

1. Ve a Supabase SQL Editor: https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql/new

2. Ejecuta esta consulta (reemplaza el email):
```sql
UPDATE user_profiles 
SET role = 'admin', full_name = 'Administrador Principal'
WHERE email = 'tu-email@ejemplo.com';
```

3. **Recarga la página** en tu navegador para que se actualice el perfil

4. Deberías ver el badge "Admin" en el menú y el botón "Panel Admin"

### Paso 4: Crear Usuarios de Cocina

#### Opción A: Desde Supabase (Manual)

1. El usuario debe registrarse primero en http://localhost:3000/login

2. Luego ejecuta en Supabase:
```sql
UPDATE user_profiles 
SET role = 'cocina', full_name = 'Personal de Cocina'
WHERE email = 'cocina@ejemplo.com';
```

#### Opción B: Desde Panel Admin (Futuro)
*Próximamente se agregará una interfaz para gestionar usuarios desde el panel de admin*

---

## 🎯 Uso del Sistema

### Como Cliente (customer)
1. Regístrate en /login
2. Navega por el menú
3. Chatea con María
4. Haz pedidos

### Como Admin (admin)
1. Inicia sesión
2. Verás "Panel Admin" en el menú
3. Ve a /admin para acceder al dashboard
4. Gestiona usuarios, productos, órdenes

### Como Personal de Cocina (cocina)
1. Inicia sesión
2. Verás "Panel Cocina" en el menú
3. Ve a /cocina para ver órdenes en tiempo real
4. Cambia estados: Pendiente → Preparando → Completado

---

## 🔒 Seguridad (Row Level Security)

El sistema usa RLS (Row Level Security) de Supabase:

- ✅ **Clientes** solo ven sus propias órdenes
- ✅ **Staff** (admin + cocina) ve todas las órdenes
- ✅ **Solo admins** pueden cambiar roles
- ✅ **Solo admins** pueden gestionar productos
- ✅ Los usuarios solo pueden actualizar su propio perfil (excepto el rol)

---

## 📊 Consultas Útiles

### Ver todos los usuarios y sus roles:
```sql
SELECT id, email, full_name, role, active, created_at 
FROM user_profiles
ORDER BY created_at DESC;
```

### Ver cuántos usuarios hay por rol:
```sql
SELECT role, COUNT(*) as total 
FROM user_profiles 
WHERE active = true
GROUP BY role;
```

### Cambiar un usuario a admin:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'email@ejemplo.com';
```

### Cambiar un usuario a cocina:
```sql
UPDATE user_profiles 
SET role = 'cocina' 
WHERE email = 'email@ejemplo.com';
```

### Desactivar un usuario:
```sql
UPDATE user_profiles 
SET active = false 
WHERE email = 'email@ejemplo.com';
```

### Reactivar un usuario:
```sql
UPDATE user_profiles 
SET active = true 
WHERE email = 'email@ejemplo.com';
```

---

## 🔧 Funciones de Verificación

En tu código React puedes usar:

```tsx
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const { profile, isAdmin, isCocina, isStaff } = useAuth();
  
  // Verificar rol específico
  if (profile?.role === 'admin') {
    // Código para admin
  }
  
  // Usar funciones helper
  if (isAdmin()) {
    // Mostrar opciones de admin
  }
  
  if (isCocina()) {
    // Mostrar opciones de cocina
  }
  
  if (isStaff()) {
    // Mostrar opciones de staff (admin + cocina)
  }
}
```

---

## 🛡️ Proteger Rutas

Usa los guards para proteger páginas:

```tsx
import { AdminGuard, StaffGuard, RoleGuard } from '@/components/auth/RoleGuard';

// Solo para admins
export default function AdminPage() {
  return (
    <AdminGuard>
      <YourContent />
    </AdminGuard>
  );
}

// Para admin + cocina
export default function StaffPage() {
  return (
    <StaffGuard>
      <YourContent />
    </StaffGuard>
  );
}

// Personalizado
export default function CustomPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'cocina']}>
      <YourContent />
    </RoleGuard>
  );
}
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `schema.sql` en Supabase
- [ ] Ejecutar `roles.sql` en Supabase
- [ ] Ejecutar `seed.sql` en Supabase
- [ ] Crear primer usuario en /login
- [ ] Convertir usuario en admin con SQL
- [ ] Verificar que aparece "Panel Admin" en el menú
- [ ] Acceder a /admin y verificar que funciona
- [ ] Crear usuario de cocina
- [ ] Verificar que aparece "Panel Cocina" en el menú
- [ ] Acceder a /cocina y verificar órdenes en tiempo real

---

## 🚀 Próximas Mejoras

- [ ] Interfaz gráfica para gestionar usuarios desde /admin
- [ ] Página de gestión de roles
- [ ] Logs de auditoría (quién cambió qué)
- [ ] Permisos granulares (por módulo)
- [ ] Notificaciones en tiempo real para cocina
- [ ] Dashboard con métricas por rol
