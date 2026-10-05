import { describe, it, expect } from 'vitest';
import { splitImportDuplicates } from '../importDedupe';

const row = (over: Partial<{ id: string; date: string; category: string; description: string; amount: number }> = {}) => ({
  id: 'n', date: '2026-10-05', category: 'อาหาร', description: 'ข้าวมันไก่', amount: 60, ...over,
});
const existing = (over = {}) => ({ date: '2026-10-05', category: 'อาหาร', description: 'ข้าวมันไก่', amount: 60, ...over });

describe('splitImportDuplicates', () => {
  it('skips a row that already exists (same date, category, description, amount)', () => {
    const { fresh, skipped } = splitImportDuplicates([row({ id: 'a' })], [existing()]);
    expect(fresh).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('keeps rows that differ in any field', () => {
    const items = [row({ id: 'a', date: '2026-10-06' }), row({ id: 'b', category: 'เดินทาง' }), row({ id: 'c', description: 'อื่น' }), row({ id: 'd', amount: 61 })];
    const { fresh, skipped } = splitImportDuplicates(items, [existing()]);
    expect(fresh.map(r => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(skipped).toBe(0);
  });

  it('matches by count: two identical lunches in the file, one already stored -> imports one', () => {
    const { fresh, skipped } = splitImportDuplicates([row({ id: 'a' }), row({ id: 'b' })], [existing()]);
    expect(fresh.map(r => r.id)).toEqual(['b']);
    expect(skipped).toBe(1);
  });

  it('compares money in satang, so 60 and 60.00 and float noise are the same', () => {
    const { skipped } = splitImportDuplicates([row({ amount: 0.1 + 0.2 })], [existing({ amount: 0.3 })]);
    expect(skipped).toBe(1);
  });

  it('treats a savings sell (negative) as different from a buy', () => {
    const { fresh } = splitImportDuplicates([row({ amount: -60 })], [existing()]);
    expect(fresh).toHaveLength(1);
  });

  it('ignores surrounding whitespace in the description', () => {
    expect(splitImportDuplicates([row({ description: ' ข้าวมันไก่ ' })], [existing()]).skipped).toBe(1);
  });
});
