import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getAdminMetrics, getIngredients, getAllPromotions, getAllProducts, getOrders,
  getInventoryAlerts, getSalesByProductRange, getSalesByHour, getSalesByDayOfWeek,
  updateIngredient, updatePromotion, updateProduct, updateOrderStatus,
  createPromotion, deletePromotion, createProduct, createIngredient, deleteProduct,
  resolveAlertsByIngredient,
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
  // ── CREAR / ELIMINAR PRODUCTOS ───────────────────────────────────────────────
  {
    name: 'create_product',
    description: 'Crea un nuevo producto en el menú. Úsalo cuando el admin quiera agregar un plato, bebida o acompañamiento nuevo.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del producto' },
        description: { type: 'string', description: 'Descripción del producto (opcional)' },
        base_price: { type: 'number', description: 'Precio base del producto' },
        calories: { type: 'number', description: 'Calorías (opcional)' },
        preparation_time: { type: 'number', description: 'Tiempo de preparación en minutos (por defecto 10)' },
        active: { type: 'boolean', description: 'Si debe estar visible en el menú desde el inicio (por defecto true)' },
        featured: { type: 'boolean', description: 'Si debe aparecer como destacado (por defecto false)' },
      },
      required: ['name', 'base_price'],
    },
  },
  {
    name: 'delete_product',
    description: 'Elimina permanentemente un producto del menú. CUIDADO: acción irreversible. Pide confirmación al admin antes de ejecutar.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Nombre exacto o parcial del producto a eliminar' },
      },
      required: ['product_name'],
    },
  },
  // ── CREAR / EDITAR INGREDIENTES ──────────────────────────────────────────────
  {
    name: 'create_ingredient',
    description: 'Crea un nuevo ingrediente en el inventario. Úsalo cuando el admin quiera registrar un ingrediente nuevo.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del ingrediente' },
        unit: { type: 'string', description: 'Unidad de medida: unidad, gramo, ml, kg, litro (por defecto: unidad)' },
        stock_quantity: { type: 'number', description: 'Stock inicial (por defecto 0)' },
        min_stock_alert: { type: 'number', description: 'Cantidad mínima antes de alertar (por defecto 10)' },
        price: { type: 'number', description: 'Precio extra si es personalización cobrada (por defecto 0)' },
        is_allergen: { type: 'boolean', description: 'Si es alérgeno (por defecto false)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_ingredient_info',
    description: 'Edita la información de un ingrediente (nombre, unidad, mínimo de alerta, precio extra). Diferente de update_ingredient_stock que solo cambia la cantidad.',
    parameters: {
      type: 'object',
      properties: {
        ingredient_name: { type: 'string', description: 'Nombre actual del ingrediente a editar' },
        new_name: { type: 'string', description: 'Nuevo nombre (opcional)' },
        unit: { type: 'string', description: 'Nueva unidad de medida (opcional)' },
        min_stock_alert: { type: 'number', description: 'Nuevo umbral de alerta (opcional)' },
        price: { type: 'number', description: 'Nuevo precio extra (opcional)' },
        is_allergen: { type: 'boolean', description: 'Si es alérgeno o no (opcional)' },
      },
      required: ['ingredient_name'],
    },
  },
  // ── PEDIDOS ──────────────────────────────────────────────────────────────────
  {
    name: 'get_order_detail',
    description: 'Obtiene el detalle completo de un pedido específico: items, cantidades, customizaciones, total y estado. Úsalo cuando el admin quiere ver qué lleva un pedido concreto.',
    parameters: {
      type: 'object',
      properties: {
        order_identifier: {
          type: 'string',
          description: 'Número de pedido (ej: "001"), nombre del cliente, o "último" para el más reciente',
        },
      },
      required: ['order_identifier'],
    },
  },
  // ── INVENTARIO ───────────────────────────────────────────────────────────────
  {
    name: 'bulk_update_stock',
    description: 'Actualiza el stock de MÚLTIPLES ingredientes a la vez con una sola instrucción. Úsalo cuando el admin diga "llegó el pedido" o liste varios ingredientes de una vez.',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Lista de actualizaciones de stock',
          items: {
            type: 'object',
            properties: {
              ingredient_name: { type: 'string', description: 'Nombre del ingrediente' },
              quantity: { type: 'number', description: 'Nueva cantidad de stock' },
            },
          },
        },
      },
      required: ['updates'],
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] }: { message: string; history: ChatMessage[] } = await request.json();

    console.log('\n🎯 ========== ADMIN CHAT REQUEST ==========');
    console.log('📝 Mensaje recibido:', message);
    console.log('📚 Historial:', history.length, 'mensajes');

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
      console.log('🔍 Construyendo contexto del sistema (SIN cachear datos)...');
      
      // NO cargar datos aquí - cada función debe consultar DB en tiempo real
      const systemContext = await buildDynamicSystemContext(metrics);

      // Convertir historial a formato Gemini (user/model en lugar de user/assistant)
      const geminiHistory = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      console.log('🤖 Iniciando chat con Gemini (gemini-2.5-pro)...');

      // Crear modelo con herramientas (usando modelo potente para function calling)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemContext,
        tools: [{ functionDeclarations: MAX_TOOLS as any }],
      });

      const chat = model.startChat({
        history: geminiHistory,
      });

      console.log('📤 Enviando mensaje a Gemini...');
      let result = await chat.sendMessage(message);
      let response = result.response;
      console.log('📥 Respuesta recibida de Gemini');
      const actionResults: ActionResult[] = [];

      // Procesar function calls si existen
      let functionCall = response.functionCalls()?.[0];
      
      if (functionCall) {
        console.log('🔧 Gemini quiere ejecutar función:', functionCall.name);
      } else {
        console.log('💬 Gemini respondió solo con texto (sin función)');
      }
      
      while (functionCall) {
        const functionName = functionCall.name;
        const args = functionCall.args as any;

        console.log(`🔧 Max ejecutando: ${functionName}`, JSON.stringify(args, null, 2));

        let actionResult: ActionResult;

        try {
          // 🔥 TODAS las funciones consultan DB en tiempo real (NO usan cache)
          switch (functionName) {
            case 'update_ingredient_stock':
              console.log('➡️  Ejecutando update_ingredient_stock con:', args);
              actionResult = await executeUpdateStock(args.ingredient_name, args.quantity);
              console.log('✅ Resultado:', actionResult);
              break;
            case 'toggle_ingredient_available':
              console.log('➡️  Ejecutando toggle_ingredient_available con:', args);
              actionResult = await executeToggleIngredient(args.ingredient_name, args.available);
              console.log('✅ Resultado:', actionResult);
              break;
            case 'toggle_product':
              actionResult = await executeToggleProduct(args.product_name, args.active);
              break;
            case 'set_product_featured':
              actionResult = await executeSetFeatured(args.product_name, args.featured);
              break;
            case 'update_product_price':
              actionResult = await executeUpdatePrice(args.product_name, args.price);
              break;
            case 'update_product_details':
              actionResult = await executeUpdateProductDetails(args);
              break;
            case 'toggle_promotion':
              actionResult = await executeTogglePromotion(args.promotion_name, args.active);
              break;
            case 'update_promotion_value':
              actionResult = await executeUpdatePromotion(args);
              break;
            case 'create_promotion':
              actionResult = await executeCreatePromotion(args);
              break;
            case 'delete_promotion':
              actionResult = await executeDeletePromotion(args.promotion_name);
              break;
            case 'update_order_status':
              actionResult = await executeUpdateOrderStatus(args.order_identifier, args.status);
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
              actionResult = await executeGetProductDetail(args.product_name, args.days || 30);
              break;
            case 'create_product':
              actionResult = await executeCreateProduct(args);
              break;
            case 'delete_product':
              actionResult = await executeDeleteProduct(args.product_name);
              break;
            case 'create_ingredient':
              actionResult = await executeCreateIngredient(args);
              break;
            case 'update_ingredient_info':
              actionResult = await executeUpdateIngredientInfo(args);
              break;
            case 'get_order_detail':
              actionResult = await executeGetOrderDetail(args.order_identifier);
              break;
            case 'bulk_update_stock':
              actionResult = await executeBulkUpdateStock(args.updates);
              break;
            default:
              actionResult = { type: functionName, description: 'Acción desconocida', success: false };
          }
        } catch (e: any) {
          console.error('❌ Error ejecutando función:', e);
          actionResult = { type: functionName, description: `Error: ${e.message}`, success: false };
        }

        actionResults.push(actionResult);
        console.log('📊 Acción agregada a resultados. Total:', actionResults.length);

        // Enviar resultado de la función de vuelta a Gemini
        console.log('📤 Enviando resultado de función a Gemini...');
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: functionName,
              response: { result: actionResult.description },
            },
          },
        ]);

        response = result.response;
        console.log('📥 Nueva respuesta de Gemini recibida');
        functionCall = response.functionCalls()?.[0];
        
        if (functionCall) {
          console.log('🔧 Gemini quiere ejecutar otra función:', functionCall.name);
        } else {
          console.log('✅ Gemini terminó de ejecutar funciones');
        }
      }

      // Obtener respuesta final de texto (con manejo de error)
      console.log('📝 Intentando obtener respuesta de texto final...');
      let finalText = '';
      try {
        finalText = response.text();
        console.log('✅ Texto obtenido exitosamente:', finalText.substring(0, 100) + '...');
      } catch (parseError: any) {
        console.error('❌ Error al parsear respuesta final de Gemini:', parseError);
        console.error('❌ Detalles del error:', parseError.message);
        console.error('❌ Stack:', parseError.stack);
        
        // Si hay acciones ejecutadas, resumir el resultado
        if (actionResults.length > 0) {
          const lastAction = actionResults[actionResults.length - 1];
          finalText = lastAction.description;
          console.log('⚠️  Usando resultado de última acción como fallback:', finalText);
        } else {
          finalText = 'Acción completada.';
          console.log('⚠️  Usando mensaje genérico como fallback');
        }
      }

      console.log('🎉 ========== ADMIN CHAT SUCCESS ==========\n');
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

// ─── Ejecutores (TODOS consultan DB en tiempo real) ──────────────────────────

async function executeUpdateStock(name: string, quantity: number): Promise<ActionResult> {
  console.log(`🔍 [executeUpdateStock] Buscando ingrediente en DB: "${name}"`);
  console.log(`📦 [executeUpdateStock] Cantidad a actualizar: ${quantity}`);
  
  try {
    // 🔥 Consultar DB en tiempo real (NO usar cache)
    const ingredients = await getIngredients();
    console.log(`📊 [executeUpdateStock] ${ingredients?.length} ingredientes en DB`);
    
    const match = findByName(ingredients || [], name);
    
    if (!match) {
      console.log(`❌ [executeUpdateStock] No se encontró ingrediente "${name}"`);
      return { type: 'update_stock', description: `No encontré ingrediente "${name}"`, success: false };
    }
    
    console.log(`✅ [executeUpdateStock] Ingrediente encontrado:`, {
      id: match.id,
      name: match.name,
      stock_actual: match.stock_quantity,
      unit: match.unit
    });
    
    console.log(`🔄 [executeUpdateStock] Actualizando DB: ${match.name} -> ${quantity} ${match.unit}`);
    const result = await updateIngredient(match.id, { stock_quantity: quantity });
    console.log(`✅ [executeUpdateStock] Base de datos actualizada:`, result);
    
    return { 
      type: 'update_stock', 
      description: `Hecho. Stock de ${match.name} actualizado a ${quantity} ${match.unit}.`, 
      success: true 
    };
  } catch (error: any) {
    console.error(`❌ [executeUpdateStock] Error:`, error);
    return { 
      type: 'update_stock', 
      description: `Error al actualizar stock: ${error.message}`, 
      success: false 
    };
  }
}

async function executeToggleIngredient(name: string, available: boolean): Promise<ActionResult> {
  const ingredients = await getIngredients(); // 🔥 Query DB en tiempo real
  const match = findByName(ingredients || [], name);
  if (!match) return { type: 'toggle_ingredient', description: `No encontré ingrediente "${name}"`, success: false };
  await updateIngredient(match.id, { available });
  return {
    type: 'toggle_ingredient',
    description: `Ingrediente "${match.name}" marcado como ${available ? 'disponible' : 'no disponible'}`,
    success: true,
  };
}

async function executeToggleProduct(name: string, active: boolean): Promise<ActionResult> {
  const products = await getAllProducts(); // 🔥 Query DB en tiempo real
  const match = findByName(products || [], name);
  if (!match) return { type: 'toggle_product', description: `No encontré producto "${name}"`, success: false };
  await updateProduct(match.id, { active });
  return { type: 'toggle_product', description: `Producto "${match.name}" ${active ? 'activado' : 'desactivado'} en el menú`, success: true };
}

async function executeSetFeatured(name: string, featured: boolean): Promise<ActionResult> {
  const products = await getAllProducts(); // 🔥 Query DB en tiempo real
  const match = findByName(products || [], name);
  if (!match) return { type: 'set_featured', description: `No encontré producto "${name}"`, success: false };
  await updateProduct(match.id, { featured });
  return { type: 'set_featured', description: `"${match.name}" ${featured ? 'marcado como destacado' : 'quitado de destacados'}`, success: true };
}

async function executeUpdatePrice(name: string, price: number): Promise<ActionResult> {
  if (price <= 0) return { type: 'update_price', description: 'El precio debe ser mayor a 0', success: false };
  const products = await getAllProducts(); // 🔥 Query DB en tiempo real
  const match = findByName(products || [], name);
  if (!match) return { type: 'update_price', description: `No encontré producto "${name}"`, success: false };
  const oldPrice = match.base_price;
  await updateProduct(match.id, { base_price: price });
  return { type: 'update_price', description: `Precio de "${match.name}" actualizado: $${oldPrice} → $${price}`, success: true };
}

async function executeUpdateProductDetails(args: any): Promise<ActionResult> {
  const products = await getAllProducts(); // 🔥 Query DB en tiempo real
  const match = findByName(products || [], args.product_name);
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
  return { type: 'update_product', description: `Producto "${match.name}" actualizado: ${changes.join(', ')}`, success: true };
}

async function executeTogglePromotion(name: string, active: boolean): Promise<ActionResult> {
  const promotions = await getAllPromotions(); // 🔥 Query DB en tiempo real
  const match = findByName(promotions || [], name);
  if (!match) return { type: 'toggle_promotion', description: `No encontré promoción "${name}"`, success: false };
  await updatePromotion(match.id, { active });
  return { type: 'toggle_promotion', description: `Promoción "${match.name}" ${active ? 'activada' : 'desactivada'}`, success: true };
}

async function executeUpdatePromotion(args: any): Promise<ActionResult> {
  const promotions = await getAllPromotions(); // 🔥 Query DB en tiempo real
  const match = findByName(promotions || [], args.promotion_name);
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
    description: `Promoción "${args.name}" creada: ${typeLabel}, mín $${args.min_purchase}`,
    success: true,
  };
}

async function executeDeletePromotion(name: string): Promise<ActionResult> {
  const promotions = await getAllPromotions(); // 🔥 Query DB en tiempo real
  const match = findByName(promotions || [], name);
  if (!match) return { type: 'delete_promotion', description: `No encontré promoción "${name}"`, success: false };
  await deletePromotion(match.id);
  return { type: 'delete_promotion', description: `Promoción "${match.name}" eliminada permanentemente`, success: true };
}

async function executeUpdateOrderStatus(identifier: string, status: string): Promise<ActionResult> {
  const orders = await getOrders(); // 🔥 Query DB en tiempo real
  let match: any = null;

  const id = identifier.toLowerCase().trim();
  if (id === 'último' || id === 'ultimo' || id === 'last') {
    match = (orders || [])[0]; // getOrders ya viene ordenado por fecha desc
  } else {
    match = (orders || []).find(o =>
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
  const orders = await getOrders(); // 🔥 Query DB en tiempo real
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
      return `  ${o.order_number} | ${o.customer_name || 'sin nombre'} | $${parseFloat(String(o.final_amount)).toFixed(2)} | ${statusLabel[o.status] || o.status} | hace ${mins} min`;
    }),
  ];

  return { type: 'get_active_orders', description: lines.join('\n'), success: true };
}

async function executeGetProductDetail(name: string, days: number): Promise<ActionResult> {
  const products = await getAllProducts(); // 🔥 Query DB en tiempo real
  const match = findByName(products || [], name);
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

async function executeCreateProduct(args: any): Promise<ActionResult> {
  try {
    const product = await createProduct({
      name: args.name,
      description: args.description || '',
      base_price: args.base_price,
      calories: args.calories || null,
      preparation_time: args.preparation_time || 10,
      active: args.active !== false,
      featured: args.featured || false,
    });
    return {
      type: 'create_product',
      description: `Producto "${product.name}" creado. Precio: $${product.base_price}. Estado: ${product.active ? 'activo en el menú' : 'inactivo'}`,
      success: true,
    };
  } catch (e: any) {
    return { type: 'create_product', description: `Error al crear producto: ${e.message}`, success: false };
  }
}

async function executeDeleteProduct(name: string): Promise<ActionResult> {
  const products = await getAllProducts();
  const match = findByName(products || [], name);
  if (!match) return { type: 'delete_product', description: `No encontré producto "${name}"`, success: false };
  try {
    await deleteProduct(match.id);
    return { type: 'delete_product', description: `Producto "${match.name}" eliminado permanentemente del sistema.`, success: true };
  } catch (e: any) {
    return { type: 'delete_product', description: `Error al eliminar: ${e.message}`, success: false };
  }
}

async function executeCreateIngredient(args: any): Promise<ActionResult> {
  try {
    const ingredient = await createIngredient({
      name: args.name,
      unit: args.unit || 'unidad',
      stock_quantity: args.stock_quantity ?? 0,
      min_stock_alert: args.min_stock_alert ?? 10,
      price: args.price ?? 0,
      is_allergen: args.is_allergen ?? false,
    });
    return {
      type: 'create_ingredient',
      description: `Ingrediente "${ingredient.name}" creado. Stock inicial: ${ingredient.stock_quantity} ${ingredient.unit}. Mínimo alerta: ${ingredient.min_stock_alert}.`,
      success: true,
    };
  } catch (e: any) {
    return { type: 'create_ingredient', description: `Error al crear ingrediente: ${e.message}`, success: false };
  }
}

async function executeUpdateIngredientInfo(args: any): Promise<ActionResult> {
  const ingredients = await getIngredients();
  const match = findByName(ingredients || [], args.ingredient_name);
  if (!match) return { type: 'update_ingredient_info', description: `No encontré ingrediente "${args.ingredient_name}"`, success: false };

  const updates: any = {};
  const changes: string[] = [];
  if (args.new_name) { updates.name = args.new_name; changes.push(`nombre → "${args.new_name}"`); }
  if (args.unit) { updates.unit = args.unit; changes.push(`unidad → ${args.unit}`); }
  if (args.min_stock_alert !== undefined) { updates.min_stock_alert = args.min_stock_alert; changes.push(`alerta mínima → ${args.min_stock_alert}`); }
  if (args.price !== undefined) { updates.price = args.price; changes.push(`precio extra → $${args.price}`); }
  if (args.is_allergen !== undefined) { updates.is_allergen = args.is_allergen; changes.push(args.is_allergen ? 'marcado como alérgeno' : 'alérgeno removido'); }

  if (changes.length === 0) {
    return { type: 'update_ingredient_info', description: 'No se especificaron campos a actualizar', success: false };
  }
  await updateIngredient(match.id, updates);
  return {
    type: 'update_ingredient_info',
    description: `Ingrediente "${match.name}" actualizado: ${changes.join(', ')}`,
    success: true,
  };
}

async function executeGetOrderDetail(identifier: string): Promise<ActionResult> {
  const orders = await getOrders();
  let match: any = null;

  const id = identifier.toLowerCase().trim();
  if (id === 'último' || id === 'ultimo' || id === 'last') {
    match = (orders || [])[0];
  } else {
    match = (orders || []).find((o: any) =>
      o.order_number?.toLowerCase().includes(id) ||
      (o.customer_name || '').toLowerCase().includes(id) ||
      (o.customer_email || '').toLowerCase().includes(id)
    );
  }

  if (!match) return { type: 'get_order_detail', description: `No encontré pedido "${identifier}"`, success: false };

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'En preparación',
    completed: 'Completado', cancelled: 'Cancelado',
  };

  const items = (match.items || []).map((item: any) => {
    let line = `  • ${item.quantity}x ${item.product?.name || 'Producto'} — $${parseFloat(String(item.unit_price)).toFixed(2)}/ud`;
    if (item.customizations && item.customizations.length > 0) {
      line += ` [${item.customizations.map((c: any) => c.name || c).join(', ')}]`;
    }
    if (item.notes) line += ` (${item.notes})`;
    return line;
  });

  const lines = [
    `Pedido ${match.order_number} — ${statusLabel[match.status] || match.status}`,
    `Cliente: ${match.customer_name || 'Sin nombre'} | ${match.customer_email || ''}`,
    `Fecha: ${new Date(match.created_at).toLocaleString('es-MX')}`,
    ``,
    `Items (${items.length}):`,
    ...items,
    items.length === 0 ? '  (sin items registrados)' : '',
    ``,
    `Subtotal: $${parseFloat(String(match.subtotal_amount || 0)).toFixed(2)}`,
    match.discount_amount > 0 ? `Descuento: -$${parseFloat(String(match.discount_amount)).toFixed(2)}` : '',
    `Total: $${parseFloat(String(match.final_amount)).toFixed(2)}`,
  ].filter(l => l !== '');

  return { type: 'get_order_detail', description: lines.join('\n'), success: true };
}

async function executeBulkUpdateStock(updates: Array<{ ingredient_name: string; quantity: number }>): Promise<ActionResult> {
  if (!updates || updates.length === 0) {
    return { type: 'bulk_update_stock', description: 'No se especificaron ingredientes a actualizar', success: false };
  }

  const ingredients = await getIngredients();
  const results: string[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const upd of updates) {
    const match = findByName(ingredients || [], upd.ingredient_name);
    if (!match) {
      results.push(`  ❌ "${upd.ingredient_name}" — no encontrado`);
      failCount++;
      continue;
    }
    try {
      await updateIngredient(match.id, { stock_quantity: upd.quantity });
      results.push(`  ✅ ${match.name}: ${upd.quantity} ${match.unit}`);
      successCount++;
    } catch (e: any) {
      results.push(`  ❌ ${match.name}: error — ${e.message}`);
      failCount++;
    }
  }

  return {
    type: 'bulk_update_stock',
    description: [`Actualización masiva de stock (${successCount} exitosos, ${failCount} fallidos):`, ...results].join('\n'),
    success: successCount > 0,
  };
}

// ─── Utilidad de búsqueda por nombre ─────────────────────────────────────────
function findByName(list: any[], query: string) {
  const q = query.toLowerCase();
  return list.find(item =>
    item.name?.toLowerCase().includes(q) || q.includes(item.name?.toLowerCase())
  ) || null;
}

// ─── Contexto del sistema DINÁMICO (consulta DB cada vez) ────────────────────
async function buildDynamicSystemContext(
  metrics: Awaited<ReturnType<typeof getAdminMetrics>>
) {
  // 🔥 Query DB en tiempo real para contexto fresco
  console.log('🔄 [buildDynamicSystemContext] Consultando DB para contexto fresco...');
  const [ingredients, promotions, products, orders] = await Promise.all([
    getIngredients(),
    getAllPromotions(),
    getAllProducts(),
    getOrders(),
  ]);
  console.log(`✅ [buildDynamicSystemContext] ${ingredients?.length} ingredientes, ${products?.length} productos, ${promotions?.length} promos, ${orders?.length} pedidos`);
  
  const { salesByProduct, salesByHour, criticalStock, recentOrders, yesterdaySales } = metrics;

  const topProds = salesByProduct.slice(0, 8).map(p =>
    `  - ${p.product?.name}: ${p.totalQuantity} uds · $${p.totalRevenue.toFixed(2)}`
  ).join('\n') || '  Sin ventas esta semana.';

  const stockInfo = criticalStock.length > 0
    ? criticalStock.map(a =>
        `  - ${a.ingredient?.name}: ${a.alert_type === 'out_of_stock' ? '⚠️ SIN STOCK' : '🔶 BAJO'}`
      ).join('\n')
    : '  Sin alertas de stock.';

  const ingList = (ingredients || []).map(i =>
    `  - ${i.name} (stock: ${i.stock_quantity} ${i.unit}, disponible: ${i.available ? 'sí' : 'NO'})`
  ).join('\n') || '  Sin ingredientes.';

  const promoList = (promotions || []).length > 0
    ? (promotions || []).map(p => `  - "${p.name}" (${p.active ? 'ACTIVA' : 'inactiva'}, ${p.discount_type} ${p.discount_value}, mín $${p.min_purchase})`).join('\n')
    : '  Sin promociones.';

  const prodList = (products || []).slice(0, 15).map(p =>
    `  - "${p.name}" $${p.base_price} (${p.active ? 'activo' : 'inactivo'}${p.featured ? ', destacado' : ''})`
  ).join('\n') || '  Sin productos.';

  const recentOrdersList = (orders || []).slice(0, 8).map(o =>
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
- Cuando el admin pide una acción, SOLO usa las herramientas (functions), NO respondas con texto antes de ejecutar.
- Una vez ejecutada la acción, confirma brevemente el resultado.
- Si algo no está en los datos, lo dices sin inventar.
- Siempre en español.
- IMPORTANTE: Si el admin dice "listo ya traje X unidades", "agregalas", "al faltante", etc., usa el CONTEXTO de la conversación anterior para saber a qué ingrediente se refiere.
- Para acciones destructivas (eliminar producto), confirma brevemente antes de ejecutar si no lo ha confirmado ya.

CAPACIDADES COMPLETAS:

📦 INGREDIENTES:
  - Actualizar stock de un ingrediente → update_ingredient_stock
  - Actualizar stock de VARIOS ingredientes a la vez → bulk_update_stock
  - Marcar disponible/no disponible → toggle_ingredient_available
  - Editar info (nombre, unidad, alerta mínima, precio extra) → update_ingredient_info
  - Crear nuevo ingrediente → create_ingredient
  - Ver análisis completo del inventario → analyze_stock

🍔 PRODUCTOS:
  - Activar/desactivar del menú → toggle_product
  - Destacar/quitar de destacados → set_product_featured
  - Cambiar precio → update_product_price
  - Editar nombre, descripción, calorías, tiempo → update_product_details
  - Ver detalle y ventas de un producto → get_product_detail
  - Crear nuevo producto → create_product
  - Eliminar producto → delete_product

🏷️ PROMOCIONES:
  - Activar/desactivar → toggle_promotion
  - Crear nueva → create_promotion
  - Editar descuento, mínimo de compra, usos → update_promotion_value
  - Eliminar → delete_promotion

📋 PEDIDOS:
  - Ver pedidos activos en este momento → get_active_orders
  - Ver detalle completo de un pedido (items, customizaciones) → get_order_detail
  - Cambiar estado (confirmar, preparando, completado, cancelado) → update_order_status

📊 ANÁLISIS:
  - Análisis de ventas por período (7/14/30 días) → analyze_sales_period
  - Horas pico y días con más pedidos → analyze_sales_period
  - Inventario crítico con recomendaciones → analyze_stock

DATOS DEL RESTAURANTE:

VENTAS ESTA SEMANA:
${topProds}

PEDIDOS DE HOY: Total ${recentOrders.total} | Completados ${recentOrders.completed} | Cancelados ${recentOrders.cancelled}
Ticket promedio: $${recentOrders.avgTicket} | Ayer: $${yesterdaySales.toFixed(2)}
${peakHour ? `Hora pico: ${peakHour.hour}:00 h (${peakHour.orders} pedidos)` : 'Sin pedidos hoy'}

INVENTARIO CRÍTICO:
${stockInfo}

INGREDIENTES (${(ingredients || []).length} total):
${ingList}

PROMOCIONES:
${promoList}

PRODUCTOS (${(products || []).length} total):
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
