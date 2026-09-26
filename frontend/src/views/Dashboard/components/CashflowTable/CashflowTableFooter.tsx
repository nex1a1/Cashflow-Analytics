// src/views/Dashboard/components/CashflowTable/CashflowTableFooter.tsx
import React, { useMemo } from 'react';
import { formatMoney } from '@/utils/formatters';
import { calculateAdjustedGroupsTotal, calculateActiveMonthGroupTotal } from './helpers';
import { MONTH_COL_CLS, GROUP_COL_CLS, CAT_COL_CLS } from './constants';
import { FooterProps, MonthRow } from './types';

import { tc } from '@/constants/theme';
export const CashflowTableFooter = React.memo(({
  activeIncomeGroups, activeExpenseGroups, expandedGroups,
  getActiveCatsForGroup, analytics, thinBorder, boundaryBorder, boxBorder,
  hoveredCol, setHoveredCol,
  excludedMonths, excludedGroups, excludedCategories, categories,
  filteredCatMap = {}, filteredGroupMap = {},
}: FooterProps) => {
  const activeMonths: MonthRow[] = (analytics.sortedCashflow as MonthRow[]).filter((r) => !excludedMonths.has(r.monthStr));

  // Fix #3: pre-compute per-month totals once instead of calling getAdjusted* twice in reduce
  const { totalActiveIncome, totalActiveExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of activeMonths) {
      income += calculateAdjustedGroupsTotal({
        groups: activeIncomeGroups, row: r, excludedGroups, excludedCategories, categories,
        filteredGroupMap, filteredCatMap, analytics,
      });
      expense += calculateAdjustedGroupsTotal({
        groups: activeExpenseGroups, row: r, excludedGroups, excludedCategories, categories,
        filteredGroupMap, filteredCatMap, analytics,
      });
    }
    return { totalActiveIncome: income, totalActiveExpense: expense };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonths, activeIncomeGroups, activeExpenseGroups, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics]);

  // Fix #13: แสดง message แทนการหาย เมื่อมีแค่เดือนเดียว (moved after hooks — Rules of Hooks)
  if (analytics.numMonths <= 1) {
    return (
      <tfoot>
        <tr>
          <td
            colSpan={999}
            className={`px-4 py-2 text-center text-[11px] text-neutral-500 italic border-t ${thinBorder} bg-surface`}
          >
            ยอดรวมจะแสดงเมื่อมีข้อมูลมากกว่า 1 เดือน
          </td>
        </tr>
      </tfoot>
    );
  }

  const totalActiveNet = totalActiveIncome - totalActiveExpense;
  const activeSavingsRate =
    totalActiveIncome > 0 ? ((totalActiveNet / totalActiveIncome) * 100).toFixed(1) : '0.0';
  const activePctSpent =
    totalActiveIncome > 0 ? ((totalActiveExpense / totalActiveIncome) * 100).toFixed(1) : '0.0';

  return (
    <tfoot className={`font-bold border-t ${thinBorder} sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}>
      <tr className="text-slate-200">
        <td
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 text-center sticky left-0 z-30 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${MONTH_COL_CLS} ${
            hoveredCol === 'month' ? 'bg-surface-hover' : 'bg-canvas'
          }`}
        >
          รวมทั้งหมด
        </td>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isGroupExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <td
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 truncate border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${GROUP_COL_CLS} ${
                  isColHovered ? 'bg-surface-hover' : 'bg-canvas'
                } ${isGroupExcluded ? 'opacity-40 select-none text-neutral-400 line-through' : ''}`}
                style={{ color: isGroupExcluded ? undefined : (g.color || tc('income')) }}
              >
                {formatMoney(calculateActiveMonthGroupTotal({
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics,
                }))}
              </td>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isGroupExcluded || isCatExcluded;

                return (
                  <td
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[11px] font-black uppercase truncate border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} ${CAT_COL_CLS} ${
                      isCatColHovered ? 'bg-surface-hover' : 'bg-canvas'
                    } ${isCatFaded ? 'opacity-40 select-none text-neutral-400 line-through' : ''}`}
                    style={{ color: isCatFaded ? tc('ink-muted') : (c.color ?? undefined) }}
                  >
                    {formatMoney(
                      activeMonths.reduce(
                        (s, r) =>
                          s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)),
                        0,
                      ),
                    )}
                  </td>
                );
              })}
            </React.Fragment>
          );
        })}

        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isGroupExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <td
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 truncate border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${GROUP_COL_CLS} ${
                  isColHovered ? 'bg-surface-hover' : 'bg-canvas'
                } ${isGroupExcluded ? 'opacity-40 select-none text-neutral-400 line-through' : ''}`}
                style={{ color: isGroupExcluded ? undefined : (g.color || tc('gray-300')) }}
              >
                {formatMoney(calculateActiveMonthGroupTotal({
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics,
                }))}
              </td>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isGroupExcluded || isCatExcluded;

                return (
                  <td
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[11px] font-black uppercase truncate border-l border-b transition-colors ${thinBorder} ${CAT_COL_CLS} ${
                      isCatColHovered ? 'bg-surface-hover' : 'bg-canvas'
                    } ${isCatFaded ? 'opacity-40 select-none text-neutral-400 line-through' : ''}`}
                    style={{ color: isCatFaded ? tc('ink-muted') : (c.color ?? undefined) }}
                  >
                    {formatMoney(
                      activeMonths.reduce(
                        (s, r) =>
                          s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)),
                        0,
                      ),
                    )}
                  </td>
                );
              })}
            </React.Fragment>
          );
        })}

        <td
          onMouseEnter={() => setHoveredCol('trend')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l !border-l-line-strong border-b ${thinBorder} text-accent sticky right-[250px] z-30 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.35)] transition-colors w-[155px] min-w-[155px] max-w-[155px] ${
            hoveredCol === 'trend' ? 'bg-surface-hover' : 'bg-canvas'
          }`}
        >
          {formatMoney(totalActiveExpense)}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l border-b ${thinBorder} sticky right-[140px] z-30 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-surface-hover' : 'bg-canvas'
          } ${totalActiveNet >= 0 ? 'text-emerald-400' : 'text-danger'}`}
        >
          {formatMoney(totalActiveNet)}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-b ${thinBorder} text-center text-emerald-400 sticky right-[70px] z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-left' ? 'bg-surface-hover' : 'bg-canvas'
          }`}
        >
          {totalActiveIncome > 0 ? `${activeSavingsRate}%` : '0%'}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-r border-b ${thinBorder} text-center text-neutral-200 sticky right-0 z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-spent' ? 'bg-surface-hover' : 'bg-canvas'
          }`}
        >
          {totalActiveIncome > 0 ? `${activePctSpent}%` : '0%'}
        </td>
      </tr>
    </tfoot>
  );
});

CashflowTableFooter.displayName = 'CashflowTableFooter';
