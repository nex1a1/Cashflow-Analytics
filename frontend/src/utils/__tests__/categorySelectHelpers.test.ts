// frontend/src/utils/__tests__/categorySelectHelpers.test.ts
import { describe, it, expect } from 'vitest';
import { filterAndGroupCategories, getTopCategoriesFromTransactions } from '../categorySelectHelpers';
import { Category, CashflowGroup, TransactionDisplay } from '../../types';

describe('categorySelectHelpers', () => {
  const mockGroups: CashflowGroup[] = [
    { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 1, color: '#f59e0b' },
    { id: 'g_housing', name: 'ค่าหอ/ที่พัก', type: 'expense', allocation_type: 'need', order_index: 2, color: '#3b82f6' },
    { id: 'g_income', name: 'รายได้หลัก', type: 'income', allocation_type: 'need', order_index: 1, color: '#10b981' },
  ];

  const mockCategories: Category[] = [
    { id: 'c_food_1', name: 'อาหาร', cashflow_group_id: 'g_food', type: 'expense', order_index: 1, allocation_type: 'need' },
    { id: 'c_food_2', name: 'เครื่องดื่ม', cashflow_group_id: 'g_food', type: 'expense', order_index: 2, allocation_type: 'want' },
    { id: 'c_rent', name: 'ค่าเช่าห้อง', cashflow_group_id: 'g_housing', type: 'expense', order_index: 1, allocation_type: 'need' },
    { id: 'c_salary', name: 'เงินเดือน', cashflow_group_id: 'g_income', type: 'income', order_index: 1 },
  ];

  describe('filterAndGroupCategories', () => {
    it('filters by type correctly', () => {
      const expenseGroups = filterAndGroupCategories({
        categories: mockCategories,
        cashflowGroups: mockGroups,
        type: 'expense'
      });
      expect(expenseGroups).toHaveLength(2);
      expect(expenseGroups[0].name).toBe('ค่ากิน');
      expect(expenseGroups[0].categories).toHaveLength(2);
      expect(expenseGroups[1].name).toBe('ค่าหอ/ที่พัก');
      expect(expenseGroups[1].categories).toHaveLength(1);
    });

    it('filters by search query on category name', () => {
      const results = filterAndGroupCategories({
        categories: mockCategories,
        cashflowGroups: mockGroups,
        searchQuery: 'เครื่องดื่ม'
      });
      expect(results).toHaveLength(1);
      expect(results[0].categories[0].name).toBe('เครื่องดื่ม');
    });

    it('filters by search query on group name', () => {
      const results = filterAndGroupCategories({
        categories: mockCategories,
        cashflowGroups: mockGroups,
        searchQuery: 'ค่าหอ'
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('ค่าหอ/ที่พัก');
      expect(results[0].categories[0].name).toBe('ค่าเช่าห้อง');
    });

    it('filters by selectedGroupId', () => {
      const results = filterAndGroupCategories({
        categories: mockCategories,
        cashflowGroups: mockGroups,
        selectedGroupId: 'g_food'
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('g_food');
      expect(results[0].categories).toHaveLength(2);
    });
  });

  describe('getTopCategoriesFromTransactions', () => {
    it('returns top frequent categories in descending order', () => {
      const mockTxs: TransactionDisplay[] = [
        { id: '1', date: '2026-09-01', amount: 50, category_id: 'c_food_1', category: 'อาหาร', description: 'ข้าวกะเพรา' },
        { id: '2', date: '2026-09-01', amount: 35, category_id: 'c_food_2', category: 'เครื่องดื่ม', description: 'กาแฟ' },
        { id: '3', date: '2026-09-02', amount: 60, category_id: 'c_food_1', category: 'อาหาร', description: 'ก๋วยเตี๋ยว' },
        { id: '4', date: '2026-09-03', amount: 55, category_id: 'c_food_1', category: 'อาหาร', description: 'ข้าวราดแกง' },
      ];

      const top = getTopCategoriesFromTransactions(mockTxs, mockCategories, 'expense', 2);
      expect(top).toHaveLength(2);
      expect(top[0].id).toBe('c_food_1'); // 3 times
      expect(top[1].id).toBe('c_food_2'); // 1 time
    });
  });
});
