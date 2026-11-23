import React from 'react';
import { Search, X, RefreshCw, CalendarDays, Tag, Folder } from 'lucide-react';
import DatePicker from '../../../../components/ui/DatePicker';
import CategoryMatrixFilter from './CategoryMatrixFilter';
import SegmentGroup from './SegmentGroup';
import { ChipTrigger, ValueChip, pillStyle } from './FilterChip';
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
}

const AMOUNT_INPUT = 'flex-1 min-w-0 w-0 h-full pr-1 leading-6 bg-transparent! rounded-none! outline-hidden focus:ring-0 text-xs font-semibold tabular-nums text-ink-display placeholder-ink-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const CAPTION = 'text-[11px] font-bold text-ink-muted whitespace-nowrap';

/** One of the three equal sections of row 2: a caption, then its controls filling the rest. */
const SECTION = 'bg-canvas px-2.5 py-2 flex items-center gap-2 min-w-0';

/** The Ledger list's filters in two rows: search + type on top; amount, allocation, date and category below. */
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
  availableDatesInPeriod, cashflowGroups, activeCategoryNames, categories,
  clearFilters, isFilterActive,
  filterPeriod,
  dayTypes = {},
  dayTypeConfig = [],
}: FilterBarProps) {
  const dateValue = advancedFilterDate !== 'ALL' ? advancedFilterDate : dayTypeFilter;
  const group = advancedFilterGroup !== 'ALL' ? cashflowGroups.find(g => g.id === advancedFilterGroup) : undefined;

  const amountActive = minAmount !== '' || maxAmount !== '';

  return (
    <div className="relative border border-line/60 bg-canvas mb-4 z-40 flex flex-col">
      {/* Row 1: what you reach for most — search, the type switch, and clearing everything */}
      <div className="p-2.5 flex items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
          <input
            type="text"
            placeholder="ค้นหารายละเอียด หรือหมวดหมู่..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-8 pr-8 border rounded-none outline-hidden text-xs leading-6 font-semibold bg-surface border-line focus:border-accent-ink text-ink-soft placeholder-ink-muted"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none hover:bg-surface-elevated text-ink-muted hover:text-ink-display"
              title="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isFilterActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-7 flex items-center gap-1 text-[11px] font-black px-2 text-ink-muted hover:text-accent-ink shrink-0 whitespace-nowrap cursor-pointer"
            title="ล้างการคัดกรองทั้งหมด"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ล้างทั้งหมด</span>
          </button>
        )}

        <SegmentGroup compact value={typeFilter} onChange={setTypeFilter} options={[
          { value: 'ALL', label: 'ทั้งหมด' },
          { value: 'INCOME', label: 'รายรับ', colorScheme: 'emerald' },
          { value: 'EXPENSE', label: 'รายจ่าย', colorScheme: 'rose' },
          { value: 'SAVINGS', label: 'ลงทุน', colorScheme: 'indigo' },
        ]} />
      </div>

      {/* Row 2: three equal sections, like the old panel — amount & allocation | date | category.
          Only date and category, which need a big panel, open one. */}
      <div className="grid grid-cols-3 gap-px bg-line/60 border-t border-line/60">
        <div className={SECTION}>
          <span className={CAPTION}>ช่วงเงิน</span>
          {/* One field with two halves; the focus ring goes round the whole box, not inside it. */}
          <div
            className="flex-1 min-w-0 flex items-center h-7 border tint-border bg-surface focus-within:outline-2 focus-within:outline-accent-ink focus-within:outline-offset-1"
            style={pillStyle(amountActive)}
          >
            <label className="flex-1 min-w-0 h-full flex items-center gap-1 pl-2.5 cursor-text">
              <span className="text-[11px] font-black text-ink-muted">฿</span>
              <input type="number" min={0} placeholder="ต่ำสุด" aria-label="ยอดต่ำสุด" value={minAmount} onChange={e => setMinAmount(e.target.value)} className={AMOUNT_INPUT} />
            </label>
            <span aria-hidden className="w-px h-4 bg-line shrink-0" />
            <label className="flex-1 min-w-0 h-full flex items-center gap-1 pl-2.5 cursor-text">
              <span className="text-[11px] font-black text-ink-muted">฿</span>
              <input type="number" min={0} placeholder="สูงสุด" aria-label="ยอดสูงสุด" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className={AMOUNT_INPUT} />
            </label>
            {amountActive && (
              <button
                type="button"
                onClick={() => { setMinAmount(''); setMaxAmount(''); }}
                aria-label="ล้างตัวกรองช่วงเงิน"
                title="ล้างตัวกรองช่วงเงิน"
                className="h-full px-2 text-ink-muted hover:text-accent-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <SegmentGroup compact value={allocationFilter} onChange={setAllocationFilter} options={[
            { value: 'ALL', label: 'ทั้งหมด' },
            { value: 'need', label: 'Need', colorScheme: 'rose' },
            { value: 'want', label: 'Want', colorScheme: 'amber' },
            { value: 'savings', label: 'Save', colorScheme: 'indigo' },
          ]} />
        </div>

        <div className={SECTION}>
          <span className={CAPTION}>วันที่</span>
          <div className="flex-1 min-w-0">
            <DatePicker
              value={dateValue}
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
              customTrigger={({ open, setOpen, display }) => (
                <ChipTrigger
                  block
                  icon={CalendarDays}
                  label="วันที่"
                  placeholder="ทุกวันในช่วงนี้"
                  valueLabel={display}
                  active={dateValue !== 'ALL'}
                  open={open}
                  onToggle={() => setOpen(!open)}
                  onClear={() => { setAdvancedFilterDate('ALL'); setDayTypeFilter('ALL'); }}
                />
              )}
            />
          </div>
        </div>

        <div className={SECTION}>
          <span className={CAPTION}>หมวดหมู่</span>
          <CategoryMatrixFilter
            className="flex-1 min-w-0"
            categories={categories}
            cashflowGroups={cashflowGroups}
            selectedCategories={advancedFilterCategory as any}
            onChange={setAdvancedFilterCategory as any}
            activeCategoryNames={activeCategoryNames as any}
            typeFilter={typeFilter}
            popoverClassName="right-0 w-[min(46rem,90vw)]"
            renderTrigger={({ open, toggle, label, isActive, clear }) => (
              <ChipTrigger block icon={Tag} label="หมวดหมู่" placeholder={label} valueLabel={label} active={isActive} open={open} onToggle={toggle} onClear={clear} />
            )}
          />
          {advancedFilterGroup !== 'ALL' && (
            <ValueChip icon={Folder} label="กลุ่ม" valueLabel={group?.name ?? advancedFilterGroup} onClear={() => setAdvancedFilterGroup('ALL')} />
          )}
        </div>
      </div>
    </div>
  );
}
