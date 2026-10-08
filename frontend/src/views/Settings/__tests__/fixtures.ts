import type { CashflowGroup, Category, DayType } from '@/types';

export const grp = (id: string, over: Partial<CashflowGroup> = {}): CashflowGroup => ({
  id, name: id, type: 'expense', allocation_type: 'want', order_index: 1, color: '#112233', icon: 'wallet', ...over,
});

export const cat = (id: string, over: Partial<Category> = {}): Category => ({
  id, name: id, type: 'expense', order_index: 1, cashflowGroup: 'g1', color: '#445566', icon: 'tag', ...over,
});

export const dayType = (id: string, over: Partial<DayType> = {}): DayType => ({
  id, name: id, label: id, color: '#778899', order_index: 1, ...over,
});
