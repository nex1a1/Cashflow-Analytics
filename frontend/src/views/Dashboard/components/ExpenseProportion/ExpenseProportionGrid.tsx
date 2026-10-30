// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionGrid.tsx
import React from 'react';
import { CatItem } from './CatItem';
import { AllocationItem } from './AllocationItem';
import { planOf } from './proportionHelpers';
import { formatBaht } from '@/utils/formatters';
import { withAlpha } from '../MainChart/futureZone';
import { readable } from '@/constants/theme';
import {
  AllocationItemData,
  CategoryItemData,
  ExpenseProportionGridProps,
} from './types';

const EMPTY_CELL_KEYS = ['prop-empty-0', 'prop-empty-1', 'prop-empty-2', 'prop-empty-3'];

/** ranked list columns; rows fill top to bottom, then the next column */
const CATEGORY_COLUMNS = 4;

interface CategoryGridProps {
  items: CategoryItemData[];
  hoveredIdx: number;
  onHover: (idx: number) => void;
  isActive: boolean;
}

/**
 * The whole-to-part view the doughnut used to give, as one straight bar: every
 * category's share of total spending, plan tails hatched. Hovering a segment
 * lights its row below and the reverse. Rows carry the numbers, so the strip is
 * hidden from screen readers.
 */
const ProportionStrip = React.memo<CategoryGridProps>(({ items, hoveredIdx, onHover, isActive }) => {
  const total = items.reduce((sum, c) => sum + c.amount, 0);
  if (total <= 0) return null;
  return (
    <div className="flex h-3 gap-px bg-canvas" aria-hidden="true" onMouseLeave={() => onHover(-1)}>
      {items.map((cat, idx) => {
        const plan = planOf(cat);
        const dim = isActive && hoveredIdx !== -1 && hoveredIdx !== idx;
        return (
          <div
            key={cat.id || cat.name}
            onMouseEnter={() => onHover(idx)}
            title={`${cat.name} · ${formatBaht(cat.amount)} (${cat.percentage}%)`}
            className={`h-full min-w-0 flex transition-opacity duration-150 ${dim ? 'opacity-30' : ''}`}
            style={{ width: `${(cat.amount / total) * 100}%` }}
          >
            <div className="h-full flex-1" style={{ backgroundColor: cat.color }} />
            {plan > 0 && (
              <div
                className="h-full shrink-0"
                style={{
                  width: `${(plan / cat.amount) * 100}%`,
                  backgroundColor: withAlpha(cat.color, 0.25),
                  backgroundImage: `repeating-linear-gradient(135deg, ${cat.color} 0 2px, transparent 2px 5px)`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
ProportionStrip.displayName = 'ProportionStrip';

const CategoryGrid = React.memo<CategoryGridProps>((props) => {
  const { items, hoveredIdx, onHover, isActive } = props;
  const rows = Math.max(1, Math.ceil(items.length / CATEGORY_COLUMNS));
  const emptyCount = rows * CATEGORY_COLUMNS - items.length;
  const maxAmount = items.reduce((max, c) => Math.max(max, c.amount), 0);
  return (
    <div
      className={`[grid-area:1/1] flex flex-col gap-3 p-3 ${isActive ? '' : 'invisible pointer-events-none'}`}
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <ProportionStrip {...props} />
      <div
        // rows share the height the taller mode (50/30/20) sets, so the stacked views never leave a gap
        className="flex-1 grid grid-flow-col gap-px bg-line"
        style={{ gridTemplateColumns: `repeat(${CATEGORY_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(2rem, 1fr))` }}
      >
        {items.map((cat, idx) => (
          <CatItem
            key={cat.id || cat.name}
            cat={cat}
            idx={idx}
            isHovered={isActive && hoveredIdx === idx}
            onHover={onHover}
            maxAmount={maxAmount}
          />
        ))}
        {EMPTY_CELL_KEYS.slice(0, emptyCount).map((key) => (
          <div key={key} className="bg-surface" />
        ))}
      </div>
    </div>
  );
});
CategoryGrid.displayName = 'CategoryGrid';

interface AllocationGridProps {
  items: AllocationItemData[];
  hoveredIdx: number;
  onHover: (idx: number) => void;
  allocationTotal: number;
  excludedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  isActive: boolean;
}

interface SplitBarProps {
  label: string;
  parts: Array<{ key: string; idx: number; name: string; pct: number; color: string }>;
  hoveredIdx: number;
  onHover: (idx: number) => void;
  /** actual split = solid fills with dark text; target split = faint fills with coloured text */
  solid: boolean;
}

function SplitBar({ label, parts, hoveredIdx, onHover, solid }: SplitBarProps) {
  const sum = parts.reduce((s, p) => s + p.pct, 0);
  const scale = sum > 100 ? 100 / sum : 1; // spending past income: show the split of what went out
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] font-bold text-ink-muted">{label}</span>
      <div className="flex-1 flex h-[18px] gap-px bg-canvas" onMouseLeave={() => onHover(-1)}>
        {parts.map(p => {
          const width = p.pct * scale;
          if (width <= 0) return null;
          const dim = hoveredIdx !== -1 && hoveredIdx !== p.idx;
          return (
            <div
              key={p.key}
              onMouseEnter={() => onHover(p.idx)}
              className={`h-full min-w-0 flex items-center px-1.5 overflow-hidden transition-opacity duration-150 ${dim ? 'opacity-35' : ''}`}
              style={{ width: `${width}%`, backgroundColor: solid ? p.color : withAlpha(p.color, 0.16) }}
            >
              {width >= 7 && (
                <span
                  className={`truncate text-[11px] leading-none font-black tabular-nums ${solid ? 'text-canvas' : ''}`}
                  style={solid ? undefined : { color: readable(p.color) }}
                >
                  {p.name} {solid ? `${p.pct.toFixed(1)}%` : `${p.pct}%`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Where the income went (จริง) above the 50/30/20 it should follow (เป้า). The
 * boundaries line up when the plan is kept; the gap between them is the story.
 * Columns below carry every number, so the strips are hidden from screen readers.
 */
function AllocationStrips({ items, hoveredIdx, onHover }: Pick<AllocationGridProps, 'items' | 'hoveredIdx' | 'onHover'>) {
  const parts = items.map((item, idx) => ({
    key: item.id, idx, name: item.name, color: item.color,
    actual: Number.parseFloat(String(item.percentage)) || 0,
    target: item.target,
  }));
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      <SplitBar label="จริง" parts={parts.map(p => ({ ...p, pct: p.actual }))} hoveredIdx={hoveredIdx} onHover={onHover} solid />
      <SplitBar label="เป้า" parts={parts.map(p => ({ ...p, pct: p.target }))} hoveredIdx={hoveredIdx} onHover={onHover} solid={false} />
    </div>
  );
}

const AllocationGrid = React.memo<AllocationGridProps>(({
  items, hoveredIdx, onHover, allocationTotal, excludedGroupIds, onToggleGroup, isActive,
}) => {
  const emptyCount = (3 - (items.length % 3)) % 3;
  return (
    <div
      className={`[grid-area:1/1] flex flex-col gap-3 p-3 ${isActive ? '' : 'invisible pointer-events-none'}`}
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <AllocationStrips items={items} hoveredIdx={isActive ? hoveredIdx : -1} onHover={onHover} />
      <div className="flex-1 grid grid-cols-3 gap-px bg-line">
      {items.map((item, idx) => (
        <AllocationItem
          key={item.id || item.name}
          item={item}
          idx={idx}
          isHovered={isActive && hoveredIdx === idx}
          onHover={onHover}
          activeTotal={allocationTotal}
          excludedGroupIds={excludedGroupIds}
          onToggleGroup={onToggleGroup}
        />
      ))}
      {EMPTY_CELL_KEYS.slice(0, emptyCount).map((key) => (
        <div key={key} className="bg-surface" />
      ))}
      </div>
    </div>
  );
});
AllocationGrid.displayName = 'AllocationGrid';

/**
 * Both modes' grids are mounted at once, stacked in the same CSS grid cell
 * ([grid-area:1/1]). The inactive one is `invisible` (not `hidden`/`display:none`),
 * so it still contributes to layout height — the container is always exactly as
 * tall as the taller of the two, keeping the card's height identical across modes
 * without a scrollbar or a guessed fixed height.
 */
export const ExpenseProportionGrid = React.memo<ExpenseProportionGridProps>(({
  categoryItems,
  allocationItems,
  isAllocationMode,
  hoveredIdx,
  onHover,
  allocationTotal,
  excludedGroupIds,
  onToggleGroup,
}) => {
  return (
    <div className="flex-1 min-w-0 grid">
      <CategoryGrid
        items={categoryItems}
        hoveredIdx={hoveredIdx}
        onHover={onHover}
        isActive={!isAllocationMode}
      />
      <AllocationGrid
        items={allocationItems}
        hoveredIdx={hoveredIdx}
        onHover={onHover}
        allocationTotal={allocationTotal}
        excludedGroupIds={excludedGroupIds}
        onToggleGroup={onToggleGroup}
        isActive={isAllocationMode}
      />
    </div>
  );
});

ExpenseProportionGrid.displayName = 'ExpenseProportionGrid';
