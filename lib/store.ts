import { create } from 'zustand';
import { Cart, CartItem, Product, Ingredient, Promotion } from '@/types';

interface CartStore {
  cart: Cart;
  addItem: (product: Product, quantity?: number, customizations?: CartItem['customizations']) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemCustomization: (productId: string, customizations: CartItem['customizations']) => void;
  clearCart: () => void;
  applyPromotion: (promotion: Promotion) => void;
  removePromotion: () => void;
}

// Precios de extras comunes (cuando vienen como strings desde el chat)
const EXTRA_PRICES: { [key: string]: number } = {
  'doble carne': 2.00,
  'carne extra': 2.00,
  'bacon': 1.50,
  'aguacate': 1.00,
  'queso extra': 0.50,
  'queso': 0.50,
  'huevo frito': 0.75,
  'huevo': 0.75,
  'jalapeños': 0.25,
  'pan integral': 0.50,
  'pan sin gluten': 1.50,
};

const calculateItemTotal = (product: Product, quantity: number, customizations: CartItem['customizations']): number => {
  let total = product.base_price * quantity;
  
  // Add price for additional ingredients
  if (customizations.added) {
    customizations.added.forEach(item => {
      // Si es un objeto con ingredient (desde sistema de ingredientes)
      if (typeof item === 'object' && 'ingredient' in item) {
        total += item.ingredient.price * item.quantity * quantity;
      } 
      // Si es un string (desde el chat)
      else if (typeof item === 'string') {
        const itemLower = item.toLowerCase();
        const price = EXTRA_PRICES[itemLower] || 0;
        total += price * quantity;
      }
    });
  }
  
  return parseFloat(total.toFixed(2));
};

const calculateCartTotals = (items: CartItem[], appliedPromotion?: Promotion) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  let discount = 0;
  if (appliedPromotion) {
    if (appliedPromotion.discount_type === 'percentage') {
      discount = (subtotal * appliedPromotion.discount_value) / 100;
    } else if (appliedPromotion.discount_type === 'fixed') {
      discount = appliedPromotion.discount_value;
    }
  }
  
  const total = Math.max(0, subtotal - discount);
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

export const useCartStore = create<CartStore>((set, get) => ({
  cart: {
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
  },

  addItem: (product, quantity = 1, customizations) => {
    const { cart } = get();
    
    // Si hay personalizaciones, siempre crear un nuevo item (no combinar)
    let newItems: CartItem[];
    
    if (customizations && (customizations.added?.length || customizations.removed?.length || customizations.notes)) {
      // Crear nuevo item con personalizaciones
      const newItem: CartItem = {
        product,
        quantity,
        customizations: {
          removed: customizations.removed || [],
          added: customizations.added || [],
          notes: customizations.notes || '',
        },
        totalPrice: calculateItemTotal(product, quantity, customizations),
      };
      newItems = [...cart.items, newItem];
    } else {
      // Comportamiento original: buscar item existente sin personalizaciones
      const existingItemIndex = cart.items.findIndex(
        item => item.product.id === product.id && 
        !item.customizations.added?.length && 
        !item.customizations.removed?.length && 
        !item.customizations.notes
      );

      if (existingItemIndex >= 0) {
        newItems = [...cart.items];
        newItems[existingItemIndex].quantity += quantity;
        newItems[existingItemIndex].totalPrice = calculateItemTotal(
          product,
          newItems[existingItemIndex].quantity,
          newItems[existingItemIndex].customizations
        );
      } else {
        const newItem: CartItem = {
          product,
          quantity,
          customizations: {
            removed: [],
            added: [],
            notes: '',
          },
          totalPrice: calculateItemTotal(product, quantity, {
            removed: [],
            added: [],
            notes: '',
          }),
        };
        newItems = [...cart.items, newItem];
      }
    }

    const totals = calculateCartTotals(newItems, cart.appliedPromotion);

    set({
      cart: {
        ...cart,
        items: newItems,
        ...totals,
      },
    });
  },

  removeItem: (productId) => {
    const { cart } = get();
    const newItems = cart.items.filter(item => item.product.id !== productId);
    const totals = calculateCartTotals(newItems, cart.appliedPromotion);

    set({
      cart: {
        ...cart,
        items: newItems,
        ...totals,
      },
    });
  },

  updateItemQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const { cart } = get();
    const newItems = cart.items.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          totalPrice: calculateItemTotal(item.product, quantity, item.customizations),
        };
      }
      return item;
    });

    const totals = calculateCartTotals(newItems, cart.appliedPromotion);

    set({
      cart: {
        ...cart,
        items: newItems,
        ...totals,
      },
    });
  },

  updateItemCustomization: (productId, customizations) => {
    const { cart } = get();
    const newItems = cart.items.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          customizations,
          totalPrice: calculateItemTotal(item.product, item.quantity, customizations),
        };
      }
      return item;
    });

    const totals = calculateCartTotals(newItems, cart.appliedPromotion);

    set({
      cart: {
        ...cart,
        items: newItems,
        ...totals,
      },
    });
  },

  clearCart: () => {
    set({
      cart: {
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
      },
    });
  },

  applyPromotion: (promotion) => {
    const { cart } = get();
    const totals = calculateCartTotals(cart.items, promotion);

    set({
      cart: {
        ...cart,
        appliedPromotion: promotion,
        ...totals,
      },
    });
  },

  removePromotion: () => {
    const { cart } = get();
    const totals = calculateCartTotals(cart.items);

    set({
      cart: {
        ...cart,
        appliedPromotion: undefined,
        ...totals,
      },
    });
  },
}));
