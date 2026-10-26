import React from 'react';
import { 
  Search, X, Hash, CalendarDays, MousePointer2,
  Folder, ChevronDown, RefreshCw, SlidersHorizontal
} from 'lucide-react';
import DatePicker from '../../../../components/ui/DatePicker';
import CategoryMatrixFilter from './CategoryMatrixFilter';
import SegmentGroup from './SegmentGroup';
import { ActiveFiltersBar, FilterColumn, FilterField } from './filterParts';
import { Category, CashflowGroup, DayType } from '../../../../types';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  advancedFilterDate: string;
  setAdvancedFilterDate: (date: string) => void;
  advancedFilterGroup: string;
  setAdvancedFilterGroup: (group: string) => void;
  advancedFilterCategory: string | string[];
  setAdvancedFilterCategory: (category: string | string[]) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  allocationFilter: string;
  setAllocationFilter: (alloc: string) => void;
  minAmount: string;
  setMinAmount: (min: string) => void;
  maxAmount: string;
  setMaxAmount: (max: string) => void;
  dayTypeFilter: string;
  setDayTypeFilter: (dayType: string) => void;
  availableDatesInPeriod: string[];
  cashflowGroups: CashflowGroup[];
  activeCashflowGroupIds: Set<string>;
  activeCategoryNames: Set<string>;
  categories: Category[];
  clearFilters: () => void;
  isFilterActive: boolean;
  filterPeriod: string;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  isExpanded?: boolean;
  setIsExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
}

const AMOUNT_INPUT = 'w-full pl-6 pr-1 py-1 border rounded-none outline-hidden text-xs font-semibold bg-surface border-line text-ink-soft focus:border-accent-ink placeholder-ink-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export default function FilterBar({
  searchQuery, setSearchQuery,
  advancedFilterDate, setAdvancedFilterDate,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterCategory, setAdvancedFilterCategory,
  typeFilter, setTypeFilter,
  allocationFilter, setAllocationFilter,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  dayTypeFilter, setDayTypeFilter,
  availableDatesInPeriod, cashflowGroups, activeCashflowGroupIds, activeCategoryNames, categories,
  clearFilters, isFilterActive,
  filterPeriod,
  dayTypes = {},
  dayTypeConfig = [],
  isExpanded = false,
  setIsExpanded = () => {}
}: FilterBarProps) {
  const isCatActive = Array.isArray(advancedFilterCategory)
    ? advancedFilterCategory.length < (categories?.length || 0)
    : advancedFilterCategory !== 'ALL';


  // Advanced active filters count (excluding search query and type filter)
  const advancedActiveCount = [
    allocationFilter !== 'ALL',
    (advancedFilterDate !== 'ALL' || dayTypeFilter !== 'ALL'),
    advancedFilterGroup !== 'ALL',
    isCatActive,
    minAmount !== '',
    maxAmount !== ''
  ].filter(Boolean).length;

  // Dynamic active filters count
  const activeCount = [
    searchQuery !== '',
    typeFilter !== 'ALL',
    allocationFilter !== 'ALL',
    (advancedFilterDate !== 'ALL' || dayTypeFilter !== 'ALL'),
    advancedFilterGroup !== 'ALL',
    isCatActive,
    minAmount !== '',
    maxAmount !== ''
  ].filter(Boolean).length;

  return (
    <div className="relative rounded-none border border-line/60 bg-surface mb-4 z-40">
      {/* ================= COMPACT SEARCH STRIP (ROW 1: ALWAYS VISIBLE IN LIST VIEW) ================= */}
      <div className="p-2 bg-canvas flex items-center justify-between gap-2.5 flex-wrap">
        {/* Left: Quick Search Box */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
          <input
            type="text"
            placeholder="ค้นหารายละเอียด หรือหมวดหมู่..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 border rounded-none outline-hidden text-xs font-semibold bg-surface border-line focus:border-accent-ink text-ink-soft placeholder-ink-muted"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none hover:bg-surface-elevated text-ink-muted hover:text-ink-display"
              title="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Quick Type Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <SegmentGroup value={typeFilter} onChange={setTypeFilter} options={[
            { value: 'ALL', label: 'ทั้งหมด' },
            { value: 'INCOME', label: 'รายรับ', colorScheme: 'emerald' },
            { value: 'EXPENSE', label: 'รายจ่าย', colorScheme: 'rose' },
          ]} />
        </div>

        {/* Right: Advanced Filters Toggle & Clear */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-none border font-mono transition-all select-none whitespace-nowrap ${
              isExpanded
                ? 'bg-accent/10 border-accent-ink text-accent-ink'
                : 'bg-surface border-line text-ink-body hover:text-ink-display hover:border-line-strong'
            } ${advancedActiveCount > 0 ? 'border-warn/80! text-warn! bg-warn/10!' : ''}`}
            title="เปิด/ปิด แผงตัวกรองขั้นสูง (วันที่, กลุ่ม, หมวดหมู่, ช่วงเงิน, การจัดสรร)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ตัวกรองขั้นสูง</span>
            {advancedActiveCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-none text-[11px] font-black font-mono bg-warn/20 text-warn border border-warn/40 leading-none">
                {advancedActiveCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-accent-ink' : 'text-ink-muted'}`} />
          </button>

          {isFilterActive && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-pill border text-accent-ink bg-accent/5 hover:bg-accent/10 border-accent/30 hover:border-accent-ink font-mono shrink-0 whitespace-nowrap"
              title="ล้างการคัดกรองทั้งหมด"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= COLLAPSIBLE ADVANCED FILTER SECTION (ROW 2) ================= */}
      {isExpanded && (
        <div className="m-reveal border-t border-line/60">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_348px_minmax(320px,1.5fr)] gap-px bg-surface-elevated/50 relative z-20">
            
            <FilterColumn icon={MousePointer2} title="ช่วงจำนวนเงินและการจัดสรร">
              <FilterField label="ช่วงจำนวนเงิน">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value)}
                      className={AMOUNT_INPUT}
                    />
                  </div>
                  <span className="text-xs font-black text-ink-muted font-mono">—</span>
                  <div className="relative flex-1">
                    <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={e => setMaxAmount(e.target.value)}
                      className={AMOUNT_INPUT}
                    />
                  </div>
                </div>
              </FilterField>

              <FilterField label="การจัดสรรเงิน">
                <SegmentGroup value={allocationFilter} onChange={setAllocationFilter} options={[
                  { value: 'ALL', label: 'ทั้งหมด' },
                  { value: 'need', label: 'Need', colorScheme: 'rose' },
                  { value: 'want', label: 'Want', colorScheme: 'amber' },
                  { value: 'savings', label: 'Save', colorScheme: 'indigo' },
                ]} />
              </FilterField>
            </FilterColumn>

            {/* Date picker column: exactly fits the 320px calendar + 28px padding */}
            <FilterColumn icon={CalendarDays} title="ตัวกรองวันที่" note="* เลือกวันเพื่อดูรายการ" className="relative z-30">
              <FilterField label="เลือกวันเฉพาะ หรือช่วงวันที่" className="relative z-50">
                <DatePicker
                  value={advancedFilterDate !== 'ALL' ? advancedFilterDate : dayTypeFilter}
                  onChange={(val: string) => {
                    if (val === 'WEEKDAY' || val === 'WEEKEND') {
                      setAdvancedFilterDate('ALL');
                      setDayTypeFilter(val);
                    } else {
                      setAdvancedFilterDate(val);
                      setDayTypeFilter('ALL');
                    }
                  }}
                  variant="hud"
                  placeholder="วันที่"
                  allowAll={true}
                  availableDates={availableDatesInPeriod}
                  filterPeriod={filterPeriod}
                  dayTypes={dayTypes}
                  dayTypeConfig={dayTypeConfig}
                />
              </FilterField>
            </FilterColumn>

            <FilterColumn icon={Folder} title="จำแนกตามกลุ่ม / หมวดหมู่" note="* คลิกเพื่อเลือกกลุ่มและหมวดหมู่ย่อย" className="relative z-30">
              <FilterField label="เลือกหมวดหมู่" className="relative z-50">
                <CategoryMatrixFilter
                  categories={categories}
                  cashflowGroups={cashflowGroups}
                  selectedCategories={advancedFilterCategory as any}
                  onChange={setAdvancedFilterCategory as any}
                  activeCategoryNames={activeCategoryNames as any}
                  typeFilter={typeFilter}
                />
              </FilterField>
            </FilterColumn>
          </div>

          {isFilterActive && <ActiveFiltersBar label="ตัวกรองที่ทำงานอยู่:" count={activeCount} onClear={clearFilters} />}
        </div>
      )}

    </div>
  );
}
