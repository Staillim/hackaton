'use client';

import { StaffGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getOrders } from '@/lib/supabase';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function CocinaPage() {
  return (
    <StaffGuard>
      <CocinaDashboard />
    </StaffGuard>
  );
}

function CocinaDashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing'>('all');

  useEffect(() => {
    loadOrders();
    
    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      // Filtrar solo órdenes activas (no canceladas ni completadas)
      const activeOrders = (data || []).filter(
        o => o.status !== 'cancelled' && o.status !== 'completed'
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Orden actualizada a: ${getStatusLabel(newStatus)}`);
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar la orden');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'En preparación',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
      confirmed: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      preparing: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
      completed: 'bg-green-600/20 text-green-400 border-green-600/30',
      cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    };
    return colors[status] || 'bg-zinc-700 text-gray-300';
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
      {/* Header */}
      <header className="bg-black/50 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-white">Panel de Cocina</h1>
                <p className="text-gray-400 text-sm">{profile?.full_name || profile?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadOrders}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Inicio
              </Link>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              Todas ({orders.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              Pendientes ({orders.filter(o => o.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'preparing'
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              En preparación ({orders.filter(o => o.status === 'preparing').length})
            </button>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando órdenes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay órdenes {filter !== 'all' ? getStatusLabel(filter).toLowerCase() : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative"
              >
                {/* Orden Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">{order.order_number}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Cliente */}
                <div className="mb-4">
                  <p className="text-white font-medium">{order.customer_name || 'Cliente'}</p>
                  {order.customer_phone && (
                    <p className="text-gray-400 text-sm">{order.customer_phone}</p>
                  )}
                </div>

                {/* Items */}
                <div className="mb-4 space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                      <p className="text-white font-semibold">
                        {item.quantity}x {item.product?.name || 'Producto'}
                      </p>
                      
                      {/* Customizaciones */}
                      {item.customizations && (
                        <div className="mt-2 space-y-1 text-xs">
                          {item.customizations.removed && item.customizations.removed.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-400">➖ Sin:</span>
                              <span className="text-gray-300">
                                {Array.isArray(item.customizations.removed)
                                  ? item.customizations.removed.map((r: any) => 
                                      typeof r === 'string' ? r : r.ingredient?.name || r
                                    ).join(', ')
                                  : item.customizations.removed}
                              </span>
                            </div>
                          )}
                          {item.customizations.added && item.customizations.added.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-green-400">➕ Extra:</span>
                              <span className="text-gray-300">
                                {Array.isArray(item.customizations.added)
                                  ? item.customizations.added.map((a: any) => 
                                      typeof a === 'string' ? a : a.ingredient?.name || a
                                    ).join(', ')
                                  : item.customizations.added}
                              </span>
                            </div>
                          )}
                          {item.customizations.notes && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400">📝 Nota:</span>
                              <span className="text-gray-300">{item.customizations.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Notas */}
                {order.notes && (
                  <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
                    <p className="text-gray-300 text-sm italic">{order.notes}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Preparar
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Completar
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'preparing') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      title="Cancelar orden"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
