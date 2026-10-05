import { describe, it, expect } from 'vitest';
import { sortTransactions } from '../useTransactionData';

const tx = (id: string, date: string) => ({ id, date, category: '', category_id: 'c', description: '', amount: 1 } as any);

describe('sortTransactions', () => {
  it('orders by date', () => {
    expect(sortTransactions([tx('b', '2026-10-02'), tx('a', '2026-10-01')]).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('keeps the order the server sent for rows of the same date (it is entry order; the id is a random UUID)', () => {
    const fromServer = [tx('zzz', '2026-10-01'), tx('aaa', '2026-10-01'), tx('mmm', '2026-10-01')];
    expect(sortTransactions(fromServer).map(t => t.id)).toEqual(['zzz', 'aaa', 'mmm']);
  });

  it('does not mutate its input', () => {
    const input = [tx('b', '2026-10-02'), tx('a', '2026-10-01')];
    sortTransactions(input);
    expect(input.map(t => t.id)).toEqual(['b', 'a']);
  });
});
