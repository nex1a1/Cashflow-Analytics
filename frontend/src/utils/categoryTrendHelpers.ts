// src/utils/categoryTrendHelpers.ts
// Small-multiples math: per-category series + dynamic latest period comparison.
// Standard periods: MoM comparison (latest completed period vs prior completed period).
// ALL period: compares latest completed period vs overall period average.
// Periods are whatever analytics buckets by (calendar month or pay cycle); amounts in analytics' unit (Baht).

export interface CategoryTrend {
  catId: string;
  keys: string[];             // periods up to and including the current one (no future-dated buckets)
  series: number[];           // amount per period, aligned with keys
  hasPartial: boolean;        // last key is the in-progress period
  totalAmount: number;        // sum of series for all periods in this view
  periodAvg: number;          // average per period across all periods in this view
  latestAmount: number;       // amount in the last complete period
  latestKey: string;          // period key of the last complete period
  priorAmount: number | null; // amount in the period before latest (for MoM); null when there is none
  priorKey: string | null;    // period key of the period before latest
  comparisonType: 'mom' | 'avg';
  pctChange: number | null;   // percentage change: vs prior (MoM) or vs periodAvg (ALL); null if new
  delta: number;              // Baht difference, used for ranking
}

export function buildCategoryTrends(
  periodKeys: string[],
  monthlyCatMap: Record<string, Record<string, number>>,
  currentKey: string,
  isAll: boolean = false,
): CategoryTrend[] {
  const keys = periodKeys.filter((k) => k <= currentKey);
  const complete = keys.filter((k) => k < currentKey);
  const hasPartial = keys.length > 0 && keys[keys.length - 1] === currentKey;

  // The latest completed period, fallback to the latest key if none are strictly before currentKey
  const latestKey = complete.length > 0
    ? complete[complete.length - 1]
    : (keys.length > 0 ? keys[keys.length - 1] : '');

  // Prior completed period for MoM comparison
  const priorKey = complete.length > 1
    ? complete[complete.length - 2]
    : null;

  const trends: CategoryTrend[] = [];
  for (const [catId, byKey] of Object.entries(monthlyCatMap || {})) {
    const series = keys.map((k) => byKey?.[k] || 0);
    if (!series.some((v) => v > 0)) continue;

    const totalAmount = series.reduce((s, v) => s + v, 0);
    const periodAvg = series.length ? totalAmount / series.length : 0;
    const latestAmount = latestKey ? (byKey?.[latestKey] || 0) : 0;
    const priorAmount = priorKey !== null ? (byKey?.[priorKey] || 0) : null;

    const comparisonType: 'mom' | 'avg' = isAll ? 'avg' : 'mom';
    let pctChange: number | null = null;
    let delta = 0;

    if (isAll) {
      delta = latestAmount - periodAvg;
      if (periodAvg > 0) {
        pctChange = ((latestAmount - periodAvg) / periodAvg) * 100;
      } else if (latestAmount === 0) {
        pctChange = 0;
      }
    } else {
      delta = latestAmount - (priorAmount ?? 0);
      if (priorAmount !== null) {
        if (priorAmount > 0) {
          pctChange = ((latestAmount - priorAmount) / priorAmount) * 100;
        } else if (latestAmount === 0) {
          pctChange = 0;
        }
      }
    }

    trends.push({
      catId,
      keys,
      series,
      hasPartial,
      totalAmount,
      periodAvg,
      latestAmount,
      latestKey,
      priorAmount,
      priorKey,
      comparisonType,
      pctChange,
      delta,
    });
  }

  // Rank by growth delta descending, then by overall period average descending
  return trends.sort((a, b) => (b.delta !== a.delta ? b.delta - a.delta : b.periodAvg - a.periodAvg));
}
