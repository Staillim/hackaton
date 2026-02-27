import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/alerts — Max verifica el estado crítico de inventario y genera alerta proactiva
export async function GET() {
  try {
    const [{ data: products }, { data: ingredients }] = await Promise.all([
      supabase
        .from('products')
        .select('name, stock_quantity, active')
        .order('name'),
      supabase
        .from('ingredients')
        .select('name, stock_quantity, min_stock_alert, available')
        .order('name'),
    ]);

    const allProducts = (products || []) as any[];
    const allIngredients = (ingredients || []) as any[];

    // ── Productos críticos ──────────────────────────────────────────────────
    const prodAgotados = allProducts.filter(p => p.active && (p.stock_quantity ?? 0) <= 0);
    const prodBajos = allProducts.filter(p => p.active && (p.stock_quantity ?? 99) > 0 && (p.stock_quantity ?? 99) <= 5);

    // ── Ingredientes críticos ───────────────────────────────────────────────
    const ingAgotados = allIngredients.filter(i => !i.available || (i.stock_quantity ?? 0) <= 0);
    const ingBajos = allIngredients.filter(
      i => i.available && (i.stock_quantity ?? 0) > 0 && (i.stock_quantity ?? 99) <= (i.min_stock_alert ?? 0)
    );

    const total = prodAgotados.length + prodBajos.length + ingAgotados.length + ingBajos.length;

    if (total === 0) {
      return NextResponse.json({ hasAlerts: false });
    }

    // ── Construir el mensaje proactivo de Max ───────────────────────────────
    const lines: string[] = ['⚠️ Revisé el inventario y hay cosas que necesitan atención:'];

    if (prodAgotados.length > 0) {
      lines.push('');
      lines.push(`🚫 PRODUCTOS AGOTADOS (${prodAgotados.length}):`);
      prodAgotados.forEach(p => lines.push(`  • ${p.name} — 0 unidades`));
    }

    if (prodBajos.length > 0) {
      lines.push('');
      lines.push(`⚠️ PRODUCTOS CON STOCK BAJO (${prodBajos.length}):`);
      prodBajos.forEach(p => lines.push(`  • ${p.name} — ${p.stock_quantity} und.`));
    }

    if (ingAgotados.length > 0) {
      lines.push('');
      lines.push(`🚫 INGREDIENTES AGOTADOS / NO DISPONIBLES (${ingAgotados.length}):`);
      ingAgotados.forEach(i => lines.push(`  • ${i.name} — ${i.stock_quantity ?? 0} und.`));
    }

    if (ingBajos.length > 0) {
      lines.push('');
      lines.push(`⚠️ INGREDIENTES CON STOCK BAJO (${ingBajos.length}):`);
      ingBajos.forEach(i =>
        lines.push(`  • ${i.name} — ${i.stock_quantity} und. (alerta: ≤${i.min_stock_alert})`)
      );
    }

    lines.push('');

    const urgentes = prodAgotados.length + ingAgotados.length;
    if (urgentes > 0) {
      lines.push(`Hay ${urgentes} ítem${urgentes !== 1 ? 's' : ''} completamente agotado${urgentes !== 1 ? 's' : ''}. Dime si quieres que actualice el stock o te ayude a gestionar algo.`);
    } else {
      lines.push('Sin agotados urgentes, pero vale la pena reponer lo que está bajo. ¿Quieres que lo gestione?');
    }

    return NextResponse.json({
      hasAlerts: true,
      message: lines.join('\n'),
      critical: {
        prodAgotados: prodAgotados.length,
        prodBajos: prodBajos.length,
        ingAgotados: ingAgotados.length,
        ingBajos: ingBajos.length,
      },
    });
  } catch (err) {
    console.error('❌ /api/admin/alerts error:', err);
    return NextResponse.json({ hasAlerts: false, error: 'Error al verificar alertas' });
  }
}
