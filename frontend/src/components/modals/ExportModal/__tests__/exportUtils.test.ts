// frontend/src/components/modals/ExportModal/__tests__/exportUtils.test.ts
import { describe, it, expect } from 'vitest';
import {
  escapeCsvCell,
  resolveDayTypeInfo,
  filterExportTransactions,
  calculateCategoryTotal,
  buildLongCsv,
  buildWideCsv,
  buildFullExtendedCsv,
  buildSystemBackupJson,
  calculateExportStats,
} from '../exportUtils';
import { Category, CashflowGroup, DayType, TransactionDisplay } from '../../../../types';

describe('exportUtils', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'อาหารและเครื่องดื่ม',
      type: 'expense',
      color: '#ef4444',
      cashflowGroup: 'group-var',
      allocation_type: 'need',
    },
    {
      id: 'cat-2',
      name: 'เงินเดือน',
      type: 'income',
      color: '#10b981',
      cashflowGroup: 'group-inc',
      allocation_type: null,
    },
    {
      id: 'cat-3',
      name: 'กองทุน ETF',
      type: 'savings',
      color: '#06b6d4',
      cashflowGroup: 'group-sav',
      allocation_type: 'savings',
    },
  ];

  const mockGroups: CashflowGroup[] = [
    {
      id: 'group-inc',
      name: 'รายรับประจำ',
      type: 'income',
      allocation_type: 'need',
      order_index: 0,
    },
    {
      id: 'group-var',
      name: 'ค่าใช้จ่ายจำเป็น',
      type: 'expense',
      allocation_type: 'need',
      order_index: 1,
    },
    {
      id: 'group-sav',
      name: 'เงินออมและลงทุน',
      type: 'savings',
      allocation_type: 'savings',
      order_index: 2,
    },
  ];

  const mockDayTypes: Record<string, string> = {
    '2026-03-01': 'dt-holiday',
    '2026-03-02': 'dt-work',
  };

  const mockDayTypeConfig: DayType[] = [
    { id: 'dt-work', label: 'ทำงาน', color: '#3b82f6' },
    { id: 'dt-holiday', label: 'วันหยุด', color: '#ef4444' },
    { id: 'dt-ot', label: 'OT', color: '#8b5cf6' },
  ];

  const mockTransactions: TransactionDisplay[] = [
    {
      id: 'tx-1',
      date: '2026-03-01',
      category: 'อาหารและเครื่องดื่ม',
      category_id: 'cat-1',
      description: 'ข้าวผัดกะเพราไข่ดาว',
      amount: 65,
      group_type: 'expense',
      allocation_type: 'need',
    },
    {
      id: 'tx-2',
      date: '2026-03-01',
      category: 'กองทุน ETF',
      category_id: 'cat-3',
      description: 'ซื้อ DCA หุ้นสหรัฐ',
      amount: 5000,
      group_type: 'savings',
      allocation_type: 'savings',
    },
    {
      id: 'tx-3',
      date: '2026-03-02',
      category: 'เงินเดือน',
      category_id: 'cat-2',
      description: 'เงินเดือนประจำเดือน',
      amount: 50000,
      group_type: 'income',
      allocation_type: null,
    },
  ];

  const getDayTypeInfo = (date: string) => resolveDayTypeInfo(date, mockDayTypes, mockDayTypeConfig);

  describe('escapeCsvCell', () => {
    it('handles normal strings without modifications', () => {
      expect(escapeCsvCell('Hello World')).toBe('Hello World');
      expect(escapeCsvCell(1234)).toBe('1234');
    });

    it('escapes strings containing commas, semicolons, and quotes', () => {
      expect(escapeCsvCell('ข้าว, กาแฟ')).toBe('"ข้าว, กาแฟ"');
      expect(escapeCsvCell('ข้าว; กาแฟ')).toBe('"ข้าว; กาแฟ"');
      expect(escapeCsvCell('มี "เครื่องหมายคำพูด"')).toBe('"มี ""เครื่องหมายคำพูด"""');
    });

    it('handles null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });
  });

  describe('resolveDayTypeInfo', () => {
    it('resolves configured day types accurately', () => {
      const dt1 = resolveDayTypeInfo('2026-03-01', mockDayTypes, mockDayTypeConfig);
      expect(dt1.label).toBe('วันหยุด');
      expect(dt1.color).toBe('#ef4444');

      const dt2 = resolveDayTypeInfo('2026-03-02', mockDayTypes, mockDayTypeConfig);
      expect(dt2.label).toBe('ทำงาน');
      expect(dt2.color).toBe('#3b82f6');
    });

    it('falls back to weekend calculation if date is not in map', () => {
      // 2026-03-07 is Saturday
      const dt = resolveDayTypeInfo('2026-03-07', {}, mockDayTypeConfig);
      expect(dt.label).toBe('วันหยุด');
    });
  });

  describe('filterExportTransactions', () => {
    it('filters by period ALL', () => {
      const filtered = filterExportTransactions(mockTransactions, 'ALL', 'all', '', mockCategories);
      expect(filtered.length).toBe(3);
    });

    it('filters by transaction type (income)', () => {
      const filtered = filterExportTransactions(mockTransactions, 'ALL', 'income', '', mockCategories);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('tx-3');
    });

    it('filters by search query matching description or category', () => {
      const filtered = filterExportTransactions(mockTransactions, 'ALL', 'all', 'กะเพรา', mockCategories);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('tx-1');
    });

    it('does not silently drop items with specific Thai phrases', () => {
      const txWithSpecialPhrase: TransactionDisplay[] = [
        ...mockTransactions,
        {
          id: 'tx-4',
          date: '2026-03-01',
          category: 'อาหารและเครื่องดื่ม',
          category_id: 'cat-1',
          description: 'หักวงเงินบัตรเครดิต',
          amount: 150,
          group_type: 'expense',
        },
      ];
      const filtered = filterExportTransactions(txWithSpecialPhrase, 'ALL', 'all', '', mockCategories);
      expect(filtered.length).toBe(4);
    });
  });

  describe('calculateCategoryTotal', () => {
    it('accurately calculates category totals with 2 decimal places', () => {
      const total = calculateCategoryTotal(mockTransactions, '2026-03-01', 'อาหารและเครื่องดื่ม');
      expect(total).toBe(65);
    });
  });

  describe('buildLongCsv', () => {
    it('builds Long CSV with Thai headers matching useImportCSV', () => {
      const csv = buildLongCsv({
        data: mockTransactions,
        categories: mockCategories,
        getDayTypeInfo,
        delimiter: ',',
        headerLang: 'th',
      });

      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน');
      expect(lines.length).toBe(4); // 1 header + 3 rows
      expect(lines[1]).toContain('2026-03-01,วันหยุด,รายจ่าย,อาหารและเครื่องดื่ม,ข้าวผัดกะเพราไข่ดาว,65.00');
    });

    it('builds Long CSV with English headers and semicolon delimiter', () => {
      const csv = buildLongCsv({
        data: mockTransactions,
        categories: mockCategories,
        getDayTypeInfo,
        delimiter: ';',
        headerLang: 'en',
      });

      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('Date;DayType;Type;Category;Description;Amount');
      expect(lines[1]).toContain('2026-03-01;วันหยุด;expense;อาหารและเครื่องดื่ม;ข้าวผัดกะเพราไข่ดาว;65.00');
    });
  });

  describe('buildWideCsv', () => {
    it('builds Wide matrix comparison table with daily totals', () => {
      const csv = buildWideCsv({
        data: mockTransactions,
        categories: mockCategories,
        getDayTypeInfo,
        delimiter: ',',
        headerLang: 'th',
      });

      const lines = csv.trim().split('\n');
      expect(lines[0]).toContain('วันที่,ชนิดวัน');
      expect(lines[0]).toContain('รวมสุทธิ');
      expect(lines.length).toBe(3); // Header + 2 unique dates (2026-03-01, 2026-03-02)
    });
  });

  describe('buildFullExtendedCsv', () => {
    it('includes full relational details including allocation and group', () => {
      const csv = buildFullExtendedCsv({
        data: mockTransactions,
        categories: mockCategories,
        cashflowGroups: mockGroups,
        getDayTypeInfo,
        delimiter: ',',
        headerLang: 'en',
      });

      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('TransactionID,Date,DayType,GroupType,GroupName,Category,AllocationType,Description,Amount');
      expect(lines[1]).toContain('tx-1,2026-03-01,วันหยุด,expense,ค่าใช้จ่ายจำเป็น,อาหารและเครื่องดื่ม,need,ข้าวผัดกะเพราไข่ดาว,65.00');
    });
  });

  describe('buildSystemBackupJson', () => {
    it('generates valid JSON with complete system state', () => {
      const jsonStr = buildSystemBackupJson({
        transactions: mockTransactions,
        categories: mockCategories,
        cashflowGroups: mockGroups,
        dayTypes: mockDayTypes,
        dayTypeConfig: mockDayTypeConfig,
      });

      const parsed = JSON.parse(jsonStr);
      expect(parsed.app).toBe('CashflowShark');
      expect(parsed.schemaVersion).toBe('2.0.0');
      expect(parsed.stats.transactionsCount).toBe(3);
      expect(parsed.data.transactions.length).toBe(3);
      expect(parsed.data.categories.length).toBe(3);
      expect(parsed.data.cashflowGroups.length).toBe(3);
    });
  });

  describe('calculateExportStats', () => {
    it('calculates stats for long CSV', () => {
      const stats = calculateExportStats('long', mockTransactions, mockTransactions, mockCategories, mockDayTypeConfig, mockDayTypes);
      expect(stats.rowCount).toBe(3);
      expect(stats.hasData).toBe(true);
      expect(Number(stats.estKB)).toBeGreaterThan(0);
    });

    it('calculates stats for wide CSV (unique dates count)', () => {
      const stats = calculateExportStats('wide', mockTransactions, mockTransactions, mockCategories, mockDayTypeConfig, mockDayTypes);
      expect(stats.rowCount).toBe(2); // 2 distinct dates
      expect(stats.hasData).toBe(true);
    });
  });
});
