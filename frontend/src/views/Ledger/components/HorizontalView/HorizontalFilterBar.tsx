import React, { useMemo, useCallback } from 'react';
import { 
  Building2, Calendar, EyeOff, RefreshCw, Sparkles, 
  SlidersHorizontal, Check, Folder, MousePointer2
} from 'lucide-react';
import CategoryMatrixFilter from '../Shared/CategoryMatrixFilter';
import { EXCLUDED_HEATMAP_CATEGORIES, HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';
import { Category, CashflowGroup, TransactionDisplay } from '../../../../types';

interface SegmentButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  colorScheme?: 'rose' | 'sky' | 'emerald' | 'amber' | 'red' | 'blue';
}

const SegmentButton: React.FC<SegmentButtonProps> = ({ label, active, onClick, colorScheme = 'blue' }) => {
  const getColors = () => {
    if (!active) {
      return 'bg-[#121212] border-[#303030] text-[#888888] hover:text-[#cbd5e1] hover:bg-[#303030]/30';
    }

    switch (colorScheme) {
      case 'rose':
        return 'bg-rose-950/20 border-rose-500/40 text-rose-400 font-black shadow-[0_0_8px_rgba(239,68,68,0.06)]';
      case 'sky':
        return 'bg-sky-950/20 border-sky-500/40 text-sky-400 font-black shadow-[0_0_8px_rgba(56,189,248,0.06)]';
      case 'emerald':
        return 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 font-black shadow-[0_0_8px_rgba(16,185,129,0.06)]';
      case 'amber':
        return 'bg-amber-950/20 border-amber-500/40 text-amber-400 font-black shadow-[0_0_8px_rgba(245,158,11,0.06)]';
      case 'red':
        return 'bg-[#da291c]/20 border-[#da291c]/50 text-[#da291c] font-black shadow-[0_0_8px_rgba(218,41,28,0.08)]';
      default:
        return 'bg-[#303030] border-[#505050] text-white font-black';
    }
  };

  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 transition-colors font-mono cursor-pointer ${getColors()}`}
    >
      {label}
    </button>
  );
};

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
    <div className="relative rounded-none border border-[#303030]/60 bg-[#121212] mb-4 z-40 shadow-md">
      
      {/* Header bar */}
      <div className="px-3.5 py-2 bg-[#181818] border-b border-[#303030]/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-[#da291c] rounded-none shrink-0" />
          <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#da291c]" />
            <span>ตัวกรองตารางวิเคราะห์ความถี่ (MATRIX / HEATMAP FILTERS)</span>
          </div>
        </div>

        {/* Clear and Status */}
        <div className="flex items-center gap-2">
          {isFilterActive && (
            <span className="px-2 py-0.5 rounded-none text-[9px] font-black font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {effectiveActiveCount} ตัวกรองทำงานอยู่
            </span>
          )}

          {isFilterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-none border text-[#da291c] bg-[#da291c]/5 hover:bg-[#da291c]/15 border-[#da291c]/40 hover:border-[#da291c] font-mono transition-colors cursor-pointer"
              title="ล้างตัวกรองของตารางทั้งหมด"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_320px_minmax(320px,1.5fr)] gap-[1px] bg-[#303030]/50 relative z-20">
        
        {/* COLUMN 1: SCOPE & DISPLAY OPTIONS */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <MousePointer2 className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              การจัดสรรและตัวเลือกแสดงผล
            </span>
          </div>

          {/* Allocation */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              การจัดสรรเงิน (Need / Want)
            </span>
            <div className="flex rounded-none p-0.5 border bg-[#121212] border-[#303030]">
              <SegmentButton 
                label="ทั้งหมด" 
                active={allocationFilter === 'ALL'} 
                onClick={() => setFilters(prev => ({ ...prev, allocationFilter: 'ALL' }))} 
              />
              <SegmentButton 
                label="Need" 
                active={allocationFilter === 'need'} 
                onClick={() => setFilters(prev => ({ ...prev, allocationFilter: 'need' }))} 
                colorScheme="rose" 
              />
              <SegmentButton 
                label="Want" 
                active={allocationFilter === 'want'} 
                onClick={() => setFilters(prev => ({ ...prev, allocationFilter: 'want' }))} 
                colorScheme="sky" 
              />
            </div>
          </div>

          {/* Display Toggles */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFixedCosts}
                className={`flex-1 flex items-center justify-between px-2.5 py-1.5 border rounded-none text-[10px] font-mono font-bold transition-all select-none cursor-pointer ${
                  includeFixedCosts
                    ? 'bg-amber-950/30 border-amber-500/60 text-amber-300'
                    : 'bg-[#121212] border-[#303030] text-slate-400 hover:text-slate-200 hover:border-[#444444]'
                }`}
                title="สลับการรวม ค่าเช่า/ค่าหอพัก ค่าน้ำ ค่าไฟ ค่าเน็ต"
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>รวมค่าหอ/น้ำ/ไฟ/เน็ต</span>
                </div>
                <div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none ${
                  includeFixedCosts ? 'bg-amber-500 border-amber-500 text-black' : 'border-[#404040] bg-[#181818]'
                }`}>
                  {includeFixedCosts && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={toggleHideZeroDays}
                className={`flex-1 flex items-center justify-between px-2.5 py-1.5 border rounded-none text-[10px] font-mono font-bold transition-all select-none cursor-pointer ${
                  hideZeroDays
                    ? 'bg-[#da291c]/20 border-[#da291c]/60 text-[#da291c]'
                    : 'bg-[#121212] border-[#303030] text-slate-400 hover:text-slate-200 hover:border-[#444444]'
                }`}
                title="ซ่อนแถววันที่ไม่มียอดใช้จ่ายในเดือนนี้"
              >
                <div className="flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>ซ่อนวันไม่มียอดใช้จ่าย</span>
                </div>
                <div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none ${
                  hideZeroDays ? 'bg-[#da291c] border-[#da291c] text-white' : 'border-[#404040] bg-[#181818]'
                }`}>
                  {hideZeroDays && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            * ควบคุมการรวมค่าคงที่และการซ่อนแถววันว่างในตารางความถี่
          </div>
        </div>

        {/* COLUMN 2: DAY TYPE */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2.5 relative z-30">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              ตัวกรองประเภทวัน (Day Type)
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              กรองตามวันทำงาน / วันหยุด
            </span>
            <div className="flex rounded-none p-0.5 border bg-[#121212] border-[#303030]">
              <SegmentButton 
                label="ทุกวัน" 
                active={dayTypeFilter === 'ALL'} 
                onClick={() => setFilters(prev => ({ ...prev, dayTypeFilter: 'ALL' }))} 
              />
              <SegmentButton 
                label="วันทำงาน" 
                active={dayTypeFilter === 'WEEKDAY'} 
                onClick={() => setFilters(prev => ({ ...prev, dayTypeFilter: 'WEEKDAY' }))} 
                colorScheme="emerald" 
              />
              <SegmentButton 
                label="วันหยุด" 
                active={dayTypeFilter === 'WEEKEND'} 
                onClick={() => setFilters(prev => ({ ...prev, dayTypeFilter: 'WEEKEND' }))} 
                colorScheme="amber" 
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            * กรองแถววันที่ในตารางความถี่ตามประเภทวันทำงานหรือวันหยุด
          </div>
        </div>

        {/* COLUMN 3: CATEGORY MATRIX */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2.5 relative z-30">
          <div className="flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              จำแนกตามกลุ่ม / หมวดหมู่ในตาราง
            </span>
          </div>

          <div className="flex flex-col gap-1 relative z-50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              เลือกหมวดหมู่คอลัมน์ (2-Tier Matrix)
            </span>
            <CategoryMatrixFilter
              categories={categories}
              cashflowGroups={cashflowGroups}
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
              activeCategoryNames={filterActiveCatNames}
              typeFilter="EXPENSE"
            />
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            * หมวดหมู่ที่ไม่มีข้อมูลและค่าหอพักจะถูกติ๊กออกตามค่าเริ่มต้น และสามารถติ๊กเลือกเพิ่มได้อิสระ
          </div>
        </div>

      </div>

      {/* Active summary bottom bar */}
      {isFilterActive && (
        <div className="flex items-center justify-between border-t border-[#303030]/60 p-2.5 px-3.5 bg-[#121212]/50 relative z-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#da291c]" />
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                ตัวกรองตารางที่ทำงานอยู่:
              </span>
              <span className="px-2 py-0.5 rounded-none text-[10px] font-black bg-[#121212] border border-[#da291c]/30 text-[#cbd5e1] font-mono">
                {effectiveActiveCount} active
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-[10.5px] font-black uppercase px-3 py-1 rounded-none border text-[#da291c] bg-[#da291c]/5 hover:bg-[#da291c]/10 border-[#da291c]/30 hover:border-[#da291c] font-mono cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            ล้างการคัดกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
