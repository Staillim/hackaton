'use client';

import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Shield, ChefHat, Save, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error al actualizar el perfil. Intenta de nuevo.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleInfo = () => {
    switch (profile?.role) {
      case 'admin':
        return {
          icon: <Shield className="w-5 h-5 text-red-500" />,
          label: 'Administrador',
          description: 'Acceso total al sistema',
          color: 'from-red-600/20 to-red-800/20 border-red-500/30'
        };
      case 'cocina':
        return {
          icon: <ChefHat className="w-5 h-5 text-orange-500" />,
          label: 'Personal de Cocina',
          description: 'Gestiona órdenes y preparación',
          color: 'from-orange-600/20 to-orange-800/20 border-orange-500/30'
        };
      default:
        return {
          icon: <User className="w-5 h-5 text-blue-500" />,
          label: 'Cliente',
          description: 'Usuario estándar',
          color: 'from-blue-600/20 to-blue-800/20 border-blue-500/30'
        };
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-gray-400 mt-2">Gestiona tu información personal</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Tarjeta de Rol */}
          <div className={`p-6 bg-gradient-to-r ${roleInfo.color} border rounded-xl`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-900/80 rounded-full flex items-center justify-center">
                {roleInfo.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{roleInfo.label}</h2>
                <p className="text-sm text-gray-400">{roleInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {message && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-900/20 border-green-500/30 text-green-400'
                  : 'bg-red-900/20 border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p>{message.text}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h3 className="text-xl font-bold mb-4">Información Personal</h3>

            {/* Email (no editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Correo Electrónico
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">El correo no se puede modificar</p>
            </div>

            {/* Nombre completo */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-400 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nombre Completo
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 px-6 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </form>

          {/* Información de cuenta */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Información de Cuenta</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Usuario ID:</span>
                <span className="font-mono text-gray-300">{user.id.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tipo de cuenta:</span>
                <span className={`font-semibold ${
                  profile.role === 'admin' ? 'text-red-500' :
                  profile.role === 'cocina' ? 'text-orange-500' :
                  'text-blue-500'
                }`}>
                  {roleInfo.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estado:</span>
                <span className={`flex items-center gap-2 ${profile.active ? 'text-green-500' : 'text-red-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${profile.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {profile.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Miembro desde:</span>
                <span className="text-gray-300">
                  {new Date(profile.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
