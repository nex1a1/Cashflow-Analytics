import { describe, it, expect } from 'vitest';
import { buildDoughnutChartData, resolveDoughnutHoverIndex, hasPlanSlices, planOf } from '../proportionHelpers';

const cat = (name: string, amount: number, planAmount?: number) =>
  ({ id: name, name, color: '#10B981', amount, planAmount, percentage: '10.0' }) as any;

describe('plan slices of the proportion doughnut', () => {
  it('keeps one arc per item when nothing is planned', () => {
    const d = buildDoughnutChartData([cat('a', 100), cat('b', 50)], -1);
    expect(d.datasets[0].data).toEqual([100, 50]);
    expect(hasPlanSlices([cat('a', 100)])).toBe(false);
  });

  it('splits every item into actual + plan arcs when any item has plan money', () => {
    const d = buildDoughnutChartData([cat('a', 100, 40), cat('b', 50)], -1);
    expect(d.datasets[0].data).toEqual([60, 40, 50, 0]);
    expect(d.labels).toEqual(['a', 'a (แผน)', 'b', 'b (แผน)']);
    // an empty arc has no border, so it leaves no hairline
    expect(d.datasets[0].borderWidth).toEqual([2, 2, 2, 0]);
  });

  it('never lets plan exceed the item (e.g. after a what-if exclusion)', () => {
    expect(planOf(cat('a', 30, 80))).toBe(30);
  });

  it('maps a hovered arc back to its item', () => {
    expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 3 }], true)).toBe(1);
    expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 3 }], false)).toBe(3);
    expect(resolveDoughnutHoverIndex([], true)).toBe(-1);
  });
});
