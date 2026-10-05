import { describe, it, expect } from 'vitest';
import { budgetLevel, computeEnvelopes, parseBudgetInput, parseBudgets } from '../budgetEnvelope';

const rows = [
  { date: '2026-09-30', satang: 100000, groupId: 'food' },
  { date: '2026-10-10', satang: 56800, groupId: 'food' }, // อนาคต = แผน
  { date: '2026-10-10', satang: 99999, groupId: 'other' }, // อีกกลุ่ม ห้ามปน
  { date: '2026-08-30', satang: 150000, groupId: 'food' },
  { date: '2026-07-30', satang: 300000, groupId: 'food' },
  { date: '2026-06-30', satang: 450000, groupId: 'food' },
  { date: '2026-06-24', satang: 777777, groupId: 'food' }, // นอกหน้าต่างทั้งแบบรอบและแบบเดือน
  { date: '2026-10-02', satang: 20000, groupId: 'food' },
];

describe('budgetEnvelope', () => {
  it('goes amber when over budget and red only past 120%', () => {
    expect(budgetLevel(300000, 300000)).toBe('ok');
    expect(budgetLevel(318500, 300000)).toBe('warn'); // ค่ากินเกิน 185 บาท ไม่ควรแดง
    expect(budgetLevel(360000, 300000)).toBe('warn');
    expect(budgetLevel(360001, 300000)).toBe('over');
  });

  it('parses stored budgets and typed input defensively', () => {
    expect(parseBudgets({ a: 300000, b: 0, c: -5, d: 'x', e: NaN })).toEqual({ a: 300000 });
    expect(parseBudgets(null)).toEqual({});
    expect(parseBudgets([1, 2])).toEqual({});
    expect(parseBudgetInput('3,000')).toBe(3000);
    expect(parseBudgetInput(' ')).toBeNull();
    expect(parseBudgetInput('abc')).toBe(false);
    expect(parseBudgetInput('0')).toBe(false);
  });

  it('pay cycle: splits spent vs planned and averages the 3 cycles before it', () => {
    // รอบ ก.ย. = 25 ก.ย. – 24 ต.ค. ; วันนี้ 4 ต.ค.
    const [e] = computeEnvelopes(rows, { food: 300000 }, 'cycle:2026-09', '2026-10-04');
    expect(e).toMatchObject({ spent: 120000, planned: 56800, avg: 300000, avgUnits: 3, level: 'ok' });
  });

  it('calendar month: same budget, calendar boundaries', () => {
    // ต.ค. 2026: ใช้แล้ว 20,000 (2 ต.ค.), แผน 56,800 ; เฉลี่ยจาก ก.ค./ส.ค./ก.ย.
    const [e] = computeEnvelopes(rows, { food: 300000 }, '2026-10', '2026-10-04');
    expect(e).toMatchObject({ spent: 20000, planned: 56800, avgUnits: 3 });
    expect(e.avg).toBe(Math.round((300000 + 150000 + 100000) / 3));
  });

  it('a past period has no plan, a future period has no spend', () => {
    expect(computeEnvelopes(rows, { food: 300000 }, 'cycle:2026-08', '2026-10-04')[0]).toMatchObject({ spent: 150000, planned: 0 });
    expect(computeEnvelopes(rows, { food: 300000 }, '2026-11', '2026-10-04')[0]).toMatchObject({ spent: 0, planned: 0 });
  });

  it('only averages periods after the system started', () => {
    const [e] = computeEnvelopes([{ date: '2025-06-30', satang: 200000, groupId: 'g' }], { g: 300000 }, 'cycle:2025-07', '2025-08-10');
    expect(e.avgUnits).toBe(1); // รอบ มิ.ย. 2025 เท่านั้น (ก่อนหน้านั้นไม่มีวันเงินเดือน)
    expect(e.avg).toBe(200000);
  });
});
