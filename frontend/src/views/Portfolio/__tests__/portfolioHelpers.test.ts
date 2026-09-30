import { describe, it, expect } from 'vitest';
import { signedTradeAmount, tradeSideOf, describePriceAge, defaultUnitLabel, formatUnits, toBaseUnits, fromBaseUnits, isGoldKind, trimNum, checkPriceSanity, describeHolding, summarizeTrades } from '../portfolioHelpers';

describe('portfolioHelpers', () => {
  it('ขาย = ยอดติดลบ ซื้อ = บวก และย้อนกลับได้', () => {
    expect(signedTradeAmount('sell', 480)).toBe(-480);
    expect(signedTradeAmount('buy', 500)).toBe(500);
    expect(signedTradeAmount('sell', -480)).toBe(-480);
    expect(tradeSideOf(-480)).toBe('sell');
    expect(tradeSideOf(500)).toBe('buy');
  });

  it('ราคาเก่ากว่า 24 ชม. ถูกทำเครื่องหมาย stale พร้อมป้ายกำกับ', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(describePriceAge('2026-09-30T10:00:00Z', now)?.stale).toBe(false);
    const old = describePriceAge('2026-09-28T10:00:00Z', now);
    expect(old?.stale).toBe(true);
    expect(old?.label.startsWith('ข้อมูล ณ ')).toBe(true);
    expect(describePriceAge(null, now)).toBeNull();
    expect(describePriceAge('not-a-date', now)).toBeNull();
  });

  it('หน่วยเริ่มต้นและรูปแบบจำนวนหน่วย', () => {
    expect(defaultUnitLabel('gold_bar')).toBe('บาททอง');
    expect(defaultUnitLabel('us_stock')).toBe('หุ้น');
    expect(formatUnits(0.0234)).toBe('0.0234');
    expect(formatUnits(2)).toBe('2');
  });

  it('ทอง: กรัม ↔ บาททอง (0.2393 กรัม ≈ 0.015698 บาททอง)', () => {
    expect(trimNum(toBaseUnits(0.2393, true), 6)).toBe('0.015698');
    expect(fromBaseUnits(toBaseUnits(3.81, true), true)).toBeCloseTo(3.81, 10);
    expect(toBaseUnits(2, false)).toBe(2);
    expect(isGoldKind('gold_bar') && isGoldKind('gold_ornament') && !isGoldKind('us_stock')).toBe(true);
  });

  it('เตือนเมื่อราคาห่างตลาดเกิน 3 เท่า (มักกรอกหน่วยผิด)', () => {
    expect(checkPriceSanity(63700, 64000)).toBe('ok');
    expect(checkPriceSanity(4179, 64000)).toBe('far');
    expect(checkPriceSanity(100, null)).toBe('ok');
  });

  it('ถือมานานเท่าไร', () => {
    expect(describeHolding('2026-09-10', '2026-09-30')).toBe('20 วัน');
    expect(describeHolding('2025-10-05', '2026-09-30')).toBe('11 เดือน');
    expect(describeHolding('2025-10-05', '2026-10-05')).toBe('1 ปี');
    expect(describeHolding('2025-10-05', '2026-12-20')).toBe('1 ปี 2 เดือน');
  });

  it('summarizeTrades: คงเหลือ + กำไรต่อรายการขายด้วยต้นทุนเฉลี่ย', () => {
    const t = (id: string, date: string, side: 'buy' | 'sell', units: number, amount: number) =>
      ({ id, date, side, units, amount, pricePerUnit: amount / units, description: '' });
    const r = summarizeTrades([t('c', '2026-03-01', 'sell', 5, 700), t('a', '2026-01-01', 'buy', 10, 1000), t('b', '2026-02-01', 'buy', 10, 1400)]);
    expect(r.rows.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(r.rows[2].balance).toBe(15);
    expect(r.rows[2].realized).toBe(700 - 2400 * (5 / 20)); // ต้นทุนเฉลี่ย 120 → ขาย 5 หน่วยต้นทุน 600
    expect([r.buyCount, r.sellCount, r.boughtAmount, r.soldAmount]).toEqual([2, 1, 2400, 700]);
  });
});
