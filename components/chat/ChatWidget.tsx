'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, ShoppingCart, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types';
import { useCartStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { createOrder, createOrderItems } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Generar ID de sesión único
const getSessionId = () => {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('smartburger_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('smartburger_session_id', sessionId);
  }
  return sessionId;
};

// Cargar historial guardado
const loadChatHistory = (): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  const saved = sessionStorage.getItem('smartburger_chat_history');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

// Guardar historial
const saveChatHistory = (messages: ChatMessage[]) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('smartburger_chat_history', JSON.stringify(messages));
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hook del carrito y auth
  const addItem = useCartStore((state) => state.addItem);
  const { cart, clearCart } = useCartStore();
  const { user, profile } = useAuth();

  // Función para crear orden desde el chat
  const handleCreateOrderFromChat = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para confirmar la orden');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

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
        notes: 'Orden creada desde el chat',
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

      toast.success(`🎉 ¡Orden #${order.order_number} confirmada y enviada a cocina!`, {
        duration: 5000,
        icon: '✅',
      });
      
      clearCart();

    } catch (error) {
      console.error('Error creating order from chat:', error);
      toast.error('Error al confirmar la orden');
    }
  };

  // Inicializar sesión y cargar historial
  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);
    
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    } else {
      // Mensaje de bienvenida personalizado
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: '¡Hola! Soy María, tu asesora personal en SmartBurger 😊\n\n¿Es tu primera vez con nosotros? Me encantaría conocer tus gustos para recomendarte algo delicioso.\n\n¿Qué se te antoja hoy?',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      saveChatHistory([welcomeMessage]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 CHAT WIDGET - Enviando mensaje');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Mensaje del usuario:', input);
    console.log('🔑 SessionID:', sessionId);

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    console.log('📊 Total de mensajes en historial:', updatedMessages.length);
    
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      console.log('🚀 Enviando request a /api/chat...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          sessionId: sessionId,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        console.error('❌ Error en la respuesta del servidor');
        throw new Error('Error en la respuesta');
      }

      const data = await response.json();
      console.log('✅ Datos recibidos:', data);
      console.log('💬 Mensaje de María:', data.message?.substring(0, 100) + '...');

      // Procesar acciones del carrito si hay
      if (data.cartActions && Array.isArray(data.cartActions) && data.cartActions.length > 0) {
        console.log('🛒 Procesando acciones del carrito:', data.cartActions);
        
        data.cartActions.forEach((action: any) => {
          if (action.product && action.quantity) {
            console.log(`➕ Agregando al carrito: ${action.product.name} x${action.quantity}`);
            
            // Preparar personalizaciones si existen
            let customizations = undefined;
            if (action.customizations) {
              customizations = {
                added: action.customizations.additions || [],
                removed: action.customizations.removals || [],
                notes: action.customizations.notes || '',
              };
              console.log('🎨 Con personalizaciones:', customizations);
            }
            
            // Agregar al carrito con o sin personalizaciones
            addItem(action.product, action.quantity, customizations);
            
            // Construir mensaje de notificación
            let notificationText = `${action.product.name}`;
            if (action.customizations) {
              const details = [];
              if (action.customizations.additions && action.customizations.additions.length > 0) {
                details.push(`+${action.customizations.additions.join(', ')}`);
              }
              if (action.customizations.removals && action.customizations.removals.length > 0) {
                details.push(`-${action.customizations.removals.join(', ')}`);
              }
              if (details.length > 0) {
                notificationText += ` (${details.join(' ')})`;
              }
            }
            notificationText += ' agregado al carrito 🛒';
            
            // Mostrar notificación
            toast.success(notificationText, {
              duration: 3000,
              icon: '✅',
              style: {
                background: '#10b981',
                color: '#fff',
              },
            });
          }
        });

        // Abrir el carrito automáticamente
        setTimeout(() => {
          const event = new CustomEvent('openCart');
          window.dispatchEvent(event);
        }, 1000);
      }

      // Procesar confirmación de orden si se detectó
      if (data.confirmOrder) {
        console.log('✅ Confirmación de orden detectada desde el chat');
        setTimeout(() => {
          handleCreateOrderFromChat();
        }, 1500);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      
      console.log('✅ Mensaje agregado al historial');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERROR EN CHAT WIDGET');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error completo:', error);
      toast.error('Error al comunicarse con María. Intenta de nuevo.');
      
      // Remover el mensaje del usuario si hubo error
      setMessages(messages);
      saveChatHistory(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: '¡Hola de nuevo! 😊 ¿Listo para ordenar algo delicioso?',
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
    saveChatHistory([welcomeMessage]);
  };

  const quickActions = [
    '🍔 Recomiéndame algo',
    '🔥 ¿Qué es lo más vendido?',
    '🎁 Quiero un combo',
    '🌱 Opciones vegetarianas',
  ];

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-5 rounded-full shadow-2xl hover:shadow-red-600/50 transition-all duration-300 group hover:scale-110"
            >
              <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white" />
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                <div className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap border border-zinc-700 shadow-xl">
                  <p className="font-semibold">💬 María está en línea</p>
                  <p className="text-xs text-gray-400">Click para chatear</p>
                </div>
              </div>
            </button>
            
            {/* Notification badge */}
            {messages.length === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg"
              >
                !
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-red-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white">María - Asesora de Ventas</h3>
                  <p className="text-xs text-red-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    En línea • Te respondo al instante
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    className="text-white hover:bg-red-800 p-2 rounded-lg transition-colors text-xs"
                    title="Nueva conversación"
                  >
                    ↻
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-red-800 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-zinc-900 to-black">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mr-2 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-gray-100 rounded-2xl rounded-tl-sm border border-zinc-700'
                    }`}
                  >
                    <div className="p-3">
                      {message.role === 'assistant' && (
                        <p className="text-xs font-semibold text-red-400 mb-1">María</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <span className="text-xs opacity-60 mt-2 block">
                        {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 rounded-2xl rounded-tl-sm border border-zinc-700">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      <span className="text-sm text-gray-400">María está escribiendo...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 pb-2 border-t border-zinc-800 pt-3 bg-zinc-900">
                <p className="text-xs text-gray-400 mb-2">Sugerencias rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-gray-300 px-3 py-2 rounded-full transition-all hover:scale-105 border border-zinc-700"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje a María..."
                  className="flex-1 bg-zinc-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 border border-zinc-700 placeholder-gray-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-zinc-700 disabled:to-zinc-800 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                María responde al instante • Presiona Enter para enviar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
