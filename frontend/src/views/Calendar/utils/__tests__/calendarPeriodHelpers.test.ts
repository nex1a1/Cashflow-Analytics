// src/views/Calendar/utils/__tests__/calendarPeriodHelpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  getMonthsForPeriod,
  getCPAGrade,
  getHeatmapLevel,
  isWorkDayType,
  isFoodCategory,
  isRentTransaction,
  calculatePeriodMetrics,
  calculateTemporalInsights,
  calculateAllocationBreakdown,
  calculatePeakOutliers
} from '../calendarPeriodHelpers';
import { TransactionDisplay, Category, CashflowGroup, DayType } from '@/types';

describe('calendarPeriodHelpers', () => {
  describe('getMonthsForPeriod', () => {
    it('returns 12 months for year period', () => {
      const months = getMonthsForPeriod('2026');
      expect(months).toHaveLength(12);
      expect(months[0].monthStr).toBe('2026-01');
      expect(months[11].monthStr).toBe('2026-12');
    });

    it('returns 6 months for half year periods', () => {
      const h1 = getMonthsForPeriod('2026-H1');
      expect(h1).toHaveLength(6);
      expect(h1[0].monthStr).toBe('2026-01');
      expect(h1[5].monthStr).toBe('2026-06');

      const h2 = getMonthsForPeriod('2026-H2');
      expect(h2).toHaveLength(6);
      expect(h2[0].monthStr).toBe('2026-07');
      expect(h2[5].monthStr).toBe('2026-12');
    });

    it('returns 3 months for quarter periods', () => {
      const q1 = getMonthsForPeriod('2026-Q1');
      expect(q1).toHaveLength(3);
      expect(q1[0].monthStr).toBe('2026-01');
      expect(q1[2].monthStr).toBe('2026-03');

      const q3 = getMonthsForPeriod('2026-Q3');
      expect(q3).toHaveLength(3);
      expect(q3[0].monthStr).toBe('2026-07');
      expect(q3[2].monthStr).toBe('2026-09');
    });

    it('returns months for range period', () => {
      const range = getMonthsForPeriod('2026-01_2026-03');
      expect(range).toHaveLength(3);
      expect(range.map(m => m.monthStr)).toEqual(['2026-01', '2026-02', '2026-03']);
    });

    it('returns months for comma period', () => {
      const comma = getMonthsForPeriod('2026-01,2026-05');
      expect(comma).toHaveLength(2);
      expect(comma.map(m => m.monthStr)).toEqual(['2026-01', '2026-05']);
    });

    it('returns months from transactions when period is ALL', () => {
      const mockTxs: TransactionDisplay[] = [
        { id: '1', date: '2025-11-10', category: 'Food', amount: 100, description: 'Lunch' },
        { id: '2', date: '2025-12-05', category: 'Rent', amount: 5000, description: 'Rent' },
        { id: '3', date: '2026-01-15', category: 'Salary', amount: 30000, description: 'Pay' }
      ];
      const all = getMonthsForPeriod('ALL', mockTxs);
      expect(all).toHaveLength(3);
      expect(all.map(m => m.monthStr)).toEqual(['2025-11', '2025-12', '2026-01']);
    });
  });

  describe('getCPAGrade', () => {
    it('grades correctly according to CPA savings rate thresholds', () => {
      expect(getCPAGrade(50).grade).toBe('A+');
      expect(getCPAGrade(40).grade).toBe('A+');
      expect(getCPAGrade(35).grade).toBe('A');
      expect(getCPAGrade(30).grade).toBe('A');
      expect(getCPAGrade(25).grade).toBe('B');
      expect(getCPAGrade(20).grade).toBe('B');
      expect(getCPAGrade(15).grade).toBe('C');
      expect(getCPAGrade(10).grade).toBe('C');
      expect(getCPAGrade(5).grade).toBe('D');
      expect(getCPAGrade(0).grade).toBe('F');
      expect(getCPAGrade(-10).grade).toBe('F');
    });
  });

  describe('getHeatmapLevel', () => {
    it('returns level 0 for zero or negative amount', () => {
      expect(getHeatmapLevel(0, 1000)).toBe(0);
      expect(getHeatmapLevel(-10, 1000)).toBe(0);
    });

    it('returns proper tiers based on ratio of maxThreshold', () => {
      expect(getHeatmapLevel(100, 1000)).toBe(1); // 10%
      expect(getHeatmapLevel(250, 1000)).toBe(2); // 25%
      expect(getHeatmapLevel(400, 1000)).toBe(3); // 40%
      expect(getHeatmapLevel(600, 1000)).toBe(4); // 60%
      expect(getHeatmapLevel(800, 1000)).toBe(5); // 80%
      expect(getHeatmapLevel(950, 1000)).toBe(6); // 95%
    });
  });

  describe('isWorkDayType', () => {
    it('correctly identifies work days', () => {
      expect(isWorkDayType({ name: 'workday', label: 'วันทำงาน', id: 'workday' })).toBe(true);
      expect(isWorkDayType({ name: 'ot', label: 'ทำงานล่วงเวลา (OT)', id: 'ot' })).toBe(true);
      expect(isWorkDayType({ name: 'shift', label: 'เข้ากะ', id: 'shift' })).toBe(true);
      expect(isWorkDayType({ name: 'activity', label: 'กิจกรรมบริษัท', id: 'act' })).toBe(true);
    });

    it('correctly identifies rest and weekend days', () => {
      expect(isWorkDayType({ name: 'weekend', label: 'วันหยุดสุดสัปดาห์', id: 'weekend' })).toBe(false);
      expect(isWorkDayType({ name: 'holiday', label: 'วันหยุดนักขัตฤกษ์', id: 'holiday' })).toBe(false);
      expect(isWorkDayType({ name: 'leave', label: 'ลาพักร้อน', id: 'leave' })).toBe(false);
      expect(isWorkDayType(null)).toBe(false);
    });
  });

  describe('isFoodCategory', () => {
    it('detects food categories by name, group, or keyword', () => {
      expect(isFoodCategory({ name: 'อาหารกลางวัน' }, { name: 'ค่าใช้จ่ายประจำวัน' })).toBe(true);
      expect(isFoodCategory({ name: 'กาแฟและขนม' }, { name: 'ความบันเทิง' })).toBe(true);
      expect(isFoodCategory({ name: 'มื้อค่ำ' }, { name: 'อาหารและเครื่องดื่ม' })).toBe(true);
      expect(isFoodCategory({ name: 'คาเฟ่' }, null)).toBe(true);
      expect(isFoodCategory(null, { name: 'Food & Dining' })).toBe(true);
    });

    it('returns false for non-food categories', () => {
      expect(isFoodCategory({ name: 'ค่าน้ำมัน' }, { name: 'การเดินทาง' })).toBe(false);
      expect(isFoodCategory({ name: 'ค่าเช่าห้อง' }, { name: 'ที่อยู่อาศัย' })).toBe(false);
    });
  });

  describe('isRentTransaction', () => {
    it('detects rent or dorm keywords in description, category, or group', () => {
      const t1: TransactionDisplay = { id: '1', date: '2026-03-01', category: 'ค่าเช่าห้อง', amount: 4500, description: 'ค่าหอพัก มี.ค.' };
      expect(isRentTransaction(t1)).toBe(true);

      const t2: TransactionDisplay = { id: '2', date: '2026-03-01', category: 'Housing', amount: 6000, description: 'Condo rent' };
      expect(isRentTransaction(t2)).toBe(true);
    });

    it('returns false for ordinary transactions', () => {
      const t: TransactionDisplay = { id: '3', date: '2026-03-01', category: 'ช้อปปิ้ง', amount: 500, description: 'ซื้อเสื้อผ้า' };
      expect(isRentTransaction(t)).toBe(false);
    });
  });

  describe('calculatePeriodMetrics', () => {
    const mockCategories: Category[] = [
      { id: 'cat-inc', name: 'เงินเดือน', type: 'income', color: '#10b981' },
      { id: 'cat-food', name: 'อาหาร', type: 'expense', color: '#ef4444' },
      { id: 'cat-shop', name: 'ช้อปปิ้ง', type: 'expense', color: '#f59e0b' }
    ];

    const mockTransactions: TransactionDisplay[] = [
      { id: '1', date: '2026-01-05', category_id: 'cat-inc', category: 'เงินเดือน', amount: 50000, description: 'เงินเดือน ม.ค.' },
      { id: '2', date: '2026-01-10', category_id: 'cat-food', category: 'อาหาร', amount: 500, description: 'ข้าวเที่ยง' },
      { id: '3', date: '2026-01-15', category_id: 'cat-shop', category: 'ช้อปปิ้ง', amount: 1500, description: 'ของใช้' },
      { id: '4', date: '2026-02-01', category_id: 'cat-food', category: 'อาหาร', amount: 600, description: 'ชาบู' }
    ];

    it('accurately aggregates inflow, outflow, net, and savings rate', () => {
      const monthsList = getMonthsForPeriod('2026-01_2026-02');
      const metrics = calculatePeriodMetrics({
        monthsList,
        transactions: mockTransactions,
        categories: mockCategories
      });

      expect(metrics.periodIncome).toBe(50000);
      expect(metrics.periodExpense).toBe(2600);
      expect(metrics.periodNet).toBe(47400);
      expect(metrics.savingsRate).toBe(95); // (47400/50000)*100 = 94.8% -> 95%
      expect(metrics.cpaGrade.grade).toBe('A+');
      expect(metrics.displayMonths).toHaveLength(2);
      expect(metrics.totalTxCount).toBe(4);
    });
  });

  describe('calculateTemporalInsights', () => {
    const mockCategories: Category[] = [
      { id: 'cat-food', name: 'อาหาร', type: 'expense', color: '#ef4444' },
      { id: 'cat-trans', name: 'เดินทาง', type: 'expense', color: '#3b82f6' }
    ];

    const mockDayTypes: DayType[] = [
      { id: 'work', label: 'วันทำงาน', color: '#3b82f6' },
      { id: 'weekend', label: 'วันหยุด', color: '#10b981' }
    ];

    const mockTransactions: TransactionDisplay[] = [
      // 2026-03-02 is Monday (work)
      { id: '1', date: '2026-03-02', category_id: 'cat-food', category: 'อาหาร', amount: 300, description: 'อาหารวันทำงาน' },
      // 2026-03-07 is Saturday (weekend)
      { id: '2', date: '2026-03-07', category_id: 'cat-food', category: 'อาหาร', amount: 900, description: 'อาหารวันหยุด' }
    ];

    it('accurately computes work vs rest stats and 7-day week breakdown', () => {
      const monthsList = getMonthsForPeriod('2026-03');
      const insights = calculateTemporalInsights({
        monthsList,
        transactions: mockTransactions,
        categories: mockCategories,
        dayTypes: { '2026-03-02': 'work', '2026-03-07': 'weekend' },
        dayTypeConfig: mockDayTypes
      });

      expect(insights.dayOfWeekStats).toHaveLength(7);
      expect(insights.foodStats.totalFoodExpense).toBe(1200);
      expect(insights.workVsRest.workTotalExpense).toBe(300);
      expect(insights.workVsRest.restTotalExpense).toBe(900);
    });
  });

  describe('calculateAllocationBreakdown', () => {
    const mockGroups: CashflowGroup[] = [
      { id: 'grp-need', name: 'ค่าใช้จ่ายจำเป็น', type: 'expense', allocation_type: 'need', order_index: 1 },
      { id: 'grp-want', name: 'ค่าใช้จ่ายตามใจ', type: 'expense', allocation_type: 'want', order_index: 2 },
      { id: 'grp-save', name: 'เงินออมและการลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 }
    ];

    const mockCategories: Category[] = [
      { id: 'c1', name: 'ค่าอาหาร', cashflow_group_id: 'grp-need', type: 'expense' },
      { id: 'c2', name: 'คาเฟ่/ชานม', cashflow_group_id: 'grp-want', type: 'expense' },
      { id: 'c3', name: 'กองทุน ETF', cashflow_group_id: 'grp-save', type: 'savings' }
    ];

    const mockTransactions: TransactionDisplay[] = [
      { id: '1', date: '2026-03-01', category_id: 'c1', category: 'ค่าอาหาร', amount: 5000, description: 'กิน' },
      { id: '2', date: '2026-03-02', category_id: 'c2', category: 'คาเฟ่/ชานม', amount: 3000, description: 'เที่ยว' },
      { id: '3', date: '2026-03-03', category_id: 'c3', category: 'กองทุน ETF', amount: 2000, description: 'ออม' }
    ];

    it('breaks down amounts into 50/30/20 need/want/savings ratios', () => {
      const monthsList = getMonthsForPeriod('2026-03');
      const allocation = calculateAllocationBreakdown({
        monthsList,
        transactions: mockTransactions,
        categories: mockCategories,
        cashflowGroups: mockGroups
      });

      expect(allocation.needTotal).toBe(5000);
      expect(allocation.wantTotal).toBe(3000);
      expect(allocation.savingsTotal).toBe(2000);
      expect(allocation.needPct).toBe(50);
      expect(allocation.wantPct).toBe(30);
      expect(allocation.savingsPct).toBe(20);
      expect(allocation.benchmarks.needDelta).toBe(0);
      expect(allocation.benchmarks.wantDelta).toBe(0);
      expect(allocation.benchmarks.savingsDelta).toBe(0);
    });
  });

  describe('calculatePeakOutliers', () => {
    const mockCategories: Category[] = [
      { id: 'c-rent', name: 'ค่าเช่าห้อง', type: 'expense' },
      { id: 'c-phone', name: 'ซื้อมือถือ', type: 'expense' },
      { id: 'c-food', name: 'อาหาร', type: 'expense' }
    ];

    const mockTransactions: TransactionDisplay[] = [
      { id: '1', date: '2026-03-01', category_id: 'c-rent', category: 'ค่าเช่าห้อง', amount: 8000, description: 'ค่าหอพัก' },
      { id: '2', date: '2026-03-05', category_id: 'c-phone', category: 'ซื้อมือถือ', amount: 25000, description: 'โทรศัพท์เครื่องใหม่' },
      { id: '3', date: '2026-03-10', category_id: 'c-food', category: 'อาหาร', amount: 400, description: 'ข้าว' }
    ];

    it('excludes rent when excludeRent is true', () => {
      const monthsList = getMonthsForPeriod('2026-03');
      const result = calculatePeakOutliers({
        monthsList,
        transactions: mockTransactions,
        categories: mockCategories,
        excludeRent: true
      });

      expect(result.rentTransactionsCount).toBe(1);
      expect(result.outliers).toHaveLength(2);
      expect(result.outliers[0].totalExpense).toBe(25000);
      expect(result.outliers[0].topItemTitle).toBe('โทรศัพท์เครื่องใหม่');
    });

    it('includes rent when excludeRent is false', () => {
      const monthsList = getMonthsForPeriod('2026-03');
      const result = calculatePeakOutliers({
        monthsList,
        transactions: mockTransactions,
        categories: mockCategories,
        excludeRent: false
      });

      expect(result.outliers).toHaveLength(3);
      expect(result.outliers.some(d => d.totalExpense === 8000)).toBe(true);
    });
  });
});
