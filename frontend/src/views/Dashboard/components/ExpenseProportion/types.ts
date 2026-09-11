// src/views/Dashboard/components/ExpenseProportion/types.ts

export type DisplayMode = 'category' | 'group' | 'allocation';

export type SortMode = 'amount-desc' | 'amount-asc' | 'order-asc' | 'order-desc';

export interface CategoryItemData {
  id: string;
  name: string;
  icon?: string;
  color: string;
  amount: number;
  percentage: string | number;
  cashflow_group_id?: string;
  order_index?: number;
}

export interface GroupCategoryItemData {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  amount: number;
  relativePercentage: string | number;
  order_index?: number;
}

export interface GroupItemData {
  id: string;
  name: string;
  icon?: string;
  color: string;
  amount: number;
  percentage: string | number;
  avgPerMonth?: number;
  allocation_type?: string;
  order_index?: number;
  categories: GroupCategoryItemData[];
}

export interface AllocationGroupItemData {
  id: string;
  name: string;
  amount: number;
  icon?: string;
  color?: string;
  relativePercentage?: string | number;
}

export interface AllocationItemData {
  id: string;
  name: string;
  amount: number;
  color: string;
  icon: string;
  target: number;
  percentage: string | number;
  order_index?: number;
  groups: AllocationGroupItemData[];
}

export type ProportionItem = CategoryItemData | GroupItemData | AllocationItemData;

export interface CatItemProps {
  cat: CategoryItemData;
  idx: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
}

export interface GroupItemProps {
  item: GroupItemData;
  idx: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
  isSingleMonthView?: boolean;
  sortMode?: SortMode;
}

export interface AllocationItemProps {
  item: AllocationItemData;
  idx: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
  activeTotal?: number;
  excludedGroupIds?: string[];
  onToggleGroup?: (groupId: string) => void;
}

export interface ExpenseProportionHeaderProps {
  displayMode: DisplayMode;
  onChangeMode: (mode: DisplayMode) => void;
  sortMode: SortMode;
  onToggleSort: (targetType: 'amount' | 'order') => void;
  isAllocationMode: boolean;
  isGroupMode: boolean;
  excludedGroupIds: string[];
  totalReduced: number;
  onResetExclusions: () => void;
  showSkeleton?: boolean;
  itemCount: number;
}

export interface ExpenseProportionChartProps {
  activeChartData: any;
  options: any;
  isAllocationMode: boolean;
  isGroupMode: boolean;
  activeTotal: number;
  onMouseLeave: () => void;
  isSliceHovered?: boolean;
  hoveredItem?: ProportionItem | null;
}

export interface ExpenseProportionGridProps {
  activeItems: ProportionItem[];
  isAllocationMode: boolean;
  isGroupMode: boolean;
  hoveredIdx: number;
  onHover: (idx: number) => void;
  activeTotal: number;
  excludedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  isSingleMonthView?: boolean;
  sortMode: SortMode;
  gridColsClass: string;
}
