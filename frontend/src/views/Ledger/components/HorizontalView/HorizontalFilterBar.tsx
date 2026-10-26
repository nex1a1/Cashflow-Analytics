import React, { useMemo, useCallback } from 'react';
import { 
  Building2, Calendar, EyeOff, RefreshCw,
  SlidersHorizontal, Check, Folder, MousePointer2
} from 'lucide-react';
import CategoryMatrixFilter from '../common/CategoryMatrixFilter';
import SegmentGroup from '../common/SegmentGroup';
import { ActiveFiltersBar, FilterColumn, FilterField } from '../common/filterParts';
import { EXCLUDED_HEATMAP_CATEGORIES, HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';
import { Category, CashflowGroup, TransactionDisplay } from '../../../../types';

interface HorizontalFilterBarProps {
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  monthTransactions: TransactionDisplay[];
  filters: HeatmapEngineOptions;
  setFilters: React.Dispatch<React.SetStateAction<HeatmapEngineOptions>>;
  clearFilters: () => void;
  isFilterActive: boolean;
  activeCount?: number;
}

/** A display option shown as a row with a checkbox at its end. */
function CheckToggle({ on, onClick, icon: Icon, label, title, onCls, boxOnCls }: {
  on: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  onCls: string;
  boxOnCls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-between px-2.5 py-1.5 border rounded-none text-[11px] font-mono font-bold transition-all select-none cursor-pointer whitespace-nowrap ${
        on ? onCls : 'bg-surface border-line text-ink-body hover:text-ink-display hover:border-line-strong'
      }`}
      title={title}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none ${on ? boxOnCls : 'border-line-strong bg-canvas'}`}>
        {on && <Check className="w-2.5 h-2.5 stroke-3" />}
      </div>
    </button>
  );
}

export default function HorizontalFilterBar({
  categories = [],
  cashflowGroups = [],
  monthTransactions = [],
  filters = {},
  setFilters,
  clearFilters,
  isFilterActive,
  activeCount
}: HorizontalFilterBarProps) {
  const {
    selectedCategories = 'ALL',
    includeFixedCosts = false,
    allocationFilter = 'ALL',
    dayTypeFilter = 'ALL',
    hideZeroDays = false,
  } = filters;

  // Set of category names with transactions in the selected period (monthTransactions)
  const activeExpenseCatNamesInPeriod = useMemo(() => {
    const set = new Set<string>();
    (monthTransactions || []).forEach(t => {
      const cat = categories.find(c => c.name === t.category || c.id === t.category_id);
      if ((cat as any)?.type === 'expense' || (!(cat as any)?.type && t.category)) {
        set.add(cat?.name || t.category);
      }
    });
    return set;
  }, [monthTransactions, categories]);

  // All expense categories
  const expenseCategories = useMemo(() => {
    return categories.filter(c => (c as any).type === 'expense');
  }, [categories]);

  // หมวดหมู่ที่มีรายการจริงในเดือนนี้ (ซิงค์กับ includeFixedCosts)
  const filterActiveCatNames = useMemo(() => {
    const set = new Set<string>();
    activeExpenseCatNamesInPeriod.forEach(name => {
      const isFixed = EXCLUDED_HEATMAP_CATEGORIES.includes(name);
      if (isFixed) {
        if (includeFixedCosts) {
          set.add(name);
        }
      } else {
        set.add(name);
      }
    });
    if (includeFixedCosts) {
      EXCLUDED_HEATMAP_CATEGORIES.forEach(name => set.add(name));
    }
    return set;
  }, [activeExpenseCatNamesInPeriod, includeFixedCosts]);

  // ตรวจสอบว่ามีการคัดกรองหมวดหมู่ที่ต่างจาก Default หรือไม่
  const isCatActive = selectedCategories !== 'ALL';

  // Effective active count
  const effectiveActiveCount = activeCount ?? [
    allocationFilter !== 'ALL',
    dayTypeFilter !== 'ALL',
    includeFixedCosts,
    hideZeroDays,
    isCatActive
  ].filter(Boolean).length;

  // ── Actions: Category Change via CategoryMatrixFilter ──
  const handleCategoryChange = useCallback((newCats: 'ALL' | string[]) => {
    if (newCats === 'ALL') {
      // Reset to default (ติ๊กเฉพาะที่มีรายการ, ปิดค่าหอพัก)
      setFilters(prev => ({
        ...prev,
        selectedCategories: 'ALL',
        includeFixedCosts: false
      }));
      return;
    }

    if (Array.isArray(newCats)) {
      const allExpenseNames = expenseCategories.map(c => c.name);
      const fixedSelectedCount = EXCLUDED_HEATMAP_CATEGORIES.filter(n => newCats.includes(n)).length;
      const hasAllFixed = fixedSelectedCount === EXCLUDED_HEATMAP_CATEGORIES.length;
      const hasAnyFixed = fixedSelectedCount > 0;

      // 1. ถ้าเลือกครบทุกหมวดหมู่รวมค่าคงที่ทั้งหมด
      if (newCats.length === allExpenseNames.length) {
        setFilters(prev => ({
          ...prev,
          selectedCategories: allExpenseNames,
          includeFixedCosts: true
        }));
        return;
      }

      // 2. ถ้าเลือกตรงกับ active categories พอดี
      const activeNamesArray = Array.from(filterActiveCatNames);
      const isExactlyActive = newCats.length === activeNamesArray.length &&
        activeNamesArray.every(n => newCats.includes(n));

      if (isExactlyActive) {
        setFilters(prev => ({
          ...prev,
          selectedCategories: 'ALL',
          includeFixedCosts: hasAnyFixed
        }));
        return;
      }

      // 3. กำหนดค่าเฉพาะ: ซิงค์สถานะปุ่ม includeFixedCosts อัตโนมัติ
      setFilters(prev => ({
        ...prev,
        selectedCategories: newCats,
        includeFixedCosts: hasAllFixed ? true : (hasAnyFixed ? prev.includeFixedCosts : false)
      }));
    }
  }, [expenseCategories, filterActiveCatNames, setFilters]);

  // ── Actions: Fixed Costs Toggle (Sync 2 ทางกับ CategoryMatrixFilter) ──
  const toggleFixedCosts = useCallback(() => {
    setFilters(prev => {
      const nextInclude = !prev.includeFixedCosts;

      if (prev.selectedCategories === 'ALL') {
        return {
          ...prev,
          includeFixedCosts: nextInclude,
          selectedCategories: 'ALL'
        };
      }

      const current = Array.isArray(prev.selectedCategories) ? prev.selectedCategories : Array.from(filterActiveCatNames);
      let nextList: string[];
      if (nextInclude) {
        // เพิ่มค่าคงที่ทั้งหมดเข้าไป
        const set = new Set([...current, ...EXCLUDED_HEATMAP_CATEGORIES]);
        nextList = Array.from(set);
      } else {
        // นำค่าคงที่ทั้งหมดออก
        nextList = current.filter(n => !EXCLUDED_HEATMAP_CATEGORIES.includes(n));
      }

      return {
        ...prev,
        includeFixedCosts: nextInclude,
        selectedCategories: nextList
      };
    });
  }, [filterActiveCatNames, setFilters]);

  // ── Actions: Hide Zero Days Toggle ──
  const toggleHideZeroDays = useCallback(() => {
    setFilters(prev => ({ ...prev, hideZeroDays: !prev.hideZeroDays }));
  }, [setFilters]);

  return (
    <div className="m-reveal relative rounded-none border border-line/60 bg-surface mb-4 z-40">
      
      {/* Header bar */}
      <div className="px-3.5 py-2 bg-canvas border-b border-line/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-accent rounded-none shrink-0" />
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-ink-soft font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent-ink" />
            <span>ตัวกรองตารางรายวัน</span>
          </div>
        </div>

        {/* Clear and Status */}
        <div className="flex items-center gap-2">
          {isFilterActive && (
            <span className="px-2 py-0.5 rounded-pill text-[11px] font-black font-mono bg-warn/10 text-warn border border-warn/30">
              {effectiveActiveCount} ตัวกรองทำงานอยู่
            </span>
          )}

          {isFilterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-pill border text-accent-ink bg-accent/5 hover:bg-accent/15 border-accent/40 hover:border-accent-ink font-mono transition-colors cursor-pointer whitespace-nowrap"
              title="ล้างตัวกรองของตารางทั้งหมด"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_320px_minmax(320px,1.5fr)] gap-px bg-surface-elevated/50 relative z-20">
        
        <FilterColumn icon={MousePointer2} title="การจัดสรรและตัวเลือกแสดงผล" note="* ควบคุมการรวมค่าคงที่และการซ่อนแถววันว่างในตารางความถี่">
          <FilterField label="การจัดสรรเงิน (Need / Want)">
            <SegmentGroup value={allocationFilter} onChange={v => setFilters(prev => ({ ...prev, allocationFilter: v }))} options={[
              { value: 'ALL', label: 'ทั้งหมด' },
              { value: 'need', label: 'Need', colorScheme: 'rose' },
              { value: 'want', label: 'Want', colorScheme: 'amber' },
            ]} />
          </FilterField>

          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2">
              <CheckToggle
                on={includeFixedCosts}
                onClick={toggleFixedCosts}
                icon={Building2}
                label="รวมค่าหอ/น้ำ/ไฟ/เน็ต"
                title="สลับการรวม ค่าเช่า/ค่าหอพัก ค่าน้ำ ค่าไฟ ค่าเน็ต"
                onCls="bg-warn/10 border-warn/60 text-warn"
                boxOnCls="bg-warn border-warn text-canvas"
              />
              <CheckToggle
                on={hideZeroDays}
                onClick={toggleHideZeroDays}
                icon={EyeOff}
                label="ซ่อนวันไม่มียอดใช้จ่าย"
                title="ซ่อนแถววันที่ไม่มียอดใช้จ่ายในเดือนนี้"
                onCls="bg-accent/20 border-accent/60 text-accent-ink"
                boxOnCls="bg-accent border-accent-ink text-on-accent"
              />
            </div>
          </div>
        </FilterColumn>

        <FilterColumn icon={Calendar} title="ตัวกรองประเภทวัน" note="* กรองแถววันที่ในตารางความถี่ตามประเภทวันทำงานหรือวันหยุด" className="relative z-30">
          <FilterField label="กรองตามวันทำงาน / วันหยุด">
            <SegmentGroup value={dayTypeFilter} onChange={v => setFilters(prev => ({ ...prev, dayTypeFilter: v }))} options={[
              { value: 'ALL', label: 'ทุกวัน' },
              { value: 'WEEKDAY', label: 'วันทำงาน', colorScheme: 'emerald' },
              { value: 'WEEKEND', label: 'วันหยุด', colorScheme: 'amber' },
            ]} />
          </FilterField>
        </FilterColumn>

        <FilterColumn
          icon={Folder}
          title="จำแนกตามกลุ่ม / หมวดหมู่ในตาราง"
          note="* หมวดหมู่ที่ไม่มีข้อมูลและค่าหอพักจะถูกติ๊กออกตามค่าเริ่มต้น และสามารถติ๊กเลือกเพิ่มได้อิสระ"
          className="relative z-30"
        >
          <FilterField label="เลือกหมวดหมู่ที่แสดงเป็นคอลัมน์" className="relative z-50">
            <CategoryMatrixFilter
              categories={categories}
              cashflowGroups={cashflowGroups}
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
              activeCategoryNames={filterActiveCatNames}
              typeFilter="EXPENSE"
            />
          </FilterField>
        </FilterColumn>

      </div>

      {isFilterActive && <ActiveFiltersBar label="ตัวกรองตารางที่ทำงานอยู่:" count={effectiveActiveCount} onClear={clearFilters} />}
    </div>
  );
}
