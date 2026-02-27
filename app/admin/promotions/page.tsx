'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, X, Tag, Loader2, Check,
  ToggleLeft, ToggleRight, Trash2, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { getAllPromotions, updatePromotion, createPromotion, deletePromotion } from '@/lib/supabase';
import { Promotion } from '@/types';
import toast from 'react-hot-toast';

export default function PromotionsPage() {
  return (
    <AdminGuard>
      <PromotionsAdmin />
    </AdminGuard>
  );
}

function PromotionsAdmin() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllPromotions();
      setPromotions(data || []);
    } catch {
      toast.error('Error cargando promociones');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      await updatePromotion(promo.id, { active: !promo.active });
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, active: !p.active } : p));
      toast.success(`${promo.name} ${!promo.active ? 'activada' : 'desactivada'}`);
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`¿Eliminar "${promo.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deletePromotion(promo.id);
      setPromotions(prev => prev.filter(p => p.id !== promo.id));
      toast.success('Promoción eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const active = promotions.filter(p => p.active);
  const inactive = promotions.filter(p => !p.active);

  const discountLabel = (p: Promotion) => {
    if (p.discount_type === 'percentage') return `${p.discount_value}% OFF`;
    if (p.discount_type === 'fixed') return `$${p.discount_value} OFF`;
    return 'Combo';
  };

  const isExpired = (p: Promotion) => new Date(p.end_date) < new Date();
  const isUpcoming = (p: Promotion) => new Date(p.start_date) > new Date();

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
              <span className="text-red-500">Promociones</span>
            </h1>
            <p className="text-gray-400 mt-1">{active.length} activas · {inactive.length} inactivas</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Nueva Promoción
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-500 mb-4">Sin promociones. Crea la primera.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nueva Promoción
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Activas */}
            {active.length > 0 && (
              <section>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Activas ({active.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {active.map(p => (
                    <PromoCard
                      key={p.id}
                      promo={p}
                      discountLabel={discountLabel(p)}
                      isExpired={isExpired(p)}
                      isUpcoming={isUpcoming(p)}
                      onToggle={() => handleToggle(p)}
                      onDelete={() => handleDelete(p)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Inactivas */}
            {inactive.length > 0 && (
              <section>
                <h2 className="text-gray-500 font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  Inactivas ({inactive.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {inactive.map(p => (
                    <PromoCard
                      key={p.id}
                      promo={p}
                      discountLabel={discountLabel(p)}
                      isExpired={isExpired(p)}
                      isUpcoming={isUpcoming(p)}
                      onToggle={() => handleToggle(p)}
                      onDelete={() => handleDelete(p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <PromoFormModal
            onClose={() => setShowForm(false)}
            onSaved={() => { loadData(); setShowForm(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PromoCard({
  promo, discountLabel, isExpired, isUpcoming, onToggle, onDelete,
}: {
  promo: Promotion;
  discountLabel: string;
  isExpired: boolean;
  isUpcoming: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <motion.div
      layout
      className={`border rounded-xl p-5 transition-colors ${
        promo.active && !isExpired
          ? 'bg-green-900/10 border-green-600/30 hover:border-green-600/50'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-semibold">{promo.name}</div>
          {promo.description && <div className="text-gray-400 text-sm mt-0.5">{promo.description}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-lg font-bold text-red-400">{discountLabel}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="bg-zinc-800 text-gray-400 px-2 py-1 rounded-full flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {fmt(promo.start_date)} → {fmt(promo.end_date)}
        </span>
        {promo.min_purchase > 0 && (
          <span className="bg-zinc-800 text-gray-400 px-2 py-1 rounded-full">
            Mínimo ${promo.min_purchase}
          </span>
        )}
        <span className="bg-zinc-800 text-gray-400 px-2 py-1 rounded-full">
          {promo.current_uses} usos{promo.max_uses ? ` / ${promo.max_uses}` : ''}
        </span>
        {isExpired && <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded-full">Expirada</span>}
        {isUpcoming && <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full">Próxima</span>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            promo.active ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-white'
          }`}
        >
          {promo.active
            ? <ToggleRight className="w-5 h-5" />
            : <ToggleLeft className="w-5 h-5" />
          }
          {promo.active ? 'Activa' : 'Inactiva'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto text-gray-600 hover:text-red-400 transition-colors p-1"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function PromoFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'combo',
    discount_value: '',
    min_purchase: '0',
    start_date: today,
    end_date: nextMonth,
    active: true,
    max_uses: '',
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.discount_value) {
      toast.error('Nombre y valor de descuento son requeridos');
      return;
    }
    setSaving(true);
    try {
      await createPromotion({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_purchase: parseFloat(form.min_purchase) || 0,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date + 'T23:59:59').toISOString(),
        active: form.active,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      });
      toast.success('Promoción creada');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Nueva Promoción</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
              placeholder="2x1 en Combos"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
              placeholder="Descripción breve..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Tipo de descuento</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
                <option value="combo">Combo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Valor {form.discount_type === 'percentage' ? '(%)' : '($)'} *
              </label>
              <input
                type="number"
                min="0"
                step={form.discount_type === 'percentage' ? '1' : '0.01'}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
                placeholder={form.discount_type === 'percentage' ? '20' : '5.00'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Fecha inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Fecha fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Compra mínima ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_purchase}
                onChange={e => setForm(f => ({ ...f, min_purchase: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Máx. usos (vacío = ilimitado)</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
                placeholder="100"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.active ? 'bg-green-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-gray-300">Activar al crear</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-400 hover:text-white text-sm transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Creando...' : 'Crear Promoción'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
