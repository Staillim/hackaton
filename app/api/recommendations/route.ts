import { NextRequest, NextResponse } from 'next/server';
import { getProducts, getProductIngredients } from '@/lib/supabase';

interface RecommendationContext {
  currentCart?: any[];
  customerPreferences?: string[];
  timeOfDay?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { context }: { context: RecommendationContext } = await request.json();
    
    const allProducts = await getProducts();
    const recommendations: any[] = [];

    // Strategy 1: Upselling - If cart has burger but no sides/drinks
    if (context.currentCart && context.currentCart.length > 0) {
      const hasMainDish = context.currentCart.some(item => 
        item.product.category?.name?.toLowerCase().includes('hamburguesa')
      );
      const hasSides = context.currentCart.some(item => 
        item.product.category?.name?.toLowerCase().includes('acompañamiento')
      );
      const hasDrinks = context.currentCart.some(item => 
        item.product.category?.name?.toLowerCase().includes('bebida')
      );

      if (hasMainDish && !hasSides) {
        const sides = allProducts.filter(p => 
          p.category?.name?.toLowerCase().includes('acompañamiento')
        );
        if (sides.length > 0) {
          recommendations.push({
            type: 'upsell',
            reason: 'Complementa tu hamburguesa',
            products: sides.slice(0, 2),
            message: '🍟 ¿Qué tal unas papas fritas con tu hamburguesa?',
          });
        }
      }

      if (hasMainDish && !hasDrinks) {
        const drinks = allProducts.filter(p => 
          p.category?.name?.toLowerCase().includes('bebida')
        );
        if (drinks.length > 0) {
          recommendations.push({
            type: 'upsell',
            reason: 'Agrega una bebida',
            products: drinks.slice(0, 2),
            message: '🥤 ¿Te gustaría una bebida refrescante?',
          });
        }
      }

      // Suggest combos if individual items could be a combo
      if (hasMainDish && (hasSides || hasDrinks)) {
        const combos = allProducts.filter(p => 
          p.category?.name?.toLowerCase().includes('combo')
        );
        if (combos.length > 0) {
          recommendations.push({
            type: 'savings',
            reason: 'Ahorra con un combo',
            products: combos,
            message: '💰 Ahorra con nuestros combos especiales',
          });
        }
      }
    }

    // Strategy 2: Time-based recommendations
    const currentHour = new Date().getHours();
    if (currentHour >= 14 && currentHour <= 16) {
      // Happy hour
      const featured = allProducts.filter(p => p.featured);
      if (featured.length > 0) {
        recommendations.push({
          type: 'promotion',
          reason: 'Happy Hour',
          products: featured,
          message: '🎉 Happy Hour: 15% de descuento (2pm-4pm)',
          discount: 15,
        });
      }
    }

    // Strategy 3: Popular products
    const popular = allProducts
      .filter(p => p.featured)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      .slice(0, 3);

    if (popular.length > 0 && recommendations.length === 0) {
      recommendations.push({
        type: 'popular',
        reason: 'Más vendidos',
        products: popular,
        message: '🔥 Los favoritos de nuestros clientes',
      });
    }

    // Strategy 4: Smart bundling
    if (context.currentCart && context.currentCart.length > 0) {
      const cartTotal = context.currentCart.reduce((sum, item) => 
        sum + (item.product.base_price * item.quantity), 0
      );

      if (cartTotal >= 15 && cartTotal < 20) {
        recommendations.push({
          type: 'threshold',
          reason: 'Cerca de descuento',
          message: `💡 ¡Agrega $${(20 - cartTotal).toFixed(2)} más y obtén $5 de descuento!`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      recommendations,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Error generating recommendations', details: error.message },
      { status: 500 }
    );
  }
}
