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
  console.log('📦 [createOrderItems] Intentando insertar items:', {
    count: items.length,
    items: items.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      customizations: i.customizations
    }))
  });

  const { data, error } = await supabase
    .from('order_items')
    .insert(items)
    .select();

  if (error) {
    console.error('❌ [createOrderItems] Error al insertar:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Error al guardar los items de la orden: ${error.message}. CAUSA PROBABLE: RLS bloqueando INSERT en order_items.`);
  }

  console.log('✅ [createOrderItems] Items insertados exitosamente:', data?.length || 0);
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
  // 🔥 PASO 1: Resolver alertas obsoletas donde el stock ya fue repuesto
  // Usamos un JOIN directo en la query de update
  if (resolved === false || resolved === undefined) {
    try {
      // Traer todas las alertas activas con su ingrediente actual
      const { data: activeAlerts } = await supabase
        .from('inventory_alerts')
        .select('id, ingredient_id, ingredient:ingredients(stock_quantity, min_stock_alert)')
        .eq('resolved', false);

      if (activeAlerts && activeAlerts.length > 0) {
        const toResolve = activeAlerts
          .filter((a: any) => {
            if (!a.ingredient) return false;
            const stock = a.ingredient.stock_quantity ?? 0;
            const minAlert = a.ingredient.min_stock_alert ?? 10;
            return stock > minAlert;
          })
          .map((a: any) => a.id);

        if (toResolve.length > 0) {
          console.log(`🔔 [getInventoryAlerts] Resolviendo ${toResolve.length} alerta(s) obsoletas...`);
          await supabase
            .from('inventory_alerts')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .in('id', toResolve);
        }
      }
    } catch (e) {
      console.error('[getInventoryAlerts] Error auto-resolviendo alertas:', e);
    }
  }

  // PASO 2: Traer las alertas (ya limpias)
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
  try {
    // Primero, verificar si existe la conversación
    const { data: existing, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('messages')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error buscando conversación:', fetchError);
      throw fetchError;
    }

    const newMessage = {
      role,
      content,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (existing) {
      // Actualizar: agregar mensaje al array existente
      const currentMessages = existing.messages || [];
      const updatedMessages = [...currentMessages, newMessage];

      const { data, error } = await supabase
        .from('chat_conversations')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando mensajes:', error);
        throw error;
      }
      return data;
    } else {
      // Crear nueva conversación con el mensaje
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          session_id: sessionId,
          messages: [newMessage],
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando conversación:', error);
        throw error;
      }
      return data;
    }
  } catch (error) {
    console.error('❌ Error en saveChatMessage:', error);
    // No lanzar el error para que no rompa el flujo del chat
    return null;
  }
};

export const getChatHistory = async (sessionId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('messages')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error obteniendo historial:', error);
    return [];
  }

  if (!data || !data.messages) {
    return [];
  }

  // Retornar los últimos N mensajes
  const messages = data.messages.slice(-limit);
  return messages;
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

export const getUserPreferences = async (userEmail: string) => {
  try {
    console.log('📊 [getUserPreferences] Obteniendo preferencias para:', userEmail);
    
    // Intentar obtener de la tabla user_preferences (nuevo sistema)
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (error) {
      // Si la tabla no existe o no hay datos, intentar analizar ahora
      console.log('⚠️ [getUserPreferences] No hay preferencias, analizando historial...');
      
      // Llamar a la función SQL para analizar
      const { data: analyzed, error: analyzeError } = await supabase
        .rpc('analyze_user_preferences', { p_user_email: userEmail });
      
      if (analyzeError) {
        console.error('❌ [getUserPreferences] Error analizando:', analyzeError);
        return null;
      }
      
      console.log('✅ [getUserPreferences] Análisis completado:', analyzed);
      
      // Intentar obtener de nuevo
      const { data: retryData, error: retryError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_email', userEmail)
        .single();
      
      if (retryError) {
        console.error('❌ [getUserPreferences] Error después de analizar:', retryError);
        return null;
      }
      
      return retryData;
    }

    console.log('✅ [getUserPreferences] Preferencias encontradas:', {
      total_orders: data.total_orders,
      confidence_level: data.confidence_level,
      has_favorites: data.favorite_products?.length > 0,
      has_removals: data.always_removes?.length > 0,
      has_additions: data.always_adds?.length > 0
    });

    return data;
  } catch (error) {
    console.error('❌ [getUserPreferences] Error general:', error);
    return null;
  }
};

// Guardar gusto explícito del usuario (mencionado en conversación)
export const saveExplicitLike = async (
  userEmail: string,
  itemName: string,
  context?: string
) => {
  try {
    console.log(`💾 [saveExplicitLike] Guardando: "${itemName}" para ${userEmail}`);
    
    const { data, error } = await supabase
      .rpc('save_explicit_like', {
        p_user_email: userEmail,
        p_item_name: itemName,
        p_context: context || null
      });

    if (error) {
      console.error('❌ [saveExplicitLike] Error:', error);
      throw error;
    }

    console.log('✅ [saveExplicitLike] Guardado exitoso:', data);
    return data;
  } catch (error) {
    console.error('❌ [saveExplicitLike] Error general:', error);
    throw error;
  }
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

// ============================================
// FUNCIONES ADMINISTRATIVAS
// ============================================

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
  console.log(`🔄 [updateIngredient] Iniciando actualización:`, { id, updates });
  
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ [updateIngredient] Error de Supabase:`, error);
      throw error;
    }
    
    console.log(`✅ [updateIngredient] Actualización exitosa:`, data);
    
    // 🔥 Si se actualizó el stock, verificar si hay alertas que resolver
    if (updates.stock_quantity !== undefined && data) {
      await autoResolveAlerts(id, data.stock_quantity, data.min_stock_alert);
    }
    
    return data;
  } catch (error: any) {
    console.error(`❌ [updateIngredient] Error en try-catch:`, error);
    throw error;
  }
};

// ─── Gestión de Alertas de Inventario ────────────────────────────────────────

/**
 * Auto-resolver alertas cuando el stock vuelve a niveles normales
 */
async function autoResolveAlerts(ingredientId: string, currentStock: number, minAlert: number) {
  try {
    // Si el stock está por encima del mínimo, resolver alertas activas
    if (currentStock > minAlert) {
      console.log(`🔔 [autoResolveAlerts] Stock normalizado (${currentStock} > ${minAlert}), resolviendo alertas...`);
      
      const { data, error } = await supabase
        .from('inventory_alerts')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('ingredient_id', ingredientId)
        .eq('resolved', false)
        .select();
      
      if (error) {
        console.error(`❌ [autoResolveAlerts] Error:`, error);
      } else if (data && data.length > 0) {
        console.log(`✅ [autoResolveAlerts] ${data.length} alerta(s) resuelta(s)`);
      }
    }
  } catch (error) {
    console.error(`❌ [autoResolveAlerts] Error en try-catch:`, error);
    // No lanzar error, solo loguear (no queremos que falle la actualización por esto)
  }
}

/**
 * Marcar una alerta específica como resuelta
 */
export const resolveAlert = async (alertId: string) => {
  const { data, error } = await supabase
    .from('inventory_alerts')
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString() 
    })
    .eq('id', alertId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Resolver todas las alertas de un ingrediente
 */
export const resolveAlertsByIngredient = async (ingredientId: string) => {
  const { data, error } = await supabase
    .from('inventory_alerts')
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString() 
    })
    .eq('ingredient_id', ingredientId)
    .eq('resolved', false)
    .select();
  
  if (error) throw error;
  return data;
};

// ─── Promociones ──────────────────────────────────────────────────────────────

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

// ============================================
// MÉTRICAS Y ANÁLISIS ADMINISTRATIVOS
// ============================================

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

export const getSalesByProduct = async (days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, total_price, product:products(name, base_price, image_url)')
    .gte('created_at', since);

  if (error) throw error;

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

export const getSalesByHour = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, final_amount, status')
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'cancelled');

  if (error) throw error;

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
