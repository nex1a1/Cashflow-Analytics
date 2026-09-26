// src/views/Dashboard/components/CashflowTable/CashflowTableGroupCells.tsx
import React from 'react';
import { formatMoney } from '@/utils/formatters';
import { calculateAdjustedGroupValue, getHighlightBgColor, getSubHighlightBgColor } from './helpers';
import { GROUP_COL_CLS, CAT_COL_CLS } from './constants';
import { GroupCellsProps } from './types';

import { tc, readable } from '@/constants/theme';
export function CashflowTableGroupCells({
  g, isLastGroup, isIncome, expandedGroups, getActiveCatsForGroup,
  row, excludedGroups, excludedCategories, categories,
  filteredGroupMap, filteredCatMap, analytics,
  hoveredCol, setHoveredCol, isRowHovered, dm,
  thinBorder, boundaryBorder, boxBorder, isExcluded,
}: GroupCellsProps) {
  const isExpanded = expandedGroups.has(g.id);
  const cats = getActiveCatsForGroup(g.id);
  const colId = `g-${g.id}`;
  const isColHovered = hoveredCol === colId;
  const isGroupExcluded = excludedGroups.has(g.id);
  const isCellFaded = isExcluded || isGroupExcluded;

  const adjustedGroupVal = calculateAdjustedGroupValue({
    groupId: g.id, row, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics,
  });

  const defaultColor = isIncome ? tc('income') : tc('gray-300');
  const groupBg = isCellFaded ? tc('canvas') : getHighlightBgColor(g, isColHovered, isRowHovered, dm);
  const groupTextColor = isCellFaded ? undefined : readable(g.color || defaultColor);
  const boundaryCls = isLastGroup && !isExpanded ? boundaryBorder : '';

  return (
    <React.Fragment>
      <td
        onMouseEnter={() => setHoveredCol(colId)}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 truncate ${isIncome ? 'font-semibold' : 'font-medium'} border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${boundaryCls} ${GROUP_COL_CLS} ${
          isCellFaded ? 'opacity-40 select-none text-neutral-400 line-through' : ''
        }`}
        style={{ color: groupTextColor, backgroundColor: groupBg }}
      >
        {adjustedGroupVal > 0 ? formatMoney(adjustedGroupVal) : <span className="text-neutral-600 font-normal select-none">-</span>}
      </td>
      {isExpanded && cats.map((c, cIdx) => {
        const amt = filteredCatMap[c.id]?.[row.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0);
        const catColId = `c-${c.id}`;
        const isCatColHovered = hoveredCol === catColId;
        const isCatExcluded = excludedCategories?.has(c.id);
        const isCatFaded = isCellFaded || isCatExcluded;
        const catBoundaryCls = cIdx === cats.length - 1 && isLastGroup ? boundaryBorder : thinBorder;
        const catBg = isCatFaded ? tc('canvas') : getSubHighlightBgColor(g, c.color, isCatColHovered, isRowHovered, dm);

        return (
          <td
            key={c.id}
            onMouseEnter={() => setHoveredCol(catColId)}
            onMouseLeave={() => setHoveredCol(null)}
            className={`px-2 py-2 text-[11px] tabular-nums font-black truncate border-l border-b transition-colors ${catBoundaryCls} ${CAT_COL_CLS} ${
              isCatFaded ? 'opacity-40 select-none text-neutral-400 line-through' : ''
            }`}
            style={{ color: isCatFaded ? undefined : (c.color ?? undefined), backgroundColor: catBg }}
          >
            {amt > 0 ? formatMoney(amt) : <span className="text-neutral-600 font-normal select-none">-</span>}
          </td>
        );
      })}
    </React.Fragment>
  );
}
