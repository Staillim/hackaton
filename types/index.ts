// Database Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  active: boolean;
  featured: boolean;
  preparation_time: number;
  calories?: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  available: boolean;
  is_allergen: boolean;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  is_required: boolean;
  is_removable: boolean;
  ingredient?: Ingredient;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'combo';
  discount_value: number;
  min_purchase: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  active: boolean;
  max_uses?: number;
  current_uses: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations?: {
    removed?: string[];
    added?: string[];
    notes?: string;
  };
  product?: Product;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  session_id: string;
  order_id?: string;
  messages: ChatMessage[];
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface InventoryAlert {
  id: string;
  ingredient_id: string;
  alert_type: 'low_stock' | 'out_of_stock';
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
  ingredient?: Ingredient;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  customizations: {
    removed: string[];
    added: Array<{ ingredient: Ingredient; quantity: number } | string>; // Acepta tanto objetos como strings
    notes: string;
  };
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  appliedPromotion?: Promotion;
}

// Analytics
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  session_id?: string;
  created_at: string;
}
