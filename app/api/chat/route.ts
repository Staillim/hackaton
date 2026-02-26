import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getBestSellingProducts, saveChatMessage, getChatHistory, getUserPreferences } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Función para extraer productos a agregar al carrito con personalizaciones
const parseCartActions = (message: string): { 
  product: string; 
  quantity: number;
  additions?: string[];
  removals?: string[];
  notes?: string;
}[] => {
  // Formato: [ADD_TO_CART:ProductName:Quantity:Additions:Removals:Notes]
  // Additions y Removals son listas separadas por coma
  const regex = /\[ADD_TO_CART:(.*?):(\d+)(?::([^:\]]*?))?(?::([^:\]]*?))?(?::([^:\]]*?))?\]/g;
  const actions: { 
    product: string; 
    quantity: number;
    additions?: string[];
    removals?: string[];
    notes?: string;
  }[] = [];
  let match;

  while ((match = regex.exec(message)) !== null) {
    const product = match[1].trim();
    const quantity = parseInt(match[2], 10);
    const additionsStr = match[3]?.trim();
    const removalsStr = match[4]?.trim();
    const notesStr = match[5]?.trim();

    actions.push({
      product,
      quantity,
      additions: additionsStr && additionsStr !== '' ? additionsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      removals: removalsStr && removalsStr !== '' ? removalsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      notes: notesStr && notesStr !== '' ? notesStr : undefined,
    });
  }

  return actions;
};

// Función para detectar si se debe confirmar orden
const shouldConfirmOrder = (message: string): boolean => {
  return /\[CONFIRM_ORDER\]/i.test(message);
};

// Función para obtener productos desde la base de datos
const getProductsByNames = async (productNames: string[]) => {
  if (productNames.length === 0) return [];

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .in('name', productNames);

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return products || [];
};

const getEnhancedSystemPrompt = async (sessionId: string) => {
  // Obtener productos más vendidos
  const bestSellers = await getBestSellingProducts(3).catch(() => []);
  const bestSellersText = bestSellers.map((item: any, i: number) => 
    `${i + 1}. ${item.product?.name} ($${item.product?.base_price})`
  ).join(', ');

  // Obtener preferencias del usuario si existen
  const preferences = await getUserPreferences(sessionId).catch(() => null);
  const preferencesText = preferences 
    ? `\nPreferencias: ${preferences.likes || '-'} | Alergias: ${preferences.allergies || 'ninguna'}`
    : '';

  return `INSTRUCCIÓN CRÍTICA: Responde SIEMPRE en español, agrega productos al carrito, SUGIERE complementos, y confirma órdenes.

Eres María de SmartBurger. Misiones:
1. Cuando digan "quiero" → genera [ADD_TO_CART:...]
2. SIEMPRE sugiere bebida/acompañamiento  
3. Si confirman → genera [CONFIRM_ORDER] para crear orden directamente

MENÚ COMPLETO:
🍔 Hamburguesas:
- SmartBurger Clásica $5.99
- Doble Queso Deluxe $8.99

🎁 Combos:
- Combo SmartBurger $9.99 (incluye papas y bebida)
- Combo Deluxe $12.99 (incluye papas y bebida)

🍟 Acompañamientos:
- Papas Fritas $2.99
- Aros de Cebolla $3.49

🥤 Bebidas:
- Coca-Cola $1.99
- Sprite $1.99
- Fanta $1.99
- Agua $0.99

🥫 Extras disponibles:
- doble carne +$2.00
- bacon +$1.50
- aguacate +$1.00
- queso extra +$0.75
- salsa BBQ, mostaza, ketchup

${bestSellersText ? `⭐ Populares: ${bestSellersText}` : ''}${preferencesText}

FORMATO DE MARCADORES:
[ADD_TO_CART:NombreProducto:Cantidad:Extras:Quitar:Notas]
[CONFIRM_ORDER] - Para crear orden inmediata

FLUJO DE SUGERENCIAS (OBLIGATORIO):

Ejemplo 1 - Hamburguesa sola:
Usuario: "quiero una hamburguesa"
Tú: "[ADD_TO_CART:SmartBurger Clásica:1:::]
¡Perfecto! 1 SmartBurger Clásica ($5.99) 🛒

¿Te gustaría agregar:
🥤 Una bebida? (Coca-Cola, Sprite)
🍟 Papas o Aros de Cebolla?
O mejor aún, ¿prefieres un Combo que incluye todo por $9.99?"

Ejemplo 2 - Con sugerencia específica:
Usuario: "quiero un Aros de Cebolla"
Tú: "[ADD_TO_CART:Aros de Cebolla:1:::]
¡Excelente! 1 Aros de Cebolla ($3.49) 🛒

¿Qué tal una Coca-Cola para acompañar? 🥤"

Ejemplo 3 - Confirmación de orden:
Usuario: "sí, confirma mi orden"
Tú: "[CONFIRM_ORDER]
¡Orden confirmada! 🎉
Tu pedido se está enviando a cocina ahora mismo.
Puedes ver el estado en tiempo real desde tu carrito."

Ejemplo 4 - Personalización completa:
Usuario: "quiero un Combo Deluxe con doble carne sin cebolla"
Tú: "[ADD_TO_CART:Combo Deluxe:1:doble carne:cebolla:]
¡Genial! 1 Combo Deluxe con doble carne, sin cebolla ($14.99) 🛒

Tu combo incluye papas y bebida. ¿Prefieres Coca-Cola, Sprite o Fanta?"

REGLAS OBLIGATORIAS:
1. "quiero" → [ADD_TO_CART:...] + SUGERENCIA
2. Después de agregar item → SIEMPRE sugerir complemento corto
3. "confirma" o "sí" después de sugerencia → [CONFIRM_ORDER]
4. Sugerencias breves (máx 2 opciones)
5. Usa emojis: 🍔 🥤 🍟 🛒 🎉
6. SOLO español

IMPORTANTE: 
- Si piden hamburguesa sola → sugerir bebida/papas o combo
- Si piden acompañamiento → sugerir bebida
- Si confirman después de tener items → [CONFIRM_ORDER]`;
};

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 CHAT API - Nueva solicitud');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { messages, sessionId } = await request.json();

    console.log('📨 SessionID:', sessionId);
    console.log('📊 Total de mensajes recibidos:', messages?.length || 0);
    console.log('💬 Último mensaje del usuario:', messages?.[messages.length - 1]?.content?.substring(0, 100) || 'N/A');

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ ERROR: GEMINI_API_KEY no está configurada');
      return NextResponse.json(
        { 
          message: 'Lo siento, el servicio de chat no está configurado. Por favor contacta al administrador.',
          error: 'API key not configured'
        },
        { status: 500 }
      );
    }

    console.log('✅ GEMINI_API_KEY detectada:', process.env.GEMINI_API_KEY.substring(0, 20) + '...');

    if (!sessionId) {
      console.error('❌ ERROR: sessionId no proporcionado');
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Obtener el system prompt mejorado con contexto
    console.log('🔄 Obteniendo system prompt con contexto...');
    const systemPrompt = await getEnhancedSystemPrompt(sessionId);
    console.log('✅ System prompt generado:', systemPrompt.substring(0, 150) + '...');

    // Lista de modelos a probar (en orden de prioridad)
    const modelPriority = [
      'gemini-pro-latest',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
    ];

    let model = null;
    let selectedModel = '';
    
    // Probar modelos hasta encontrar uno con quota disponible
    for (const modelName of modelPriority) {
      try {
        console.log(`🤖 Probando modelo: ${modelName}...`);
        model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2000,
            topP: 0.95,
            topK: 40,
          },
        });
        selectedModel = modelName;
        console.log(`✅ Modelo ${modelName} configurado correctamente`);
        break;
      } catch (error) {
        console.log(`⚠️ Modelo ${modelName} falló, probando siguiente...`);
        continue;
      }
    }
    
    if (!model) {
      throw new Error('No hay modelos Gemini disponibles con quota');
    }

    // Construir el historial completo de conversación
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === 'user' ? 'Cliente' : 'María'}: ${msg.content}`)
      .join('\n\n');

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    console.log('📝 Historial de conversación:', conversationHistory.length, 'caracteres');
    console.log('💭 Último mensaje:', lastUserMessage);

    // Crear el prompt con todo el contexto
    const fullPrompt = `${systemPrompt}

HISTORIAL DE LA CONVERSACIÓN:
${conversationHistory}

Cliente: ${lastUserMessage}

María (responde de forma natural, cálida y conversacional, recordando TODO lo anterior):`;

    console.log('🚀 Enviando prompt a Gemini...');
    console.log('📏 Tamaño del prompt:', fullPrompt.length, 'caracteres');

    // Generar respuesta con Gemini (con retry en caso de fallo de quota)
    let responseMessage = '';
    let retryCount = 0;
    const maxRetries = modelPriority.length;

    while (retryCount < maxRetries && !responseMessage) {
      try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        responseMessage = response.text();
        console.log('✅ Respuesta recibida de Gemini con modelo:', selectedModel);
        break;
      } catch (error: any) {
        console.log(`❌ Error con modelo ${selectedModel}:`, error.message?.substring(0, 100));
        
        // Si es error de quota, probar siguiente modelo
        if (error.status === 429 && retryCount < maxRetries - 1) {
          retryCount++;
          const nextModel = modelPriority[retryCount];
          console.log(`🔄 Intentando con modelo alternativo: ${nextModel}...`);
          
          model = genAI.getGenerativeModel({ 
            model: nextModel,
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 2000,
              topP: 0.95,
              topK: 40,
            },
          });
          selectedModel = nextModel;
          continue;
        }
        
        // Si no hay más modelos, lanzar error
        throw error;
      }
    }
    console.log('📝 Respuesta COMPLETA:', responseMessage);
    console.log('📝 Respuesta (primeros 200 chars):', responseMessage.substring(0, 200));

    // Extraer acciones de carrito
    const cartActions = parseCartActions(responseMessage);
    console.log('🛒 Acciones de carrito detectadas:', cartActions.length);
    if (cartActions.length > 0) {
      console.log('🛒 Detalles de acciones:', JSON.stringify(cartActions, null, 2));
    } else {
      console.log('⚠️ NO SE DETECTARON MARCADORES [ADD_TO_CART:...] en la respuesta');
    }

    // Detectar si se debe confirmar orden
    const confirmOrder = shouldConfirmOrder(responseMessage);
    if (confirmOrder) {
      console.log('✅ CONFIRMACIÓN DE ORDEN DETECTADA');
    }

    // Limpiar respuesta (remover marcadores de carrito, confirmación y "María:")
    let cleanMessage = responseMessage
      .replace(/\[ADD_TO_CART:[^\]]+\]/g, '')
      .replace(/\[CONFIRM_ORDER\]/g, '')
      .trim();
    cleanMessage = cleanMessage.replace(/^María:\s*/i, '').trim();

    console.log('🧹 Respuesta limpia:', cleanMessage.substring(0, 200) + '...');

    // Obtener información completa de los productos con personalizaciones
    let productsToAdd: { 
      product: any; 
      quantity: number; 
      customizations?: {
        additions?: string[];
        removals?: string[];
        notes?: string;
      };
    }[] = [];
    
    if (cartActions.length > 0) {
      const productNames = cartActions.map(action => action.product);
      console.log('🔍 Buscando productos con nombres:', productNames);
      
      const products = await getProductsByNames(productNames);
      console.log('📦 Productos encontrados en BD:', products.length);
      if (products.length > 0) {
        console.log('📦 Nombres de productos encontrados:', products.map(p => p.name));
      } else {
        console.log('⚠️ NO se encontraron productos en la BD con esos nombres');
      }
      
      productsToAdd = cartActions.map(action => {
        const product = products.find(p => p.name === action.product);
        if (!product) {
          console.log(`❌ Producto NO encontrado: "${action.product}"`);
          return null;
        }
        
        console.log(`✅ Producto encontrado: "${product.name}" (ID: ${product.id})`);
        
        // Incluir personalizaciones si existen
        const customizations: any = {};
        if (action.additions && action.additions.length > 0) {
          customizations.additions = action.additions;
          console.log(`  ➕ Adiciones: ${action.additions.join(', ')}`);
        }
        if (action.removals && action.removals.length > 0) {
          customizations.removals = action.removals;
          console.log(`  ➖ Quitar: ${action.removals.join(', ')}`);
        }
        if (action.notes) {
          customizations.notes = action.notes;
          console.log(`  📝 Notas: ${action.notes}`);
        }
        
        return { 
          product, 
          quantity: action.quantity,
          ...(Object.keys(customizations).length > 0 && { customizations })
        };
      }).filter(Boolean) as { 
        product: any; 
        quantity: number; 
        customizations?: {
          additions?: string[];
          removals?: string[];
          notes?: string;
        };
      }[];

      console.log('✅ Total de productos para agregar al carrito:', productsToAdd.length);
    }

    // Guardar en la base de datos (sin bloquear la respuesta)
    Promise.all([
      saveChatMessage(sessionId, 'user', lastUserMessage),
      saveChatMessage(sessionId, 'assistant', cleanMessage)
    ]).then(() => {
      console.log('✅ Mensajes guardados en BD');
    }).catch(err => {
      console.error('⚠️ Error guardando en BD (no crítico):', err.message);
    });

    console.log('📤 Enviando respuesta al cliente...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json({
      message: cleanMessage,
      timestamp: new Date().toISOString(),
      sessionId,
      cartActions: productsToAdd, // Productos para agregar al carrito
      confirmOrder, // Indicar si se debe confirmar orden
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    
    // Fallback response más natural
    const fallbackMessage = `¡Ay perdón! Se me fue la señal un segundo 😅

Pero no te preocupes, estoy aquí para ayudarte. Estos son nuestros productos más populares:

🍔 **SmartBurger Clásica** - $5.99
La favorita de todos. Carne jugosa, vegetales frescos y nuestra salsa especial.

🍔 **Doble Queso Deluxe** - $8.99
Para los que tienen hambre de verdad. Doble carne, doble queso, bacon.

🎁 **Combo SmartBurger** - $9.99
Hamburguesa + papas + bebida. ¡El mejor valor!

¿Qué te provoca hoy? 😊`;

    return NextResponse.json({
      message: fallbackMessage,
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
}
