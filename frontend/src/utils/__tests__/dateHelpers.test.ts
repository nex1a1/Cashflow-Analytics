import { describe, it, expect } from 'vitest';
import {
  parseLooseDate, fromISODate, parseDateStrToObj, isDateInFilter, buildDateSequence, periodUnitDates,
  resolvePeriodDateBounds, generateDatesForPeriod, getPeriodDateRange,
} from '../dateHelpers';

const iso = (d: Date | undefined) => d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const span = (p: string) => { const b = resolvePeriodDateBounds(p); return b && [iso(b.start), iso(b.end)]; };

describe('parseLooseDate (CSV import dates)', () => {
  it.each([
    ['2026-10-05', '2026-10-05'],
    ['5/10/2026', '2026-10-05'],
    ['05/10/2026', '2026-10-05'],
    [' 5/10/2026 ', '2026-10-05'],
    ['5/10/2569', '2026-10-05'], // พ.ศ. จาก Excel ภาษาไทย
    ['2569-10-05', '2026-10-05'],
    ['29/2/2024', '2024-02-29'],
  ])('reads %s as %s', (input, expected) => {
    expect(parseLooseDate(input)).toBe(expected);
  });

  it.each(['', '1/2', '5/10/26', '31/2/2026', '2026-02-30', '2026-13-01', 'abc', '2026-1-5', '0/10/2026'])(
    'rejects %j',
    (input) => {
      expect(parseLooseDate(input)).toBeNull();
    },
  );
});

describe('fromISODate / parseDateStrToObj', () => {
  it('ISO → DD/MM/YYYY for display; anything else is left alone', () => {
    expect(fromISODate('2026-10-05')).toBe('05/10/2026');
    expect(fromISODate('')).toBe('');
    expect(fromISODate('abc')).toBe('abc');
  });

  it('reads ISO as a local date (not UTC midnight); no date = now', () => {
    const d = parseDateStrToObj('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
    expect(Math.abs(parseDateStrToObj('').getTime() - Date.now())).toBeLessThan(5000);
  });
});

describe('isDateInFilter (calendar mode)', () => {
  it('everything, and nothing without a date', () => {
    expect(isDateInFilter('', 'ALL')).toBe(true);
    expect(isDateInFilter('', '2026')).toBe(false);
    expect(isDateInFilter('2026-03', '2026')).toBe(false); // not a full date
  });

  it('a month, a year, a list, a range (edges included)', () => {
    expect(isDateInFilter('2026-03-31', '2026-03')).toBe(true);
    expect(isDateInFilter('2026-04-01', '2026-03')).toBe(false);
    expect(isDateInFilter('2026-12-31', '2026')).toBe(true);
    expect(isDateInFilter('2027-01-01', '2026')).toBe(false);
    expect(isDateInFilter('2026-03-10', '2026-01,2026-03')).toBe(true);
    expect(isDateInFilter('2026-02-10', '2026-01,2026-03')).toBe(false);
    expect(isDateInFilter('2025-12-01', '2025-12_2026-02')).toBe(true);
    expect(isDateInFilter('2026-02-28', '2025-12_2026-02')).toBe(true);
    expect(isDateInFilter('2026-03-01', '2025-12_2026-02')).toBe(false);
    expect(isDateInFilter('2025-11-30', '2025-12_2026-02')).toBe(false);
  });

  it.each([
    ['2026-H1', '2026-01-01', '2026-06-30', '2026-07-01'],
    ['2026-H2', '2026-07-01', '2026-12-31', '2026-06-30'],
    ['2026-Q1', '2026-01-01', '2026-03-31', '2026-04-01'],
    ['2026-Q2', '2026-04-01', '2026-06-30', '2026-07-01'],
    ['2026-Q3', '2026-07-01', '2026-09-30', '2026-10-01'],
    ['2026-Q4', '2026-10-01', '2026-12-31', '2026-09-30'],
  ])('%s: from %s to %s, not %s', (period, first, last, outside) => {
    expect(isDateInFilter(first, period)).toBe(true);
    expect(isDateInFilter(last, period)).toBe(true);
    expect(isDateInFilter(outside, period)).toBe(false);
  });

  it('a half or quarter of another year, or an unknown part, matches nothing', () => {
    expect(isDateInFilter('2025-02-01', '2026-Q1')).toBe(false);
    expect(isDateInFilter('2026-02-01', '2026-Q5')).toBe(false);
    expect(isDateInFilter('2026-02-01', '2026-X1')).toBe(false);
    expect(isDateInFilter('2026-02-01', 'junk')).toBe(false);
  });
});

describe('buildDateSequence / periodUnitDates', () => {
  it('every day from start to end inclusive; nothing when reversed; capped', () => {
    expect(buildDateSequence(new Date(2026, 1, 27), new Date(2026, 2, 2))).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(buildDateSequence(new Date(2026, 2, 2), new Date(2026, 2, 1))).toEqual([]);
    expect(buildDateSequence(new Date(2026, 0, 1), new Date(2026, 11, 31), 3)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('a calendar month, or a pay cycle 25 → 24', () => {
    const feb = periodUnitDates('2028-02', false);
    expect([feb.length, feb[0], feb.at(-1)]).toEqual([29, '2028-02-01', '2028-02-29']);
    const cyc = periodUnitDates('2026-01', true);
    expect([cyc.length, cyc[0], cyc.at(-1)]).toEqual([31, '2026-01-25', '2026-02-24']);
  });
});

describe('resolvePeriodDateBounds', () => {
  it.each([
    ['2026', '2026-01-01', '2026-12-31'],
    ['2026-H1', '2026-01-01', '2026-06-30'],
    ['2026-H2', '2026-07-01', '2026-12-31'],
    ['2026-Q1', '2026-01-01', '2026-03-31'],
    ['2026-Q2', '2026-04-01', '2026-06-30'],
    ['2026-Q4', '2026-10-01', '2026-12-31'],
    ['2028-02', '2028-02-01', '2028-02-29'],
    ['2025-11_2026-02', '2025-11-01', '2026-02-28'],
    ['cycle:2026-01', '2026-01-25', '2026-02-24'],
    ['cycle:2026-11_2027-01', '2026-11-25', '2027-02-24'],
  ])('%s → %s .. %s', (p, s, e) => {
    expect(span(p)).toEqual([s, e]);
  });

  it('not a period with bounds: null', () => {
    for (const p of ['ALL', '2026-01,2026-03', 'cycle:2026-01,2026-03', 'cycle:ALL', 'junk', '2026-1', '2026-Q5', 'a_b']) expect(span(p)).toBeNull();
  });
});

describe('generateDatesForPeriod', () => {
  const tx = (...dates: string[]) => dates.map(date => ({ date }));

  it('everything: from the first day of the earliest month (or pay cycle) to the latest row', () => {
    expect(generateDatesForPeriod('ALL', [])).toEqual([]);
    const all = generateDatesForPeriod('ALL', tx('2026-03-10', '2026-01-15', '2026-02-01'));
    expect([all[0], all.at(-1), all.length]).toEqual(['2026-01-01', '2026-03-10', 31 + 28 + 10]);
    const cyc = generateDatesForPeriod('cycle:ALL', tx('2026-01-20', '2026-02-03'));
    expect([cyc[0], cyc.at(-1)]).toEqual(['2025-12-25', '2026-02-03']);
    expect(generateDatesForPeriod('cycle:ALL', tx('2026-01-25'))[0]).toBe('2026-01-25');
  });

  it('a year is trimmed to the months that have rows, and ends at the latest row', () => {
    const d = generateDatesForPeriod('2026', tx('2026-03-10', '2026-05-02', '2027-01-01'));
    expect([d[0], d.at(-1)]).toEqual(['2026-03-01', '2026-05-02']);
    const c = generateDatesForPeriod('cycle:2026-01_2026-12', tx('2026-03-30'));
    expect([c[0], c.at(-1)]).toEqual(['2026-03-25', '2026-03-30']);
  });

  it('a year without rows in it, or with no rows at all, is the whole year', () => {
    expect(generateDatesForPeriod('2026', tx('2025-03-10')).length).toBe(365);
    expect(generateDatesForPeriod('2026', []).length).toBe(365);
  });

  it('a single month is never trimmed (the daily chart shows every day)', () => {
    expect(generateDatesForPeriod('2026-02', tx('2026-02-10')).length).toBe(28);
    expect(generateDatesForPeriod('cycle:2026-02', tx('2026-03-01')).length).toBe(28);
  });

  it('a list of months: their days in order; a junk period: nothing', () => {
    const d = generateDatesForPeriod('2026-03,2026-01', []);
    expect([d.length, d[0], d[31], d.at(-1)]).toEqual([62, '2026-01-01', '2026-03-01', '2026-03-31']);
    expect(generateDatesForPeriod('junk', tx('2026-01-01'))).toEqual([]);
  });
});

describe('getPeriodDateRange (what to fetch: the period plus the one before it to compare)', () => {
  it.each([
    ['2026-03', '2026-03-01', '2026-03-31', '2025-12-01'], // 3 months back for the pacer
    ['2026-Q1', '2026-01-01', '2026-03-31', '2025-10-01'],
    ['2026-Q3', '2026-07-01', '2026-09-30', '2026-04-01'],
    ['2026-H1', '2026-01-01', '2026-06-30', '2025-07-01'],
    ['2026-H2', '2026-07-01', '2026-12-31', '2026-01-01'],
    ['2026', '2026-01-01', '2026-12-31', '2025-01-01'],
    ['2026-01_2026-03', '2026-01-01', '2026-03-31', '2025-10-03'], // same length back (90 days)
    ['cycle:2026-01_2026-03', '2026-01-25', '2026-04-24', '2025-10-27'],
  ])('%s', (p, startDate, endDate, fetchStartDate) => {
    expect(getPeriodDateRange(p)).toEqual({ startDate, endDate, fetchStartDate });
  });

  it('no bounds: fetch everything', () => {
    for (const p of ['ALL', 'cycle:ALL', '2026-01,2026-03', 'junk']) {
      expect(getPeriodDateRange(p)).toEqual({ startDate: null, endDate: null, fetchStartDate: null });
    }
  });
});
