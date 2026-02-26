import { NextRequest, NextResponse } from 'next/server';
import { createOrder, createOrderItems, getActivePromotions } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { customer, items, notes } = await request.json();

    // Calculate totals
    let subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    // Check for applicable promotions
    const promotions = await getActivePromotions();
    let discount = 0;
    let appliedPromotion = null;

    for (const promo of promotions) {
      if (promo.min_purchase && subtotal < promo.min_purchase) continue;

      if (promo.discount_type === 'percentage') {
        const promoDiscount = (subtotal * promo.discount_value) / 100;
        if (promoDiscount > discount) {
          discount = promoDiscount;
          appliedPromotion = promo;
        }
      } else if (promo.discount_type === 'fixed') {
        if (promo.discount_value > discount) {
          discount = promo.discount_value;
          appliedPromotion = promo;
        }
      }
    }

    const finalAmount = Math.max(0, subtotal - discount);

    // Create order
    const order = await createOrder({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      total_amount: subtotal,
      discount_amount: discount,
      final_amount: finalAmount,
      status: 'pending',
      payment_status: 'pending',
      notes: notes,
    });

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      customizations: item.customizations,
    }));

    await createOrderItems(orderItems);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: orderItems,
        appliedPromotion,
      },
    });

  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Error al crear la orden', details: error.message },
      { status: 500 }
    );
  }
}
