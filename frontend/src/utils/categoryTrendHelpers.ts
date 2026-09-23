// src/utils/categoryTrendHelpers.ts
// Small-multiples math: per-category series + "last 3 complete periods vs earlier average".
// Periods are whatever analytics buckets by (calendar month or pay cycle); amounts in analytics' unit (Baht).

export interface CategoryTrend {
  catId: string;
  keys: string[];          // periods up to and including the current one (no future-dated buckets)
  series: number[];        // amount per period, aligned with keys
  hasPartial: boolean;     // last key is the in-progress period
  totalAmount: number;     // sum of series for all periods in this view
  periodAvg: number;       // average per period across all periods in this view
  recentAvg: number;       // avg of last 3 complete periods
  priorAvg: number | null; // avg of complete periods before those; null when there are none
  delta: number;           // recentAvg - (priorAvg ?? 0), used for ranking
}

export function buildCategoryTrends(
  periodKeys: string[],
  monthlyCatMap: Record<string, Record<string, number>>,
  currentKey: string,
): CategoryTrend[] {
  const keys = periodKeys.filter((k) => k <= currentKey);
  const complete = keys.filter((k) => k < currentKey);
  const recentKeys = complete.slice(-3);
  const priorKeys = complete.slice(0, -3);
  const hasPartial = keys[keys.length - 1] === currentKey;
  const avg = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0);

  const trends: CategoryTrend[] = [];
  for (const [catId, byKey] of Object.entries(monthlyCatMap || {})) {
    const series = keys.map((k) => byKey?.[k] || 0);
    if (!series.some((v) => v > 0)) continue;
    const totalAmount = series.reduce((s, v) => s + v, 0);
    const periodAvg = series.length ? totalAmount / series.length : 0;
    const recentAvg = avg(recentKeys.map((k) => byKey?.[k] || 0));
    const priorAvg = priorKeys.length ? avg(priorKeys.map((k) => byKey?.[k] || 0)) : null;
    trends.push({
      catId,
      keys,
      series,
      hasPartial,
      totalAmount,
      periodAvg,
      recentAvg,
      priorAvg,
      delta: recentAvg - (priorAvg ?? 0),
    });
  }
  // Rank by baht change when trends differ, then by overall period average
  return trends.sort((a, b) => (b.delta !== a.delta ? b.delta - a.delta : b.periodAvg - a.periodAvg));
}
