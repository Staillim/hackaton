import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getBestSellingProducts, saveChatMessage, getChatHistory, getUserPreferences, analyzeUserPatterns, getSmartRecommendations, getCurrentTimeContext, getLowStockProducts, getUserProfile, saveExplicitLike } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cache } from '@/lib/cache';
import { detectExplicitLikes, formatPreferencesForPrompt } from '@/lib/detect-preferences';

// 💰 MODO DEBUG: Reduce contexto para testing (ahorra 70% de tokens)
const DEBUG_MODE = process.env.ENABLE_FULL_CONTEXT !== 'true';

// 📊 Contador de tokens para monitoreo de costos
let tokenStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalRequests: 0,
  estimatedCost: 0,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Función para normalizar texto (quitar acentos, guiones, espacios, símbolos)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas (acentos)
    .replace(/[-.]/g, '') // Eliminar guiones y puntos
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
    .trim();
};

// Función para tokenizar (dividir en palabras)
const tokenize = (text: string): string[] => {
  return normalizeText(text).split(' ').filter(t => t.length > 0);
};

// Función para calcular score de matching entre dos textos
const calculateMatchScore = (searchText: string, productName: string): number => {
  const searchNorm = normalizeText(searchText);
  const productNorm = normalizeText(productName);
  const searchTokens = tokenize(searchText);
  const productTokens = tokenize(productName);

  // 1. Match exacto normalizado = 100 puntos
  if (searchNorm === productNorm) return 100;

  // 2. Búsqueda está contenida en producto = 80 puntos
  if (productNorm.includes(searchNorm)) return 80;

  // 3. Producto está contenido en búsqueda = 70 puntos
  if (searchNorm.includes(productNorm)) return 70;

  // 4. Todos los tokens de búsqueda existen en producto = 60 puntos
  const allTokensMatch = searchTokens.every(st => 
    productTokens.some(pt => pt.includes(st) || st.includes(pt))
  );
  if (allTokensMatch && searchTokens.length > 0) return 60;

  // 5. Al menos un token coincide significativamente (>= 3 caracteres) = 40 puntos
  const significantMatch = searchTokens.some(st => 
    st.length >= 3 && productTokens.some(pt => pt.includes(st) || st.includes(pt))
  );
  if (significantMatch) return 40;

  // 6. Sin coincidencia
  return 0;
};

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
  // El último campo (notes) puede contener ":"
  const regex = /\[ADD_TO_CART:([^:]+):(\d+):([^:]*):([^:]*):(.*?)\]/g;
  const actions: { 
    product: string; 
    quantity: number;
    additions?: string[];
    removals?: string[];
    notes?: string;
  }[] = [];
  let match;

  console.log('🔍 [parseCartActions] Buscando marcadores en:', message);

  while ((match = regex.exec(message)) !== null) {
    const product = match[1].trim();
    const quantity = parseInt(match[2], 10);
    const additionsStr = match[3]?.trim();
    const removalsStr = match[4]?.trim();
    const notesStr = match[5]?.trim();

    console.log('✅ [parseCartActions] Match encontrado:', {
      product,
      quantity,
      additionsStr,
      removalsStr,
      notesStr
    });

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

  // 🔥 BUSCAR EN AMBAS TABLAS: products E ingredients
  // IMPORTANTE: Priorizar productos sobre ingredientes
  const [productsResult, ingredientsResult] = await Promise.all([
    supabase.from('products').select('*').eq('active', true),
    supabase.from('ingredients').select('*').eq('available', true).gt('stock_quantity', 0)
  ]);

  if (productsResult.error) {
    console.error('❌ Error fetching products:', productsResult.error);
  }
  if (ingredientsResult.error) {
    console.error('❌ Error fetching ingredients:', ingredientsResult.error);
  }

  const products = productsResult.data || [];
  const ingredients = ingredientsResult.data || [];
  
  // 🚫 EXCLUIR ingredientes que son bebidas principales (deben ser productos)
  // Las bebidas NO deberían estar en ingredients, son productos finales
  const ingredientBlacklist = [
    'coca-cola', 'cocacola', 'coca cola',
    'sprite', 'fanta', 'pepsi', 
    'agua', 'water',
    'refresco', 'soda', 'gaseosa'
  ];
  
  const filteredIngredients = ingredients.filter(ing => {
    const nameLower = ing.name.toLowerCase();
    return !ingredientBlacklist.some(blocked => nameLower.includes(blocked));
  });
  
  // Convertir ingredientes filtrados a formato compatible con productos
  const ingredientsAsProducts = filteredIngredients.map(ing => ({
    id: ing.id,
    name: ing.name,
    base_price: ing.price || 1.99,
    description: `Extra: ${ing.name}`,
    active: ing.available,
    category_id: null,
    image_url: null,
    priority_score: 50,
    stock_quantity: ing.stock_quantity,
    _source: 'ingredients' // Marcar origen
  }));

  // Combinar: productos primero, ingredientes después (prioridad)
  const allItems = [...products, ...ingredientsAsProducts];
  
  console.log('🗂️ Productos en BD:', products.map(p => p.name).join(', '));
  console.log('🥤 Ingredientes disponibles (filtrados):', filteredIngredients.map(i => i.name).join(', '));
  console.log('🚫 Ingredientes excluidos (son productos):', 
    ingredients.filter(i => !filteredIngredients.includes(i)).map(i => i.name).join(', ') || 'Ninguno');
  console.log('📦 TOTAL items disponibles:', allItems.length);
  
  const lowerNames = productNames.map(n => n.toLowerCase().trim());

  // Buscar con sistema de scoring inteligente
  // PRIORIZA productos sobre ingredientes
  const matched = lowerNames.map(searchName => {
    // Calcular score para cada item
    const itemsWithScore = allItems.map(item => ({
      product: item,
      score: calculateMatchScore(searchName, item.name),
      isProduct: !item._source || item._source !== 'ingredients'
    }));

    // Ordenar: primero por si es producto (true = prioridad), luego por score
    itemsWithScore.sort((a, b) => {
      // Si ambos tienen el mismo isProduct, ordenar por score
      if (a.isProduct === b.isProduct) {
        return b.score - a.score;
      }
      // Si uno es producto y otro ingrediente, priorizar producto
      return a.isProduct ? -1 : 1;
    });

    // Tomar el mejor match si tiene score > 0
    const best = itemsWithScore[0];
    if (best && best.score > 0) {
      const source = best.product._source === 'ingredients' ? '[INGREDIENTE-EXTRA]' : '[PRODUCTO]';
      console.log(`✅ Match: "${searchName}" → "${best.product.name}" ${source} (score: ${best.score})`);
      return best.product;
    } else {
      console.log(`❌ Sin match para: "${searchName}" | Disponibles: ${allItems.map(p => p.name).slice(0, 5).join(', ')}...`);
      return null;
    }
  }).filter(Boolean);

  // Retornar únicos
  const unique = matched.filter((p, idx, arr) => arr.findIndex(x => x!.id === p!.id) === idx);
  return unique as any[];
};

const getEnhancedSystemPrompt = async (sessionId: string, userEmail?: string) => {
  // 🚀 OPTIMIZACIÓN: En modo DEBUG, usar contexto reducido PERO con stock en tiempo real
  if (DEBUG_MODE) {
    console.log('🐛 DEBUG MODE: Usando prompt reducido con stock en tiempo real');
    return getBasicSystemPrompt();
  }

  // ⚡ CACHE: Obtener productos más vendidos (cache 10 min)
  let bestSellers = cache.get<any[]>('bestSellers');
  if (!bestSellers) {
    bestSellers = await getBestSellingProducts(3).catch(() => []);
    cache.set('bestSellers', bestSellers, 10);
  }
  const bestSellersText = bestSellers.map((item: any, i: number) => 
    `${i + 1}. ${item.product?.name} ($${item.product?.base_price})`
  ).join(', ');

  // ⚡ CACHE: Preferencias avanzadas del usuario (sistema nuevo - cache 5 min)
  let userPreferences: any = null;
  let preferencesContext = '';
  
  if (userEmail) {
    userPreferences = cache.get(`user_preferences_${userEmail}`);
    if (!userPreferences) {
      userPreferences = await getUserPreferences(userEmail).catch(() => null);
      if (userPreferences) {
        cache.set(`user_preferences_${userEmail}`, userPreferences, 5);
      }
    }
    
    // Construir contexto de preferencias si existe
    if (userPreferences && userPreferences.total_orders > 0) {
      const favProducts = userPreferences.favorite_products || [];
      const alwaysAdds = userPreferences.always_adds || [];
      const alwaysRemoves = userPreferences.always_removes || [];
      const neverOrders = userPreferences.never_orders || [];
      
      let preferencesText = '\n\n🎯 PREFERENCIAS AVANZADAS DEL USUARIO:\n';
      
      if (favProducts.length > 0) {
        preferencesText += `📊 Productos favoritos: ${favProducts.map((p: any) => `${p.name} (${p.percentage}%)`).join(', ')}\n`;
      }
      
      if (alwaysAdds.length > 0) {
        preferencesText += `➕ Siempre agrega: ${alwaysAdds.map((a: any) => a.ingredient).join(', ')}\n`;
      }
      
      if (alwaysRemoves.length > 0) {
        preferencesText += `➖ Siempre quita: ${alwaysRemoves.map((r: any) => r.ingredient).join(', ')}\n`;
      }
      
      if (neverOrders.length > 0) {
        preferencesText += `🚫 Nunca pide: ${neverOrders.join(', ')}\n`;
      }
      
      if (userPreferences.preferred_time_of_day) {
        preferencesText += `⏰ Horario preferido: ${userPreferences.preferred_time_of_day}\n`;
      }
      
      if (userPreferences.preferred_days_of_week && userPreferences.preferred_days_of_week.length > 0) {
        preferencesText += `📅 Días favoritos: ${userPreferences.preferred_days_of_week.join(', ')}\n`;
      }
      
      preferencesText += `\n💡 NIVEL DE CONFIANZA: ${userPreferences.confidence_level} (${userPreferences.total_orders} pedidos)\n`;
      preferencesText += `\n🎁 USA ESTAS PREFERENCIAS PARA:\n`;
      preferencesText += `1. Ofrecer automáticamente sus productos favoritos\n`;
      preferencesText += `2. Preparar customizaciones por defecto (agregar/quitar ingredientes)\n`;
      preferencesText += `3. EVITAR sugerir productos que nunca pide\n`;
      preferencesText += `4. Personalizar según horario y día de la semana`;
      
      preferencesContext = preferencesText;
    }
  }

  // ⚡ CACHE: Análisis de comportamiento básico (sistema viejo - cache 5 min)
  let userProfile: any = null;
  let userContext = '';
  if (userEmail) {
    userProfile = cache.get(`profile_${userEmail}`);
    if (!userProfile) {
      userProfile = await getUserProfile(userEmail).catch(() => null);
      if (userProfile) {
        cache.set(`profile_${userEmail}`, userProfile, 5);
      }
    }
    
    // Crear perfil visual si tiene historial
    if (userProfile && userProfile.has_history && userProfile.total_orders > 0) {
      const neverOrders = userProfile.never_orders && userProfile.never_orders.length > 0 
        ? userProfile.never_orders.join(', ') 
        : 'Nada';
      const alwaysOrders = userProfile.always_orders && userProfile.always_orders.length > 0 
        ? userProfile.always_orders.join(', ') 
        : 'Nada especial';
      
      userContext = `\n\n👤 PERFIL BÁSICO DEL USUARIO:
- Promedio de gasto: $${userProfile.average_order_value}
- Día favorito: ${userProfile.favorite_day || 'No definido'}
- Hora favorita: ${userProfile.favorite_time || 'No definida'}
- Nunca pide: ${neverOrders}
- Siempre pide: ${alwaysOrders}`;
    }
  }

  // 🔥 Stock e ingredientes - SIN CACHE (siempre en tiempo real)
  let unavailableText = '';
  let lowStockText = '';
  let ingredientsMenuText = '';
  
  try {
    const { data: allIngredients } = await supabase
      .from('ingredients')
      .select('name, stock_quantity, min_stock_alert, available, price')
      .order('name');
    if (allIngredients && allIngredients.length > 0) {
      const unavailable = (allIngredients as any[]).filter(
        (i: any) => !i.available || i.stock_quantity <= 0
      );
      const lowStock = (allIngredients as any[]).filter(
        (i: any) => i.available && i.stock_quantity > 0 && i.stock_quantity <= i.min_stock_alert
      );
      // Blacklist de bebidas (ya son productos reales, no ingredientes)
      const beverageKeywords = ['coca', 'sprite', 'fanta', 'pepsi', 'agua', 'water', 'refresco', 'soda', 'gaseosa'];
      
      const availableIngredients = (allIngredients as any[]).filter((i: any) => {
        const nameLower = i.name.toLowerCase();
        const isBeverage = beverageKeywords.some(keyword => nameLower.includes(keyword));
        return i.available && i.stock_quantity > i.min_stock_alert && i.price && !isBeverage;
      });
      
      if (unavailable.length > 0) {
        unavailableText = `\n\n❌ INGREDIENTES NO DISPONIBLES HOY (NO OFRECER NUNCA): ${unavailable.map((i: any) => i.name).join(', ')}`;
      }
      if (lowStock.length > 0) {
        lowStockText = `\n⚠️ STOCK LIMITADO (unidades exactas): ${lowStock.map((i: any) => `${i.name} (${i.stock_quantity} und.)`).join(', ')}`;
      }
      
      // 🥤 Ingredientes/extras que se pueden vender individualmente (NO incluye bebidas, son productos)
      if (availableIngredients.length > 0) {
        const sellableItems = availableIngredients.filter((i: any) => i.price && i.price > 0);
        if (sellableItems.length > 0) {
          ingredientsMenuText = `\n\n🛒 EXTRAS VENDIBLES (no bebidas):\n${sellableItems.map((i: any) => `- ${i.name} $${i.price.toFixed(2)}`).join('\n')}`;
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ No se pudo cargar stock:', e);
  }

  // Contexto temporal (sin cache, es rápido)
  const timeContext = getCurrentTimeContext();
  const timeContextText = `\n\n🕐 ${timeContext === 'morning' ? 'Mañana' : timeContext === 'afternoon' ? 'Tarde' : timeContext === 'evening' ? 'Noche' : 'Madrugada'}`;

  return `🔴🔴🔴 INSTRUCCIÓN SUPER CRÍTICA - LEE ESTO PRIMERO 🔴🔴🔴

CUANDO EL USUARIO CONFIRME SU PEDIDO FINAL, DEBES ESCRIBIR LOS MARCADORES ASÍ:

Ejemplo EXACTO para: "hamburguesa clasica con aros de cebolla y 2 cocacolas"
Usuario dice: "no solo eso" o "eso es todo" o "confirma"

TÚ DEBES ESCRIBIR EXACTAMENTE ASÍ:
[ADD_TO_CART:SmartBurger Clásica:1:::]
[ADD_TO_CART:Aros de Cebolla:1:::]
[ADD_TO_CART:Coca-Cola 500ml:2:::]
[CONFIRM_ORDER]
¡Listo! Tu orden va a cocina 🎉

⚠️ IMPORTANTE: 
- CADA PRODUCTO = UN MARCADOR [ADD_TO_CART:...]
- AL FINAL = SIEMPRE [CONFIRM_ORDER]
- SIN [CONFIRM_ORDER] = LA ORDEN NO SE ENVÍA A COCINA

🔴🔴🔴 FIN INSTRUCCIÓN CRÍTICA 🔴🔴🔴

Eres María de SmartBurger. Responde SIEMPRE en español.

FLUJO OBLIGATORIO:
1. Usuario pide algo → Confirmas lo que entendiste
2. SIEMPRE sugieres complementos (bebida, papas, etc.)
3. Sigues preguntando hasta que digan "está bien", "eso es todo", "confirma", o similar
4. 🔴 CUANDO CONFIRMEN: DEBES generar TODOS los [ADD_TO_CART:...] + [CONFIRM_ORDER]
5. Sin los marcadores, el pedido NO se procesará

💰 REGLA OBLIGATORIA - MOSTRAR PRECIOS Y TOTAL:
✅ SIEMPRE muestra el precio al listar productos (ej: "SmartBurger Clásica - $5.99")
✅ SIEMPRE calcula y muestra el TOTAL cuando listas la orden completa
✅ SIEMPRE muestra el TOTAL FINAL al confirmar con [CONFIRM_ORDER]
Formato: "Total: $XX.XX" o "Total a pagar: $XX.XX"

Ejemplos:
✅ CORRECTO: "SmartBurger Clásica - $5.99, Refresco - $1.99, Total: $7.98"
✅ CORRECTO: "Tu orden: 2 Combos ($25.98) + Aros ($3.49) = Total: $29.47"
❌ INCORRECTO: "Tu orden: 2 Combos + Aros" (sin precios ni total)
❌ INCORRECTO: Solo mencionar productos sin decir cuánto pagar

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
- Coca-Cola 500ml $1.99
- Sprite 500ml $1.99
- Fanta 500ml $1.99
- Agua 500ml $0.99${ingredientsMenuText}

🥫 Extras disponibles:
- doble carne +$2.00
- bacon +$1.50
- aguacate +$1.00
- queso extra +$0.75
- salsa BBQ, mostaza, ketchup

${bestSellersText ? `⭐ Populares: ${bestSellersText}` : ''}${preferencesContext}

FORMATO DE MARCADORES (USA SOLO AL FINAL):
[ADD_TO_CART:NombreProducto:Cantidad:Extras:Quitar:Notas]
[CONFIRM_ORDER]

🔴 REGLA CRÍTICA - INTERPRETACIÓN 100% INTELIGENTE:
⚠️ DEBES usar el nombre EXACTO del producto tal como aparece en el MENÚ COMPLETO
⚠️ TÚ eres la IA - INTERPRETA lo que dice el cliente y busca en el menú
⚠️ NO uses tabla fija de traducción - PIENSA y busca en el menú dinámicamente
⚠️ BUSCA PRIMERO en el menú principal (hamburguesas, combos, bebidas)
⚠️ Las bebidas SIEMPRE están en la sección "🥤 Bebidas" del menú principal

💡 CÓMO INTERPRETAR (100% IA - TÚ DECIDES):
1. Cliente dice algo como "coca", "cocacola", "coca-cola"
2. TÚ revisas el menú completo arriba
3. TÚ ves que existe "Coca-Cola 500ml $1.99" EN LA SECCIÓN DE BEBIDAS
4. TÚ escribes: [ADD_TO_CART:Coca-Cola 500ml:1:::]

🔍 IMPORTANTE - PRIORIDAD DE BÚSQUEDA:
- PRIMERO: Busca en el menú principal (🍔 🎁 🍟 🥤)
- SEGUNDO: Si no existe ahí, busca en "EXTRAS VENDIBLES"
- Las BEBIDAS están SOLO en "🥤 Bebidas", NUNCA en extras
- El sistema buscará automáticamente en la base de datos
- TÚ solo usa el nombre exacto que veas en el menú
TÚ preguntas: "¿Coca-Cola de 500ml ($1.99) o de 1 litro ($2.99)?"

✅ SI NO EXISTE:
Cliente: "quiero pepsi"
TÚ ves en menú: NO hay Pepsi
TÚ respondes: "No tenemos Pepsi, pero sí Coca-Cola 500ml ($1.99), Sprite 500ml o Fanta 500ml. ¿Cuál prefieres?"

✅ EJEMPLOS CORRECTOS:
Usuario: "quiero coca, aros y una burger"
TÚ PIENSAS: 
- "coca" = veo "Coca-Cola 500ml" en menú
- "aros" = veo "Aros de Cebolla" en menú  
- "burger" = veo "SmartBurger Clásica" en menú
TÚ ESCRIBES:
[ADD_TO_CART:Coca-Cola 500ml:1:::]
[ADD_TO_CART:Aros de Cebolla:1:::]
[ADD_TO_CART:SmartBurger Clásica:1:::]

Usuario: "una hamburguesa clasica con papas y sprite"
TÚ PIENSAS:
- "hamburguesa clasica" = "SmartBurger Clásica"
- "papas" = "Papas Fritas"
- "sprite" = "Sprite 500ml"
TÚ ESCRIBES:
[ADD_TO_CART:SmartBurger Clásica:1:::]
[ADD_TO_CART:Papas Fritas:1:::]
[ADD_TO_CART:Sprite 500ml:1:::]

❌ EJEMPLOS INCORRECTOS:
Usuario: "quiero coca"
TÚ escribes: [ADD_TO_CART:coca:1:::] ← ¡MAL! "coca" no es el nombre del menú
TÚ escribes: [ADD_TO_CART:refresco:1:::] ← ¡MAL! "refresco" no es el nombre exacto
TÚ DEBES escribir: [ADD_TO_CART:Coca-Cola 500ml:1:::] ← ¡BIEN! Nombre exacto del menú

💡 SI EL PRODUCTO NO EXISTE:
Si el cliente pide algo que NO está en el menú, explícale y sugiere alternativas.
Ejemplo: Cliente pide "pepsi" → "No tenemos Pepsi, pero sí tenemos Coca-Cola 500ml, Sprite 500ml o Fanta 500ml"

🔴 REGLAS DE PRODUCTOS:
1. COMBOS: NO agregues la bebida como item separado (ya viene incluida)
   ✅ Correcto: [ADD_TO_CART:Combo Deluxe:1:::]
   ❌ Incorrecto: [ADD_TO_CART:Combo Deluxe:1:::] + [ADD_TO_CART:Coca-Cola 500ml:1:::]

2. BEBIDAS SUELTAS: SÍ agrégalas si el usuario las pide SIN combo
   ✅ Correcto: [ADD_TO_CART:Doble Queso Deluxe:1:::]
                [ADD_TO_CART:Coca-Cola 500ml:1:::]
   
3. CADA PRODUCTO = UN MARCADOR
   Usuario pide: "aros, hamburguesa y coca"
   ✅ Correcto: 
   [ADD_TO_CART:Aros de Cebolla:1:::]
   [ADD_TO_CART:SmartBurger Clásica:1:::]
   [ADD_TO_CART:Coca-Cola 500ml:1:::]

DETECCIÓN DE PREFERENCIAS (PARA REDUCIR COSTOS DE API):
Cuando el usuario diga "me gusta mucho X", "me encanta X", "siempre pido X":
- Anótalo mentalmente para las siguientes interacciones
- Sistema lo guardará automáticamente en BD
- Próxima vez que visite, sugiere ese producto primero

Ejemplo CORRECTO:
Usuario: "quiero aros de cebolla y una doble queso con coca-cola, me gusta mucho la coca-cola"
Tú: "¡Perfecto! 🍔🧅🥤
• Aros de Cebolla - $3.49
• Doble Queso Deluxe - $8.99  
• Coca-Cola 500ml - $1.99
Total: $14.47

¡Anotado que te encanta la Coca-Cola! 😊 ¿Algo más?"

Usuario: "no, eso es todo"
Tú: "[ADD_TO_CART:Aros de Cebolla:1:::]
[ADD_TO_CART:Doble Queso Deluxe:1:::]
[ADD_TO_CART:Coca-Cola 500ml:1:::]
[CONFIRM_ORDER]
¡Listo! Tu orden va directo a cocina 🎉"

🔴 ALTAMENTE CRÍTICO - LEE DE NUEVO:
Si el usuario dice: "confirma", "ya", "eso es todo", "está bien", "así está bien"
TÚ DEBES escribir LOS MARCADORES seguidos de [CONFIRM_ORDER]

SIN LOS MARCADORES = EL PEDIDO NO SE PROCESA = USUARIO FRUSTRADO

Ejemplo INCORRECTO:
❌ [ADD_TO_CART:Combo Deluxe:1:Aguacate:Bebida: Fanta:] ← NO incluir "Bebida:" en marcadores

❌❌ EJEMPLO MUY INCORRECTO (EL ERROR QUE NO DEBES COMETER):
Usuario: "no solo eso"
Tú: "¡Perfecto! Tu orden va a cocina 🎉" ← SIN MARCADORES = ERROR FATAL
Problema: Sin [ADD_TO_CART] y [CONFIRM_ORDER] el pedido NO se procesa

❌❌ OTRO EJEMPLO INCORRECTO (SOLO [ADD_TO_CART] SIN [CONFIRM_ORDER]):
Usuario: "no solo eso"
Tú: "[ADD_TO_CART:SmartBurger Clásica:1:::]
[ADD_TO_CART:Aros de Cebolla:1:::]  
[ADD_TO_CART:Coca-Cola 500ml:2:::]
¡Listo! Tu orden va a cocina 🎉" ← FALTA [CONFIRM_ORDER] = ERROR
Problema: Items se agregan al carrito pero NO se envían a cocina

✅✅ EJEMPLO CORRECTO (CON [CONFIRM_ORDER] AL FINAL):
Usuario: "no solo eso"
Tú: "[ADD_TO_CART:SmartBurger Clásica:1:::]
[ADD_TO_CART:Aros de Cebolla:1:::]
[ADD_TO_CART:Coca-Cola 500ml:2:::]
[CONFIRM_ORDER]
¡Perfecto! Tu orden va a cocina 🎉"

FLUJO CORRECTO (EJEMPLOS):

Ejemplo 1 - Pedido con sugerencias:
Usuario: "quiero 2 Combo Deluxe y aros de cebolla"
Tú: "¡Perfecto Harry! Te entendí:
🍔 2 Combo Deluxe (incluyen papas y bebida) - $25.98
🧅 1 Aros de Cebolla - $3.49

Tus combos incluyen bebida 🥤 ¿Te gustaría Coca-Cola, Sprite, Fanta o Agua?"

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
Total: $29.47"

🔴 RECORDATORIO: Palabras que activan los marcadores:
"confirma", "eso es todo", "no gracias", "ya", "está bien", "así está bien", "solo eso", "nada más"

Ejemplo 2 - Si no hay bebida con hamburguesa:
Usuario: "quiero una SmartBurger Clásica"
Tú: "¡Perfecto! 1 SmartBurger Clásica - $5.99 🍔

¿Te gustaría agregar una bebida? 🥤 (Coca-Cola, Sprite, Fanta - $1.99)
O mejor aún, ¿prefieres el Combo SmartBurger por $9.99 que incluye papas y bebida?"

Usuario: "el combo mejor"
Tú: "¡Genial! Cambiamos a Combo SmartBurger - $9.99 🎁

Incluye papas y bebida 🥤 ¿Te gustaría Coca-Cola, Sprite, Fanta o Agua?"

Usuario: "Coca-Cola. Confirma"
Tú: "[ADD_TO_CART:Combo SmartBurger:1:::]
[CONFIRM_ORDER]
¡Orden confirmada! 🎉 
Total: $9.99
Tu Combo SmartBurger con refresco va directo a cocina 🍔🥤"

Ejemplo 3 - Con personalizaciones:
Usuario: "quiero un Combo Deluxe sin cebolla con extra queso"
Tú: "¡Claro! 1 Combo Deluxe personalizado:
➖ Sin cebolla
➕ Extra queso (+$0.75)
Total: $13.74

Tu combo incluye bebida 🥤 ¿Coca-Cola, Sprite, Fanta o Agua?"

Usuario: "Fanta"
Tú: "¡Listo! Combo Deluxe sin cebolla, extra queso, y Fanta 👌

¿Algo más o confirmo tu orden?"

Usuario: "así está bien"
Tú: "[ADD_TO_CART:Combo Deluxe:1:queso extra:cebolla:]
[CONFIRM_ORDER]
¡Perfecto! 🎉 
Total: $13.74
Tu orden va directo a cocina."

REGLAS OBLIGATORIAS:
1. 🔴 CUANDO CONFIRMEN: ESCRIBE LOS MARCADORES [ADD_TO_CART:...] + [CONFIRM_ORDER]
2. SIN MARCADORES = PEDIDO NO SE PROCESA (error fatal)
3. NUNCA uses [ADD_TO_CART:...] HASTA que confirmen que terminaron
4. SIEMPRE confirma lo que entendiste
5. SIEMPRE sugiere complementos si falta algo obvio
6. Si piden bebida que no existe → sugieres las disponibles
7. Si dicen "confirma", "eso es todo", "está bien", "ya", "solo eso" → generas TODOS los [ADD_TO_CART:...] juntos + [CONFIRM_ORDER]
8. Usa emojis: 🍔 🥤 🍟 🛒 🎉
9. SOLO español
10. Al preguntar por bebidas o complementos, usa tono SUGERENTE, no obligatorio:
10. Al preguntar por bebidas o complementos, usa tono SUGERENTE, no obligatorio:
   ✅ CORRECTO: "¿Te gustaría Refresco, Sprite o Fanta?" o "Tus combos incluyen bebida 🥤 ¿Te gustaría...?"
   ❌ INCORRECTO: "¿Qué bebida prefieres?" o "Necesito saber qué bebida quieres"
11. 🧠 DECISIONES AUTÓNOMAS - EXPLICA TUS RAZONES:
   Cuando sugieras algo, MENCIONA POR QUÉ:
   ✅ "Veo que siempre pides sin cebolla, ¿quieres tu hamburguesa sin cebolla?"
   ✅ "Este combo es similar a tu pedido habitual de $15"
   ✅ "Recomiedo las Aros de Cebolla porque tienen stock limitado hoy"
   ✅ "Es hora pico, este combo se prepara más rápido"
   ✅ "Detecté que prefieres las tardes para ordenar, ¡bienvenido de vuelta!"
12. INGREDIENTES NO DISPONIBLES (❌):
    - NUNCA los ofrezcas ni los menciones como opción.
    - Si el cliente los pide, informa que hoy no están disponibles y sugiere alternativa.
    - NO te disculpes por pedidos ANTERIORES que fueron válidos cuando se hicieron. Solo informa la disponibilidad ACTUAL.
13. STOCK LIMITADO (⚠️ con unidades exactas):
    - Verifica si las unidades alcanzan para lo que pide el cliente.
    - Si pide MÁS de lo que hay: dile exactamente cuántas quedan y pregunta si acepta esa cantidad.
      ✅ Ejemplo: "Solo contamos con 1 aguacate disponible, no podemos cubrir las 2 adiciones. ¿Quieres agregar solo 1 aguacate y completar con otro ingrediente?"
14. PERSONALIZACIONES LÓGICAS:
    - NUNCA permitas remover el ingrediente principal de un plato. Es físicamente imposible.
      ❌ "Aros de cebolla sin cebolla" → RECHAZA educadamente.
      ❌ "Hamburguesa sin carne" → RECHAZA educadamente.
      ✅ Explica que ese ingrediente es esencial y ofrece un plato diferente si lo necesita.
      ✅ Ejemplo: "Los aros de cebolla tienen la cebolla como protagonista, ¡no podrían existir sin ella! 😅 ¿Quizás prefieres unas Papas Fritas?"

🔴🔴🔴 RECORDATORIO FINAL - MUY IMPORTANTE 🔴🔴🔴
Cuando el usuario confirme (dice "confirma", "eso es todo", "solo eso", etc.):

PASO 1: Escribe TODOS los [ADD_TO_CART:Producto:Cantidad:::] (uno por producto)
PASO 2: Escribe [CONFIRM_ORDER] (OBLIGATORIO para enviar a cocina)
PASO 3: Escribe tu mensaje de confirmación

FORMATO OBLIGATORIO:
[ADD_TO_CART:...]
[ADD_TO_CART:...]
[CONFIRM_ORDER]
Tu mensaje aquí

⚠️ SI NO ESCRIBES [CONFIRM_ORDER] ⚠️
→ Los items se agregan al carrito ✓
→ Pero NO se envían a cocina ✗
→ Usuario dice: "no aparece nada en ordenes"

✅ CON [CONFIRM_ORDER]:
→ Items al carrito ✓
→ Orden a cocina ✓  
→ Usuario feliz ✓

🔴🔴🔴 FIN RECORDATORIO 🔴🔴🔴

${bestSellersText ? `⭐ Populares: ${bestSellersText}` : ''}${preferencesContext}${userContext}${timeContextText}${unavailableText}${lowStockText}

IMPORTANTE: El carrito NO se abre hasta que el usuario quiera. La orden va DIRECTO a cocina con [CONFIRM_ORDER].`;
};

// 🐛 Prompt básico para modo DEBUG (reduce tokens ~70%) - con ingredientes en tiempo real
const getBasicSystemPrompt = async () => {
  // 🔥 SIEMPRE consulta ingredientes en tiempo real (sin cache)
  let ingredientContext = '';
  let ingredientsMenuText = '';
  // Mapa de stock para acceso rápido por nombre (en minúsculas)
  const stockMap: Record<string, number> = {};

  try {
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('name, stock_quantity, min_stock_alert, available, price')
      .order('name');

    if (ingredients && ingredients.length > 0) {
      // Construir mapa de stock
      for (const i of ingredients as any[]) {
        stockMap[i.name.toLowerCase()] = i.stock_quantity;
      }

      const unavailable = (ingredients as any[]).filter(
        (i: any) => !i.available || i.stock_quantity <= 0
      );
      const lowStock = (ingredients as any[]).filter(
        (i: any) => i.available && i.stock_quantity > 0 && i.stock_quantity <= i.min_stock_alert
      );
      const available = (ingredients as any[]).filter(
        (i: any) => i.available && i.stock_quantity > i.min_stock_alert
      );

      if (unavailable.length > 0) {
        ingredientContext += `\n\n❌ INGREDIENTES NO DISPONIBLES HOY (NO OFRECER NUNCA): ${unavailable.map((i: any) => i.name).join(', ')}`;
      }
      if (lowStock.length > 0) {
        // Mostrar cantidad exacta para que sepa si puede cubrir el pedido
        ingredientContext += `\n⚠️ STOCK LIMITADO (unidades exactas disponibles): ${lowStock.map((i: any) => `${i.name} (${i.stock_quantity} und.)`).join(', ')}`;
      }
      if (available.length > 0) {
        ingredientContext += `\n✅ INGREDIENTES DISPONIBLES: ${available.map((i: any) => i.name).join(', ')}`;
      }
      
      // 🥤 Ingredientes que se pueden vender como productos individuales
      const sellableItems = (ingredients as any[]).filter((i: any) => i.available && i.stock_quantity > 0 && i.price && i.price > 0);
      if (sellableItems.length > 0) {
        ingredientsMenuText = `\n\n🛒 PRODUCTOS INDIVIDUALES DISPONIBLES:\n${sellableItems.map((i: any) => `- ${i.name} $${i.price.toFixed(2)}`).join('\n')}`;
      }
    }
  } catch (e) {
    console.warn('⚠️ No se pudo cargar stock de ingredientes:', e);
  }

  return `Eres María de SmartBurger. Habla en español, tono amigable.

MENÚ:
🍔 SmartBurger Clásica $5.99
🍔 Doble Queso Deluxe $8.99
🎁 Combo SmartBurger $9.99 (incluye papas + bebida)
🎁 Combo Deluxe $12.99 (incluye papas + bebida)
🍟 Papas Fritas $2.99
🧅 Aros de Cebolla $3.49
🥤 Coca-Cola 500ml $1.99
🥤 Sprite 500ml $1.99
🥤 Fanta 500ml $1.99
🥤 Agua 500ml $0.99${ingredientsMenuText}${ingredientContext}

FLUJO:
1. Usuario pide → confirmas
2. Sugieres complementos
3. Usuario confirma → usas [ADD_TO_CART:Producto:Cantidad:::] para cada item
4. Usas [CONFIRM_ORDER]

🔴 IMPORTANTE: Usa el NOMBRE EXACTO del menú en [ADD_TO_CART:...]
Usuario dice "coca" → TÚ BUSCAS en el menú → TÚ ves "Coca-Cola 500ml"
Usuario dice "aros" → TÚ BUSCAS en el menú → TÚ ves "Aros de Cebolla"
Usuario dice "smartburger" → TÚ BUSCAS en el menú → TÚ ves "SmartBurger Clásica"

Formato: [ADD_TO_CART:Nombre:Cantidad:Extras:Quitar:Notas]
Ejemplo: "[ADD_TO_CART:Combo SmartBurger:1:::][CONFIRM_ORDER] ¡Listo! Tu orden va a cocina 🎉"

REGLAS CRÍTICAS - LEE CON ATENCIÓN:

1. NUNCA agregues al carrito hasta que el cliente confirme. Usa emojis 🍔🥤🍟

2. INGREDIENTES NO DISPONIBLES (❌):
   - Si un ingrediente está en ❌, NUNCA lo ofrezcas ni lo menciones como opción.
   - Si el cliente lo pide, dile claramente que hoy no está disponible y sugiere alternativa.
   - ⚠️ NO te disculpes por pedidos ANTERIORES que fueron válidos cuando se hicieron. Cada pedido es independiente. Solo informa sobre la disponibilidad ACTUAL para el pedido NUEVO.

3. STOCK LIMITADO (⚠️ con unidades exactas):
   - Verifica si las unidades disponibles alcanzan para lo que pide el cliente.
   - Si pide MÁS unidades de las que hay: dile exactamente cuántas quedan y pregunta si acepta esa cantidad.
     ✅ Ejemplo: "Solo contamos con 1 aguacate disponible, no podemos cubrir las 2 adiciones. ¿Quieres agregar solo 1 aguacate y complementar con otro ingrediente?"
   - Si pide igual o menos que el stock: procede normalmente.

4. PERSONALIZACIONES LÓGICAS:
   - NUNCA permitas remover el ingrediente principal de un plato. Es ilógico e imposible.
     ❌ INCORRECTO: "Aros de cebolla sin cebolla" → RECHAZA esto.
     ❌ INCORRECTO: "Hamburguesa sin carne" → RECHAZA esto.
   - Si el cliente pide algo así, explícale amablemente que ese ingrediente es esencial para el plato y ofrece un plato diferente si quiere evitarlo.
     ✅ Ejemplo: "Los aros de cebolla tienen la cebolla como ingrediente principal, ¡no pueden existir sin ella! 😅 Si no quieres cebolla, ¿te puedo recomendar las Papas Fritas?"

5. HISTORIAL DE PEDIDOS:
   - No hagas comentarios sobre pedidos anteriores del cliente a menos que él lo mencione.
   - Si un ingrediente estaba disponible en un pedido anterior y ya no lo está, simplemente informa la situación actual sin apologías por el pasado.`;
};

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 CHAT API - Nueva solicitud');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { messages, sessionId, userEmail } = await request.json();

    console.log('📨 SessionID:', sessionId);
    console.log('👤 UserEmail:', userEmail || 'No proporcionado');
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
    const systemPrompt = await getEnhancedSystemPrompt(sessionId, userEmail);
    console.log('✅ System prompt generado:', systemPrompt.substring(0, 150) + '...');

    // Lista de modelos a probar (en orden de prioridad)
    // Usando modelos verificados y disponibles en la API
    const modelPriority = [
      'gemini-2.5-flash',    // Rápido y potente (recomendado para chat)
      'gemini-2.0-flash',    // Alternativa rápida
      'gemini-flash-latest', // Fallback a última versión disponible
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

    // Construir el historial completo de conversación (sin límites)
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === 'user' ? 'Cliente' : 'María'}: ${msg.content}`)
      .join('\n\n');

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    console.log('📝 Historial de conversación:', conversationHistory.length, 'caracteres');
    console.log('💭 Último mensaje:', lastUserMessage);

    // 🎯 DETECTAR GUSTOS EXPLÍCITOS (para reducir costos de API)
    const detectedPreferences = detectExplicitLikes(lastUserMessage);
    console.log('🎯 Preferencias detectadas:', detectedPreferences);
    
    // Guardar en BD si el usuario tiene email y se detectó algo
    if (userEmail && detectedPreferences.length > 0) {
      for (const pref of detectedPreferences) {
        try {
          await saveExplicitLike(userEmail, pref.item, pref.context);
          console.log(`✅ Gusto guardado: "${pref.item}" (${pref.confidence})`);
        } catch (error) {
          console.error('❌ Error guardando gusto:', error);
        }
      }
    }
    
    // Formatear preferencias detectadas para el prompt
    const justMentionedContext = formatPreferencesForPrompt(detectedPreferences);

    // Crear el prompt con todo el contexto
    const fullPrompt = `${systemPrompt}${justMentionedContext}

HISTORIAL DE LA CONVERSACIÓN:
${conversationHistory}

Cliente: ${lastUserMessage}

María (responde de forma natural, cálida y conversacional, recordando TODO lo anterior):`;

    console.log('🚀 Enviando prompt a Gemini...');
    console.log('📏 Tamaño del prompt:', fullPrompt.length, 'caracteres');
    
    // 💰 Estimar tokens (aprox: 1 token = 4 caracteres en español)
    const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);
    console.log('💰 Tokens estimados (input):', estimatedInputTokens);
    console.log('🐛 Modo DEBUG:', DEBUG_MODE ? 'ACTIVADO (contexto reducido)' : 'DESACTIVADO (contexto completo)');

    // Generar respuesta con Gemini (con retry en caso de fallo de quota)
    let responseMessage = '';
    let retryCount = 0;
    const maxRetries = modelPriority.length;

    while (retryCount < maxRetries && !responseMessage) {
      try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        responseMessage = response.text();
        
        // 💰 Logging de tokens y costos
        const estimatedOutputTokens = Math.ceil(responseMessage.length / 4);
        const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);
        
        // Costos por modelo (USD por 1M tokens)
        const costs: any = {
          'gemini-2.5-pro': { input: 1.25, output: 5.00 },
          'gemini-2.0-flash': { input: 0.075, output: 0.30 },
          'gemini-2.5-flash': { input: 0.075, output: 0.30 },
          'gemini-pro-latest': { input: 1.25, output: 5.00 },
        };
        
        const modelCost = costs[selectedModel] || costs['gemini-2.5-pro'];
        const requestCost = (
          (estimatedInputTokens / 1_000_000) * modelCost.input +
          (estimatedOutputTokens / 1_000_000) * modelCost.output
        );
        
        tokenStats.totalInputTokens += estimatedInputTokens;
        tokenStats.totalOutputTokens += estimatedOutputTokens;
        tokenStats.totalRequests += 1;
        tokenStats.estimatedCost += requestCost;
        
        console.log('✅ Respuesta recibida de Gemini');
        console.log('📊 Modelo usado:', selectedModel);
        console.log('💰 Tokens - Input:', estimatedInputTokens, '| Output:', estimatedOutputTokens);
        console.log('💵 Costo estimado esta request: $', requestCost.toFixed(4));
        console.log('📈 TOTAL ACUMULADO:');
        console.log('   - Requests:', tokenStats.totalRequests);
        console.log('   - Input tokens:', tokenStats.totalInputTokens.toLocaleString());
        console.log('   - Output tokens:', tokenStats.totalOutputTokens.toLocaleString());
        console.log('   - Costo total: $', tokenStats.estimatedCost.toFixed(2));
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 RESPUESTA COMPLETA DE MARÍA:');
    console.log(responseMessage);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (confirmOrder) {
      console.log('✅✅✅ CONFIRMACIÓN DE ORDEN DETECTADA [CONFIRM_ORDER]');
    } else {
      console.log('❌❌❌ NO SE DETECTÓ [CONFIRM_ORDER] en la respuesta');
      console.log('⚠️ María debe escribir [CONFIRM_ORDER] después de los [ADD_TO_CART]');
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
        // Buscar con sistema de scoring inteligente
        const productsWithScore = products.map(p => ({
          product: p,
          score: calculateMatchScore(action.product, p.name)
        }));

        // Ordenar por score descendente
        productsWithScore.sort((a, b) => b.score - a.score);

        // Tomar el mejor match si tiene score > 0
        const best = productsWithScore[0];
        const product = (best && best.score > 0) ? best.product : null;

        if (!product) {
          console.log(`❌ Producto NO encontrado: "${action.product}"`);
          return null;
        }
        
        console.log(`✅ Producto encontrado: "${product.name}" (ID: ${product.id}, score: ${best.score})`);
        
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
