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

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('name');
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: {
  name?: string; description?: string; base_price?: number;
  calories?: number; active?: boolean; featured?: boolean;
  preparation_time?: number; image_url?: string; category_id?: string;
}) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();
  if (error) throw error;
  return data;
};

export const createProduct = async (product: {
  name: string; description?: string; base_price: number;
  calories?: number; active: boolean; featured: boolean;
  preparation_time: number; image_url?: string; category_id?: string;
}) => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select('*, category:categories(*)')
    .single();
  if (error) throw error;
  return data;
};

export const addProductIngredient = async (productId: string, ingredientId: string, opts: {
  quantity: number; is_required: boolean; is_removable: boolean;
}) => {
  const { data, error } = await supabase
    .from('product_ingredients')
    .insert({ product_id: productId, ingredient_id: ingredientId, ...opts })
    .select('*, ingredient:ingredients(*)')
    .single();
  if (error) throw error;
  return data;
};

export const deleteProductIngredient = async (id: string) => {
  const { error } = await supabase.from('product_ingredients').delete().eq('id', id);
  if (error) throw error;
};

export const getIngredients = async () => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const updateIngredient = async (id: string, updates: { stock_quantity?: number; available?: boolean }) => {
  const { data, error } = await supabase
    .from('ingredients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getAllPromotions = async () => {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updatePromotion = async (id: string, updates: Partial<{
  name: string; description: string; discount_type: string; discount_value: number;
  min_purchase: number; start_date: string; end_date: string; active: boolean; max_uses: number;
}>) => {
  const { data, error } = await supabase
    .from('promotions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createPromotion = async (promo: {
  name: string; description?: string; discount_type: 'percentage' | 'fixed' | 'combo';
  discount_value: number; min_purchase: number; start_date: string; end_date: string; active: boolean; max_uses?: number;
}) => {
  const { data, error } = await supabase
    .from('promotions')
    .insert({ ...promo, current_uses: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deletePromotion = async (id: string) => {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
};

export const getUserProfiles = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId: string, role: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data;
};

// ─── Métricas para el panel admin ────────────────────────────────────────────

// Ventas agrupadas por producto con rango de fechas personalizado
export const getSalesByProductRange = async (fromDate: string, toDate: string) => {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, total_price, product:products(name, base_price, image_url), order:orders!inner(status, created_at)')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  if (error) throw error;

  const grouped: Record<string, { product: any; totalQuantity: number; totalRevenue: number }> = {};
  ((data || []) as any[]).forEach((item: any) => {
    if (item.order?.status === 'cancelled') return;
    const id = item.product_id;
    if (!grouped[id]) grouped[id] = { product: item.product, totalQuantity: 0, totalRevenue: 0 };
    grouped[id].totalQuantity += item.quantity;
    grouped[id].totalRevenue += parseFloat(item.total_price || 0);
  });

  return Object.values(grouped).sort((a, b) => b.totalQuantity - a.totalQuantity);
};

// Ventas agrupadas por producto en los últimos N días (excluye cancelados)
export const getSalesByProduct = async (days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, total_price, product:products(name, base_price, image_url)')
    .gte('created_at', since);

  if (error) throw error;

  // Agrupar por product_id
  const grouped: Record<string, { product: any; totalQuantity: number; totalRevenue: number }> = {};
  (data || []).forEach((item: any) => {
    const id = item.product_id;
    if (!grouped[id]) {
      grouped[id] = { product: item.product, totalQuantity: 0, totalRevenue: 0 };
    }
    grouped[id].totalQuantity += item.quantity;
    grouped[id].totalRevenue += parseFloat(item.total_price || 0);
  });

  return Object.values(grouped).sort((a, b) => b.totalQuantity - a.totalQuantity);
};

// Ventas por hora del día (hoy)
export const getSalesByHour = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, final_amount, status')
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'cancelled');

  if (error) throw error;

  // Inicializar todas las horas del día en 0
  const hours: Record<number, { hour: number; sales: number; orders: number }> = {};
  for (let h = 0; h < 24; h++) {
    hours[h] = { hour: h, sales: 0, orders: 0 };
  }

  (data || []).forEach((order: any) => {
    const hour = new Date(order.created_at).getHours();
    hours[hour].sales += parseFloat(order.final_amount || 0);
    hours[hour].orders += 1;
  });

  return Object.values(hours);
};

// Total de ventas de ayer (para calcular trend real vs "+12%" hardcodeado)
export const getYesterdaySales = async () => {
  const yesterdayStart = new Date();
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date();
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('orders')
    .select('final_amount')
    .gte('created_at', yesterdayStart.toISOString())
    .lte('created_at', yesterdayEnd.toISOString())
    .neq('status', 'cancelled');

  if (error) throw error;
  return (data || []).reduce((sum: number, o: any) => sum + parseFloat(o.final_amount || 0), 0);
};

// Ventas agrupadas por día de la semana (últimos N días, para análisis de patrones)
export const getSalesByDayOfWeek = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, final_amount, status')
    .gte('created_at', since)
    .neq('status', 'cancelled');

  if (error) throw error;

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const grouped: Record<number, { day: string; sales: number; orders: number }> = {};
  for (let d = 0; d < 7; d++) {
    grouped[d] = { day: dayNames[d], sales: 0, orders: 0 };
  }

  (data || []).forEach((order: any) => {
    const dayIdx = new Date(order.created_at).getDay();
    grouped[dayIdx].sales += parseFloat(String(order.final_amount || 0));
    grouped[dayIdx].orders += 1;
  });

  return Object.values(grouped);
};

// Métricas completas para el agente IA — ejecuta todo en paralelo
export const getAdminMetrics = async () => {
  const [salesByProduct, salesByHour, criticalStock, promotions, yesterdaySales] = await Promise.all([
    getSalesByProduct(7),
    getSalesByHour(),
    getInventoryAlerts(false),
    getActivePromotions(),
    getYesterdaySales(),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('final_amount, status')
    .gte('created_at', todayStart.toISOString());

  const completed = (recentOrders || []).filter((o: any) => o.status === 'completed').length;
  const cancelled = (recentOrders || []).filter((o: any) => o.status === 'cancelled').length;
  const totalRevenue = (recentOrders || [])
    .filter((o: any) => o.status !== 'cancelled')
    .reduce((sum: number, o: any) => sum + parseFloat(o.final_amount || 0), 0);
  const avgTicket = completed > 0 ? (totalRevenue / completed).toFixed(2) : '0.00';

  return {
    salesByProduct,
    salesByHour,
    criticalStock,
    promotions,
    yesterdaySales,
    recentOrders: {
      total: (recentOrders || []).length,
      completed,
      cancelled,
      avgTicket,
    },
  };
};
