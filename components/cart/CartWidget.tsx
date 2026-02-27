'use client';

import { ShoppingCart, X, Plus, Minus, Trash2, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { createOrder, createOrderItems, getUserOrders } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function CartWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const { cart, updateItemQuantity, removeItem, clearCart } = useCartStore();
  const { user, profile } = useAuth();

  // Escuchar evento para abrir el carrito desde el chat
  useEffect(() => {
    const handleOpenCart = () => setIsOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  // Cargar órdenes del usuario cuando abre el carrito
  useEffect(() => {
    if (isOpen && user?.email) {
      loadUserOrders();
    }
  }, [isOpen, user]);

  const loadUserOrders = async () => {
    if (!user?.email) return;
    try {
      const orders = await getUserOrders(user.email);
      setUserOrders(orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para realizar una orden');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    setIsCreatingOrder(true);
    try {
      // Crear la orden
      const orderData = {
        customer_name: profile?.full_name || user.email,
        customer_email: user.email,
        customer_phone: profile?.phone || '',
        total_amount: cart.subtotal,
        discount_amount: cart.discount,
        final_amount: cart.total,
        status: 'pending',
        payment_status: 'pending',
        notes: '',
      };

      const order = await createOrder(orderData);

      // Crear los items de la orden
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.base_price,
        total_price: item.totalPrice,
        customizations: {
          removed: item.customizations.removed || [],
          added: item.customizations.added || [],
          notes: item.customizations.notes || '',
        },
      }));

      await createOrderItems(orderItems);

      toast.success(`🎉 ¡Orden #${order.order_number} creada exitosamente!`);
      clearCart();
      loadUserOrders();
      setShowOrders(true);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear la orden. Intenta nuevamente.');
    } finally {
      setIsCreatingOrder(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'confirmed':
      case 'preparing':
        return <Package className="w-4 h-4 text-orange-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
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

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 z-40 bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-full shadow-lg border border-zinc-700 transition-all duration-300 group"
      >
        <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
        {cart.items.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {cart.items.length}
          </span>
        )}
      </button>

      {/* Cart sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-red-600" />
                    {showOrders ? 'Mis Órdenes' : 'Tu Carrito'}
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Toggle tabs */}
                {user && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowOrders(false)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        !showOrders
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Carrito ({cart.items.length})
                    </button>
                    <button
                      onClick={() => setShowOrders(true)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        showOrders
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Órdenes ({userOrders.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-6">
                {showOrders ? (
                  // Vista de Órdenes
                  userOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No tienes órdenes aún</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOrders.map((order) => (
                        <motion.div
                          key={order.id}
                          layout
                          className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
                        >
                          {/* Order header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-white">{order.order_number}</h3>
                              <p className="text-sm text-gray-400">
                                {new Date(order.created_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {getStatusLabel(order.status)}
                            </span>
                          </div>

                          {/* Order items */}
                          <div className="space-y-2 mb-3">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="text-sm">
                                <div className="flex justify-between text-white">
                                  <span>
                                    {item.quantity}x {item.product?.name || 'Producto'}
                                  </span>
                                  <span>${item.total_price.toFixed(2)}</span>
                                </div>
                                {item.customizations && (
                                  <div className="text-xs text-gray-400 ml-4">
                                    {item.customizations.removed?.length > 0 && (
                                      <div>Sin: {item.customizations.removed.join(', ')}</div>
                                    )}
                                    {item.customizations.added?.length > 0 && (
                                      <div>Extra: {item.customizations.added.join(', ')}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Order total */}
                          <div className="pt-3 border-t border-zinc-700 flex justify-between items-center">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-xl font-bold text-red-600">
                              ${order.final_amount.toFixed(2)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  // Vista de Carrito
                  cart.items.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Tu carrito está vacío</p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="mt-4 btn-primary"
                    >
                      Ver Menú
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <motion.div
                        key={item.product.id}
                        layout
                        className="bg-zinc-800 rounded-xl p-4 border border-zinc-700"
                      >
                        <div className="flex gap-4">
                          <img
                            src={item.product.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200'}
                            alt={item.product.name}
                            className="w-20 h-20 object-contain rounded-lg bg-zinc-900"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">
                              {item.product.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-2">
                              ${item.product.base_price.toFixed(2)} c/u
                            </p>

                            {/* Quantity controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1">
                                <button
                                  onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-gray-400" />
                                </button>
                                <span className="w-8 text-center font-semibold text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="text-red-500 hover:text-red-400 p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Customizations */}
                        {(item.customizations.removed?.length > 0 || 
                          item.customizations.added?.length > 0 || 
                          item.customizations.notes) && (
                          <div className="mt-3 pt-3 border-t border-zinc-700 text-sm space-y-1">
                            {item.customizations.removed && item.customizations.removed.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-red-400">➖ Sin:</span>
                                <span className="text-gray-400">
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
                                <span className="text-gray-400">
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
                                <span className="text-gray-400">{item.customizations.notes}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Item total */}
                        <div className="mt-2 text-right">
                          <span className="text-lg font-bold text-red-600">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
                )}
              </div>

              {/* Footer */}
              {cart.items.length > 0 && !showOrders && (
                <div className="p-6 border-t border-zinc-800 bg-zinc-950">
                  {/* Totals */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>${cart.subtotal.toFixed(2)}</span>
                    </div>
                    {cart.discount > 0 && (
                      <div className="flex justify-between text-green-500">
                        <span>Descuento</span>
                        <span>-${cart.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-zinc-800">
                      <span>Total</span>
                      <span>${cart.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={handleCreateOrder}
                      disabled={isCreatingOrder || !user}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCreatingOrder ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Creando orden...
                        </>
                      ) : !user ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Inicia sesión para ordenar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Realizar Orden
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full text-gray-400 hover:text-white py-2 transition-colors"
                    >
                      Vaciar Carrito
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
