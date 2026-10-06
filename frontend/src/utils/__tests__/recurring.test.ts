import { describe, it, expect } from 'vitest';
import { findRecurring, recurringKey, recurringWindow, parseHiddenKeys, RecurringRow } from '../recurring';

let n = 0;
const row = (date: string, category_id: string, description: string, amount: number, extra: Partial<RecurringRow> = {}): RecurringRow =>
  ({ id: `r${++n}`, date, category_id, description, amount, allocation_type: 'need', ...extra });

// ค่าหอ 25 ทุกเดือน, ค่าไฟยอดไม่เท่ากัน, Netflix แค่เดือนเดียว, ข้าวหลายครั้งต่อเดือน
const history: RecurringRow[] = [
  row('2026-07-25', 'rent', 'ค่าหอ', 4500), row('2026-08-25', 'rent', 'ค่าหอ', 4500), row('2026-09-25', 'rent', 'ค่าหอ', 4500),
  row('2026-08-10', 'elec', 'ค่าไฟ', 1100), row('2026-09-12', 'elec', 'ค่าไฟ', 1240),
  row('2026-09-01', 'subs', 'Netflix', 419),
  row('2026-08-03', 'food', 'ข้าว', 60), row('2026-08-04', 'food', 'ข้าว', 60),
  row('2026-09-03', 'food', 'ข้าว', 60), row('2026-09-05', 'food', 'ข้าว', 60),
];

describe('findRecurring (calendar months)', () => {
  it('finds what came back in >= 2 of the last 3 months, once per month; daily food is not a bill', () => {
    const items = findRecurring(history, '2026-10-06', false);
    expect(items.map(i => i.description)).toEqual(['ค่าไฟ', 'ค่าหอ']);
  });

  it('suggests the same day in the target month and the latest amount; flags a changing amount', () => {
    const [elec, rent] = findRecurring(history, '2026-10-06', false);
    expect(rent).toMatchObject({ suggestedDate: '2026-10-25', amount: 4500, variable: false, recordedOn: null });
    expect(elec).toMatchObject({ suggestedDate: '2026-10-12', amount: 1240, variable: true });
  });

  it('marks an item already recorded in the target month (also from rows only in the cart) and lists missing first', () => {
    const cart = row('2026-10-10', 'elec', ' ค่าไฟ ', 1300); // case/space-insensitive
    const items = findRecurring([...history, cart], '2026-10-06', false);
    expect(items.map(i => [i.description, i.recordedOn])).toEqual([['ค่าหอ', null], ['ค่าไฟ', '2026-10-10']]);
  });

  it('chains: once October is in the cart, November still sees the bills (filling a year in one session)', () => {
    const oct = [row('2026-10-25', 'rent', 'ค่าหอ', 4500), row('2026-10-12', 'elec', 'ค่าไฟ', 1240)];
    const nov = findRecurring([...history, ...oct], '2026-11-01', false);
    expect(nov.map(i => i.suggestedDate)).toEqual(['2026-11-12', '2026-11-25']);
  });

  it('clamps the day to the month length (31 → 28 Feb)', () => {
    const rows = [row('2026-12-31', 'x', 'บิล', 100), row('2027-01-31', 'x', 'บิล', 100)];
    expect(findRecurring(rows, '2027-02-10', false)[0].suggestedDate).toBe('2027-02-28');
  });

  it('skips hidden keys, sells, asset trades and rows without a category', () => {
    const rows = [
      row('2026-08-01', 'gold', 'ขายทอง', -500), row('2026-09-01', 'gold', 'ขายทอง', -500),
      row('2026-08-02', 'fund', 'DCA', 1000, { asset_id: 'a1' }), row('2026-09-02', 'fund', 'DCA', 1000, { asset_id: 'a1' }),
      row('2026-08-03', '', 'ไม่มีหมวด', 10), row('2026-09-03', '', 'ไม่มีหมวด', 10),
    ];
    expect(findRecurring([...history, ...rows], '2026-10-06', false, new Set([recurringKey('rent', 'ค่าหอ')])).map(i => i.description)).toEqual(['ค่าไฟ']);
  });

  it('counts a row only once when the same id comes from both the fetch and the context', () => {
    // counted twice, August would look like "more than once a month" and drop a real bill
    const dup = row('2026-08-20', 'gym', 'ฟิตเนส', 900);
    const rows = [dup, { ...dup }, row('2026-09-20', 'gym', 'ฟิตเนส', 900)];
    expect(findRecurring(rows, '2026-10-06', false).map(i => i.description)).toEqual(['ฟิตเนส']);
  });
});

describe('findRecurring (pay cycles 25–24)', () => {
  it('keys by salary month and keeps the position inside the cycle', () => {
    // รอบ ส.ค. = 25 ส.ค. – 24 ก.ย.; ค่าหอวันที่ 25 = ต้นรอบ, ค่าไฟวันที่ 10 = เดือนที่สองของรอบ
    const rows = [
      row('2026-08-25', 'rent', 'ค่าหอ', 4500), row('2026-09-25', 'rent', 'ค่าหอ', 4500),
      row('2026-09-10', 'elec', 'ค่าไฟ', 1100), row('2026-10-10', 'elec', 'ค่าไฟ', 1100),
    ];
    const items = findRecurring(rows, '2026-10-30', true); // รอบ ต.ค.
    expect(items.map(i => [i.description, i.suggestedDate])).toEqual([['ค่าหอ', '2026-10-25'], ['ค่าไฟ', '2026-11-10']]);
  });

  it('window covers 3 cycles back to the end of the target cycle', () => {
    expect(recurringWindow('2026-10-30', true)).toEqual({ start: '2026-07-25', end: '2026-11-24' });
    expect(recurringWindow('2026-10-30', false)).toEqual({ start: '2026-07-01', end: '2026-10-31' });
  });
});

describe('parseHiddenKeys', () => {
  it('keeps only strings and survives junk', () => {
    expect(parseHiddenKeys(['a|b', 3, null])).toEqual(['a|b']);
    expect(parseHiddenKeys(undefined)).toEqual([]);
  });
});
