'use client';

import { useAuth } from '@/lib/auth';
import { User, LogOut, Shield, ChefHat, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function UserMenu() {
  const { user, profile, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        Iniciar Sesión
      </Link>
    );
  }

  const getRoleIcon = () => {
    if (profile?.role === 'admin') return <Shield className="w-4 h-4 text-red-500" />;
    if (profile?.role === 'cocina') return <ChefHat className="w-4 h-4 text-orange-500" />;
    return <User className="w-4 h-4 text-blue-500" />;
  };

  const getRoleLabel = () => {
    if (profile?.role === 'admin') return 'Administrador';
    if (profile?.role === 'cocina') return 'Cocina';
    return 'Cliente';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700/80 rounded-lg transition-all border border-zinc-700/50"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold">
          {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-semibold text-white">
            {profile?.full_name || 'Usuario'}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            {getRoleIcon()}
            {getRoleLabel()}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
          {/* Cabecera */}
          <div className="p-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-zinc-800">
            <p className="font-semibold text-white">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-zinc-800/80 rounded text-xs">
              {getRoleIcon()}
              <span className="text-gray-300">{getRoleLabel()}</span>
            </div>
          </div>

          {/* Opciones */}
          <div className="p-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition-colors text-white"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              <span>Mi Perfil</span>
            </Link>

            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition-colors text-white"
              >
                <Shield className="w-4 h-4 text-red-500" />
                <span>Panel Admin</span>
              </Link>
            )}

            {profile?.role === 'cocina' && (
              <Link
                href="/kitchen"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition-colors text-white"
              >
                <ChefHat className="w-4 h-4 text-orange-500" />
                <span>Panel Cocina</span>
              </Link>
            )}

            <button
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/20 rounded-lg transition-colors text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
