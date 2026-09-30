import { describe, it, expect } from 'vitest';
import { computePosition, pickQuote, marketValueSatang, Trade } from '../services/portfolioMath';

const buy = (date: string, units: number, baht: number): Trade => ({ date, side: 'buy', units, amountSatang: baht * 100 });
const sell = (date: string, units: number, baht: number): Trade => ({ date, side: 'sell', units, amountSatang: baht * 100 });

describe('computePosition', () => {
  it('ซื้อ 500 ขายหมดได้ 480 = ขาดทุนที่รับรู้ 20 บาท และไม่เหลือสถานะ', () => {
    const p = computePosition([buy('2026-09-01', 2, 500), sell('2026-09-10', 2, 480)]);
    expect(p).toEqual({ units: 0, costSatang: 0, realizedSatang: -2000, oversold: false });
  });

  it('ขายบางส่วนใช้ต้นทุนเฉลี่ย', () => {
    // ซื้อ 10 หน่วย 1,000 + 10 หน่วย 1,400 → เฉลี่ย 120/หน่วย; ขาย 5 หน่วยได้ 700 → กำไร 100
    const p = computePosition([buy('2026-01-01', 10, 1000), buy('2026-02-01', 10, 1400), sell('2026-03-01', 5, 700)]);
    expect(p.units).toBe(15);
    expect(p.costSatang).toBe(180000);
    expect(p.realizedSatang).toBe(10000);
  });

  it('บันทึกขายก่อนซื้อของวันเดียวกัน = สลับเป็นซื้อก่อนขาย ไม่ถือว่าขายเกิน', () => {
    const p = computePosition([sell('2026-05-01', 1, 120), buy('2026-05-01', 1, 100)]);
    expect(p.oversold).toBe(false);
    expect(p.realizedSatang).toBe(2000);
  });

  it('ซื้อ-ขาย-ซื้อในวันเดียวกัน ใช้ลำดับที่บันทึก: ซื้อรอบหลังไม่ปนต้นทุนของการขาย', () => {
    const p = computePosition([
      { ...buy('2026-09-30', 2, 500), createdAt: '2026-09-30 10:00:00' },
      { ...sell('2026-09-30', 2, 480), createdAt: '2026-09-30 10:00:01' },
      { ...buy('2026-09-30', 0.5, 6000), createdAt: '2026-09-30 10:00:02' },
    ]);
    expect(p.realizedSatang).toBe(-2000);
    expect(p.units).toBe(0.5);
    expect(p.costSatang).toBe(600000);
  });

  it('ขายเกินที่ถือ = ตั้งธง oversold และไม่ทำให้หน่วยติดลบ', () => {
    const p = computePosition([buy('2026-01-01', 1, 100), sell('2026-01-02', 2, 300)]);
    expect(p.oversold).toBe(true);
    expect(p.units).toBe(0);
  });
});

describe('pickQuote / marketValueSatang', () => {
  const cached = { price: 100, at: '2026-09-30T10:00:00Z', source: 'yahoo' };
  const manual = { price: 90, at: '2026-09-30T12:00:00Z', source: 'manual' };
  it('ราคาที่ใหม่กว่าชนะ', () => {
    expect(pickQuote(cached, manual)).toBe(manual);
    expect(pickQuote(cached, { ...manual, at: '2026-09-29T00:00:00Z' })).toBe(cached);
    expect(pickQuote(null, null)).toBeNull();
  });
  it('มูลค่า = หน่วย × ราคา ปัดเป็นสตางค์', () => {
    expect(marketValueSatang(0.0234, 8000.55)).toBe(18721);
    expect(marketValueSatang(1, null)).toBeNull();
  });
});
