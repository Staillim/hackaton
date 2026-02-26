'use client';

import { AdminGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { getOrders, getInventoryAlerts } from '@/lib/supabase';
import { Order, InventoryAlert } from '@/types';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}

function AdminDashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    activeOrders: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersData, alertsData] = await Promise.all([
        getOrders(),
        getInventoryAlerts(false),
      ]);

      setOrders(ordersData || []);
      setAlerts(alertsData || []);

      // Calculate stats
      const today = new Date().toDateString();
      const todayOrders = (ordersData || []).filter(
        (o) => new Date(o.created_at).toDateString() === today
      );

      const todaySales = todayOrders.reduce((sum, o) => sum + parseFloat(String(o.final_amount)), 0);
      const activeOrders = (ordersData || []).filter(
        (o) => o.status === 'pending' || o.status === 'preparing'
      ).length;

      setStats({
        todaySales,
        todayOrders: todayOrders.length,
        activeOrders,
        lowStockItems: alertsData?.length || 0,
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-600/20`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        {trend && (
          <span className="text-green-500 text-sm flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </motion.div>
  );

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
              Panel <span className="gradient-text">Administrativo</span>
            </h1>
            <p className="text-gray-400 mt-2">Gestiona tu restaurante inteligente</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={DollarSign}
            label="Ventas de Hoy"
            value={`$${stats.todaySales.toFixed(2)}`}
            color="green"
            trend="+12%"
          />
          <StatCard
            icon={ShoppingBag}
            label="Pedidos de Hoy"
            value={stats.todayOrders}
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

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-600/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-white">Alertas de Inventario</h2>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg"
                >
                  <span className="text-gray-300">{alert.message}</span>
                  <span className="text-sm text-red-500 font-semibold">
                    {alert.alert_type === 'out_of_stock' ? 'Sin stock' : 'Stock bajo'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Orders */}
        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Pedidos Recientes</h2>
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
                      <div className="font-bold text-red-600">${order.final_amount.toFixed(2)}</div>
                      <div
                        className={`text-xs font-semibold ${
                          order.status === 'completed'
                            ? 'text-green-500'
                            : order.status === 'preparing'
                            ? 'text-yellow-500'
                            : 'text-blue-500'
                        }`}
                      >
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
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg transition-colors text-left">
                <div className="font-semibold mb-1">Gestionar Productos</div>
                <div className="text-sm text-gray-400">Agregar, editar o eliminar productos</div>
              </button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg transition-colors text-left">
                <div className="font-semibold mb-1">Control de Inventario</div>
                <div className="text-sm text-gray-400">Actualizar stock de ingredientes</div>
              </button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg transition-colors text-left">
                <div className="font-semibold mb-1">Promociones</div>
                <div className="text-sm text-gray-400">Activar/desactivar ofertas</div>
              </button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg transition-colors text-left">
                <div className="font-semibold mb-1">Reportes</div>
                <div className="text-sm text-gray-400">Ver análisis y métricas</div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
