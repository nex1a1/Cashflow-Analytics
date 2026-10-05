// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, act } from '@/test-utils/renderHook';
import useFilters from '../useFilters';

vi.mock('../../services/api', () => ({ transactionService: { search: vi.fn().mockResolvedValue([]) } }));

const tx = (id: string, date: string) => ({ id, date, category: 'อาหาร', category_id: 'c', description: id, amount: 1, group_type: 'expense', allocation_type: 'need' }) as any;
const cats: any[] = [{ id: 'c', name: 'อาหาร', type: 'expense' }];

// `new Date('2026-10-10')` is UTC midnight; west of UTC that is still the day before, so the weekend filter
// used to flip Saturday/Sunday there. Thailand never shows it, which is why the test pins a timezone.
describe('useFilters weekday / weekend filters', () => {
  // the frontend has no @types/node, so reach process through globalThis
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
  const originalTz = env.TZ;
  beforeAll(() => { env.TZ = 'America/New_York'; });
  afterAll(() => { if (originalTz === undefined) delete env.TZ; else env.TZ = originalTz; });

  it('WEEKEND keeps Saturday and drops Monday, whatever the timezone', () => {
    const transactions = [tx('sat', '2026-10-10'), tx('mon', '2026-10-12')];
    const { result } = renderHook(() => useFilters({ transactions, categories: cats }));
    act(() => { result.current.setFilterPeriod('ALL'); });
    act(() => { result.current.setAdvancedFilterDate('WEEKEND'); }); // changing the period resets this filter, so set it after
    expect(result.current.displayTransactions.map((t: any) => t.id)).toEqual(['sat']);
  });

  it('the day-type switch (dayTypeFilter) agrees', () => {
    const transactions = [tx('sat', '2026-10-10'), tx('mon', '2026-10-12')];
    const { result } = renderHook(() => useFilters({ transactions, categories: cats }));
    act(() => { result.current.setFilterPeriod('ALL'); result.current.setDayTypeFilter('WEEKDAY'); });
    expect(result.current.displayTransactions.map((t: any) => t.id)).toEqual(['mon']);
  });
});
