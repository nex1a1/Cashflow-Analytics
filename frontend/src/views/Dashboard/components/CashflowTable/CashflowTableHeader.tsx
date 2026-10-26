// src/views/Dashboard/components/CashflowTable/CashflowTableHeader.tsx
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { CashflowGroup } from '@/types';
import { getHighlightBgColor, getSubHighlightBgColor } from './helpers';
import { MONTH_COL_CLS, GROUP_COL_CLS, CAT_COL_CLS } from './constants';
import { HeaderProps } from './types';

import { tc, readable } from '@/constants/theme';

// Sticky summary columns on the right edge
const SUMMARY_COLS: { id: string; label: string; cls: string; title?: string; text?: string }[] = [
  { id: 'trend', label: 'รวมรายจ่าย', text: 'text-accent-ink', cls: 'px-3 border-l-line-strong! sticky right-[250px] shadow-[-6px_0_12px_-4px_rgb(0_0_0/calc(0.35*var(--shadow-k)))] w-[155px] min-w-[155px] max-w-[155px]' },
  { id: 'net', label: 'เงินคงเหลือ', cls: 'px-3 sticky right-[140px] w-[110px] min-w-[110px] max-w-[110px]' },
  { id: 'pct-left', label: '%เหลือ', title: '(เงินคงเหลือ ÷ รายรับรวม) × 100 — อัตราการออม', cls: 'px-2 text-center sticky right-[70px] w-[70px] min-w-[70px] max-w-[70px] cursor-help' },
  { id: 'pct-spent', label: '%จ่าย', title: '(รายจ่ายรวม ÷ รายรับรวม) × 100 — อัตราการใช้จ่าย', cls: 'px-2 border-r text-center sticky right-0 w-[70px] min-w-[70px] max-w-[70px] cursor-help' },
];

const excludeBtn = (excluded: boolean) => `inline-flex items-center justify-center shrink-0 transition-colors ${
  excluded ? 'text-neutral-400 hover:text-neutral-300 hover:bg-surface-elevated' : 'text-neutral-400 hover:text-white hover:bg-surface-elevated/50'
}`;

export const CashflowTableHeader = React.memo(({
  activeIncomeGroups,
  activeExpenseGroups,
  expandedGroups,
  toggleGroup,
  getActiveCatsForGroup,
  thinBorder,
  boundaryBorder,
  boxBorder,
  handleMouseEnter,
  handleCategoryMouseEnter,
  handleMouseLeave,
  hoveredCol,
  setHoveredCol,
  excludedGroups,
  toggleGroupExclusion,
  excludedCategories,
  toggleCategoryExclusion,
}: HeaderProps) => {
  const span = (groups: CashflowGroup[]) =>
    groups.reduce((acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1), 0);
  const leave = () => { handleMouseLeave(); setHoveredCol(null); };

  /** A group's header cell plus, when expanded, one cell per category. The last income column carries the boundary border. */
  const groupCells = (g: CashflowGroup, isIncome: boolean, isLastIncome: boolean) => {
    const isExpanded = expandedGroups.has(g.id);
    const cats = getActiveCatsForGroup(g.id);
    const colId = `g-${g.id}`;
    const isExcluded = excludedGroups.has(g.id);
    const groupColor = g.color || tc(isIncome ? 'income' : 'gray-300');

    return (
      <React.Fragment key={g.id}>
        <th
          onMouseEnter={(e) => { handleMouseEnter(e, g); setHoveredCol(colId); }}
          onMouseLeave={leave}
          className={`px-2 py-1.5 ${isIncome ? 'font-extrabold' : 'font-bold'} text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${isExcluded ? 'opacity-40' : ''} ${GROUP_COL_CLS}`}
          style={{ color: isExcluded ? undefined : readable(groupColor), backgroundColor: getHighlightBgColor(g, hoveredCol === colId, false), boxShadow: isExcluded ? undefined : `inset 0 2px 0 ${groupColor}` }}
        >
          <div className="flex items-center justify-center gap-1 min-w-0">
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={`กลุ่ม${isIncome ? 'รายรับ' : 'รายจ่าย'} ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
              onClick={() => toggleGroup(g.id)}
              className={`cursor-pointer inline-flex items-center gap-1 bg-transparent border-0 p-0 transition-opacity select-none hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent-ink ${isExcluded ? 'opacity-40 grayscale' : ''}`}
            >
              <CategoryGlyph icon={g.icon} color={isExcluded ? tc('ink-muted') : groupColor} size={18} fallbackEmoji={isIncome ? '💰' : '📦'} />
              {cats.length > 0 && (
                <span className={`${isIncome ? 'text-[11px]' : 'text-[20px]'} font-mono leading-none ${isExpanded ? 'text-accent-ink' : isIncome ? 'text-emerald-400/70' : 'text-slate-400'}`}>
                  {isExpanded ? '«' : '»'}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleGroupExclusion(g.id); }}
              className={`p-1 rounded-none ${excludeBtn(isExcluded)}`}
              title={isExcluded ? `นำกลุ่ม ${g.name} กลับมารวมคำนวณ` : `ยกเว้นกลุ่ม ${g.name} จากการคำนวณ`}
            >
              {isExcluded ? <EyeOff className="w-3 h-3 text-ink-muted" aria-label="ยกเว้นจากการคำนวณ" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
        </th>
        {isExpanded && cats.map((c, cIdx) => {
          const catColId = `c-${c.id}`;
          const isCatExcluded = Boolean(excludedCategories?.has(c.id));
          const isCatFaded = isExcluded || isCatExcluded;
          return (
            <th
              key={c.id}
              onMouseEnter={(e) => { handleCategoryMouseEnter?.(e, g, c); setHoveredCol(catColId); }}
              onMouseLeave={leave}
              className={`px-2 py-1.5 font-black text-center text-[11px] uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-line-strong/65 border-b-line-strong/65 ${isCatFaded ? 'opacity-30' : ''} ${CAT_COL_CLS}`}
              style={{ backgroundColor: getSubHighlightBgColor(g, c.color, hoveredCol === catColId, false), boxShadow: `inset 0 2px 0 ${c.color || groupColor}` }}
              title={c.name}
            >
              <div className="flex items-center justify-center gap-1 min-w-0">
                <CategoryGlyph icon={c.icon} color={isCatFaded ? tc('ink-muted') : c.color} size={15} className={isCatFaded ? 'opacity-60' : ''} fallbackEmoji="📁" />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCategoryExclusion(c.id); }}
                  className={`p-0.5 rounded ${excludeBtn(isCatExcluded)}`}
                  title={isCatExcluded ? `นำหมวด ${c.name} กลับมารวมคำนวณ` : `ยกเว้นหมวด ${c.name} จากการคำนวณ`}
                >
                  {isCatExcluded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                </button>
              </div>
            </th>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <thead className="sticky top-0 z-30 bg-surface">
      <tr>
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgb(0_0_0/calc(0.15*var(--shadow-k)))] transition-colors ${MONTH_COL_CLS} ${
            hoveredCol === 'month' ? 'bg-surface-elevated text-white' : 'text-neutral-200 bg-surface'
          }`}
        >
          ช่วงเวลา
        </th>

        {activeIncomeGroups.length > 0 && (
          <th colSpan={span(activeIncomeGroups)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-emerald-400`}>
            รายรับ (+)
          </th>
        )}
        {activeExpenseGroups.length > 0 && (
          <th colSpan={span(activeExpenseGroups)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-slate-400`}>
            รายจ่าย (-)
          </th>
        )}

        {SUMMARY_COLS.map(col => (
          <th
            key={col.id}
            rowSpan={2}
            onMouseEnter={() => setHoveredCol(col.id)}
            onMouseLeave={() => setHoveredCol(null)}
            title={col.title}
            className={`py-2.5 font-bold border-l border-b ${thinBorder} align-middle z-50 transition-colors ${col.cls} ${
              hoveredCol === col.id ? `bg-surface-elevated ${col.text ?? 'text-white'}` : `${col.text ?? 'text-neutral-200'} bg-surface`
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>

      <tr>
        {activeIncomeGroups.map((g, idx) => groupCells(g, true, idx === activeIncomeGroups.length - 1))}
        {activeExpenseGroups.map(g => groupCells(g, false, false))}
      </tr>
    </thead>
  );
});

CashflowTableHeader.displayName = 'CashflowTableHeader';
