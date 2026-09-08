// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionGrid.tsx
import React from 'react';
import { CatItem } from './CatItem';
import { GroupItem } from './GroupItem';
import { AllocationItem } from './AllocationItem';
import {
  AllocationItemData,
  CategoryItemData,
  ExpenseProportionGridProps,
  GroupItemData,
  ProportionItem,
  SortMode,
} from './types';

interface ProportionItemCellProps {
  item: ProportionItem;
  idx: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
  isAllocationMode: boolean;
  isGroupMode: boolean;
  activeTotal: number;
  excludedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  isSingleMonthView?: boolean;
  sortMode: SortMode;
}

const ProportionItemCell = React.memo<ProportionItemCellProps>(({
  item,
  idx,
  isHovered,
  onHover,
  isAllocationMode,
  isGroupMode,
  activeTotal,
  excludedGroupIds,
  onToggleGroup,
  isSingleMonthView,
  sortMode,
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
  if (isGroupMode) {
    return (
      <GroupItem 
        item={item as GroupItemData} 
        idx={idx} 
        isHovered={isHovered} 
        onHover={onHover} 
        isSingleMonthView={isSingleMonthView} 
        sortMode={sortMode} 
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
  isGroupMode,
  hoveredIdx,
  onHover,
  activeTotal,
  excludedGroupIds,
  onToggleGroup,
  isSingleMonthView,
  sortMode,
  gridColsClass,
}) => {
  const itemCount = activeItems.length;
  const isGrid3 = isAllocationMode || isGroupMode;
  const emptyCount = isGrid3 ? (3 - (itemCount % 3)) % 3 : (5 - (itemCount % 5)) % 5;

  return (
    <div className={`flex-1 grid ${gridColsClass} gap-px bg-[#303030]/50`}>
      {activeItems.map((item, idx) => (
        <ProportionItemCell
          key={item.id || item.name}
          item={item}
          idx={idx}
          isHovered={hoveredIdx === idx}
          onHover={onHover}
          isAllocationMode={isAllocationMode}
          isGroupMode={isGroupMode}
          activeTotal={activeTotal}
          excludedGroupIds={excludedGroupIds}
          onToggleGroup={onToggleGroup}
          isSingleMonthView={isSingleMonthView}
          sortMode={sortMode}
        />
      ))}
      {EMPTY_CELL_KEYS.slice(0, emptyCount).map((key) => (
        <div key={key} className="bg-[#181818]/10" />
      ))}
    </div>
  );
});

ExpenseProportionGrid.displayName = 'ExpenseProportionGrid';
export default ExpenseProportionGrid;
