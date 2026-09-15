// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionGrid.tsx
import React from 'react';
import { CatItem } from './CatItem';
import { AllocationItem } from './AllocationItem';
import {
  AllocationItemData,
  CategoryItemData,
  ExpenseProportionGridProps,
  ProportionItem,
} from './types';

interface ProportionItemCellProps {
  item: ProportionItem;
  idx: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
  isAllocationMode: boolean;
  activeTotal: number;
  excludedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
}

const ProportionItemCell = React.memo<ProportionItemCellProps>(({
  item,
  idx,
  isHovered,
  onHover,
  isAllocationMode,
  activeTotal,
  excludedGroupIds,
  onToggleGroup,
}) => {
  if (isAllocationMode) {
    return (
      <AllocationItem 
        item={item as AllocationItemData} 
        idx={idx} 
        isHovered={isHovered} 
        onHover={onHover} 
        activeTotal={activeTotal} 
        excludedGroupIds={excludedGroupIds}
        onToggleGroup={onToggleGroup}
      />
    );
  }
  return (
    <CatItem 
      cat={item as CategoryItemData} 
      idx={idx} 
      isHovered={isHovered} 
      onHover={onHover} 
    />
  );
});

ProportionItemCell.displayName = 'ProportionItemCell';

const EMPTY_CELL_KEYS = ['prop-empty-0', 'prop-empty-1', 'prop-empty-2', 'prop-empty-3'];

export const ExpenseProportionGrid = React.memo<ExpenseProportionGridProps>(({
  activeItems,
  isAllocationMode,
  hoveredIdx,
  onHover,
  activeTotal,
  excludedGroupIds,
  onToggleGroup,
  gridColsClass,
}) => {
  const itemCount = activeItems.length;
  const emptyCount = isAllocationMode ? (3 - (itemCount % 3)) % 3 : (5 - (itemCount % 5)) % 5;

  return (
    <div className="flex-1 min-w-0 max-h-[260px] overflow-y-auto tactical-scrollbar">
      <div className={`grid ${gridColsClass} gap-px bg-[#303030]/50`}>
        {activeItems.map((item, idx) => (
          <ProportionItemCell
            key={item.id || item.name}
            item={item}
            idx={idx}
            isHovered={hoveredIdx === idx}
            onHover={onHover}
            isAllocationMode={isAllocationMode}
            activeTotal={activeTotal}
            excludedGroupIds={excludedGroupIds}
            onToggleGroup={onToggleGroup}
          />
        ))}
        {EMPTY_CELL_KEYS.slice(0, emptyCount).map((key) => (
          <div key={key} className="bg-[#181818]/10" />
        ))}
      </div>
    </div>
  );
});

ExpenseProportionGrid.displayName = 'ExpenseProportionGrid';
export default ExpenseProportionGrid;
