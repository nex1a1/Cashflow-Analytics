import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';
import assetService from '../services/assetService';
import analyticsService from '../services/analyticsService';

const G = 'test-g-invest';
const C = 'test-c-invest';
const A = 'test-asset-dime';
const EXPENSE_C = 'test-c-expense';
const EXPENSE_G = 'test-g-expense';

const cleanup = () => {
  db.prepare("DELETE FROM transactions WHERE id LIKE 'test-inv-%'").run();
  db.prepare('DELETE FROM price_cache WHERE asset_id = ?').run(A);
  db.prepare('DELETE FROM assets WHERE id = ?').run(A);
  db.prepare('DELETE FROM categories WHERE id IN (?, ?)').run(C, EXPENSE_C);
  db.prepare('DELETE FROM cashflow_groups WHERE id IN (?, ?)').run(G, EXPENSE_G);
};

describe('investment ledger (savings group + assets)', () => {
  beforeAll(() => {
    initSchema();
    cleanup();
    db.prepare("INSERT INTO cashflow_groups (id, name, type, allocation_type, order_index) VALUES (?, 'test ลงทุน', 'savings', 'savings', 99)").run(G);
    db.prepare("INSERT INTO cashflow_groups (id, name, type, allocation_type, order_index) VALUES (?, 'test จ่าย', 'expense', 'want', 98)").run(EXPENSE_G);
    db.prepare("INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, 'test-invest', ?)").run(C, G);
    db.prepare("INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, 'test-expense', ?)").run(EXPENSE_C, EXPENSE_G);
    assetService.upsert({ id: A, name: 'Dime AAPL', kind: 'us_stock', symbol: 'AAPL', unit_label: 'หุ้น' });
  });
  afterAll(cleanup);

  const asset = () => assetService.getPortfolio().assets.find(a => a.id === A)!;

  it('ซื้อ 500 ขาย 480 → ขาดทุนที่รับรู้ 20 และออมสุทธิของเดือน = 20', () => {
    transactionService.upsertMany([
      { id: 'test-inv-buy', date: '2099-01-05', amount: 500, category_id: C, asset_id: A, units: 2 },
      { id: 'test-inv-sell', date: '2099-01-20', amount: -480, category_id: C, asset_id: A, units: 2 },
    ]);

    const a = asset();
    expect(a.units).toBe(0);
    expect(a.realized).toBe(-20);
    expect(a.trades.map(t => t.side)).toEqual(['sell', 'buy']);

    const monthly = analyticsService.getMonthlyAggregation('2099-01-01', '2099-01-31');
    expect(monthly.find(m => m.month === '2099-01')?.savings).toBe(20);
  });

  it('ยังถืออยู่ + มีราคากรอกเอง → มูลค่าปัจจุบันและกำไรที่ยังไม่รับรู้', () => {
    transactionService.upsertMany([
      { id: 'test-inv-buy2', date: '2099-02-01', amount: 1000, category_id: C, asset_id: A, units: 4 },
    ]);
    assetService.setManualPrice(A, 300); // 4 หน่วย × 300 = 1,200
    const a = asset();
    expect(a.units).toBe(4);
    expect(a.marketValue).toBe(1200);
    expect(a.unrealized).toBe(200);
    expect(a.priceSource).toBe('กรอกเอง');
  });

  it('ปฏิเสธ: ยอดติดลบในหมวดรายจ่าย, สินทรัพย์ไม่มีจำนวนหน่วย, ลบสินทรัพย์ที่มีรายการ', () => {
    expect(() => transactionService.upsertMany([{ id: 'test-inv-bad1', date: '2099-03-01', amount: -10, category_id: EXPENSE_C }])).toThrow(/ติดลบ/);
    expect(() => transactionService.upsertMany([{ id: 'test-inv-bad2', date: '2099-03-01', amount: 10, category_id: C, asset_id: A }])).toThrow(/จำนวนหน่วย/);
    expect(() => assetService.delete(A)).toThrow(/ลบไม่ได้/);
  });

  it('ออมทั่วไป (ไม่ผูกสินทรัพย์) นับเป็นต้นทุนแยกต่างหาก', () => {
    const before = assetService.getPortfolio().generalSavings;
    transactionService.upsertMany([{ id: 'test-inv-gen', date: '2099-04-01', amount: 250, category_id: C }]);
    expect(assetService.getPortfolio().generalSavings).toBeCloseTo(before + 250, 2);
  });
});
