import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';
import assetService from '../services/assetService';
import analyticsService from '../services/analyticsService';
import groupService from '../services/groupService';
import categoryService from '../services/categoryService';

const G = 'test-g-invest';
const C = 'test-c-invest';
const A = 'test-asset-dime';
const B = 'test-asset-nopriced';
const EXPENSE_C = 'test-c-expense';
const EXPENSE_G = 'test-g-expense';

const cleanup = () => {
  db.prepare("DELETE FROM transactions WHERE id LIKE 'test-inv-%'").run();
  db.prepare('DELETE FROM price_cache WHERE asset_id IN (?, ?)').run(A, B);
  db.prepare('DELETE FROM assets WHERE id IN (?, ?)').run(A, B);
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

  it('totals.bought = ยอดซื้อสะสม (ส่วนที่ขายไปแล้วไม่หาย) · สินทรัพย์ไม่มีราคาแยกเป็น unpricedCost ไม่ปนใน cost', () => {
    const before = assetService.getPortfolio().totals;
    assetService.upsert({ id: B, name: 'กองทุนไม่มีราคา', kind: 'other', unit_label: 'หน่วย' });
    transactionService.upsertMany([
      { id: 'test-inv-b1', date: '2099-05-01', amount: 200, category_id: C, asset_id: B, units: 2 },
      { id: 'test-inv-b2', date: '2099-05-02', amount: 150, category_id: C, asset_id: B, units: 1 },
    ]);
    const after = assetService.getPortfolio().totals;
    expect(after.unpricedCount).toBe(before.unpricedCount + 1);
    expect(after.unpricedCost).toBeCloseTo(before.unpricedCost + 350, 2);
    expect(after.cost).toBeCloseTo(before.cost, 2);
    // ถือของที่ยังไม่มีราคา: ฐาน % นับเฉพาะส่วนที่ขายแล้ว (ซื้อ 350 − ต้นทุนที่ถือ 350 = 0)
    expect(after.bought).toBeCloseTo(before.bought, 2);
    // A: ซื้อ 500 + 1000 = 1500 ทั้งที่ 500 แรกขายไปแล้ว
    expect(after.bought).toBeGreaterThanOrEqual(1500);
  });

  it('จดมูลค่าพอร์ตวันละ 1 แถวเมื่อกรอกราคา (ครั้งหลังสุดชนะ) และคืนใน history', () => {
    assetService.setManualPrice(A, 310); // 4 × 310 = 1,240
    assetService.setManualPrice(A, 320); // 4 × 320 = 1,280 ทับของวันเดียวกัน
    const { history, totals } = assetService.getPortfolio();
    const last = history[history.length - 1];
    expect(history.filter(h => h.date === last.date)).toHaveLength(1);
    expect(last.marketValue).toBeCloseTo(totals.marketValue, 2);
    expect(last.cost).toBeCloseTo(totals.cost, 2);
    expect(totals.marketValue).toBeGreaterThanOrEqual(1280);
  });

  it('DB ปฏิเสธแถวซื้อขายที่ไม่สอดคล้องแม้ข้าม service (หน่วยลอย, หน่วยติดลบ, ขายนอกกลุ่มลงทุน/ออม)', () => {
    const ins = db.prepare('INSERT INTO transactions (id, date, amount, category_id, asset_id, units, trade_side) VALUES (?, ?, ?, ?, ?, ?, ?)');
    expect(() => ins.run('test-inv-t1', '2099-06-01', 100, C, null, 5, null)).toThrow(/ไม่สอดคล้อง/); // หน่วยโดยไม่มีสินทรัพย์
    expect(() => ins.run('test-inv-t2', '2099-06-01', 100, C, A, -3, 'buy')).toThrow(/ไม่สอดคล้อง/);
    expect(() => ins.run('test-inv-t3', '2099-06-01', 100, C, A, 3, null)).toThrow(/ไม่สอดคล้อง/); // ไม่มีทิศทาง
    expect(() => ins.run('test-inv-t4', '2099-06-01', 100, EXPENSE_C, null, null, 'sell')).toThrow(/ไม่สอดคล้อง/);
    // UPDATE ก็ถูกกัน: แถวซื้อขายเดิมย้ายไปหมวดรายจ่ายตรงๆ ไม่ได้
    expect(() => db.prepare("UPDATE transactions SET category_id = ? WHERE id = 'test-inv-buy'").run(EXPENSE_C)).toThrow(/ไม่สอดคล้อง/);
    expect(() => ins.run('test-inv-ok', '2099-06-01', 100, C, A, 3, 'buy')).not.toThrow();
  });

  it('กันย้ายกลุ่ม/หมวดที่มีรายการซื้อขายออกจากลงทุน/ออม และกันลบหมวด — แต่ผ่านเมื่อรายการถูกลบแล้ว', () => {
    expect(() => groupService.upsert({ id: G, name: 'test ลงทุน', type: 'expense' })).toThrow(/เปลี่ยนชนิดไม่ได้/);
    expect(() => categoryService.upsert({ id: C, name: 'test-invest', cashflow_group_id: EXPENSE_G })).toThrow(/ย้ายไม่ได้/);
    expect(() => categoryService.delete(C)).toThrow(/ลบไม่ได้/);
    expect(db.prepare('SELECT type FROM cashflow_groups WHERE id = ?').get(G)).toEqual({ type: 'savings' });
    // แก้ชื่อ/คงชนิดเดิมได้ตามปกติ
    expect(() => groupService.upsert({ id: G, name: 'test ลงทุน 2', type: 'savings' })).not.toThrow();

    const live = db.prepare("SELECT id FROM transactions WHERE id LIKE 'test-inv-%' AND is_deleted = 0 AND (asset_id IS NOT NULL OR trade_side IS NOT NULL)").all() as { id: string }[];
    live.forEach(r => transactionService.delete(r.id));
    expect(() => groupService.upsert({ id: G, name: 'test ลงทุน', type: 'expense' })).not.toThrow();
    groupService.upsert({ id: G, name: 'test ลงทุน', type: 'savings' });
  });

  it('ลบสินทรัพย์ได้เมื่อเหลือแต่แถวที่ซอฟต์ลบแล้ว (ลบแถวเหล่านั้นไปด้วย ไม่ค้าง FK)', () => {
    // ต่อจากเทสต์ก่อนหน้า: แถวซื้อขายของ A ถูกซอฟต์ลบหมดแล้ว
    expect(() => assetService.delete(A)).not.toThrow();
    expect(db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE asset_id = ?').get(A)).toEqual({ c: 0 });
    expect(assetService.getPortfolio().assets.some(a => a.id === A)).toBe(false);
  });
});
