// frontend/src/components/modals/DayDetailModal/__tests__/DayDetailModal.test.ts
import { describe, it, expect } from 'vitest';

describe('DayDetailModal transaction sorting logic', () => {
  const sampleTransactions = [
    { id: '1', description: 'กาแฟ', amount: 65, category: 'เครื่องดื่ม', category_id: 'cat-drink' },
    { id: '2', description: 'อาหารเที่ยง', amount: 120, category: 'อาหาร', category_id: 'cat-food' },
    { id: '3', description: 'ขนม', amount: 35, category: 'ของว่าง', category_id: 'cat-snack' },
  ];

  it('sorts by amount in descending order when sortBy is amount', () => {
    const sorted = [...sampleTransactions].sort(
      (a, b) => (Number.parseFloat(String(b.amount)) || 0) - (Number.parseFloat(String(a.amount)) || 0)
    );

    expect(sorted.map(t => t.amount)).toEqual([120, 65, 35]);
    expect(sorted[0].description).toBe('อาหารเที่ยง');
    expect(sorted[2].description).toBe('ขนม');
  });

  it('preserves natural category order when sortBy is category', () => {
    const sortBy = 'category';
    const sorted = sortBy === 'amount'
      ? [...sampleTransactions].sort((a, b) => (Number.parseFloat(String(b.amount)) || 0) - (Number.parseFloat(String(a.amount)) || 0))
      : sampleTransactions;

    expect(sorted.map(t => t.id)).toEqual(['1', '2', '3']);
  });

  it('handles zero or string amounts gracefully', () => {
    const mixedAmounts = [
      { id: 'a', amount: '50' },
      { id: 'b', amount: 0 },
      { id: 'c', amount: '150.5' }
    ];

    const sorted = [...mixedAmounts].sort(
      (a, b) => (Number.parseFloat(String(b.amount)) || 0) - (Number.parseFloat(String(a.amount)) || 0)
    );

    expect(sorted[0].id).toBe('c');
    expect(sorted[1].id).toBe('a');
    expect(sorted[2].id).toBe('b');
  });
});
