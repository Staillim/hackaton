import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only validate in runtime, not during build
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Helper functions for common queries
export const getProducts = async (featured?: boolean) => {
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('active', true)
    .order('name');

  if (featured !== undefined) {
    query = query.eq('featured', featured);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getProductById = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const getProductIngredients = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('*, ingredient:ingredients(*)')
    .eq('product_id', productId);

  if (error) throw error;
  return data;
};

export const getActivePromotions = async () => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now);

  if (error) throw error;
  return data;
};

export const createOrder = async (orderData: any) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createOrderItems = async (items: any[]) => {
  const { data, error } = await supabase
    .from('order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data;
};

export const getOrders = async (status?: string) => {
  let query = supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*))')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getInventoryAlerts = async (resolved?: boolean) => {
  let query = supabase
    .from('inventory_alerts')
    .select('*, ingredient:ingredients(*)')
    .order('created_at', { ascending: false });

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const updateIngredientStock = async (id: string, quantity: number) => {
  const { data, error } = await supabase
    .from('ingredients')
    .update({ stock_quantity: quantity })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const trackAnalytics = async (eventType: string, eventData: any, sessionId?: string) => {
  const { error } = await supabase
    .from('analytics')
    .insert({
      event_type: eventType,
      event_data: eventData,
      session_id: sessionId,
    });

  if (error) console.error('Analytics error:', error);
};

// Chat conversation functions
export const saveChatMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      session_id: sessionId,
      role,
      content,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getChatHistory = async (sessionId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getBestSellingProducts = async (limit: number = 5) => {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, product:products(name, base_price, image_url), quantity')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Agrupar y contar productos
  const productCounts: { [key: string]: any } = {};
  data?.forEach((item) => {
    const id = item.product_id;
    if (!productCounts[id]) {
      productCounts[id] = {
        product: item.product,
        count: 0,
      };
    }
    productCounts[id].count += item.quantity;
  });

  return Object.values(productCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, limit);
};

export const saveUserPreference = async (sessionId: string, preferences: any) => {
  const { error } = await supabase
    .from('analytics')
    .insert({
      event_type: 'user_preference',
      event_data: preferences,
      session_id: sessionId,
    });

  if (error) console.error('Preference save error:', error);
};

export const getUserPreferences = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('analytics')
    .select('event_data')
    .eq('session_id', sessionId)
    .eq('event_type', 'user_preference')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].event_data;
};

// Obtener órdenes de un usuario específico
export const getUserOrders = async (userEmail: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*))')
    .eq('customer_email', userEmail)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Actualizar estado de una orden
export const updateOrderStatus = async (orderId: string, status: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Obtener productos por nombres (para el chat)
export const getProductsByNames = async (productNames: string[]) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('name', productNames)
    .eq('active', true);

  if (error) throw error;
  return data || [];
};

// ============================================
// FUNCIONES PARA DECISIONES AUTÓNOMAS
// ============================================

// Obtener recomendaciones inteligentes basadas en contexto
export const getSmartRecommendations = async (
  userEmail?: string,
  timeContext: string = 'any',
  limit: number = 5
) => {
  try {
    const { data, error } = await supabase.rpc('get_smart_recommendations', {
      p_user_email: userEmail,
      p_time_context: timeContext,
      p_limit: limit
    });

    if (error) {
      console.error('Error getting smart recommendations:', error);
      // Fallback: obtener productos ordenados por prioridad
      const { data: fallbackData } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .gt('stock_quantity', 0)
        .order('priority_score', { ascending: false })
        .limit(limit);
      
      return fallbackData || [];
    }

    return data || [];
  } catch (err) {
    console.error('Smart recommendations error:', err);
    return [];
  }
};

// Obtener análisis de comportamiento de un usuario
export const getUserBehavior = async (userEmail: string) => {
  const { data, error } = await supabase
    .from('user_behavior_analytics')
    .select('*')
    .eq('user_email', userEmail)
    .single();

  if (error) {
    // Si no existe, retornar objeto vacío
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
};

// Obtener pedidos anteriores de un usuario para análisis
export const getUserOrderHistory = async (userEmail: string, limit: number = 10) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*))')
    .eq('customer_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Analizar patrones de pedidos del usuario
export const analyzeUserPatterns = async (userEmail: string) => {
  try {
    const orders = await getUserOrderHistory(userEmail, 20);
    
    if (!orders || orders.length === 0) {
      return {
        hasHistory: false,
        totalOrders: 0,
        averageOrderValue: 0,
        favoriteProducts: [],
        commonRemovals: [],
        commonAdditions: [],
        preferredTime: null,
      };
    }

    // Calcular métricas
    const totalOrders = orders.length;
    const averageOrderValue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) / totalOrders;

    // Analizar productos favoritos
    const productCounts: { [key: string]: { name: string; count: number } } = {};
    const removals: { [key: string]: number } = {};
    const additions: { [key: string]: number } = {};

    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        // Contar productos
        const productName = item.product?.name;
        if (productName) {
          if (!productCounts[productName]) {
            productCounts[productName] = { name: productName, count: 0 };
          }
          productCounts[productName].count += item.quantity;
        }

        // Analizar customizaciones
        if (item.customizations) {
          if (item.customizations.removed) {
            item.customizations.removed.forEach((r: string) => {
              removals[r] = (removals[r] || 0) + 1;
            });
          }
          if (item.customizations.added) {
            item.customizations.added.forEach((a: string) => {
              additions[a] = (additions[a] || 0) + 1;
            });
          }
        }
      });
    });

    // Obtener top 3 productos
    const favoriteProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => p.name);

    // Obtener customizaciones comunes
    const commonRemovals = Object.entries(removals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item]) => item);

    const commonAdditions = Object.entries(additions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item]) => item);

    // Analizar hora preferida
    const hours = orders.map(order => new Date(order.created_at).getHours());
    const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    let preferredTime = 'tarde';
    if (avgHour < 12) preferredTime = 'mañana';
    else if (avgHour >= 12 && avgHour < 18) preferredTime = 'tarde';
    else preferredTime = 'noche';

    return {
      hasHistory: true,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      favoriteProducts,
      commonRemovals,
      commonAdditions,
      preferredTime,
      lastOrderDate: orders[0].created_at,
    };
  } catch (error) {
    console.error('Error analyzing user patterns:', error);
    return {
      hasHistory: false,
      totalOrders: 0,
      averageOrderValue: 0,
      favoriteProducts: [],
      commonRemovals: [],
      commonAdditions: [],
      preferredTime: null,
    };
  }
};

// Obtener métricas del dashboard
export const getDashboardMetrics = async () => {
  try {
    const { data, error } = await supabase
      .from('dashboard_metrics')
      .select('*')
      .single();

    if (error) {
      console.error('Dashboard metrics error:', error);
      // Fallback: calcular manualmente
      return await calculateDashboardMetricsManual();
    }

    return data;
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    return await calculateDashboardMetricsManual();
  }
};

// Calcular métricas del dashboard manualmente (fallback)
const calculateDashboardMetricsManual = async () => {
  const today = new Date().toISOString().split('T')[0];

  // Órdenes de hoy
  const { data: ordersToday } = await supabase
    .from('orders')
    .select('total_amount, status')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const ordersCount = ordersToday?.length || 0;
  const revenueToday = ordersToday
    ?.filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 0;
  const avgTicket = ordersCount > 0 ? revenueToday / ordersCount : 0;

  // Órdenes pendientes
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending');

  const { data: preparingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'preparing');

  // Alertas de stock bajo
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('id, stock_quantity, min_stock_alert')
    .eq('active', true);

  const lowStockCount = lowStockProducts?.filter(
    p => p.stock_quantity < p.min_stock_alert
  ).length || 0;

  return {
    orders_today: ordersCount,
    revenue_today: Math.round(revenueToday * 100) / 100,
    avg_ticket_today: Math.round(avgTicket * 100) / 100,
    top_product_today: 'N/A',
    pending_orders: pendingOrders?.length || 0,
    preparing_orders: preparingOrders?.length || 0,
    avg_prep_time_today: 0,
    low_stock_alerts: lowStockCount,
  };
};

// Actualizar stock de un producto
export const updateProductStock = async (productId: string, quantity: number) => {
  const { data, error } = await supabase
    .from('products')
    .update({ stock_quantity: quantity })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Obtener productos con stock bajo
export const getLowStockProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .filter('stock_quantity', 'lt', 'min_stock_alert')
    .order('stock_quantity', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Obtener contexto temporal actual
export const getCurrentTimeContext = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

// ============================================
// PERFIL DE USUARIO MEJORADO
// ============================================

export interface UserProfile {
  user_email: string;
  total_orders: number;
  average_order_value: number;
  favorite_products?: string[];
  favorite_day?: string;
  favorite_time?: string;
  never_orders?: string[];
  always_orders?: string[];
  preferred_order_time?: string;
  common_customizations?: any;
  last_order_date?: string;
  has_history: boolean;
}

// Obtener perfil completo del usuario
export const getUserProfile = async (userEmail: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_profile', { p_user_email: userEmail });

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

// Analizar y actualizar perfil del usuario
export const analyzeAndUpdateUserProfile = async (userEmail: string) => {
  try {
    const { data, error } = await supabase
      .rpc('analyze_and_update_user_profile', { p_user_email: userEmail });

    if (error) {
      console.error('Error analyzing user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in analyzeAndUpdateUserProfile:', error);
    return null;
  }
};
