export interface CashflowGroup {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'savings';
  allocation_type: 'need' | 'want' | 'savings';
  order_index: number;
  color?: string | null;
  icon?: string | null;
  highlight_bg: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  order_index: number;
  cashflow_group_id: string;
}

export interface DayType {
  id: string;
  name: string;
  label: string;
  color?: string | null;
  order_index: number;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day_type_id: string;
  note?: string | null;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description?: string | null;
  amount: number; // Stored in Satang (integer)
  category_id: string;
  allocation_type?: 'need' | 'want' | 'savings' | null;
  is_deleted: number; // 0 or 1
  created_at?: string;
  updated_at?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export type ItemStatus = 'planned' | 'cancelled' | 'purchased' | 'stored' | 'broken' | 'sold';

export interface ItemCategory {
  id: number;
  name: string;
  order_index?: number;
  created_at: string;
}

export interface Item {
  id: number;
  category_id: number;
  name: string;
  brand_model?: string | null;
  source?: string | null;
  status: ItemStatus;
  price_satang?: number | null;
  purchased_at?: string | null;
  broken_at?: string | null;
  warranty_until?: string | null;
  priority: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemWithDetails extends Item {
  category_name: string;
  linked_count: number;
  linked_satang: number;
  display_price_satang: number;
  display_price: number; // in Baht
  price?: number | null;  // in Baht
}

