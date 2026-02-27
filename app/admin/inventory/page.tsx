'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, AlertTriangle, CheckCircle, Package,
  Loader2, Search, Check, X, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { getIngredients, updateIngredient } from '@/lib/supabase';
import { Ingredient } from '@/types';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  return (
    <AdminGuard>
      <InventoryAdmin />
    </AdminGuard>
  );
}

type Filter = 'todos' | 'ok' | 'bajo' | 'agotado';

function InventoryAdmin() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getIngredients();
      setIngredients(data || []);
    } catch {
      toast.error('Error cargando inventario');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditValue(String(ing.stock_quantity));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveStock = async (ing: Ingredient) => {
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Valor inválido');
      return;
    }
    try {
      await updateIngredient(ing.id, { stock_quantity: newVal });
      setIngredients(prev =>
        prev.map(i => i.id === ing.id ? { ...i, stock_quantity: newVal } : i)
      );
      setEditingId(null);
      toast.success(`Stock de ${ing.name} actualizado a ${newVal} ${ing.unit}`);
    } catch {
      toast.error('Error al actualizar stock');
    }
  };

  const toggleAvailable = async (ing: Ingredient) => {
    try {
      await updateIngredient(ing.id, { available: !ing.available });
      setIngredients(prev =>
        prev.map(i => i.id === ing.id ? { ...i, available: !i.available } : i)
      );
      toast.success(`${ing.name} ${!ing.available ? 'habilitado' : 'deshabilitado'}`);
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const getStatus = (ing: Ingredient) => {
    if (ing.stock_quantity === 0) return 'agotado';
    if (ing.stock_quantity <= ing.min_stock_alert) return 'bajo';
    return 'ok';
  };

  const filtered = ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'ok') return getStatus(i) === 'ok';
    if (filter === 'bajo') return getStatus(i) === 'bajo';
    if (filter === 'agotado') return getStatus(i) === 'agotado';
    return true;
  });

  const counts = {
    total: ingredients.length,
    ok: ingredients.filter(i => getStatus(i) === 'ok').length,
    bajo: ingredients.filter(i => getStatus(i) === 'bajo').length,
    agotado: ingredients.filter(i => getStatus(i) === 'agotado').length,
  };

  const filters: { key: Filter; label: string; count: number; color: string }[] = [
    { key: 'todos', label: 'Todos', count: counts.total, color: 'gray' },
    { key: 'ok', label: 'En stock', count: counts.ok, color: 'green' },
    { key: 'bajo', label: 'Stock bajo', count: counts.bajo, color: 'yellow' },
    { key: 'agotado', label: 'Agotados', count: counts.agotado, color: 'red' },
  ];

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
              Control de <span className="text-red-500">Inventario</span>
            </h1>
            <p className="text-gray-400 mt-1">{ingredients.length} ingredientes registrados</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: counts.total, color: 'bg-zinc-800 border-zinc-700', text: 'text-white' },
            { label: 'En stock', value: counts.ok, color: 'bg-green-900/20 border-green-600/30', text: 'text-green-400' },
            { label: 'Stock bajo', value: counts.bajo, color: 'bg-yellow-900/20 border-yellow-600/30', text: 'text-yellow-400' },
            { label: 'Agotados', value: counts.agotado, color: 'bg-red-900/20 border-red-600/30', text: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} border rounded-xl p-4`}>
              <div className={`text-2xl font-bold ${stat.text}`}>{stat.value}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {filters.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f.key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar ingrediente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-700" />
              <p className="text-gray-500">Sin ingredientes</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-6 py-4 text-gray-400 text-sm font-medium">Ingrediente</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium">Stock actual</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium hidden sm:table-cell">Mínimo</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium text-center">Estado</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium text-center hidden md:table-cell">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ing => {
                  const status = getStatus(ing);
                  const isEditing = editingId === ing.id;
                  return (
                    <tr
                      key={ing.id}
                      className={`border-b border-zinc-800 transition-colors ${
                        status === 'agotado' ? 'bg-red-900/10 hover:bg-red-900/20' :
                        status === 'bajo' ? 'bg-yellow-900/10 hover:bg-yellow-900/20' :
                        'hover:bg-zinc-800/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-white font-medium text-sm">{ing.name}</div>
                        {ing.is_allergen && (
                          <span className="text-xs text-orange-400 bg-orange-600/20 px-1.5 py-0.5 rounded mt-0.5 inline-block">Alérgeno</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={inputRef}
                              type="number"
                              min="0"
                              step="0.1"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveStock(ing);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-24 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-red-600"
                            />
                            <span className="text-gray-500 text-xs">{ing.unit}</span>
                            <button type="button" onClick={() => saveStock(ing)} className="text-green-400 hover:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(ing)}
                            className={`text-sm font-semibold hover:underline cursor-pointer transition-colors ${
                              status === 'agotado' ? 'text-red-400' :
                              status === 'bajo' ? 'text-yellow-400' :
                              'text-green-400'
                            }`}
                            title="Clic para editar"
                          >
                            {ing.stock_quantity} {ing.unit}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-gray-500 text-sm">{ing.min_stock_alert} {ing.unit}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {status === 'agotado' ? (
                          <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-1 rounded-full">Agotado</span>
                        ) : status === 'bajo' ? (
                          <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-1 rounded-full">Stock bajo</span>
                        ) : (
                          <span className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-1 rounded-full">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleAvailable(ing)}
                          className={`p-2 rounded-lg transition-colors ${
                            ing.available
                              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              : 'bg-zinc-700 text-gray-500 hover:bg-zinc-600'
                          }`}
                        >
                          {ing.available ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          Haz clic en el stock de cualquier ingrediente para editarlo inline
        </p>
      </div>
    </div>
  );
}
