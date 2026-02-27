import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getAdminMetrics, getIngredients, getAllPromotions, getAllProducts, getOrders,
  getInventoryAlerts, getSalesByProductRange, getSalesByHour, getSalesByDayOfWeek,
  updateIngredient, updatePromotion, updateProduct, updateOrderStatus,
  createPromotion, deletePromotion,
} from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/chat
//
// Max — Agente Autónomo de SmartBurger
// Chat conversacional con Gemini Function Calling (tool use).
// ─────────────────────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ActionResult {
  type: string;
  description: string;
  success: boolean;
}

// ─── Herramientas disponibles para Max (formato Gemini) ──────────────────────
const MAX_TOOLS = [
  // ── INGREDIENTES ────────────────────────────────────────────────────────────
  {
    name: 'update_ingredient_stock',
    description: 'Actualiza el stock (cantidad) de un ingrediente.',
    parameters: {
      type: 'object',
      properties: {
        ingredient_name: { type: 'string', description: 'Nombre exacto o parcial del ingrediente' },
        quantity: { type: 'number', description: 'Nueva cantidad de stock' },
      },
      required: ['ingredient_name', 'quantity'],
    },
  },
  {
    name: 'toggle_ingredient_available',
    description: 'Marca un ingrediente como disponible o no disponible. Úsalo cuando un ingrediente no puede usarse temporalmente aunque tenga stock.',
    parameters: {
      type: 'object',
      properties: {
        ingredient_name: { type: 'string', description: 'Nombre exacto o parcial del ingrediente' },
        available: { type: 'boolean', description: 'true = disponible, false = no disponible' },
      },
      required: ['ingredient_name', 'available'],
    },
  },
  // ── PRODUCTOS ────────────────────────────────────────────────────────────────
  {
    name: 'toggle_product',
    description: 'Activa o desactiva un producto del menú (visible/oculto para clientes).',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto' },
        active: { type: 'boolean', description: 'true = activo (visible), false = desactivado' },
      },
      required: ['product_name', 'active'],
    },
  },
  {
    name: 'set_product_featured',
    description: 'Destaca o quita de destacados un producto del menú.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto' },
        featured: { type: 'boolean', description: 'true = destacado, false = normal' },
      },
      required: ['product_name', 'featured'],
    },
  },
  {
    name: 'update_product_price',
    description: 'Cambia el precio base de un producto del menú.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto' },
        price: { type: 'number', description: 'Nuevo precio base (número positivo)' },
      },
      required: ['product_name', 'price'],
    },
  },
  {
    name: 'update_product_details',
    description: 'Edita los detalles de un producto: nombre, descripción, calorías o tiempo de preparación.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto a editar' },
        new_name: { type: 'string', description: 'Nuevo nombre (opcional)' },
        description: { type: 'string', description: 'Nueva descripción (opcional)' },
        calories: { type: 'number', description: 'Nuevas calorías (opcional)' },
        preparation_time: { type: 'number', description: 'Nuevo tiempo de preparación en minutos (opcional)' },
      },
      required: ['product_name'],
    },
  },
  // ── PROMOCIONES ──────────────────────────────────────────────────────────────
  {
    name: 'toggle_promotion',
    description: 'Activa o desactiva una promoción existente.',
    parameters: {
      type: 'object',
      properties: {
        promotion_name: { type: 'string', description: 'Nombre exacto o parcial de la promoción' },
        active: { type: 'boolean', description: 'true = activar, false = desactivar' },
      },
      required: ['promotion_name', 'active'],
    },
  },
  {
    name: 'update_promotion_value',
    description: 'Modifica el valor de descuento o la compra mínima de una promoción existente.',
    parameters: {
      type: 'object',
      properties: {
        promotion_name: { type: 'string', description: 'Nombre exacto o parcial de la promoción' },
        discount_value: { type: 'number', description: 'Nuevo valor de descuento (porcentaje o monto fijo, opcional)' },
        min_purchase: { type: 'number', description: 'Nueva compra mínima requerida (opcional)' },
        max_uses: { type: 'number', description: 'Nuevo máximo de usos (opcional)' },
      },
      required: ['promotion_name'],
    },
  },
  {
    name: 'create_promotion',
    description: 'Crea una nueva promoción. Úsala cuando el admin quiera lanzar un descuento nuevo.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la promoción' },
        description: { type: 'string', description: 'Descripción de la promoción (opcional)' },
        discount_type: {
          type: 'string',
          enum: ['percentage', 'fixed', 'combo'],
          description: 'Tipo: percentage (%), fixed (monto fijo), combo',
        },
        discount_value: { type: 'number', description: 'Valor del descuento (% o monto)' },
        min_purchase: { type: 'number', description: 'Compra mínima para aplicar (0 si no hay mínimo)' },
        end_date: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD (obligatoria)' },
        max_uses: { type: 'number', description: 'Número máximo de usos (opcional, omitir para ilimitado)' },
      },
      required: ['name', 'discount_type', 'discount_value', 'min_purchase', 'end_date'],
    },
  },
  {
    name: 'delete_promotion',
    description: 'Elimina permanentemente una promoción. Úsala solo si el admin confirma que quiere borrarla.',
    parameters: {
      type: 'object',
      properties: {
        promotion_name: { type: 'string', description: 'Nombre exacto o parcial de la promoción a eliminar' },
      },
      required: ['promotion_name'],
    },
  },
  // ── PEDIDOS ──────────────────────────────────────────────────────────────────
  {
    name: 'update_order_status',
    description: 'Cambia el estado de un pedido. Úsalo para confirmar, marcar como preparando, completar o cancelar pedidos.',
    parameters: {
      type: 'object',
      properties: {
        order_identifier: {
          type: 'string',
          description: 'Número de pedido (ej: "001"), nombre del cliente, o "último" para el más reciente',
        },
        status: {
          type: 'string',
          enum: ['confirmed', 'preparing', 'completed', 'cancelled'],
          description: 'Nuevo estado del pedido',
        },
      },
      required: ['order_identifier', 'status'],
    },
  },
  // ── CONSULTAS ANALÍTICAS (solo lectura) ──────────────────────────────────────
  {
    name: 'analyze_stock',
    description: 'Consulta el estado completo e actualizado del inventario. Muestra qué ingredientes están sin stock, cuáles tienen stock bajo, y genera recomendaciones de reposición con cantidades.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'analyze_sales_period',
    description: 'Analiza las ventas por producto, por hora del día y por día de la semana para un período. Úsalo cuando el admin pregunta qué se vende más, en qué horarios, qué día tiene más ventas.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Número de días a analizar hacia atrás (7, 14 o 30). Por defecto 7.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_active_orders',
    description: 'Obtiene los pedidos activos actuales (pendientes y en preparación). Úsalo cuando el admin quiere ver qué pedidos hay ahora mismo o cuántos están en cola.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_product_detail',
    description: 'Obtiene el detalle de ventas de un producto específico: unidades vendidas, ingresos totales, ticket promedio y su rendimiento en el período.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto' },
        days: { type: 'number', description: 'Días de histórico a analizar (por defecto 30)' },
      },
      required: ['product_name'],
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] }: { message: string; history: ChatMessage[] } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const metrics = await getAdminMetrics();

    if (!process.env.GEMINI_API_KEY) {
      const response = buildFallbackResponse(message, metrics);
      return NextResponse.json({ 
        success: true, 
        message: `⚠️ GEMINI_API_KEY no configurada. Respuesta básica:\n\n${response}`, 
        actions: [], 
        mock: true 
      });
    }

    try {
      const [ingredients, promotions, products, orders] = await Promise.all([
        getIngredients(),
        getAllPromotions(),
        getAllProducts(),
        getOrders(),
      ]);

      const systemContext = buildSystemContext(
        metrics, ingredients || [], promotions || [], products || [], orders || []
      );

      // Convertir historial a formato Gemini (user/model en lugar de user/assistant)
      const geminiHistory = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // Crear modelo con herramientas (usando modelo potente para function calling)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        systemInstruction: systemContext,
        tools: [{ functionDeclarations: MAX_TOOLS }],
      });

      const chat = model.startChat({
        history: geminiHistory,
      });

      let result = await chat.sendMessage(message);
      let response = result.response;
      const actionResults: ActionResult[] = [];

      // Procesar function calls si existen
      let functionCall = response.functionCalls()?.[0];
      
      while (functionCall) {
        const functionName = functionCall.name;
        const args = functionCall.args;

        console.log(`🔧 Max ejecutando: ${functionName}`, args);

        let actionResult: ActionResult;

        try {
          switch (functionName) {
            case 'update_ingredient_stock':
              actionResult = await executeUpdateStock(args.ingredient_name, args.quantity, ingredients || []);
              break;
            case 'toggle_ingredient_available':
              actionResult = await executeToggleIngredient(args.ingredient_name, args.available, ingredients || []);
              break;
            case 'toggle_product':
              actionResult = await executeToggleProduct(args.product_name, args.active, products || []);
              break;
            case 'set_product_featured':
              actionResult = await executeSetFeatured(args.product_name, args.featured, products || []);
              break;
            case 'update_product_price':
              actionResult = await executeUpdatePrice(args.product_name, args.price, products || []);
              break;
            case 'update_product_details':
              actionResult = await executeUpdateProductDetails(args, products || []);
              break;
            case 'toggle_promotion':
              actionResult = await executeTogglePromotion(args.promotion_name, args.active, promotions || []);
              break;
            case 'update_promotion_value':
              actionResult = await executeUpdatePromotion(args, promotions || []);
              break;
            case 'create_promotion':
              actionResult = await executeCreatePromotion(args);
              break;
            case 'delete_promotion':
              actionResult = await executeDeletePromotion(args.promotion_name, promotions || []);
              break;
            case 'update_order_status':
              actionResult = await executeUpdateOrderStatus(args.order_identifier, args.status, orders || []);
              break;
            case 'analyze_stock':
              actionResult = await executeAnalyzeStock();
              break;
            case 'analyze_sales_period':
              actionResult = await executeAnalyzeSalesPeriod(args.days || 7);
              break;
            case 'get_active_orders':
              actionResult = await executeGetActiveOrders();
              break;
            case 'get_product_detail':
              actionResult = await executeGetProductDetail(args.product_name, args.days || 30, products || []);
              break;
            default:
              actionResult = { type: functionName, description: 'Acción desconocida', success: false };
          }
        } catch (e: any) {
          actionResult = { type: functionName, description: `Error: ${e.message}`, success: false };
        }

        actionResults.push(actionResult);

        // Enviar resultado de la función de vuelta a Gemini
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: functionName,
              response: { result: actionResult.description },
            },
          },
        ]);

        response = result.response;
        functionCall = response.functionCalls()?.[0];
      }

      // Obtener respuesta final de texto
      const finalText = response.text();

      return NextResponse.json({
        success: true,
        message: finalText,
        actions: actionResults,
        mock: false,
      });

    } catch (aiError: any) {
      console.error('❌ Error Gemini:', aiError);
      
      const fallback = buildFallbackResponse(message, metrics);
      return NextResponse.json({
        success: true,
        message: `⚠️ Error con Gemini. Respuesta básica:\n\n${fallback}`,
        actions: [],
        mock: true,
        error: aiError.message,
      });
    }

  } catch (error: any) {
    console.error('❌ Admin chat error:', error);
    return NextResponse.json(
      { error: 'Error en el chat', details: error.message },
      { status: 500 }
    );
  }
}

// ─── Ejecutores ───────────────────────────────────────────────────────────────

async function executeUpdateStock(name: string, quantity: number, ingredients: any[]): Promise<ActionResult> {
  const match = findByName(ingredients, name);
  if (!match) return { type: 'update_stock', description: `No encontré ingrediente "${name}"`, success: false };
  await updateIngredient(match.id, { stock_quantity: quantity });
  return { type: 'update_stock', description: `Stock de "${match.name}" actualizado a ${quantity} ${match.unit}`, success: true };
}

async function executeToggleIngredient(name: string, available: boolean, ingredients: any[]): Promise<ActionResult> {
  const match = findByName(ingredients, name);
  if (!match) return { type: 'toggle_ingredient', description: `No encontré ingrediente "${name}"`, success: false };
  await updateIngredient(match.id, { available });
  return {
    type: 'toggle_ingredient',
    description: `Ingrediente "${match.name}" marcado como ${available ? 'disponible' : 'no disponible'}`,
    success: true,
  };
}

async function executeToggleProduct(name: string, active: boolean, products: any[]): Promise<ActionResult> {
  const match = findByName(products, name);
  if (!match) return { type: 'toggle_product', description: `No encontré producto "${name}"`, success: false };
  await updateProduct(match.id, { active });
  return { type: 'toggle_product', description: `Producto "${match.name}" ${active ? 'activado' : 'desactivado'} en el menú`, success: true };
}

async function executeSetFeatured(name: string, featured: boolean, products: any[]): Promise<ActionResult> {
  const match = findByName(products, name);
  if (!match) return { type: 'set_featured', description: `No encontré producto "${name}"`, success: false };
  await updateProduct(match.id, { featured });
  return { type: 'set_featured', description: `"${match.name}" ${featured ? 'marcado como destacado' : 'quitado de destacados'}`, success: true };
}

async function executeUpdatePrice(name: string, price: number, products: any[]): Promise<ActionResult> {
  if (price <= 0) return { type: 'update_price', description: 'El precio debe ser mayor a 0', success: false };
  const match = findByName(products, name);
  if (!match) return { type: 'update_price', description: `No encontré producto "${name}"`, success: false };
  const oldPrice = match.base_price;
  await updateProduct(match.id, { base_price: price });
  return { type: 'update_price', description: `Precio de "${match.name}" actualizado: $${oldPrice} → $${price}`, success: true };
}

async function executeUpdateProductDetails(args: any, products: any[]): Promise<ActionResult> {
  const match = findByName(products, args.product_name);
  if (!match) return { type: 'update_product', description: `No encontré producto "${args.product_name}"`, success: false };

  const updates: any = {};
  const changes: string[] = [];
  if (args.new_name) { updates.name = args.new_name; changes.push(`nombre → "${args.new_name}"`); }
  if (args.description !== undefined) { updates.description = args.description; changes.push('descripción actualizada'); }
  if (args.calories !== undefined) { updates.calories = args.calories; changes.push(`${args.calories} kcal`); }
  if (args.preparation_time !== undefined) { updates.preparation_time = args.preparation_time; changes.push(`${args.preparation_time} min prep`); }

  if (Object.keys(updates).length === 0) {
    return { type: 'update_product', description: 'No se especificaron campos a actualizar', success: false };
  }
  await updateProduct(match.id, updates);
  return { type: 'update_product', description: `"${match.name}" actualizado: ${changes.join(', ')}`, success: true };
}

async function executeTogglePromotion(name: string, active: boolean, promotions: any[]): Promise<ActionResult> {
  const match = findByName(promotions, name);
  if (!match) return { type: 'toggle_promotion', description: `No encontré promoción "${name}"`, success: false };
  await updatePromotion(match.id, { active });
  return { type: 'toggle_promotion', description: `Promoción "${match.name}" ${active ? 'activada' : 'desactivada'}`, success: true };
}

async function executeUpdatePromotion(args: any, promotions: any[]): Promise<ActionResult> {
  const match = findByName(promotions, args.promotion_name);
  if (!match) return { type: 'update_promotion', description: `No encontré promoción "${args.promotion_name}"`, success: false };

  const updates: any = {};
  const changes: string[] = [];
  if (args.discount_value !== undefined) { updates.discount_value = args.discount_value; changes.push(`descuento → ${args.discount_value}`); }
  if (args.min_purchase !== undefined) { updates.min_purchase = args.min_purchase; changes.push(`mínimo → $${args.min_purchase}`); }
  if (args.max_uses !== undefined) { updates.max_uses = args.max_uses; changes.push(`máx usos → ${args.max_uses}`); }

  if (Object.keys(updates).length === 0) {
    return { type: 'update_promotion', description: 'No se especificaron campos a actualizar', success: false };
  }
  await updatePromotion(match.id, updates);
  return { type: 'update_promotion', description: `Promoción "${match.name}" actualizada: ${changes.join(', ')}`, success: true };
}

async function executeCreatePromotion(args: any): Promise<ActionResult> {
  const today = new Date().toISOString().split('T')[0];
  await createPromotion({
    name: args.name,
    description: args.description || '',
    discount_type: args.discount_type,
    discount_value: args.discount_value,
    min_purchase: args.min_purchase,
    start_date: today,
    end_date: args.end_date,
    active: true,
    max_uses: args.max_uses || null,
  });
  const typeLabel = args.discount_type === 'percentage' ? `${args.discount_value}% dto` : `$${args.discount_value} dto`;
  return {
    type: 'create_promotion',
    description: `Promoción "${args.name}" creada (${typeLabel}, mínimo $${args.min_purchase}, válida hasta ${args.end_date})`,
    success: true,
  };
}

async function executeDeletePromotion(name: string, promotions: any[]): Promise<ActionResult> {
  const match = findByName(promotions, name);
  if (!match) return { type: 'delete_promotion', description: `No encontré promoción "${name}"`, success: false };
  await deletePromotion(match.id);
  return { type: 'delete_promotion', description: `Promoción "${match.name}" eliminada permanentemente`, success: true };
}

async function executeUpdateOrderStatus(identifier: string, status: string, orders: any[]): Promise<ActionResult> {
  let match: any = null;

  const id = identifier.toLowerCase().trim();
  if (id === 'último' || id === 'ultimo' || id === 'last') {
    match = orders[0]; // getOrders ya viene ordenado por fecha desc
  } else {
    match = orders.find(o =>
      o.order_number?.toLowerCase().includes(id) ||
      (o.customer_name || '').toLowerCase().includes(id) ||
      (o.customer_email || '').toLowerCase().includes(id)
    );
  }

  if (!match) return { type: 'update_order', description: `No encontré pedido "${identifier}"`, success: false };

  await updateOrderStatus(match.id, status);
  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmado',
    preparing: 'En preparación',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return {
    type: 'update_order',
    description: `Pedido ${match.order_number} (${match.customer_name || 'cliente'}) → ${statusLabel[status] || status}`,
    success: true,
  };
}

// ─── Ejecutores de consulta analítica (solo lectura) ─────────────────────────

async function executeAnalyzeStock(): Promise<ActionResult> {
  const [freshIngredients, freshAlerts] = await Promise.all([
    getIngredients(),
    getInventoryAlerts(false),
  ]);

  const all = freshIngredients || [];
  const outOfStock = all.filter(i => i.stock_quantity === 0 || !i.available);
  const lowStock = all.filter(i => i.stock_quantity > 0 && i.stock_quantity <= i.min_stock_alert && i.available);
  const ok = all.filter(i => i.stock_quantity > i.min_stock_alert && i.available);

  const lines: string[] = [
    `Inventario actualizado (${all.length} ingredientes):`,
    `⛔ Sin stock / no disponible: ${outOfStock.length}`,
    ...outOfStock.map(i => `  • ${i.name}: ${i.stock_quantity} ${i.unit} — reponer mín ${i.min_stock_alert} ${i.unit}`),
    `⚠️ Stock bajo: ${lowStock.length}`,
    ...lowStock.map(i => `  • ${i.name}: ${i.stock_quantity}/${i.min_stock_alert} ${i.unit}`),
    `✅ En orden: ${ok.length} ingredientes`,
    freshAlerts && freshAlerts.length > 0 ? `Alertas activas: ${freshAlerts.length}` : 'Sin alertas sin resolver',
  ];

  return { type: 'analyze_stock', description: lines.join('\n'), success: true };
}

async function executeAnalyzeSalesPeriod(days: number): Promise<ActionResult> {
  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [products, hourly, byDay] = await Promise.all([
    getSalesByProductRange(fromDate, toDate),
    getSalesByHour(),
    getSalesByDayOfWeek(days),
  ]);

  const topProds = products.slice(0, 8).map((p, i) => {
    const avg = p.totalQuantity > 0 ? (p.totalRevenue / p.totalQuantity).toFixed(2) : '0';
    return `  ${i + 1}. ${p.product?.name}: ${p.totalQuantity} uds · $${p.totalRevenue.toFixed(2)} · $${avg}/ud`;
  });

  const peakHour = hourly.filter(h => h.orders > 0).reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0, sales: 0 });
  const activeHours = hourly.filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 3);

  const peakDay = byDay.filter(d => d.orders > 0).reduce((max, d) => d.orders > max.orders ? d : max, { day: 'Sin datos', orders: 0, sales: 0 });
  const activeDays = byDay.filter(d => d.orders > 0).sort((a, b) => b.orders - a.orders);

  const lines: string[] = [
    `Análisis ventas últimos ${days} días (${fromDate} → ${toDate}):`,
    ``,
    `TOP PRODUCTOS (${products.length} en total):`,
    ...topProds,
    topProds.length === 0 ? '  Sin ventas en el período' : '',
    ``,
    `HORARIOS (hoy):`,
    activeHours.length > 0
      ? activeHours.map(h => `  • ${h.hour}:00h — ${h.orders} pedidos · $${h.sales.toFixed(2)}`).join('\n')
      : '  Sin datos de hoy todavía',
    peakHour.orders > 0 ? `  → Pico: ${peakHour.hour}:00h` : '',
    ``,
    `DÍAS DE LA SEMANA (últimos ${days} días):`,
    activeDays.length > 0
      ? activeDays.map(d => `  • ${d.day}: ${d.orders} pedidos · $${d.sales.toFixed(2)}`).join('\n')
      : '  Sin datos suficientes',
    activeDays.length > 0 ? `  → Día más activo: ${peakDay.day} (${peakDay.orders} pedidos)` : '',
  ];

  return { type: 'analyze_sales', description: lines.filter(l => l !== '').join('\n'), success: true };
}

async function executeGetActiveOrders(): Promise<ActionResult> {
  const orders = await getOrders();
  const active = (orders || []).filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'confirmed');

  if (active.length === 0) {
    return { type: 'get_active_orders', description: 'No hay pedidos activos en este momento.', success: true };
  }

  const statusLabel: Record<string, string> = {
    pending: '⏳ Pendiente',
    confirmed: '✅ Confirmado',
    preparing: '👨‍🍳 Preparando',
  };

  const lines = [
    `Pedidos activos: ${active.length}`,
    ...active.map(o => {
      const mins = Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000);
      return `  • ${o.order_number} | ${o.customer_name || 'sin nombre'} | $${parseFloat(String(o.final_amount)).toFixed(2)} | ${statusLabel[o.status] || o.status} | hace ${mins} min`;
    }),
  ];

  return { type: 'get_active_orders', description: lines.join('\n'), success: true };
}

async function executeGetProductDetail(name: string, days: number, products: any[]): Promise<ActionResult> {
  const match = findByName(products, name);
  if (!match) return { type: 'get_product_detail', description: `No encontré producto "${name}"`, success: false };

  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sales = await getSalesByProductRange(fromDate, toDate);

  const productSales = sales.find(p => p.product?.name === match.name);

  const lines = [
    `Detalle de "${match.name}" (últimos ${days} días):`,
    `  Precio actual: $${match.base_price}`,
    `  Estado: ${match.active ? 'activo' : 'inactivo'}${match.featured ? ', destacado' : ''}`,
    productSales
      ? [
          `  Unidades vendidas: ${productSales.totalQuantity}`,
          `  Ingresos totales: $${productSales.totalRevenue.toFixed(2)}`,
          `  Ticket promedio: $${productSales.totalQuantity > 0 ? (productSales.totalRevenue / productSales.totalQuantity).toFixed(2) : '0'}`,
          `  Rank en ventas: #${sales.indexOf(productSales) + 1} de ${sales.length} productos`,
        ].join('\n')
      : '  Sin ventas registradas en el período.',
  ];

  return { type: 'get_product_detail', description: lines.join('\n'), success: true };
}

// ─── Utilidad de búsqueda por nombre ─────────────────────────────────────────
function findByName(list: any[], query: string) {
  const q = query.toLowerCase();
  return list.find(item =>
    item.name?.toLowerCase().includes(q) || q.includes(item.name?.toLowerCase())
  ) || null;
}

// ─── Contexto del sistema ─────────────────────────────────────────────────────
function buildSystemContext(
  metrics: Awaited<ReturnType<typeof getAdminMetrics>>,
  ingredients: any[],
  promotions: any[],
  products: any[],
  orders: any[]
) {
  const { salesByProduct, salesByHour, criticalStock, recentOrders, yesterdaySales } = metrics;

  const topProds = salesByProduct.slice(0, 8).map(p =>
    `  - ${p.product?.name}: ${p.totalQuantity} uds · $${p.totalRevenue.toFixed(2)}`
  ).join('\n') || '  Sin ventas esta semana.';

  const stockInfo = criticalStock.length > 0
    ? criticalStock.map(a =>
        `  - ${a.ingredient?.name}: ${a.alert_type === 'out_of_stock' ? '⚠️ SIN STOCK' : '🔶 BAJO'}`
      ).join('\n')
    : '  Sin alertas de stock.';

  const ingList = ingredients.map(i =>
    `  - ${i.name} (stock: ${i.stock_quantity} ${i.unit}, disponible: ${i.available ? 'sí' : 'NO'})`
  ).join('\n') || '  Sin ingredientes.';

  const promoList = promotions.length > 0
    ? promotions.map(p => `  - "${p.name}" (${p.active ? 'ACTIVA' : 'inactiva'}, ${p.discount_type} ${p.discount_value}, mín $${p.min_purchase})`).join('\n')
    : '  Sin promociones.';

  const prodList = products.slice(0, 15).map(p =>
    `  - "${p.name}" $${p.base_price} (${p.active ? 'activo' : 'inactivo'}${p.featured ? ', destacado' : ''})`
  ).join('\n') || '  Sin productos.';

  const recentOrdersList = orders.slice(0, 8).map(o =>
    `  - ${o.order_number} | ${o.customer_name || 'cliente'} | $${parseFloat(String(o.final_amount)).toFixed(2)} | ${o.status}`
  ).join('\n') || '  Sin pedidos recientes.';

  const activeHours = salesByHour.filter(h => h.orders > 0);
  const peakHour = activeHours.length > 0
    ? activeHours.reduce((max, h) => h.orders > max.orders ? h : max)
    : null;

  return `Eres Max, el analista y asistente operativo de SmartBurger.

IDENTIDAD:
- Directo, preciso, con datos. Sin relleno.
- Cuando hay un problema lo dices primero.
- Cuando el admin pide una acción, la ejecutas con tus herramientas y confirmas brevemente.
- Si algo no está en los datos, lo dices sin inventar.
- Siempre en español.

CAPACIDADES:
Ingredientes: actualizar stock, marcar disponible/no disponible
Productos: activar/desactivar, destacar, cambiar precio, editar nombre/descripción/calorías/tiempo
Promociones: activar/desactivar, crear nuevas, editar valor/mínimo/usos, eliminar
Pedidos: cambiar estado (confirmar, preparando, completado, cancelado)

DATOS DEL RESTAURANTE:

VENTAS ESTA SEMANA:
${topProds}

PEDIDOS DE HOY: Total ${recentOrders.total} | Completados ${recentOrders.completed} | Cancelados ${recentOrders.cancelled}
Ticket promedio: $${recentOrders.avgTicket} | Ayer: $${yesterdaySales.toFixed(2)}
${peakHour ? `Hora pico: ${peakHour.hour}:00 h (${peakHour.orders} pedidos)` : 'Sin pedidos hoy'}

INVENTARIO CRÍTICO:
${stockInfo}

INGREDIENTES:
${ingList}

PROMOCIONES:
${promoList}

PRODUCTOS:
${prodList}

PEDIDOS RECIENTES:
${recentOrdersList}`;
}

// ─── Fallback sin Gemini ─────────────────────────────────────────────────────
function buildFallbackResponse(message: string, metrics: Awaited<ReturnType<typeof getAdminMetrics>>) {
  const msg = message.toLowerCase();
  const { salesByProduct, criticalStock, recentOrders, promotions } = metrics;

  if (msg.includes('hola') || msg.includes('buen')) {
    return `Max aquí. Sin conexión a IA activa, pero puedo responder preguntas básicas sobre ventas, stock y promociones.`;
  }
  if (msg.includes('stock') || msg.includes('inventario') || msg.includes('reponer')) {
    if (criticalStock.length === 0) return 'Inventario en orden. Sin alertas activas.';
    const out = criticalStock.filter(a => a.alert_type === 'out_of_stock');
    const low = criticalStock.filter(a => a.alert_type === 'low_stock');
    let resp = '';
    if (out.length > 0) resp += `SIN STOCK: ${out.map(a => a.ingredient?.name).join(', ')}.\n`;
    if (low.length > 0) resp += `Stock bajo: ${low.map(a => a.ingredient?.name).join(', ')}.`;
    return resp.trim();
  }
  if (msg.includes('vend') || msg.includes('top') || msg.includes('producto')) {
    if (salesByProduct.length === 0) return 'Sin ventas esta semana.';
    return salesByProduct.slice(0, 3).map((p, i) =>
      `${i + 1}. ${p.product?.name} — ${p.totalQuantity} uds`
    ).join('\n');
  }
  if (msg.includes('promo')) {
    return promotions.length > 0
      ? `${promotions.length} promoción(es): ${(promotions as any[]).map(p => `${p.name} (${p.active ? 'activa' : 'inactiva'})`).join(', ')}.`
      : 'Sin promociones registradas.';
  }
  return `Sin IA activa — puedo responder sobre ventas, stock o promociones. Para acciones necesitas GEMINI_API_KEY configurada.`;
}
