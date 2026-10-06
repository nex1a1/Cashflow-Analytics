import { describe, it, expect } from 'vitest';
import { computeDeductions, estimateTax, progressiveTax, parseTaxProfile, taxYearOf, TaxRow } from '../taxDeduction';

let n = 0;
const row = (date: string, category_id: string, amount: number): TaxRow => ({ id: `t${++n}`, date, category_id, description: 'x', amount });
const satang = (baht: number) => baht * 100;

describe('computeDeductions', () => {
  it('sums the calendar year only, net of sells, and caps by the percent of income when it is known', () => {
    const rows = [
      row('2025-12-31', 'rmf', 9_999), // last year
      row('2026-01-25', 'rmf', 50_000), row('2026-06-25', 'rmf', 100_000), row('2026-09-01', 'rmf', -10_000), // sold back
      row('2027-01-01', 'rmf', 9_999), // next year
    ];
    const s = computeDeductions(rows, { rmf: 'rmf' }, '2026', { income: satang(400_000) });
    const [rmf] = s.lines;
    expect(rmf.paid).toBe(satang(140_000));
    expect(rmf.cap).toBe(satang(120_000)); // 30% of 400,000 < 500,000
    expect(rmf.deductible).toBe(satang(120_000));
    expect(s.overCap).toBe(satang(20_000));
    expect(rmf.rows.map(r => r.date)).toEqual(['2026-01-25', '2026-06-25', '2026-09-01']);
  });

  it('without the income uses the baht cap and says the percent cap is unknown', () => {
    const [esg] = computeDeductions([row('2026-03-01', 'esg', 350_000)], { esg: 'thai_esg' }, '2026').lines;
    expect(esg).toMatchObject({ cap: satang(300_000), pctUnknown: true, deductible: satang(300_000) });
  });

  it('life + health share 100,000: health keeps its own 25,000, life is trimmed', () => {
    const rows = [row('2026-02-01', 'life', 90_000), row('2026-02-01', 'health', 30_000)];
    const s = computeDeductions(rows, { life: 'life_ins', health: 'health_ins' }, '2026');
    const by = Object.fromEntries(s.lines.map(l => [l.type.id, l.deductible]));
    expect(by.health_ins).toBe(satang(25_000));
    expect(by.life_ins).toBe(satang(75_000));
    expect(s.total).toBe(satang(100_000));
    expect(s.trimmed).toEqual([{ label: expect.stringContaining('ประกันชีวิต'), amount: satang(15_000) }]);
  });

  it('a mapped type with no rows still shows (0) so the user sees it is set up; a net sell never goes below 0', () => {
    const s = computeDeductions([row('2026-05-01', 'rmf', -5_000)], { rmf: 'rmf', gift: 'donation' }, '2026');
    expect(s.lines.map(l => [l.type.id, l.paid, l.deductible, l.cap])).toEqual([['rmf', 0, 0, satang(500_000)], ['donation', 0, 0, null]]);
  });
});

describe('taxYearOf', () => {
  it('only a whole year (calendar or the cycle year preset)', () => {
    expect(taxYearOf('2026')).toBe('2026');
    expect(taxYearOf('cycle:2026-01_2026-12')).toBe('2026');
    expect(taxYearOf('cycle:2026-01_2026-03')).toBeNull();
    expect(taxYearOf('2026-10')).toBeNull();
    expect(taxYearOf('ALL')).toBeNull();
  });
});

describe('parseTaxProfile', () => {
  it('drops unknown types and bad incomes', () => {
    expect(parseTaxProfile({ mapping: { a: 'rmf', b: 'lottery', c: 3 }, years: { 2026: { income: 42_000_000, withheld: 0, sso: -1, pvd: 'x' }, bad: { income: 1 } } }))
      .toEqual({ mapping: { a: 'rmf' }, years: { 2026: { income: 42_000_000, withheld: 0 } } });
    expect(parseTaxProfile(null)).toEqual({ mapping: {}, years: {} });
  });

  it('keeps the filed result (history) and drops junk inside it', () => {
    const raw = { years: { 2025: { income: 1, filed: { date: '2026-02-15', netIncome: 2_074_384, tax: 0, paid: 'x', refund: -5, ref: 'P9' } } } };
    expect(parseTaxProfile(raw).years['2025'].filed).toEqual({ date: '2026-02-15', netIncome: 2_074_384, tax: 0 });
    expect(parseTaxProfile({ years: { 2025: { filed: { date: '15/02/2026' } } } }).years['2025'].filed).toBeUndefined();
  });
});

describe('estimateTax', () => {
  const none = computeDeductions([], {}, '2026');

  it('salary 420,000 + SSO 9,000: net 251,000 → 5% on 101,000 = 5,050; withheld 5,000 → pay 50 more', () => {
    const form = { income: satang(420_000), sso: satang(9_000), withheld: satang(5_000) };
    const e = estimateTax(form, computeDeductions([], {}, '2026', form))!;
    expect(e.steps.map(s => s.amount)).toEqual([satang(420_000), -satang(100_000), -satang(60_000), -satang(9_000)]);
    expect(e.netIncome).toBe(satang(251_000));
    expect(e.tax).toBe(satang(5_050));
    expect(e.balance).toBe(satang(50));
    expect(e.marginalRate).toBe(0.05);
  });

  it('RMF 30,000 from the Ledger turns it into a refund of 1,450', () => {
    const form = { income: satang(420_000), sso: satang(9_000), withheld: satang(5_000) };
    const s = computeDeductions([row('2026-12-01', 'rmf', 30_000)], { rmf: 'rmf' }, '2026', form);
    expect(estimateTax(form, s)!.balance).toBe(-satang(1_450));
  });

  it('matches a filed ภ.ง.ด.91 (tax year 2568): net income 20,743.84, tax 0', () => {
    // income 173,641.68 · expense 86,820.84 · deductions 66,077 = personal 60,000 + PVD 1,760 + SSO 4,317
    const form = { income: 17_364_168, sso: satang(4_317), pvd: satang(1_760), withheld: 0 };
    const e = estimateTax(form, computeDeductions([], {}, '2025', form))!;
    expect(e.steps[1].amount).toBe(-8_682_084);
    expect(e.netIncome).toBe(2_074_384);
    expect(e.tax).toBe(0);
    expect(e.balance).toBe(0);
  });

  it('needs the income from the 50 ทวิ', () => {
    expect(estimateTax({ withheld: satang(1_000) }, none)).toBeNull();
  });

  it('progressive brackets: 1,200,000 net = 0 + 7,500 + 20,000 + 37,500 + 50,000 + 50,000', () => {
    const t = progressiveTax(satang(1_200_000));
    expect(t.tax).toBe(satang(165_000));
    expect(t.marginalRate).toBe(0.25);
    expect(t.brackets.map(b => b.rate)).toEqual([0, 0.05, 0.1, 0.15, 0.2, 0.25]);
  });
});

describe('caps that need the 50 ทวิ', () => {
  it('PVD eats the 500,000 retirement cap first, RMF gets the rest', () => {
    const form = { income: satang(3_000_000), pvd: satang(450_000) };
    const s = computeDeductions([row('2026-03-01', 'rmf', 100_000)], { rmf: 'rmf' }, '2026', form);
    expect(s.pvd).toBe(satang(450_000));
    expect(s.lines[0].deductible).toBe(satang(50_000));
    expect(s.trimmed[0].amount).toBe(satang(50_000));
  });

  it('donation is capped at 10% of income after expenses and allowances', () => {
    // 420,000 − 100,000 − 60,000 = 260,000 → cap 26,000
    const s = computeDeductions([row('2026-05-01', 'gift', 50_000)], { gift: 'donation' }, '2026', { income: satang(420_000) });
    expect(s.lines[0]).toMatchObject({ cap: satang(26_000), deductible: satang(26_000) });
  });
});
