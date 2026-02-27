import { NextRequest, NextResponse } from 'next/server';
import { getAdminMetrics } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/analyze
//
// Agente de Inteligencia del Admin — Max
// Usa OpenAI GPT-4o-mini (misma key que el chat de Max)
// Recopila métricas reales de Supabase y devuelve insights con personalidad.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 ADMIN ANALYZE - Nueva solicitud');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('📊 Obteniendo métricas del restaurante...');
    const metrics = await getAdminMetrics();
    console.log('✅ Métricas obtenidas:', {
      productos: metrics.salesByProduct.length,
      alertasStock: metrics.criticalStock.length,
      promocionesCativas: metrics.promotions.length,
    });

    // ─── Max — OpenAI GPT-4o-mini ────────────────────────────────────────────
    if (process.env.OPENAI_API_KEY) {
      console.log('🧠 OPENAI_API_KEY detectada — activando Max (GPT-4o-mini)...');
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = buildAnalysisPrompt(metrics);
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres Max, analista de negocio de SmartBurger. Responde SOLO con JSON válido, sin markdown, sin texto extra.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const insights = JSON.parse(result.choices[0].message.content || '{}');
      console.log('✅ Análisis OpenAI completado');

      return NextResponse.json({
        success: true,
        mock: false,
        insights,
        metrics,
        timestamp: new Date().toISOString(),
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log('⚠️ OPENAI_API_KEY no encontrada — usando análisis de datos reales');
    const insights = buildMockInsights(metrics);

    return NextResponse.json({
      success: true,
      mock: true,
      insights,
      metrics,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Admin analyze error:', error);
    return NextResponse.json(
      { error: 'Error al obtener métricas', details: error.message },
      { status: 500 }
    );
  }
}

// ─── Identidad de Max ─────────────────────────────────────────────────────────
// Max — Analista de Negocio de SmartBurger
// Directo, preciso, sin rodeos. Habla con datos, no con suposiciones.
// Cuando no tiene datos suficientes lo dice sin excusas.
// Cuando hay algo urgente lo dice primero, sin suavizarlo.
// ─────────────────────────────────────────────────────────────────────────────

function buildAnalysisPrompt(metrics: Awaited<ReturnType<typeof getAdminMetrics>>) {
  return `Eres Max, el analista de negocio de SmartBurger.

PERSONALIDAD:
- Directo y preciso. Sin frases de relleno ni elogios vacíos.
- Hablas con datos específicos, no con generalidades.
- Cuando algo está mal, lo dices primero, sin suavizarlo.
- Cuando no tienes datos suficientes para una conclusión, lo dices en lugar de inventar.
- Tono profesional pero humano. No eres un robot corporativo.
- Máximo 2 oraciones por punto. Sin listas de 7 elementos cuando 3 bastan.

DATOS A ANALIZAR:

VENTAS POR PRODUCTO (últimos 7 días):
${JSON.stringify(metrics.salesByProduct.slice(0, 10).map(p => ({
  producto: p.product?.name,
  unidades: p.totalQuantity,
  ingresos: `$${p.totalRevenue.toFixed(2)}`,
  ticketPromedio: `$${p.totalQuantity > 0 ? (p.totalRevenue / p.totalQuantity).toFixed(2) : '0'}`,
})), null, 2)}

VENTAS POR HORA (hoy):
${JSON.stringify(metrics.salesByHour.filter(h => h.orders > 0).map(h => ({
  hora: `${h.hour}:00`,
  pedidos: h.orders,
  ventas: `$${h.sales.toFixed(2)}`,
})), null, 2)}

INVENTARIO CRÍTICO:
${JSON.stringify(metrics.criticalStock.map(a => ({
  ingrediente: a.ingredient?.name || 'desconocido',
  tipo: a.alert_type === 'out_of_stock' ? 'SIN STOCK' : 'STOCK BAJO',
  mensaje: a.message,
})), null, 2)}

MÉTRICAS DE HOY:
- Pedidos: ${metrics.recentOrders.total} (${metrics.recentOrders.completed} completados, ${metrics.recentOrders.cancelled} cancelados)
- Ticket promedio: $${metrics.recentOrders.avgTicket}
- Ventas ayer: $${metrics.yesterdaySales.toFixed(2)}

PROMOCIONES ACTIVAS (${metrics.promotions.length}):
${metrics.promotions.length > 0
  ? JSON.stringify(metrics.promotions.map((p: any) => ({
      nombre: p.name,
      tipo: p.discount_type,
      valor: p.discount_value,
      usos: p.current_uses,
    })), null, 2)
  : 'Ninguna activa.'}

RESPONDE EXCLUSIVAMENTE con este JSON. Sé Max: directo, con datos, sin relleno.
{
  "summary": "2-3 oraciones. El dato más importante primero. Sin introducciones.",
  "topProducts": ["1. Nombre — X uds · $Y · conclusión operativa"],
  "stockAlerts": ["Sin stock — Nombre: impacto concreto", "Stock bajo — Nombre: cuándo actuar"],
  "peakHours": "Una sola conclusión operativa sobre el horario. Qué hacer con esa info.",
  "promotionEffectiveness": "Si hay promociones: usos reales. Si no: qué activar y por qué.",
  "recommendations": ["Acción concreta 1 con número o plazo", "Acción 2", "Acción 3"],
  "urgentAlerts": ["Solo lo que requiere acción HOY, con consecuencia si no se actúa"]
}`;
}

function buildMockInsights(metrics: Awaited<ReturnType<typeof getAdminMetrics>>) {
  const { salesByProduct, salesByHour, criticalStock, promotions, recentOrders, yesterdaySales } = metrics;

  const topProducts = salesByProduct.slice(0, 5).map((p, i) => {
    const revenue = p.totalRevenue.toFixed(2);
    const avg = p.totalQuantity > 0 ? (p.totalRevenue / p.totalQuantity).toFixed(2) : '0.00';
    return `${i + 1}. ${p.product?.name || 'Desconocido'} — ${p.totalQuantity} uds · $${revenue} · ticket/ud $${avg}`;
  });

  const urgentAlerts = criticalStock
    .filter((a) => a.alert_type === 'out_of_stock')
    .map((a) => a.message);

  const stockAlerts = criticalStock.length > 0
    ? criticalStock.slice(0, 5).map((a) =>
        a.alert_type === 'out_of_stock'
          ? `Sin stock — ${a.ingredient?.name || a.message}. Bloquea pedidos ahora mismo.`
          : `Stock bajo — ${a.ingredient?.name || a.message}. Quedan pocas unidades.`
      )
    : ['Todo el inventario está en niveles normales.'];

  const activeHours = salesByHour.filter((h) => h.orders > 0);
  const peakHour = activeHours.length > 0
    ? activeHours.reduce((max, h) => (h.orders > max.orders ? h : max))
    : null;

  const peakHoursText = peakHour
    ? `Pico hoy a las ${peakHour.hour}:00 h — ${peakHour.orders} pedido(s), $${peakHour.sales.toFixed(2)} generados. ` +
      (activeHours.length > 1 ? `Total horas activas: ${activeHours.length}. Concentra personal en ese rango.` : 'Solo una hora con actividad hoy.')
    : 'Sin pedidos hoy todavía.';

  const trendText = yesterdaySales > 0
    ? recentOrders.total === 0
      ? `Ayer fueron $${yesterdaySales.toFixed(2)}. Hoy sin ventas aún.`
      : `Comparado con ayer ($${yesterdaySales.toFixed(2)}), hoy llevas ${recentOrders.total} pedido(s).`
    : 'Sin datos de ayer para comparar.';

  const promotionEffectiveness = promotions.length > 0
    ? `${promotions.length} promoción(es) activa(s): ${promotions.map((p: any) => p.name).join(', ')}. Sin IA no puedo calcular el impacto real en ventas.`
    : 'No hay promociones activas. Si el ticket promedio es bajo, considera activar un combo.';

  const topName = salesByProduct[0]?.product?.name;
  const topQty = salesByProduct[0]?.totalQuantity;
  let summary: string;

  if (salesByProduct.length > 0 && recentOrders.total > 0) {
    summary = `Esta semana lidera ${topName} con ${topQty} unidades. Hoy: ${recentOrders.total} pedido(s), ticket promedio $${recentOrders.avgTicket}. ` +
      (urgentAlerts.length > 0 ? `HAY ${urgentAlerts.length} ingrediente(s) sin stock — acción inmediata.` : criticalStock.length > 0 ? `${criticalStock.length} alerta(s) de inventario activas.` : 'Inventario en orden.');
  } else if (salesByProduct.length > 0) {
    summary = `Esta semana el más vendido es ${topName} con ${topQty} unidades. Hoy sin pedidos registrados. ${trendText}`;
  } else {
    summary = `Sin ventas registradas esta semana. ${trendText}${criticalStock.length > 0 ? ` Hay ${criticalStock.length} alerta(s) de stock activas.` : ''}`;
  }

  const recommendations: string[] = [];
  if (urgentAlerts.length > 0) recommendations.push(`Reabastecer ahora: ${urgentAlerts.length} ingrediente(s) en cero bloquean productos del menú.`);
  const lowStock = criticalStock.filter((a) => a.alert_type === 'low_stock');
  if (lowStock.length > 0) recommendations.push(`Planificar compra de ${lowStock.length} ingrediente(s) con stock bajo antes de que se agoten.`);
  if (promotions.length === 0 && parseFloat(recentOrders.avgTicket) < 8) recommendations.push(`Ticket promedio bajo ($${recentOrders.avgTicket}). Activa un combo o descuento para subirlo.`);
  if (salesByProduct.length > 3) {
    const last = salesByProduct[salesByProduct.length - 1];
    recommendations.push(`${last.product?.name || 'Último producto'} tiene baja rotación. Agrégalo a un combo o baja su visibilidad.`);
  }
  if (recommendations.length === 0) recommendations.push('Métricas dentro de parámetros normales. Monitorear tendencia mañana.');

  return {
    summary,
    topProducts: topProducts.length > 0 ? topProducts : ['Sin ventas registradas esta semana.'],
    stockAlerts,
    peakHours: peakHoursText,
    promotionEffectiveness,
    recommendations,
    urgentAlerts,
  };
}
