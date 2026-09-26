// src/views/Dashboard/components/CashflowTable/helpers.tsx
import React from 'react';
import { hexToRgb } from '@/utils/formatters';
import { CashflowGroup } from '@/types';
import {
  AdjustedGroupValueParams,
  AdjustedTotalParams,
  ActiveMonthGroupTotalParams,
  MonthRow,
} from './types';

import { tc } from '@/constants/theme';
// ─── Shared highlight helpers (single source of truth) ────────────────────────

export function resolveTableHighlightOpacity(dm: boolean, isColHovered: boolean, isRowHovered: boolean): number {
  if (isColHovered && isRowHovered) return dm ? 0.22 : 0.44;
  if (isColHovered) return dm ? 0.14 : 0.34;
  if (isRowHovered) return dm ? 0.12 : 0.32;
  return dm ? 0.08 : 0.28;
}

export function resolveTableSubHighlightOpacity(dm: boolean, isColHovered: boolean, isRowHovered: boolean): number {
  if (isColHovered && isRowHovered) return dm ? 0.18 : 0.36;
  if (isColHovered) return dm ? 0.12 : 0.26;
  if (isRowHovered) return dm ? 0.10 : 0.24;
  return dm ? 0.06 : 0.20;
}

export function getHighlightBgColor(
  group: CashflowGroup,
  isColHovered: boolean,
  isRowHovered: boolean,
  dm: boolean | undefined,
): string {
  const hexColor = group.color || (group.type === 'income' ? tc('income') : tc('ink-muted'));
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableHighlightOpacity(dm ?? false, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

export function getSubHighlightBgColor(
  group: CashflowGroup,
  subColor: string | null | undefined,
  isColHovered: boolean,
  isRowHovered: boolean,
  dm: boolean | undefined,
): string {
  const hexColor = subColor || group.color || tc('ink-muted');
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableSubHighlightOpacity(dm ?? false, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

// ─── Calculation helpers ───────────────────────────────────────────────────────

/** Single source of truth for "group total minus excluded categories" — used by the footer total,
 *  the row summary total, and each row's per-group cell so they can never silently disagree. */
export function calculateAdjustedGroupValue({
  groupId,
  row,
  excludedCategories,
  categories,
  filteredGroupMap,
  filteredCatMap,
  analytics,
}: AdjustedGroupValueParams): number {
  const rawVal = filteredGroupMap[groupId]?.[row.monthStr] ?? (row.groups[groupId] || 0);
  const groupCats = categories.filter((c) => c.cashflowGroup === groupId || c.cashflow_group_id === groupId);
  const excludedCatSum = groupCats
    .filter((c) => excludedCategories?.has(c.id))
    .reduce(
      (cSum, c) =>
        cSum +
        (filteredCatMap[c.id]?.[row.monthStr] ??
          (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0)),
      0,
    );
  return Math.max(0, rawVal - excludedCatSum);
}

export function calculateAdjustedGroupsTotal({
  groups,
  row,
  excludedGroups,
  excludedCategories,
  categories,
  filteredGroupMap,
  filteredCatMap,
  analytics,
}: AdjustedTotalParams): number {
  if (!row) return 0;
  return groups
    .filter((g) => !excludedGroups.has(g.id))
    .reduce(
      (sum, g) =>
        sum +
        calculateAdjustedGroupValue({ groupId: g.id, row, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics }),
      0,
    );
}

export function calculateActiveMonthGroupTotal({
  groupId,
  activeMonths,
  categories,
  excludedCategories,
  filteredGroupMap,
  filteredCatMap,
  analytics,
}: ActiveMonthGroupTotalParams): number {
  return activeMonths.reduce(
    (s, r) =>
      s +
      calculateAdjustedGroupValue({ groupId, row: r, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics }),
    0,
  );
}

export function findPreviousActiveMonth(
  sortedCashflow: MonthRow[],
  currentMonthStr: string,
  excludedMonths: Set<string>,
): MonthRow | null {
  const currentIndex = sortedCashflow.findIndex((r) => r.monthStr === currentMonthStr);
  if (currentIndex <= 0) return null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = sortedCashflow[i];
    if (!excludedMonths.has(candidate.monthStr)) return candidate;
  }
  return null;
}

export function renderMoMBadge(currentAdjustedExpense: number, prevAdjustedExpense: number): React.ReactNode {
  if (!prevAdjustedExpense || prevAdjustedExpense <= 0) return null;
  const diff = currentAdjustedExpense - prevAdjustedExpense;
  const percent = (diff / prevAdjustedExpense) * 100;
  const isUp = percent > 0;
  const isFlat = Math.abs(percent) < 0.1;

  let badgeClass = 'bg-surface-elevated/40 text-slate-400 border-line-strong/30';
  let arrow = '-';
  if (!isFlat) {
    if (isUp) {
      badgeClass = 'bg-danger/10 text-danger border-danger/25';
      arrow = '↑';
    } else {
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      arrow = '↓';
    }
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-[50px] min-w-[50px] max-w-[50px] text-[11px] font-black py-[2px] rounded-none leading-none border ${badgeClass}`}
    >
      {arrow} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

// ─── Shared summary-cell background helper ─────────────────────────────────────

export function getSummaryCellBg(isExcluded: boolean, isColHover: boolean, isRowHovered: boolean): string {
  if (isExcluded) return 'text-neutral-700 bg-canvas opacity-25 select-none line-through';
  if (isColHover) return 'bg-surface-hover';
  if (isRowHovered) return 'bg-surface-hover/80';
  return 'bg-canvas group-hover:bg-surface-hover';
}
