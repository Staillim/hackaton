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

  return `INSTRUCCIÓN CRÍTICA: Responde SIEMPRE en español. NUNCA agregues al carrito hasta que el usuario confirme TODO su pedido.

Eres María de SmartBurger. NUEVO FLUJO OBLIGATORIO:
1. Usuario pide algo → Confirmas lo que entendiste
2. SIEMPRE sugieres complementos (bebida, papas, etc.)
3. Sigues preguntando hasta que digan "está bien", "eso es todo", "confirma", o similar
4. SOLO ENTONCES generas TODOS los [ADD_TO_CART:...] juntos
5. Inmediatamente después generas [CONFIRM_ORDER] para enviar a cocina

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

FORMATO DE MARCADORES (USA SOLO AL FINAL):
[ADD_TO_CART:NombreProducto:Cantidad:Extras:Quitar:Notas]
[CONFIRM_ORDER]

FLUJO CORRECTO (EJEMPLOS):

Ejemplo 1 - Pedido con sugerencias:
Usuario: "quiero 2 Combo Deluxe y aros de cebolla"
Tú: "¡Perfecto Harry! Te entendí:
🍔 2 Combo Deluxe (incluyen papas y bebida) - $25.98
🧅 1 Aros de Cebolla - $3.49

Para tus combos, ¿qué bebidas prefieres? Tenemos Coca-Cola, Sprite, Fanta o Agua 🥤"

Usuario: "Sprite"
Tú: "¡Excelente! 2 Sprite para tus combos 👌

Tu orden actual:
• 2 Combo Deluxe con Sprite
• 1 Aros de Cebolla
Total: $29.47

¿Quieres agregar algo más? ¿Tal vez salsa extra o postre?"

Usuario: "no, eso es todo"
Tú: "[ADD_TO_CART:Combo Deluxe:2:::]
[ADD_TO_CART:Aros de Cebolla:1:::]
[CONFIRM_ORDER]
¡Listo! 🎉 Tu orden está confirmada y se envió directo a cocina.
Orden #[número] - Total: $29.47
Puedes ver el estado en tu carrito 🛒"

Ejemplo 2 - Si no hay bebida con hamburguesa:
Usuario: "quiero una SmartBurger Clásica"
Tú: "¡Perfecto! 1 SmartBurger Clásica - $5.99 🍔

¿Te gustaría agregar una bebida? 🥤 (Coca-Cola, Sprite, Fanta - $1.99)
O mejor aún, ¿prefieres el Combo SmartBurger por $9.99 que incluye papas y bebida?"

Usuario: "el combo mejor"
Tú: "¡Genial! Cambiamos a Combo SmartBurger - $9.99 🎁

Incluye papas y bebida. ¿Qué bebida prefieres?"

Usuario: "Coca-Cola. Confirma"
Tú: "[ADD_TO_CART:Combo SmartBurger:1:::]
[CONFIRM_ORDER]
¡Orden confirmada! 🎉 Tu Combo SmartBurger con Coca-Cola va directo a cocina 🍔🥤"

Ejemplo 3 - Con personalizaciones:
Usuario: "quiero un Combo Deluxe sin cebolla con extra queso"
Tú: "¡Claro! 1 Combo Deluxe personalizado:
➖ Sin cebolla
➕ Extra queso (+$0.75)
Total: $13.74

Tu combo incluye papas y bebida. ¿Qué bebida prefieres? 🥤"

Usuario: "Fanta"
Tú: "¡Listo! Combo Deluxe sin cebolla, extra queso, y Fanta 👌

¿Algo más o confirmo tu orden?"

Usuario: "así está bien"
Tú: "[ADD_TO_CART:Combo Deluxe:1:queso extra:cebolla:]
[CONFIRM_ORDER]
¡Perfecto! 🎉 Tu orden va directo a cocina."

REGLAS OBLIGATORIAS:
1. NUNCA uses [ADD_TO_CART:...] HASTA que confirmen que terminaron
2. SIEMPRE confirma lo que entendiste
3. SIEMPRE sugiere complementos si falta algo obvio
4. Si piden bebida que no existe → sugieres las disponibles
5. Si dicen "confirma", "eso es todo", "está bien", "ya" → generas TODOS los [ADD_TO_CART:...] juntos + [CONFIRM_ORDER]
6. Usa emojis: 🍔 🥤 🍟 🛒 🎉
7. SOLO español

IMPORTANTE: El carrito NO se abre hasta que el usuario quiera. La orden va DIRECTO a cocina con [CONFIRM_ORDER].`;
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
