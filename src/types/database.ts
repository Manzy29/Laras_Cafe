export interface TableSession {
  table_number: number;
  status: 'IDLE' | 'ACTIVE';
  current_pin: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  session_id: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  is_bestseller: boolean; // <-- Added
}

export interface OrderItemPayload {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface OrderItemRecord extends OrderItemPayload {
  id: string;
  order_id: string;
  is_served: boolean;
}

export interface OrderWithItems {
  id: string;
  order_type: 'TABLE' | 'TOKEN';
  table_number?: number;
  token_number?: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  is_paid: boolean;
  created_at: string;
  order_items: OrderItemRecord[];
}