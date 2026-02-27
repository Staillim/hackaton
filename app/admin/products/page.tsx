'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Pencil, X, Check, Star, StarOff,
  Eye, EyeOff, Loader2, Package, Search, Trash2, ChevronDown,
  AlertTriangle, PackageMinus,
} from 'lucide-react';
import Link from 'next/link';
import {
  getAllProducts, updateProduct, createProduct,
  getIngredients, getCategories, getProductIngredients,
  addProductIngredient, deleteProductIngredient,
} from '@/lib/supabase';
import { Product, Ingredient, Category } from '@/types';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  return (
    <AdminGuard>
      <ProductsAdmin />
    </AdminGuard>
  );
}

type Tab = 'todos' | 'activos' | 'inactivos' | 'destacados' | 'bajo_stock';

// Stock thresholds
const STOCK_MIN = 5;  // warning
const STOCK_OUT = 0;  // critical

function getStockStatus(qty: number) {
  if (qty <= STOCK_OUT) return 'out';
  if (qty <= STOCK_MIN) return 'low';
  return 'ok';
}

function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('todos');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, ings, cats] = await Promise.all([
        getAllProducts(),
        getIngredients(),
        getCategories(),
      ]);
      setProducts(prods || []);
      setIngredients(ings || []);
      setCategories(cats || []);
    } catch (e) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (product: Product, field: 'active' | 'featured') => {
    try {
      const updated = await updateProduct(product.id, { [field]: !product[field] });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p));
      toast.success(field === 'active'
        ? `${product.name} ${!product.active ? 'activado' : 'desactivado'}`
        : `${product.name} ${!product.featured ? 'destacado' : 'sin destacar'}`
      );
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (tab === 'activos') return p.active;
    if (tab === 'inactivos') return !p.active;
    if (tab === 'destacados') return p.featured;
    if (tab === 'bajo_stock') return getStockStatus(p.stock_quantity ?? 0) !== 'ok';
    return true;
  });

  const lowStockCount = products.filter(p => getStockStatus(p.stock_quantity ?? 0) !== 'ok').length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos', label: `Todos (${products.length})` },
    { key: 'activos', label: `Activos (${products.filter(p => p.active).length})` },
    { key: 'inactivos', label: `Inactivos (${products.filter(p => !p.active).length})` },
    { key: 'destacados', label: `Destacados (${products.filter(p => p.featured).length})` },
    { key: 'bajo_stock', label: `⚠️ Bajo stock (${lowStockCount})` },
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
              Gestión de <span className="text-red-500">Productos</span>
            </h1>
            <p className="text-gray-400 mt-1">{products.length} productos en el sistema</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>

        {/* Stock Alert Banner */}
        {lowStockCount > 0 && (
          <div className={`mb-6 rounded-xl border px-5 py-4 flex items-start gap-3 ${
            products.some(p => getStockStatus(p.stock_quantity ?? 0) === 'out')
              ? 'bg-red-900/20 border-red-700/50'
              : 'bg-yellow-900/20 border-yellow-700/50'
          }`}>
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              products.some(p => getStockStatus(p.stock_quantity ?? 0) === 'out') ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <div>
              <p className="text-white font-semibold text-sm">
                {products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'out').length > 0 && (
                  <span className="text-red-400">
                    {products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'out').length} sin stock
                  </span>
                )}
                {products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'out').length > 0 &&
                  products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'low').length > 0 && ' · '}
                {products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'low').length > 0 && (
                  <span className="text-yellow-400">
                    {products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'low').length} con stock bajo
                  </span>
                )}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {[...products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'out'),
                  ...products.filter(p => getStockStatus(p.stock_quantity ?? 0) === 'low')]
                  .slice(0, 5)
                  .map(p => p.name)
                  .join(', ')}
                {lowStockCount > 5 ? ` y ${lowStockCount - 5} más` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('bajo_stock')}
              className="ml-auto text-xs text-gray-400 hover:text-white underline flex-shrink-0"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
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
              <p className="text-gray-500">Sin productos</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-6 py-4 text-gray-400 text-sm font-medium">Producto</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium hidden md:table-cell">Categoría</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium">Precio</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium hidden sm:table-cell">Cal.</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium">Stock</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium text-center">Activo</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium text-center">Destacado</th>
                  <th className="px-4 py-4 text-gray-400 text-sm font-medium text-center">Editar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => (
                  <tr key={product.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium text-sm">{product.name}</div>
                          {product.description && (
                            <div className="text-gray-500 text-xs truncate max-w-[200px]">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">{product.category?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-red-400 font-semibold">${parseFloat(String(product.base_price)).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-gray-400 text-sm">{product.calories ?? '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const qty = product.stock_quantity ?? 0;
                        const status = getStockStatus(qty);
                        return (
                          <div className="flex items-center gap-1.5">
                            {status === 'out' ? (
                              <span className="inline-flex items-center gap-1 bg-red-600/20 text-red-400 border border-red-600/30 text-xs font-semibold px-2 py-1 rounded-full">
                                <PackageMinus className="w-3 h-3" /> Sin stock
                              </span>
                            ) : status === 'low' ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 text-xs font-semibold px-2 py-1 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> {qty} uds
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm font-medium">{qty} uds</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(product, 'active')}
                        className={`p-2 rounded-lg transition-colors ${product.active ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-zinc-700 text-gray-500 hover:bg-zinc-600'}`}
                        title={product.active ? 'Desactivar' : 'Activar'}
                      >
                        {product.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(product, 'featured')}
                        className={`p-2 rounded-lg transition-colors ${product.featured ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' : 'bg-zinc-700 text-gray-500 hover:bg-zinc-600'}`}
                        title={product.featured ? 'Quitar destacado' : 'Destacar'}
                      >
                        {product.featured ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => { setEditingProduct(product); setShowForm(true); }}
                        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-gray-300 hover:text-white transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProductFormModal
            product={editingProduct}
            ingredients={ingredients}
            categories={categories}
            onClose={() => { setShowForm(false); setEditingProduct(null); }}
            onSaved={() => { loadData(); setShowForm(false); setEditingProduct(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal de creación / edición ─────────────────────────────────────────────
function ProductFormModal({
  product, ingredients, categories, onClose, onSaved,
}: {
  product: Product | null;
  ingredients: Ingredient[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !product;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    base_price: product?.base_price?.toString() || '',
    calories: product?.calories?.toString() || '',
    preparation_time: product?.preparation_time?.toString() || '15',
    image_url: product?.image_url || '',
    category_id: product?.category_id || '',
    active: product?.active ?? true,
    featured: product?.featured ?? false,
    stock_quantity: (product?.stock_quantity ?? 0).toString(),
  });
  const [productIngredients, setProductIngredients] = useState<any[]>([]);
  const [loadingIngs, setLoadingIngs] = useState(!isNew);
  const [addingIng, setAddingIng] = useState(false);
  const [selectedIng, setSelectedIng] = useState('');
  const [ingQty, setIngQty] = useState('1');
  const [ingRequired, setIngRequired] = useState(true);
  const [ingRemovable, setIngRemovable] = useState(true);

  useEffect(() => {
    if (!isNew && product) {
      loadProductIngredients(product.id);
    }
  }, [product]);

  const loadProductIngredients = async (id: string) => {
    try {
      const data = await getProductIngredients(id);
      setProductIngredients(data || []);
    } catch { /* ignore */ } finally {
      setLoadingIngs(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.base_price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        base_price: parseFloat(form.base_price),
        calories: form.calories ? parseInt(form.calories) : undefined,
        preparation_time: parseInt(form.preparation_time) || 15,
        image_url: form.image_url.trim() || undefined,
        category_id: form.category_id || undefined,
        active: form.active,
        featured: form.featured,
        stock_quantity: parseInt(form.stock_quantity) || 0,
      };
      if (isNew) {
        await createProduct(payload);
        toast.success('Producto creado');
      } else {
        await updateProduct(product!.id, payload);
        toast.success('Producto actualizado');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedIng || !product?.id) return;
    setAddingIng(true);
    try {
      const added = await addProductIngredient(product.id, selectedIng, {
        quantity: parseInt(ingQty) || 1,
        is_required: ingRequired,
        is_removable: ingRemovable,
      });
      setProductIngredients(prev => [...prev, added]);
      setSelectedIng('');
      setIngQty('1');
      toast.success('Ingrediente agregado');
    } catch (e: any) {
      toast.error(e.message || 'Error al agregar ingrediente');
    } finally {
      setAddingIng(false);
    }
  };

  const handleRemoveIngredient = async (id: string) => {
    try {
      await deleteProductIngredient(id);
      setProductIngredients(prev => prev.filter(i => i.id !== id));
      toast.success('Ingrediente eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const usedIngIds = new Set(productIngredients.map(i => i.ingredient_id));
  const availableIngs = ingredients.filter(i => !usedIngIds.has(i.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">
            {isNew ? 'Nuevo Producto' : `Editar: ${product?.name}`}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
                placeholder="SmartBurger Clásica"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Categoría</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm resize-none"
              placeholder="Descripción del producto..."
            />
          </div>

          {/* Precio / Calorías / Tiempo / Stock */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Precio ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
                placeholder="9.99"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Calorías</label>
              <input
                type="number"
                min="0"
                value={form.calories}
                onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
                placeholder="450"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Prep. (min)</label>
              <input
                type="number"
                min="1"
                value={form.preparation_time}
                onChange={e => setForm(f => ({ ...f, preparation_time: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-600 text-sm"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Stock (uds)
                {parseInt(form.stock_quantity) <= STOCK_OUT && (
                  <span className="ml-2 text-xs text-red-400 font-normal">sin stock</span>
                )}
                {parseInt(form.stock_quantity) > STOCK_OUT && parseInt(form.stock_quantity) <= STOCK_MIN && (
                  <span className="ml-2 text-xs text-yellow-400 font-normal">⚠ bajo</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                className={`w-full bg-zinc-800 border rounded-lg px-4 py-2.5 text-white focus:outline-none text-sm ${
                  parseInt(form.stock_quantity) <= STOCK_OUT
                    ? 'border-red-600 focus:border-red-500'
                    : parseInt(form.stock_quantity) <= STOCK_MIN
                    ? 'border-yellow-600 focus:border-yellow-500'
                    : 'border-zinc-700 focus:border-red-600'
                }`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">URL de imagen</label>
            <input
              type="text"
              value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 text-sm"
              placeholder="https://..."
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.active ? 'bg-green-600' : 'bg-zinc-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-300">Activo (visible en menú)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.featured ? 'bg-yellow-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.featured ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-300">Destacado</span>
            </label>
          </div>

          {/* Ingredientes — solo en edición */}
          {!isNew && (
            <div className="border-t border-zinc-800 pt-5">
              <h3 className="text-white font-semibold mb-4">Ingredientes de preparación</h3>

              {loadingIngs ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                </div>
              ) : (
                <>
                  {productIngredients.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {productIngredients.map(pi => (
                        <div key={pi.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-white text-sm font-medium">{pi.ingredient?.name}</span>
                            <span className="text-gray-500 text-xs">×{pi.quantity} {pi.ingredient?.unit}</span>
                            {pi.is_required && <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded">Requerido</span>}
                            {pi.is_removable && <span className="text-xs bg-yellow-600/20 text-yellow-400 px-1.5 py-0.5 rounded">Removible</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(pi.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableIngs.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-gray-400 text-xs mb-3">Agregar ingrediente</p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <select
                          value={selectedIng}
                          onChange={e => setSelectedIng(e.target.value)}
                          className="sm:col-span-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
                        >
                          <option value="">Seleccionar ingrediente...</option>
                          {availableIngs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={ingQty}
                          onChange={e => setIngQty(e.target.value)}
                          className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
                          placeholder="Cantidad"
                        />
                        <button
                          type="button"
                          onClick={handleAddIngredient}
                          disabled={!selectedIng || addingIng}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-1 transition-colors"
                        >
                          {addingIng ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Agregar</>}
                        </button>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input type="checkbox" checked={ingRequired} onChange={e => setIngRequired(e.target.checked)} className="accent-red-600" />
                          Requerido
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input type="checkbox" checked={ingRemovable} onChange={e => setIngRemovable(e.target.checked)} className="accent-red-600" />
                          Removible
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {isNew && (
            <p className="text-gray-600 text-xs">Los ingredientes de preparación se pueden agregar después de crear el producto.</p>
          )}
        </div>

        {/* Footer */}
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
            {saving ? 'Guardando...' : isNew ? 'Crear Producto' : 'Guardar Cambios'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
