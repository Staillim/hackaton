'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Shield, ChefHat, UserCircle, Loader2, Search, Check,
} from 'lucide-react';
import Link from 'next/link';
import { getUserProfiles, updateUserRole } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersAdmin />
    </AdminGuard>
  );
}

type Role = 'customer' | 'staff' | 'admin';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role: Role;
  created_at: string;
  updated_at?: string;
}

const ROLES: { value: Role; label: string; color: string; icon: typeof Shield }[] = [
  { value: 'customer', label: 'Cliente', color: 'bg-zinc-700 text-gray-300', icon: UserCircle },
  { value: 'staff', label: 'Cocina', color: 'bg-blue-600/20 text-blue-400', icon: ChefHat },
  { value: 'admin', label: 'Admin', color: 'bg-red-600/20 text-red-400', icon: Shield },
];

function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getUserProfiles();
      setUsers((data || []) as UserProfile[]);
    } catch (e: any) {
      toast.error('Error cargando usuarios: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user: UserProfile, newRole: Role) => {
    if (user.role === newRole) return;
    setUpdatingId(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      const roleLabel = ROLES.find(r => r.value === newRole)?.label;
      toast.success(`${user.full_name || user.email} → ${roleLabel}`);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar rol');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const counts = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
    customer: users.filter(u => u.role === 'customer').length,
  };

  const getRoleConfig = (role: Role) => ROLES.find(r => r.value === role) || ROLES[0];

  const initials = (u: UserProfile) => {
    const name = u.full_name || u.email || '?';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Panel Admin
            </Link>
            <h1 className="text-4xl font-bold text-white">
              Gestión de <span className="text-red-500">Usuarios</span>
            </h1>
            <p className="text-gray-400 mt-1">{users.length} usuarios registrados</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: counts.total, color: 'border-zinc-700', text: 'text-white' },
            { label: 'Admins', value: counts.admin, color: 'border-red-600/30', text: 'text-red-400' },
            { label: 'Cocina', value: counts.staff, color: 'border-blue-600/30', text: 'text-blue-400' },
            { label: 'Clientes', value: counts.customer, color: 'border-zinc-700', text: 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className={`bg-zinc-900 border ${s.color} rounded-xl p-4`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-700" />
              <p className="text-gray-500">Sin usuarios</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-6 py-4 text-gray-400 text-sm font-medium">Usuario</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium hidden md:table-cell">Registrado</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium">Rol</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const roleConfig = getRoleConfig(user.role);
                  const RoleIcon = roleConfig.icon;
                  const isUpdating = updatingId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${roleConfig.color}`}>
                            {initials(user)}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{user.full_name || '(sin nombre)'}</div>
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-gray-500 text-sm">
                          {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleConfig.color}`}>
                            {roleConfig.label}
                          </span>
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          ) : (
                            <div className="relative group">
                              <select
                                value={user.role}
                                onChange={e => handleRoleChange(user, e.target.value as Role)}
                                className="bg-transparent text-gray-600 hover:text-gray-300 text-xs cursor-pointer focus:outline-none appearance-none pl-1 pr-5"
                                title="Cambiar rol"
                              >
                                {ROLES.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 text-xs pointer-events-none">▼</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          Usa el selector en la columna "Rol" para cambiar permisos de acceso
        </p>
      </div>
    </div>
  );
}
