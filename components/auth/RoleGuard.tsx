'use client';

import { useAuth, UserRole } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/' }: RoleGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // No hay usuario logueado
      if (!user) {
        router.push('/login');
        return;
      }

      // Usuario no tiene rol permitido
      if (profile && !allowedRoles.includes(profile.role)) {
        router.push(redirectTo);
        return;
      }
    }
  }, [user, profile, loading, allowedRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // No mostrar nada si no está autenticado o no tiene permisos
  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}

// Guard solo para admins
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin']}>{children}</RoleGuard>;
}

// Guard para staff (admin + cocina)
export function StaffGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin', 'cocina']}>{children}</RoleGuard>;
}
