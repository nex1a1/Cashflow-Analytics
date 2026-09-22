// src/utils/allocationEvolutionHelpers.ts

export interface AllocationEvolutionMonth {
  ym: string;
  needAmt: number;
  wantAmt: number;
  savingsAmt: number;
  total: number;
  needPct: number;
  wantPct: number;
  savingsPct: number;
}

export interface AllocationEvolutionData {
  eligible: boolean;
  hasData: boolean;
  months: AllocationEvolutionMonth[];
  label: string;
}

export type MonthlyAllocMap = Record<string, Record<string, number>>;

const MIN_CUSTOM_RANGE_MONTHS = 3;

/**
 * Whether the current period selection is "trend-shaped" enough to show the
 * Evolution mode at all: hidden for a single month (nothing to trend), shown
 * for quarter/half/year/ALL, and shown for a custom range or multi-select
 * only once it spans at least MIN_CUSTOM_RANGE_MONTHS distinct months.
 */
function isEvolutionEligible(filterPeriod: string, periodMonths: string[]): boolean {
  if (/^\d{4}-\d{2}$/.test(filterPeriod)) return false; // single month
  if (filterPeriod.includes(',') || filterPeriod.includes('_')) {
    return periodMonths.length >= MIN_CUSTOM_RANGE_MONTHS; // custom range / multi-select
  }
  if (filterPeriod === 'ALL') return true;
  if (/^\d{4}-Q[1-4]$/.test(filterPeriod)) return true; // quarter
  if (/^\d{4}-H[1-2]$/.test(filterPeriod)) return true; // half-year
  if (/^\d{4}$/.test(filterPeriod)) return true; // full year
  return false;
}

function buildEvolutionLabel(hasData: boolean, monthCount: number): string {
  return hasData ? `แนวโน้ม ${monthCount} เดือน` : 'แนวโน้ม 50/30/20';
}

/**
 * Builds Need/Want/Savings allocation percentages for the exact months
 * implied by the current period filter (matching whatever's shown elsewhere
 * on the dashboard, rather than a fixed trailing window) from the already
 * period-filtered monthlyAllocMap.
 */
export function calculateAllocationEvolution(
  monthlyAllocMap: MonthlyAllocMap,
  filterPeriod: string,
  periodMonths: string[],
  monthlyIncomeMap?: Record<string, number>,
  excludeFuture?: boolean,
  currentYm?: string
): AllocationEvolutionData {
  let activeMonths = periodMonths;
  if (excludeFuture && currentYm) {
    activeMonths = periodMonths.filter(ym => ym <= currentYm);
  }

  const eligible = isEvolutionEligible(filterPeriod, activeMonths);
  if (!eligible) {
    return { eligible: false, hasData: false, months: [], label: '' };
  }

  const months: AllocationEvolutionMonth[] = activeMonths.map(ym => {
    const needAmt = monthlyAllocMap.need[ym] || 0;
    const wantAmt = monthlyAllocMap.want[ym] || 0;
    const explicitSav = monthlyAllocMap.savings[ym] || 0;
    const inc = monthlyIncomeMap ? (monthlyIncomeMap[ym] || 0) : 0;

    // Unspent cashflow surplus from monthly income
    const surplus = Math.max(0, inc - (needAmt + wantAmt + explicitSav));
    const savingsAmt = explicitSav + surplus;
    const total = Math.max(inc, needAmt + wantAmt + savingsAmt);

    return {
      ym,
      needAmt,
      wantAmt,
      savingsAmt,
      total,
      needPct: total > 0 ? (needAmt / total) * 100 : 0,
      wantPct: total > 0 ? (wantAmt / total) * 100 : 0,
      savingsPct: total > 0 ? (savingsAmt / total) * 100 : 0,
    };
  });

  const hasData = months.filter(m => m.total > 0).length >= 2;

  // Drop the leading run of empty months (before tracking started) so a new
  // account isn't shown as a wall of fabricated "100% savings" history.
  const firstDataIdx = months.findIndex(m => m.total > 0);
  const trimmedMonths = firstDataIdx === -1 ? [] : months.slice(firstDataIdx);

  return { eligible: true, hasData, months: trimmedMonths, label: buildEvolutionLabel(hasData, trimmedMonths.length) };
}

