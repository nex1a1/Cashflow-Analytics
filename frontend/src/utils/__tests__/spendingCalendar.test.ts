import { describe, expect, it } from 'vitest';
import { timelineInputs, weeksOf } from '../spendingCalendar';

const WORK = { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#3B82F6' };
const HOL = { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#F59E0B' };
const OT = { id: 'dt-ot', name: 'ot', label: 'โอที', color: '#10B981' };

describe('timelineInputs', () => {
  it('a single month lists every day; daily spend counts expense rows inside the period only', () => {
    const rows = [
      { date: '2026-02-03', amount: 100, group_type: 'expense' },
      { date: '2026-02-03', amount: '50', group_type: 'expense' },
      { date: '2026-02-04', amount: 900, group_type: 'savings' }, // investing is not spending
      { date: '2026-02-05', amount: 5000, group_type: 'income' },
      { date: '2026-01-31', amount: 70, group_type: 'expense' }, // loaded history: outside the month
    ];
    const t = timelineInputs(rows, '2026-02', {}, [WORK, HOL]);
    expect(t.datesInPeriod).toHaveLength(28);
    expect(t.dailyExpenses).toEqual({ '2026-02-03': 150 });
  });

  it('day types: a marked day keeps its type, unmarked days fall back to workday / weekend', () => {
    // 1–7 Feb 2026 = Sun..Sat
    const t = timelineInputs([], '2026-02', { '2026-02-02': 'dt-ot' }, [WORK, HOL, OT]);
    expect(t.dayTypeCounts).toEqual({ 'dt-work': 19, 'dt-hol': 8, 'dt-ot': 1 });
    expect([t.dayTypeOf['2026-02-01'], t.dayTypeOf['2026-02-02'], t.dayTypeOf['2026-02-03']]).toEqual(['dt-hol', 'dt-ot', 'dt-work']);
  });
});

describe('weeksOf', () => {
  it('Sun–Sat rows, padding the first and last week', () => {
    // 1 Oct 2026 is a Thursday, 31 Oct a Saturday
    const days = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const w = weeksOf(days);
    expect(w).toHaveLength(5);
    expect(w[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(w[4][6]).toBe('2026-10-31');
  });

  it('a gap in the dates starts a new week even mid-week (Jan + Mar never share a column)', () => {
    const w = weeksOf(['2026-01-28', '2026-03-05']); // Wed, then Thu five weeks later
    expect(w).toHaveLength(2);
    expect(w[0][3]).toBe('2026-01-28');
    expect(w[1][4]).toBe('2026-03-05');
  });
});
