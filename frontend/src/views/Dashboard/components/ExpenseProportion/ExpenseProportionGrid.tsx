// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionGrid.tsx
import React from 'react';
import { CatItem } from './CatItem';
import { AllocationItem } from './AllocationItem';
import {
  AllocationItemData,
  CategoryItemData,
  ExpenseProportionGridProps,
} from './types';

const EMPTY_CELL_KEYS = ['prop-empty-0', 'prop-empty-1', 'prop-empty-2', 'prop-empty-3'];

interface CategoryGridProps {
  items: CategoryItemData[];
  hoveredIdx: number;
  onHover: (idx: number) => void;
  isActive: boolean;
}

const CategoryGrid = React.memo<CategoryGridProps>(({ items, hoveredIdx, onHover, isActive }) => {
  const emptyCount = (5 - (items.length % 5)) % 5;
  return (
    <div
      className={`[grid-area:1/1] grid grid-cols-5 gap-px bg-[#303030]/50 ${isActive ? '' : 'invisible pointer-events-none'}`}
      aria-hidden={!isActive}
      {...(isActive ? {} : ({ inert: '' } as Record<string, string>))}
    >
      {items.map((cat, idx) => (
        <CatItem key={cat.id || cat.name} cat={cat} idx={idx} isHovered={isActive && hoveredIdx === idx} onHover={onHover} />
      ))}
      {EMPTY_CELL_KEYS.slice(0, emptyCount).map((key) => (
        <div key={key} className="bg-[#181818]/10" />
      ))}
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

const AllocationGrid = React.memo<AllocationGridProps>(({
  items, hoveredIdx, onHover, allocationTotal, excludedGroupIds, onToggleGroup, isActive,
}) => {
  const emptyCount = (3 - (items.length % 3)) % 3;
  return (
    <div
      className={`[grid-area:1/1] grid grid-cols-3 gap-px bg-[#303030]/50 ${isActive ? '' : 'invisible pointer-events-none'}`}
      aria-hidden={!isActive}
      {...(isActive ? {} : ({ inert: '' } as Record<string, string>))}
    >
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
        <div key={key} className="bg-[#181818]/10" />
      ))}
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
export default ExpenseProportionGrid;
