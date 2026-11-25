import { describe, it, expect } from 'vitest';
import { resolveSpikeCap, barTotals, niceCeil, layoutTags, spikeTagRoom, tagText, topCutIndex } from '../spikeCap';

describe('resolveSpikeCap', () => {
  // November 2026 daily spend: an SSD on the 11th and the rent on the 30th
  const nov = [927.11, 65, 306, 95, 137, 73, 831, 110, 65, 1159.46, 8545, 83, 63, 283, 538, 97, 103, 680.1, 73, 65,
    205, 190, 73, 0, 240, 0, 0, 388, 40, 6950];

  it('cuts the axis just above the usual days when one day dwarfs them', () => {
    expect(resolveSpikeCap(nov)).toBe(2500); // usual high ฿1,159 × 2 → 2,500
  });

  it('leaves an even spread alone', () => {
    expect(resolveSpikeCap([17881, 16802, 17132, 24476, 16388, 15107, 23728])).toBeNull();
  });

  it('needs a handful of bars before cutting anything', () => {
    expect(resolveSpikeCap([10, 10, 5000])).toBeNull();
  });
});

describe('barTotals', () => {
  const datasets = [
    { type: 'bar', data: [1, 2, 3] },
    { data: [10, -5, 0] },
    { type: 'line', data: [100, 100, 100] },
  ];

  it('adds stacked bar parts and skips line overlays and negatives', () => {
    expect(barTotals(datasets, true)).toEqual([11, 2, 3]);
  });

  it('side-by-side bars (income next to expense) reach only as high as the tallest', () => {
    expect(barTotals(datasets, false)).toEqual([10, 2, 3]);
  });
});

describe('niceCeil', () => {
  it('rounds up to a round axis number', () => {
    expect([niceCeil(2318.9), niceCeil(99), niceCeil(1000), niceCeil(3100)]).toEqual([2500, 100, 1000, 4000]);
  });
});

describe('layoutTags', () => {
  it('raises a tag that would touch its neighbour to the second row', () => {
    // 30th, 1st (next bar, 31px apart) and 5th, tags ~70px wide
    const slots = layoutTags([
      { index: 6, x: 235, width: 70 }, { index: 7, x: 266, width: 74 }, { index: 11, x: 393, width: 74 },
    ], 60, 1010);
    expect(slots.map(s => [s.index, s.row])).toEqual([[6, 0], [7, 1], [11, 0]]);
  });

  it('keeps tags inside the plot at the edges', () => {
    const [s] = layoutTags([{ index: 29, x: 1005, width: 70 }], 60, 1010);
    expect(s.left + s.width).toBe(1010);
  });

  it('reserves a second row only when cut bars sit close', () => {
    expect(spikeTagRoom([5000, 10, 10, 10, 10, 6000], 2500)).toBeLessThan(spikeTagRoom([5000, 6000, 10], 2500));
  });
});

describe('tagText', () => {
  it('shows whole baht', () => {
    expect(tagText(4692.4)).toBe('฿4,692');
  });
});

describe('topCutIndex', () => {
  it('crowns the largest cut bar once two or more are cut', () => {
    expect(topCutIndex([100, 6806, 4692, 100, 3176], 2500)).toBe(1);
    expect(topCutIndex([100, 3000, 100, 8545], 2500)).toBe(3);
  });

  it('crowns nothing when a single bar is cut', () => {
    expect(topCutIndex([100, 8545, 100], 2500)).toBeNull();
  });
});

describe('layoutTags with the largest pinned', () => {
  it('keeps the largest on the first row and raises its neighbour instead', () => {
    // the 1st is the largest: it stays down even though the 30th comes first
    const slots = layoutTags([{ index: 6, x: 235, width: 70 }, { index: 7, x: 266, width: 74 }], 60, 1010, 7);
    expect(Object.fromEntries(slots.map(s => [s.index, s.row]))).toEqual({ 6: 1, 7: 0 });
  });
});
