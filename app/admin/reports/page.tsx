'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ArrowLeft, BarChart3, TrendingUp, Clock, Loader2, Calendar, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getSalesByHour, getSalesByProduct, getSalesByProductRange } from '@/lib/supabase';

export default function ReportsPage() {
  return (
    <AdminGuard>
      <ReportsDashboard />
    </AdminGuard>
  );
}

const PRESETS = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
];

const toDateInput = (d: Date) => d.toISOString().split('T')[0];

function ReportsDashboard() {
  const [hourlyData, setHourlyData] = useState<{ hour: number; sales: number; orders: number }[]>([]);
  const [productData, setProductData] = useState<{ product: any; totalQuantity: number; totalRevenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const today = toDateInput(new Date());
  const sevenDaysAgo = toDateInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [fromDate, setFromDate] = useState(sevenDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [activePreset, setActivePreset] = useState<number>(7);

  useEffect(() => {
    loadReports(fromDate, toDate);
  }, []);

  const loadReports = async (from: string, to: string) => {
    try {
      setLoading(true);
      const [hourly, products] = await Promise.all([
        getSalesByHour(),
        getSalesByProductRange(from, to),
      ]);
      setHourlyData(hourly);
      setProductData(products.slice(0, 10));
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (days: number) => {
    let from: string;
    const to = today;
    if (days === 0) {
      from = today;
    } else {
      from = toDateInput(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
    }
    setFromDate(from);
    setToDate(to);
    setActivePreset(days);
    loadReports(from, to);
  };

  const applyCustomRange = () => {
    setActivePreset(-1);
    loadReports(fromDate, toDate);
  };

  const filteredHourly = hourlyData.filter((h) => h.hour >= 8 && h.hour <= 23);

  const topProductsChart = productData.slice(0, 5).map((p) => ({
    name: p.product?.name?.split(' ').slice(0, 2).join(' ') || 'N/A',
    vendidos: p.totalQuantity,
    ingresos: parseFloat(p.totalRevenue.toFixed(2)),
  }));

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  const COLOR_CLASSES = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'];

  const totalSalesToday = filteredHourly.reduce((s, h) => s + h.sales, 0);
  const totalOrdersToday = filteredHourly.reduce((s, h) => s + h.orders, 0);
  const totalRevenueRange = productData.reduce((s, p) => s + p.totalRevenue, 0);
  const totalUnitsRange = productData.reduce((s, p) => s + p.totalQuantity, 0);

  const rangeLabel = fromDate === toDate
    ? new Date(fromDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : `${new Date(fromDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} → ${new Date(toDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;

  const CustomTooltipHour = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm">
          <p className="text-white font-semibold mb-1">{label}:00 h</p>
          <p className="text-green-400">${payload[0]?.value?.toFixed(2)} en ventas</p>
          <p className="text-blue-400">{payload[1]?.value} pedido(s)</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipProduct = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm">
          <p className="text-white font-semibold mb-1">{label}</p>
          <p className="text-red-400">{payload[0]?.value} vendido(s)</p>
          <p className="text-yellow-400">${payload[1]?.value} ingresados</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al panel admin
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Reportes y <span className="text-red-500">Métricas</span>
                </h1>
                <p className="text-gray-400 mt-1">Datos en tiempo real de tu restaurante</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Selector de rango ─────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-red-400" />
            <span className="text-white font-medium text-sm">Rango de análisis</span>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyPreset(p.days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activePreset === p.days
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activePreset === -1 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-gray-500'}`}>
              Personalizado
            </span>
          </div>

          {/* Date inputs */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                title="Fecha de inicio"
                placeholder="yyyy-mm-dd"
                onChange={e => { setFromDate(e.target.value); setActivePreset(-1); }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                title="Fecha de fin"
                placeholder="yyyy-mm-dd"
                onChange={e => { setToDate(e.target.value); setActivePreset(-1); }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-600"
              />
            </div>
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Aplicar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
            <p className="text-gray-400">Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-xs">Ventas hoy</span>
                </div>
                <div className="text-2xl font-bold text-white">${totalSalesToday.toFixed(2)}</div>
                <div className="text-gray-500 text-xs mt-1">{totalOrdersToday} pedido(s)</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-xs">Ingresos ({rangeLabel})</span>
                </div>
                <div className="text-2xl font-bold text-white">${totalRevenueRange.toFixed(2)}</div>
                <div className="text-gray-500 text-xs mt-1">{totalUnitsRange} unidades</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400 text-xs">Producto #1</span>
                </div>
                <div className="text-lg font-bold text-white truncate">{productData[0]?.product?.name || '—'}</div>
                <div className="text-gray-500 text-xs mt-1">{productData[0]?.totalQuantity || 0} uds · ${(productData[0]?.totalRevenue || 0).toFixed(2)}</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400 text-xs">Ticket promedio</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${totalOrdersToday > 0 ? (totalSalesToday / totalOrdersToday).toFixed(2) : '—'}
                </div>
                <div className="text-gray-500 text-xs mt-1">Por pedido (hoy)</div>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Ventas por hora — siempre hoy */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-1">Ventas por Hora</h2>
                <p className="text-gray-500 text-sm mb-6">Hoy · Rango 8:00–23:00</p>

                {totalOrdersToday === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                    <Clock className="w-10 h-10 mb-3 opacity-40" />
                    <p>Sin pedidos registrados hoy</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={filteredHourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltipHour />} />
                      <Line type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 inline-block" />Ventas ($)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" />Pedidos</span>
                </div>
              </motion.div>

              {/* Top productos — rango seleccionado */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-1">Top Productos</h2>
                <p className="text-gray-500 text-sm mb-6">{rangeLabel} · Por unidades vendidas</p>

                {productData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                    <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
                    <p>Sin ventas en el período seleccionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topProductsChart} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                      <Tooltip content={<CustomTooltipProduct />} />
                      <Bar dataKey="vendidos" radius={[0, 4, 4, 0]}>
                        {topProductsChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                <div className="mt-4 space-y-1">
                  {topProductsChart.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-gray-400">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                        {p.name}
                      </span>
                      <span className="text-gray-500">{p.vendidos} uds · ${p.ingresos}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
