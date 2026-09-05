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
