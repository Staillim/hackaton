'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/lib/auth';
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  ArrowLeft,
  Brain,
  Sparkles,
  Loader2,
  BarChart3,
  Settings,
  Tag,
  ChevronRight,
  CheckCircle,
  Clock,
  Minus,
  Send,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { getOrders, getInventoryAlerts, getYesterdaySales, supabase } from '@/lib/supabase';
import { Order, InventoryAlert } from '@/types';
import toast from 'react-hot-toast';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}

type Period = 'today' | 'yesterday' | '7d' | '30d';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
];

function AdminDashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [yesterdaySalesAmount, setYesterdaySalesAmount] = useState(0);
  const [stats, setStats] = useState({
    activeOrders: 0,
    lowStockItems: 0,
  });


  useEffect(() => {
    loadDashboardData();

    // Supabase Realtime — actualiza stats cuando llega un pedido nuevo
    const subscription = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersData, alertsData, ySales] = await Promise.all([
        getOrders(),
        getInventoryAlerts(false),
        getYesterdaySales(),
      ]);

      setOrders(ordersData || []);
      setAlerts(alertsData || []);
      setYesterdaySalesAmount(ySales);

      const activeOrders = (ordersData || []).filter(
        (o) => o.status === 'pending' || o.status === 'preparing'
      ).length;

      setStats({
        activeOrders,
        lowStockItems: alertsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Estadísticas calculadas por período ───────────────────────────────────
  const periodStats = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (period) {
      case 'yesterday': {
        from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
        to = new Date(now); to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
        break;
      }
      case '7d': {
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); from.setHours(0, 0, 0, 0);
        to = new Date(now); to.setHours(23, 59, 59, 999);
        break;
      }
      case '30d': {
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); from.setHours(0, 0, 0, 0);
        to = new Date(now); to.setHours(23, 59, 59, 999);
        break;
      }
      default: { // 'today'
        from = new Date(now); from.setHours(0, 0, 0, 0);
        to = new Date(now); to.setHours(23, 59, 59, 999);
        break;
      }
    }

    const filtered = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= from && d <= to;
    });

    const sales = filtered
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(String(o.final_amount)), 0);

    let trendPct: string | null = null;
    if (period === 'today' && yesterdaySalesAmount > 0) {
      const pct = ((sales - yesterdaySalesAmount) / yesterdaySalesAmount) * 100;
      trendPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }

    return { sales, orderCount: filtered.length, trendPct };
  }, [orders, period, yesterdaySalesAmount]);

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-600/20`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        {trend !== undefined && trend !== null ? (
          <span className={`text-sm flex items-center gap-1 font-medium ${
            trend.startsWith('+') ? 'text-green-500' : trend.startsWith('-') ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend.startsWith('+') ? <TrendingUp className="w-4 h-4" /> :
             trend.startsWith('-') ? <TrendingDown className="w-4 h-4" /> :
             <Minus className="w-4 h-4" />}
            {trend}
          </span>
        ) : null}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </motion.div>
  );

  const quickActions = [
    {
      label: 'Gestionar Productos',
      desc: 'Agregar, editar o eliminar productos',
      icon: Package,
      href: '/admin/products',
      available: true,
    },
    {
      label: 'Control de Inventario',
      desc: 'Actualizar stock de ingredientes',
      icon: Settings,
      href: '/admin/inventory',
      available: true,
    },
    {
      label: 'Promociones',
      desc: 'Activar/desactivar ofertas',
      icon: Tag,
      href: '/admin/promotions',
      available: true,
    },
    {
      label: 'Reportes',
      desc: 'Ver análisis y métricas con gráficas',
      icon: BarChart3,
      href: '/admin/reports',
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
            <h1 className="text-4xl font-bold text-white">
              Panel <span className="text-red-500">Administrativo</span>
            </h1>
            <p className="text-gray-400 mt-2">Gestiona tu restaurante inteligente</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {profile?.full_name || profile?.email}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* ─── Filtro de período ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-gray-500 text-sm mr-1">Período:</span>
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={DollarSign}
            label={`Ventas — ${PERIODS.find(p => p.key === period)?.label}`}
            value={`$${periodStats.sales.toFixed(2)}`}
            color="green"
            trend={periodStats.trendPct}
          />
          <StatCard
            icon={ShoppingBag}
            label={`Pedidos — ${PERIODS.find(p => p.key === period)?.label}`}
            value={periodStats.orderCount}
            color="blue"
          />
          <StatCard
            icon={Users}
            label="Pedidos Activos"
            value={stats.activeOrders}
            color="purple"
          />
          <StatCard
            icon={Package}
            label="Alertas de Stock"
            value={stats.lowStockItems}
            color="red"
          />
        </div>

        {/* Inventory Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-600/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-white">Alertas de Inventario</h2>
              <span className="ml-auto text-xs text-red-400 bg-red-600/20 px-2 py-1 rounded-full">
                {alerts.length} activa{alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg"
                >
                  <span className="text-gray-300">{alert.message}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      alert.alert_type === 'out_of_stock'
                        ? 'bg-red-600/20 text-red-400'
                        : 'bg-yellow-600/20 text-yellow-400'
                    }`}
                  >
                    {alert.alert_type === 'out_of_stock' ? 'Sin stock' : 'Stock bajo'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Orders + Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Pedidos Recientes</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sin pedidos aún</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-red-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white">{order.order_number}</div>
                        <div className="text-sm text-gray-400">{order.customer_name || 'Cliente'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-500">${parseFloat(String(order.final_amount)).toFixed(2)}</div>
                        <div
                          className={`text-xs font-semibold flex items-center gap-1 justify-end mt-1 ${
                            order.status === 'completed' ? 'text-green-500' :
                            order.status === 'preparing' ? 'text-yellow-500' :
                            order.status === 'cancelled' ? 'text-red-400' : 'text-blue-500'
                          }`}
                        >
                          {order.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {order.status === 'preparing' && <Clock className="w-3 h-3" />}
                          {order.status === 'pending' && 'Pendiente'}
                          {order.status === 'confirmed' && 'Confirmado'}
                          {order.status === 'preparing' && 'Preparando'}
                          {order.status === 'completed' && 'Completado'}
                          {order.status === 'cancelled' && 'Cancelado'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                action.available ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg transition-colors text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className="w-5 h-5 text-red-500" />
                      <div>
                        <div className="font-semibold">{action.label}</div>
                        <div className="text-sm text-gray-400">{action.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                  </Link>
                ) : (
                  <div
                    key={action.label}
                    className="w-full bg-zinc-800/50 text-white p-4 rounded-lg text-left flex items-center justify-between opacity-60 cursor-not-allowed"
                    title="Próximamente"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-semibold">{action.label}</div>
                        <div className="text-sm text-gray-500">{action.desc}</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 bg-zinc-700 px-2 py-1 rounded-full">
                      Próximamente
                    </span>
                  </div>
                )
              ))}
            </div>
          </motion.div>
        </div>

        {/* ─── Max — Chat del Agente ───────────────────────────────────────────── */}
        <MaxChatSection
          criticalAlertsCount={alerts.filter(a => a.alert_type === 'out_of_stock').length}
          pendingOrdersCount={orders.filter(o => o.status === 'pending').length}
        />
      </div>
    </div>
  );
}

// ─── Max — Agente de Chat ─────────────────────────────────────────────────────

interface MaxMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: { type: string; description: string; success: boolean }[];
  timestamp: Date;
  mock?: boolean;
  quotaError?: boolean;
}

// Prompts agrupados por categoría — estado vacío
const PROMPT_CATEGORIES = [
  {
    label: 'Análisis',
    color: 'text-blue-400',
    prompts: [
      { text: 'Resumen del día', icon: '📊' },
      { text: 'Ventas de los últimos 7 días', icon: '📈' },
      { text: 'Analiza las ventas por día y hora', icon: '🕐' },
    ],
  },
  {
    label: 'Inventario',
    color: 'text-yellow-400',
    prompts: [
      { text: '¿Qué debo reponer urgente?', icon: '📦' },
      { text: 'Dame el estado completo del stock', icon: '🔍' },
    ],
  },
  {
    label: 'Acciones',
    color: 'text-green-400',
    prompts: [
      { text: 'Confirma el último pedido', icon: '✅' },
      { text: 'Crea una promo 10% sin mínimo hasta fin de mes', icon: '🎯' },
    ],
  },
  {
    label: 'Productos',
    color: 'text-red-400',
    prompts: [
      { text: '¿Cuál es mi producto más vendido?', icon: '🏆' },
      { text: 'Dame los pedidos activos ahora', icon: '⏳' },
    ],
  },
];

// Prompts rápidos inline (cuando ya hay mensajes)
const QUICK_PROMPTS = [
  '¿Qué debo reponer?',
  'Pedidos activos',
  'Ventas 7 días',
  'Resumen del día',
];

function MaxChatSection({
  criticalAlertsCount = 0,
  pendingOrdersCount = 0,
}: {
  criticalAlertsCount?: number;
  pendingOrdersCount?: number;
}) {
  const [messages, setMessages] = useState<MaxMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: MaxMessage = { role: 'user', content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg: MaxMessage = {
          role: 'assistant',
          content: data.message,
          actions: data.actions,
          timestamp: new Date(),
          mock: data.mock,
          quotaError: data.quotaError,
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (data.quotaError) {
          toast('Cuota de OpenAI excedida — Max responde en modo básico', {
            icon: '⚠️',
            style: { background: '#78350f', color: '#fde68a', border: '1px solid #d97706' },
          });
        }
      } else {
        toast.error('Max no pudo responder');
      }
    } catch {
      toast.error('Error de conexión con Max');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white text-lg select-none">
              M
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold">Max</span>
              <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Agente Autónomo
              </span>
              {criticalAlertsCount > 0 && (
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                  ⛔ {criticalAlertsCount} sin stock
                </span>
              )}
              {pendingOrdersCount > 0 && (
                <span className="text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded-full">
                  ⏳ {pendingOrdersCount} pendiente{pendingOrdersCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs">Analista · Automatización · SmartBurger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
              title="Nueva conversación"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <MessageCircle className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Banner de alertas urgentes */}
      {criticalAlertsCount > 0 && messages.length === 0 && (
        <div className="mx-4 mt-3 bg-red-900/30 border border-red-600/40 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">
              {criticalAlertsCount} ingrediente{criticalAlertsCount !== 1 ? 's' : ''} sin stock — puede afectar pedidos
            </span>
          </div>
          <button
            type="button"
            onClick={() => sendMessage('Analiza el stock urgente: qué ingredientes faltan, qué productos afecta y qué debo hacer ahora')}
            disabled={loading}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 font-medium"
          >
            Analizar con Max
          </button>
        </div>
      )}
      {pendingOrdersCount > 0 && messages.length === 0 && (
        <div className="mx-4 mt-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-300 text-sm">
              {pendingOrdersCount} pedido{pendingOrdersCount !== 1 ? 's' : ''} esperando confirmación
            </span>
          </div>
          <button
            type="button"
            onClick={() => sendMessage('Dame los pedidos activos y confírmalos si están pendientes')}
            disabled={loading}
            className="text-xs bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-600/30 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 font-medium"
          >
            Ver pedidos
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="min-h-80 max-h-[32rem] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {messages.length === 0 && !loading && (
          <div className="py-4 px-2">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600/20 to-red-900/20 border border-red-600/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Max está listo</p>
                <p className="text-gray-500 text-xs">Análisis, automatización y gestión en tiempo real</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2">
              {PROMPT_CATEGORIES.map(cat => (
                <div key={cat.label} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <p className={`text-xs font-semibold mb-2 ${cat.color}`}>{cat.label}</p>
                  <div className="space-y-1.5">
                    {cat.prompts.map(p => (
                      <button
                        key={p.text}
                        type="button"
                        onClick={() => sendMessage(p.text)}
                        className="w-full text-left text-xs text-gray-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-red-600/40 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <span>{p.icon}</span>
                        <span>{p.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 mt-0.5">
                M
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-gray-400" />
              </div>
            )}

            <div className={`max-w-[75%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Bubble */}
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'assistant'
                  ? 'bg-zinc-800 text-gray-200 rounded-tl-sm'
                  : 'bg-red-600 text-white rounded-tr-sm'
              }`}>
                {msg.content}
              </div>
              {/* Badge modo básico */}
              {msg.quotaError && (
                <span className="text-xs text-yellow-600 px-1 flex items-center gap-1">
                  ⚠️ Modo básico — cuota de OpenAI excedida
                </span>
              )}

              {/* Action pills */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.actions.map((action, j) => (
                    <span
                      key={j}
                      className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        action.success
                          ? 'bg-green-900/30 border border-green-600/30 text-green-400'
                          : 'bg-red-900/30 border border-red-600/30 text-red-400'
                      }`}
                    >
                      {action.success ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {action.description}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-gray-600 text-xs px-1">
                {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
              M
            </div>
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts — solo si hay mensajes */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-red-600/50 text-gray-400 hover:text-white px-3 py-1 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus-within:border-red-600/50 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbele a Max... ej: 'Sube a 50 el stock del queso'"
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white p-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-2 text-center">
          Max puede gestionar stock, precios, productos, promociones y pedidos
        </p>
      </div>
    </motion.div>
  );
}
