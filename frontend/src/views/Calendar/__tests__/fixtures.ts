import type { CashflowGroup, Category, DayType, TransactionDisplay } from '@/types';

export const grp = (id: string, over: Partial<CashflowGroup> = {}): CashflowGroup => ({
  id, name: id, type: 'expense', allocation_type: 'want', order_index: 1, color: '#336699', icon: 'wallet', ...over,
});

export const cat = (id: string, over: Partial<Category> = {}): Category => ({
  id, name: id, type: 'expense', order_index: 1, cashflowGroup: 'g1', color: '#446688', icon: 'tag', ...over,
});

export const tx = (id: string, date: string, amount: number, over: Partial<TransactionDisplay> = {}): TransactionDisplay => ({
  id, date, amount, category: '', description: id, ...over,
});

export const DAY_TYPES: DayType[] = [
  { id: 'dt_work', name: 'workday', label: 'ทำงาน', color: '#3B82F6', order_index: 1 },
  { id: 'dt_off', name: 'holiday', label: 'หยุด', color: '#F59E0B', order_index: 2 },
  { id: 'dt_ot', name: 'ot', label: 'โอที', color: '#10B981', order_index: 3 },
];
