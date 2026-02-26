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
