import { describe, it, expect } from 'vitest';
import { 
  createCategoryMap, 
  extractYearMonth, 
  generateCashflowMap, 
  calculateDayTypeCounts 
} from '../analyticsHelpers';
import { Category, CashflowGroup, TransactionDisplay, DayType } from '../../types';

describe('analyticsHelpers utility', () => {
  const mockCategories: Category[] = [
    { id: 'cat_salary', name: 'เงินเดือน', type: 'income', cashflow_group_id: 'grp_income' },
    { id: 'cat_food', name: 'อาหาร', type: 'expense', cashflow_group_id: 'grp_food' },
    { id: 'cat_savings', name: 'ออมเงิน', type: 'savings', cashflow_group_id: 'grp_savings' }
  ];

  const mockGroups: CashflowGroup[] = [
    { id: 'grp_income', name: 'รายรับประจำ', type: 'income', allocation_type: 'savings', order_index: 1 },
    { id: 'grp_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'want', order_index: 2 },
    { id: 'grp_savings', name: 'เงินออม', type: 'savings', allocation_type: 'savings', order_index: 3 },
  ];

  describe('createCategoryMap', () => {
    it('indexes categories by both name and id', () => {
      const catMap = createCategoryMap(mockCategories);
      expect(catMap['cat_salary']).toBeDefined();
      expect(catMap['เงินเดือน']).toBeDefined();
      expect(catMap['cat_salary'].name).toBe('เงินเดือน');
    });
  });

  describe('extractYearMonth', () => {
    it('extracts YYYY-MM from YYYY-MM-DD', () => {
      expect(extractYearMonth('2026-09-07')).toBe('2026-09');
      expect(extractYearMonth('2026-1-5')).toBe('2026-01');
    });

    it('extracts YYYY-MM from DD/MM/YYYY', () => {
      expect(extractYearMonth('07/09/2026')).toBe('2026-09');
    });

    it('returns null for invalid or empty dates', () => {
      expect(extractYearMonth('')).toBeNull();
      expect(extractYearMonth('invalid')).toBeNull();
    });
  });

  describe('generateCashflowMap', () => {
    it('correctly aggregates income, expense, and savings', () => {
      const catMap = createCategoryMap(mockCategories);
      const mockTransactions: TransactionDisplay[] = [
        { id: '1', date: '2026-09-01', category: 'เงินเดือน', category_id: 'cat_salary', description: 'Salary', amount: 50000, group_type: 'income' },
        { id: '2', date: '2026-09-02', category: 'อาหาร', category_id: 'cat_food', description: 'Lunch', amount: 200, group_type: 'expense' },
        { id: '3', date: '2026-09-03', category: 'อาหาร', category_id: 'cat_food', description: 'Dinner', amount: 300, group_type: 'expense' },
        { id: '4', date: '2026-09-04', category: 'ออมเงิน', category_id: 'cat_savings', description: 'ETF', amount: 10000, group_type: 'savings' }
      ];

      const result = generateCashflowMap(mockTransactions, '2026-09', catMap, mockGroups);

      expect(result.totals.income).toBe(50000);
      expect(result.totals.expense).toBe(500);
      expect(result.totals.savings).toBe(10000);
      expect(result.cashflowMap['2026-09']).toBeDefined();
      expect(result.cashflowMap['2026-09'].income).toBe(50000);
      expect(result.cashflowMap['2026-09'].totalExp).toBe(500);
      expect(result.cashflowMap['2026-09'].totalSav).toBe(10000);
    });
  });

  describe('calculateDayTypeCounts', () => {
    const mockDayTypeConfig: DayType[] = [
      { id: 'WORK', label: 'ทำงาน' },
      { id: 'HOLIDAY', label: 'วันหยุด' }
    ];

    it('counts occurrences of day types for given dates', () => {
      const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
      const dayTypes = {
        '2026-09-01': 'WORK',
        '2026-09-02': 'WORK',
        '2026-09-03': 'HOLIDAY'
      };

      const counts = calculateDayTypeCounts(dates, dayTypes, mockDayTypeConfig);
      expect(counts['WORK']).toBe(2);
      expect(counts['HOLIDAY']).toBe(1);
    });
  });
});
