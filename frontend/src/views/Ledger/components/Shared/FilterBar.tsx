import React from 'react';
import { 
  Search, X, Hash, CalendarDays, MousePointer2, 
  Folder, Tag, ChevronDown, ChevronUp, RefreshCw, Sparkles, SlidersHorizontal
} from 'lucide-react';
import DatePicker from '../../../../components/ui/DatePicker';
import CategoryMatrixFilter from './CategoryMatrixFilter';
import SegmentButton from './SegmentButton';
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
    <div className="relative rounded-none border border-line/60 bg-surface mb-4 z-40 shadow-md">
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
            className="w-full pl-8 pr-8 py-1.5 border rounded-none outline-none text-xs font-semibold bg-surface border-line focus:border-accent text-slate-300 placeholder-ink-muted"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none hover:bg-surface-elevated text-ink-muted hover:text-white"
              title="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Quick Type Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-none p-0.5 border bg-surface border-line">
            <SegmentButton label="ทั้งหมด" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
            <SegmentButton label="รายรับ" active={typeFilter === 'INCOME'} onClick={() => setTypeFilter('INCOME')} colorScheme="emerald" />
            <SegmentButton label="รายจ่าย" active={typeFilter === 'EXPENSE'} onClick={() => setTypeFilter('EXPENSE')} colorScheme="rose" />
          </div>
        </div>

        {/* Right: Advanced Filters Toggle & Clear */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-none border font-mono transition-all select-none whitespace-nowrap ${
              isExpanded
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-surface border-line text-slate-400 hover:text-slate-100 hover:border-line-strong'
            } ${advancedActiveCount > 0 ? '!border-amber-500/80 !text-amber-400 !bg-amber-950/20' : ''}`}
            title="เปิด/ปิด แผงตัวกรองขั้นสูง (วันที่, กลุ่ม, หมวดหมู่, ช่วงเงิน, Allocation)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ตัวกรองขั้นสูง</span>
            {advancedActiveCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-none text-[11px] font-black font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40 leading-none">
                {advancedActiveCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
          </button>

          {isFilterActive && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-none border text-accent bg-accent/5 hover:bg-accent/10 border-accent/30 hover:border-accent font-mono shrink-0 whitespace-nowrap"
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
        <div className="border-t border-line/60">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_348px_minmax(320px,1.5fr)] gap-[1px] bg-surface-elevated/50 relative z-20">
            
            {/* COLUMN 1: SCOPE & ALLOCATION */}
            <div className="bg-canvas p-3.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center gap-1.5">
                <MousePointer2 className="w-3.5 h-3.5 text-ink-muted" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 font-mono">
                  ช่วงจำนวนเงินและการจัดสรร
                </span>
              </div>

              {/* Amount Limits */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  ช่วงจำนวนเงิน (฿ Baht Range)
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value)}
                      className="w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-semibold bg-surface border-line text-slate-300 focus:border-accent placeholder-ink-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      className="w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-semibold bg-surface border-line text-slate-300 focus:border-accent placeholder-ink-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Allocation Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  การจัดสรรเงิน (Allocation)
                </span>
                <div className="flex rounded-none p-0.5 border bg-surface border-line">
                  <SegmentButton label="ทั้งหมด" active={allocationFilter === 'ALL'} onClick={() => setAllocationFilter('ALL')} />
                  <SegmentButton label="Need" active={allocationFilter === 'need'} onClick={() => setAllocationFilter('need')} colorScheme="rose" />
                  <SegmentButton label="Want" active={allocationFilter === 'want'} onClick={() => setAllocationFilter('want')} colorScheme="amber" />
                  <SegmentButton label="Save" active={allocationFilter === 'savings'} onClick={() => setAllocationFilter('savings')} colorScheme="indigo" />
                </div>
              </div>
            </div>

            {/* COLUMN 2: DATE PICKER (Exactly fits 320px calendar + 28px padding) */}
            <div className="bg-canvas p-3.5 flex flex-col justify-between gap-2.5 relative z-30">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-ink-muted" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 font-mono">
                  ตัวกรองวันที่
                </span>
              </div>

              <div className="flex flex-col gap-1 relative z-50">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  เลือกวันเฉพาะ หรือช่วงวันที่
                </span>
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
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                * เลือกวันเพื่อดูรายการ
              </div>
            </div>

            {/* COLUMN 3: CATEGORY MATRIX (Widened to take remaining space) */}
            <div className="bg-canvas p-3.5 flex flex-col justify-between gap-2.5 relative z-30">
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-ink-muted" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 font-mono">
                  จำแนกตามกลุ่ม / หมวดหมู่
                </span>
              </div>

              <div className="flex flex-col gap-1 relative z-50">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  เลือกหมวดหมู่ (2-Tier Matrix)
                </span>
                <CategoryMatrixFilter
                  categories={categories}
                  cashflowGroups={cashflowGroups}
                  selectedCategories={advancedFilterCategory as any}
                  onChange={setAdvancedFilterCategory as any}
                  activeCategoryNames={activeCategoryNames as any}
                  typeFilter={typeFilter}
                />
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                * คลิกเพื่อเลือกกลุ่มและหมวดหมู่ย่อย
              </div>
            </div>

          </div>

          {/* Active summary bottom bar inside expanded panel */}
          {isFilterActive && (
            <div className="flex items-center justify-between border-t border-line/60 p-2.5 px-3.5 bg-surface/50 relative z-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-accent"></span>
                </span>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    ตัวกรองที่ทำงานอยู่:
                  </span>
                  <span className="px-2 py-0.5 rounded-none text-[11px] font-black bg-surface border border-accent/30 text-slate-300 font-mono">
                    {activeCount} active
                  </span>
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1 rounded-none border text-accent bg-accent/5 hover:bg-accent/10 border-accent/30 hover:border-accent font-mono"
              >
                <RefreshCw className="w-3 h-3" />
                ล้างการคัดกรองทั้งหมด
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
