'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, User, LogOut, UserCircle, ShieldCheck, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, profile, loading, signOut, isAdmin, isCocina, isStaff } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md border-b border-zinc-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-3xl">🍔</div>
            <span className="text-2xl font-bold text-white group-hover:text-red-600 transition-colors">
              SmartBurger
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#products"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Menú
            </Link>
            <Link
              href="/#reviews"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Reseñas
            </Link>
            
            {/* User Menu o Login */}
            {loading ? (
              <div className="w-20 h-10 bg-zinc-700/50 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="hidden lg:block">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-zinc-700">
                        <p className="text-sm font-medium text-white">
                          {user.user_metadata?.name || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                        {profile?.role && profile.role !== 'customer' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded">
                            {profile.role === 'admin' ? 'Admin' : 'Cocina'}
                          </span>
                        )}
                      </div>
                      
                      {/* Links según rol */}
                      {isAdmin() && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-zinc-700 hover:text-white transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      
                      {isCocina() && !isAdmin() && (
                        <Link
                          href="/cocina"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-zinc-700 hover:text-white transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <ChefHat className="w-4 h-4" />
                          Panel Cocina
                        </Link>
                      )}
                      
                      <Link
                        href="/perfil"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-zinc-700 hover:text-white transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        Mi Perfil
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Iniciar Sesión
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-zinc-900 border-t border-zinc-800"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link
                href="/#products"
                className="block text-gray-300 hover:text-white transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Menú
              </Link>
              <Link
                href="/#reviews"
                className="block text-gray-300 hover:text-white transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Reseñas
              </Link>

              {/* User Menu Mobile */}
              {loading ? (
                <div className="h-10 bg-zinc-700/50 rounded-lg animate-pulse" />
              ) : user ? (
                <div className="border-t border-zinc-700 pt-4 mt-4">
                  <p className="text-sm font-medium text-white mb-1">
                    {user.user_metadata?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-400 truncate mb-3">
                    {user.email}
                  </p>
                  {profile?.role && profile.role !== 'customer' && (
                    <span className="inline-block mb-3 px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded">
                      {profile.role === 'admin' ? 'Admin' : 'Cocina'}
                    </span>
                  )}
                  
                  {/* Links según rol */}
                  {isAdmin() && (
                    <Link
                      href="/admin"
                      className="block text-gray-300 hover:text-white transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      🛡️ Panel Admin
                    </Link>
                  )}
                  
                  {isCocina() && !isAdmin() && (
                    <Link
                      href="/cocina"
                      className="block text-gray-300 hover:text-white transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      👨‍🍳 Panel Cocina
                    </Link>
                  )}
                  
                  <Link
                    href="/perfil"
                    className="block text-gray-300 hover:text-white transition-colors py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Mi Perfil
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="w-full text-left text-red-400 hover:text-red-300 transition-colors py-2"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
