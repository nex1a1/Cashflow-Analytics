import { describe, it, expect } from 'vitest';
import { pricePerDisplayUnit, signedTradeAmount, tradeSideOf, describePriceAge, defaultUnitLabel, formatUnits, toBaseUnits, fromBaseUnits, isGoldKind, trimNum, checkPriceSanity, describeHolding, summarizeTrades, xirr, portfolioAnnualReturn, sortAssets, plColor } from '../portfolioHelpers';
import type { PortfolioAsset } from '@/types';

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

  it('xirr: ลง 100 ครบ 1 ปีได้ 110 = 10% · ขาดทุน 90 = −10% · ไม่มีเงินเข้า = null', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 110 }])!).toBeCloseTo(0.10, 4);
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 90 }])!).toBeCloseTo(-0.10, 4);
    expect(xirr([{ date: '2025-01-01', amount: -100 }])).toBeNull();
  });

  const tr = (date: string, side: 'buy' | 'sell', amount: number) => ({ id: date + side, date, side, units: 1, amount, pricePerUnit: amount, description: '' });
  const mk = (id: string, over: Partial<PortfolioAsset>): PortfolioAsset => ({
    id, name: id, kind: 'us_stock', symbol: null, unitLabel: null, autoPrice: true, units: 1, cost: 100, avgCostPerUnit: 100,
    price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null, realized: 0, oversold: false, trades: [], ...over,
  });

  it('portfolioAnnualReturn: ถือครบปีใช้มูลค่าตลาดวันนี้เป็นเงินเข้า · ไม่ถึงปี/ไม่มีราคา ไม่คำนวณ', () => {
    const held = mk('a', { marketValue: 110, trades: [tr('2025-01-01', 'buy', 100)] });
    const r = portfolioAnnualReturn([held], '2026-01-01');
    expect(r.days).toBe(365);
    expect(r.rate!).toBeCloseTo(0.10, 3);
    expect(portfolioAnnualReturn([held], '2025-06-01').rate).toBeNull(); // ไม่ถึง 1 ปี
    const unpriced = mk('b', { marketValue: null, trades: [tr('2024-01-01', 'buy', 100)] });
    expect(portfolioAnnualReturn([unpriced], '2026-01-01')).toEqual({ rate: null, days: 0 });
    const soldOut = mk('c', { units: 0, trades: [tr('2025-01-01', 'buy', 100), tr('2026-01-01', 'sell', 120)] });
    expect(portfolioAnnualReturn([soldOut], '2026-01-01').rate!).toBeCloseTo(0.20, 3);
  });

  it('sortAssets: เรียงตามคีย์ ค่าว่างอยู่ท้ายเสมอทั้งสองทิศ เสมอกันเรียงตามชื่อ', () => {
    const list = [mk('b', { marketValue: 50 }), mk('none', { marketValue: null }), mk('a', { marketValue: 50 }), mk('c', { marketValue: 200 })];
    expect(sortAssets(list, { key: 'value', dir: 'desc' }, {}).map(x => x.id)).toEqual(['c', 'a', 'b', 'none']);
    expect(sortAssets(list, { key: 'value', dir: 'asc' }, {}).map(x => x.id)).toEqual(['a', 'b', 'c', 'none']);
    expect(sortAssets(list, { key: 'weight', dir: 'desc' }, { a: 10, b: 30 }).map(x => x.id)).toEqual(['b', 'a', 'c', 'none']);
    expect(sortAssets(list, { key: 'name', dir: 'asc' }, {}).map(x => x.id)).toEqual(['a', 'b', 'c', 'none']);
  });

  it('plColor: กำไรเขียว ขาดทุนเทา ไม่ใช้แดง', () => {
    expect(plColor(1)).toBe('text-income');
    expect(plColor(-1)).toBe('text-ink-soft');
    expect(plColor(null)).toBe('text-ink-display');
  });
});

describe('portfolioHelpers boundaries', () => {
  const DAY = 86_400_000;
  const t = (id: string, date: string, side: 'buy' | 'sell', units: number, amount: number) => ({ id, date, side, units, amount, pricePerUnit: amount / units, description: '' });
  const mk = (id: string, over: Partial<PortfolioAsset> = {}): PortfolioAsset => ({
    id, name: id, kind: 'us_stock', symbol: null, unitLabel: null, autoPrice: true, units: 1, cost: 100, avgCostPerUnit: 100,
    price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null, realized: 0, oversold: false, trades: [], ...over,
  });

  it('a buy is always positive, even if the number arrives negative; zero counts as a buy', () => {
    expect(signedTradeAmount('buy', -480)).toBe(480);
    expect(signedTradeAmount('sell', 480)).toBe(-480);
    expect(tradeSideOf(0)).toBe('buy');
  });

  it('a price is stale only after more than 24 hours', () => {
    const now = Date.parse('2026-09-30T12:00:00.000Z');
    const at = (ms: number) => new Date(now - ms).toISOString();
    expect(describePriceAge(at(13 * 3_600_000), now)!.stale).toBe(false);
    expect(describePriceAge(at(DAY), now)!.stale).toBe(false);
    expect(describePriceAge(at(DAY + 1), now)!.stale).toBe(true);
    expect(describePriceAge('', now)).toBeNull();
  });

  it('units keep up to six decimals', () => {
    expect(formatUnits(0.123456)).toBe('0.123456');
    expect(formatUnits(0.1234567)).toBe('0.123457');
  });

  it('price per unit shown to the user: per gram for gold, unchanged otherwise', () => {
    expect(pricePerDisplayUnit(15_244, true)).toBeCloseTo(1000, 6);
    expect(pricePerDisplayUnit(15_244, false)).toBe(15_244);
  });

  it('trimNum gives nothing for zero, negatives and non-numbers', () => {
    expect(trimNum(0, 2)).toBe('');
    expect(trimNum(-1, 2)).toBe('');
    expect(trimNum(NaN, 2)).toBe('');
    expect(trimNum(Infinity, 2)).toBe('');
    expect(trimNum(1.5, 4)).toBe('1.5');
  });

  it('price sanity: exactly 3x either way is fine, beyond is flagged', () => {
    expect(checkPriceSanity(300, 100)).toBe('ok');
    expect(checkPriceSanity(300.01, 100)).toBe('far');
    expect(checkPriceSanity(100 / 3, 100)).toBe('ok');
    expect(checkPriceSanity(33, 100)).toBe('far');
    expect(checkPriceSanity(250, 100)).toBe('ok'); // 2.5x is within the allowed range
    expect(checkPriceSanity(45, 100)).toBe('ok');
    expect(checkPriceSanity(1000, 0)).toBe('ok');
    expect(checkPriceSanity(1000, -5)).toBe('ok'); // a negative market price is not a reference
  });

  it('holding time: same day is 0 days, a trade dated after "today" is 0 days, one full month is a month', () => {
    expect(describeHolding('2026-10-08', '2026-10-08')).toBe('0 วัน');
    expect(describeHolding('2026-10-09', '2026-10-08')).toBe('0 วัน');
    expect(describeHolding('2026-09-10', '2026-10-10')).toBe('1 เดือน');
    expect(describeHolding('2026-09-10', '2026-10-09')).toBe('29 วัน');
  });

  it('summarizeTrades: floating-point dust after selling everything becomes exactly zero', () => {
    const r = summarizeTrades([t('a', '2026-01-01', 'buy', 0.1, 10), t('b', '2026-01-02', 'buy', 0.2, 20), t('c', '2026-01-03', 'sell', 0.3, 40)]);
    expect(r.rows[2].balance).toBe(0);
    expect(r.rows[2].realized).toBeCloseTo(10, 9); // 40 - 30 cost
    expect(r.soldUnits).toBe(0.3);
    expect(r.boughtUnits).toBeCloseTo(0.3, 12);
  });

  it('summarizeTrades: after a full sell-out the next buy starts a fresh average', () => {
    const r = summarizeTrades([t('a', '2026-01-01', 'buy', 1, 100), t('b', '2026-01-02', 'sell', 1, 150), t('c', '2026-01-03', 'buy', 1, 500), t('d', '2026-01-04', 'sell', 1, 520)]);
    expect(r.rows[3].realized).toBe(20); // 520 - 500, nothing left over from the first lot
  });

  it('xirr finds big losses and big gains, not only the common range', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 20 }])!).toBeCloseTo(-0.8, 3);
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 300 }])!).toBeCloseTo(2, 3);
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 100 }])!).toBeCloseTo(0, 6);
  });

  it('annual return: trades dated after today do not give negative days', () => {
    const future = mk('f', { units: 0, trades: [t('a', '2026-12-01', 'buy', 1, 100), t('b', '2026-12-20', 'sell', 1, 120)] });
    expect(portfolioAnnualReturn([future], '2026-10-08')).toEqual({ rate: null, days: 0 });
  });

  it('annual return needs 365 days, exactly 365 is enough', () => {
    const a = mk('a', { units: 1, marketValue: 110, trades: [t('a', '2025-10-08', 'buy', 1, 100)] });
    const r = portfolioAnnualReturn([a], '2026-10-08');
    expect(r.days).toBe(365);
    expect(r.rate!).toBeCloseTo(0.1, 3);
    expect(portfolioAnnualReturn([a], '2026-10-07').rate).toBeNull();
  });

  it('annual return: a held asset without a price is left out, a held one is valued today', () => {
    const priced = mk('p', { units: 1, marketValue: 120, trades: [t('a', '2025-01-01', 'buy', 1, 100)] });
    const unpriced = mk('u', { units: 1, marketValue: null, trades: [t('b', '2025-01-01', 'buy', 1, 100000)] });
    const r = portfolioAnnualReturn([priced, unpriced], '2026-01-01');
    expect(r.rate!).toBeCloseTo(0.2, 3); // the unpriced 100000 would drag this down if it were included
  });

  it('sortAssets orders names the way Thai/Latin readers expect (case-insensitive) and keeps equal names in input order', () => {
    const list = [mk('1', { name: 'B' }), mk('2', { name: 'a' }), mk('3', { name: 'A' })];
    const names = (dir: 'asc' | 'desc') => sortAssets(list, { key: 'name', dir }, {}).map(x => x.name);
    expect(names('asc')[0]).toBe('a');
    expect(names('asc')[2]).toBe('B');
    expect(names('desc')[0]).toBe('B');
    const same = [mk('x1', { name: 'Same' }), mk('x2', { name: 'Same' }), mk('x3', { name: 'Same' })];
    expect(sortAssets(same, { key: 'name', dir: 'asc' }, {}).map(x => x.id)).toEqual(['x1', 'x2', 'x3']);
    expect(sortAssets(same, { key: 'name', dir: 'desc' }, {}).map(x => x.id)).toEqual(['x1', 'x2', 'x3']);
  });
});
