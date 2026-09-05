import React, { useMemo, useState } from 'react';
import { 
  Building2, Flame, Calendar, EyeOff, RefreshCw, Sparkles, 
  SlidersHorizontal, Check, Layers, ChevronDown, ChevronUp, CheckSquare, Square
} from 'lucide-react';
import { hexToRgb } from '../../../../utils/formatters';
import { EXCLUDED_HEATMAP_CATEGORIES } from '../../hooks/useHeatmapEngine';

// Segment Buttons - Styled to match Ferrari HUD
const SegmentButton = ({ label, active, onClick, colorScheme = 'blue' }) => {
  const getColors = () => {
    if (!active) {
      return 'bg-[#121212] border-[#303030] text-[#888888] hover:text-[#cbd5e1] hover:bg-[#303030]/30';
    }

    switch (colorScheme) {
      case 'rose':
        return 'bg-rose-950/30 border-rose-500/50 text-rose-400 font-black';
      case 'sky':
        return 'bg-sky-950/30 border-sky-500/50 text-sky-400 font-black';
      case 'amber':
        return 'bg-amber-950/30 border-amber-500/50 text-amber-400 font-black';
      case 'emerald':
        return 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 font-black';
      case 'red':
        return 'bg-[#da291c]/25 border-[#da291c]/70 text-[#da291c] font-black';
      default:
        return 'bg-[#303030] border-[#505050] text-white font-black';
    }
  };

  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 transition-colors ${getColors()}`}
    >
      {label}
    </button>
  );
};

export default function HorizontalFilterBar({
  categories = [],
  cashflowGroups = [],
  monthTransactions = [],
  filters = {},
  setFilters,
  clearFilters,
  isFilterActive,
  activeCount
}) {
  const {
    selectedCategories = 'ALL',
    includeFixedCosts = false,
    allocationFilter = 'ALL',
    dayTypeFilter = 'ALL',
    hideZeroDays = false,
  } = filters;

  // Set of category names with transactions in the selected period (monthTransactions)
  const activeExpenseCatNamesInPeriod = useMemo(() => {
    const set = new Set();
    (monthTransactions || []).forEach(t => {
      const cat = categories.find(c => c.name === t.category || c.id === t.category_id);
      if (cat?.type === 'expense' || (!cat?.type && t.category)) {
        set.add(cat?.name || t.category);
      }
    });
    return set;
  }, [monthTransactions, categories]);

  // Filter categories to only expense categories that have transactions in the selected period
  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' && activeExpenseCatNamesInPeriod.has(c.name));
  }, [categories, activeExpenseCatNamesInPeriod]);

  // Map category names to category object
  const catByName = useMemo(() => {
    const map = {};
    expenseCategories.forEach(c => { map[c.name] = c; });
    return map;
  }, [expenseCategories]);

  // Normalized selected category names set (respecting default exclusion of fixed costs)
  const selectedCatNames = useMemo(() => {
    const validNames = new Set(expenseCategories.map(c => c.name));
    if (selectedCategories === 'ALL') {
      return new Set(
        expenseCategories
          .map(c => c.name)
          .filter(name => includeFixedCosts || !EXCLUDED_HEATMAP_CATEGORIES.includes(name))
      );
    }
    if (Array.isArray(selectedCategories)) {
      return new Set(selectedCategories.filter(name => validNames.has(name)));
    }
    return new Set();
  }, [selectedCategories, expenseCategories, includeFixedCosts]);

  const isAllSelected = expenseCategories.length > 0 && selectedCatNames.size === expenseCategories.length;

  // Active expense groups with their sorted categories (2-Tier Structure)
  const groupedCategories = useMemo(() => {
    // 1. Group dict
    const dict = {};
    
    // Initialize groups from cashflowGroups (type === 'expense')
    const expenseGroups = (cashflowGroups || [])
      .filter(g => g.type === 'expense')
      .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

    expenseGroups.forEach(g => {
      dict[g.id] = {
        group: g,
        categories: []
      };
    });

    // Bucket categories into their groups
    const unassignedCats = [];
    expenseCategories.forEach(c => {
      const gId = c.cashflow_group_id || c.cashflowGroup;
      if (gId && dict[gId]) {
        dict[gId].categories.push(c);
      } else {
        unassignedCats.push(c);
      }
    });

    // Filter out empty groups and build array
    const result = Object.values(dict).filter(item => item.categories.length > 0);
    
    // Sort categories inside each group
    result.forEach(item => {
      item.categories.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
    });

    // If there are unassigned categories, create an "อื่นๆ" group
    if (unassignedCats.length > 0) {
      result.push({
        group: { id: 'other', name: 'หมวดหมู่อื่นๆ', icon: '📦', color: '#64748b' },
        categories: unassignedCats
      });
    }

    return result;
  }, [cashflowGroups, expenseCategories]);

  // ── Actions: Toggle Single Category ──
  const handleToggleCategory = (catName) => {
    const currentActive = Array.from(selectedCatNames);
    const isCurrentlyActive = selectedCatNames.has(catName);

    let next;
    if (isCurrentlyActive) {
      // Turn off
      next = currentActive.filter(name => name !== catName);
    } else {
      // Turn on
      next = [...currentActive, catName];
    }

    if (next.length === expenseCategories.length) {
      setFilters(prev => ({
        ...prev,
        selectedCategories: 'ALL',
        includeFixedCosts: true
      }));
    } else {
      const hasAllFixed = EXCLUDED_HEATMAP_CATEGORIES.every(n => next.includes(n));
      setFilters(prev => ({
        ...prev,
        selectedCategories: next,
        includeFixedCosts: hasAllFixed ? true : prev.includeFixedCosts
      }));
    }
  };

  // ── Actions: Toggle Entire Group in Tier 1 ──
  const handleToggleGroup = (groupItem) => {
    const groupCatNames = groupItem.categories.map(c => c.name);
    const allGroupCatsSelected = groupCatNames.every(name => selectedCatNames.has(name));
    const currentActive = Array.from(selectedCatNames);

    let next;
    if (allGroupCatsSelected) {
      // Deselect all categories in this group
      next = currentActive.filter(name => !groupCatNames.includes(name));
    } else {
      // Select all categories in this group
      const set = new Set([...currentActive, ...groupCatNames]);
      next = Array.from(set);
    }

    if (next.length === expenseCategories.length) {
      setFilters(prev => ({
        ...prev,
        selectedCategories: 'ALL',
        includeFixedCosts: true
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        selectedCategories: next
      }));
    }
  };

  const handleSelectAllCategories = () => {
    setFilters(prev => ({
      ...prev,
      selectedCategories: 'ALL',
      includeFixedCosts: true
    }));
  };

  const handleClearAllCategories = () => {
    setFilters(prev => ({
      ...prev,
      selectedCategories: [],
      includeFixedCosts: false
    }));
  };

  const toggleFixedCosts = () => {
    setFilters(prev => {
      const nextInclude = !prev.includeFixedCosts;
      if (prev.selectedCategories === 'ALL') {
        return { ...prev, includeFixedCosts: nextInclude };
      }
      const current = Array.from(selectedCatNames);
      let nextList;
      if (nextInclude) {
        const set = new Set([...current, ...EXCLUDED_HEATMAP_CATEGORIES]);
        nextList = Array.from(set);
      } else {
        nextList = current.filter(n => !EXCLUDED_HEATMAP_CATEGORIES.includes(n));
      }
      return {
        ...prev,
        includeFixedCosts: nextInclude,
        selectedCategories: nextList.length === expenseCategories.length ? 'ALL' : nextList
      };
    });
  };

  const toggleHideZeroDays = () => {
    setFilters(prev => ({ ...prev, hideZeroDays: !prev.hideZeroDays }));
  };

  return (
    <div className="relative rounded-none border border-[#303030]/80 bg-[#121212] mb-4 z-40 shadow-xl overflow-visible">
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
              {activeCount} ตัวกรองทำงานอยู่
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

      {/* ============================================================== */}
      {/* 2-TIER INLINE CATEGORY SELECTOR (โชว์หมด ไม่ต้องเปิด Dropdown) */}
      {/* ============================================================== */}
      <div className="p-3.5 bg-[#141414] border-b border-[#303030]/60 flex flex-col gap-3">
        
        {groupedCategories.length === 0 ? (
          <div className="py-6 px-4 text-center border border-dashed border-[#282828] bg-[#111111]">
            <p className="text-xs font-mono font-bold text-slate-400">
              ไม่มีรายการค่าใช้จ่ายเกิดขึ้นในช่วงเวลาที่เลือก
            </p>
            <p className="text-[10px] font-mono text-slate-600 mt-1">
              หมวดหมู่จะปรากฏที่นี่เมื่อมีบันทึกค่าใช้จ่ายในเดือนหรือช่วงเวลาที่เลือก
            </p>
          </div>
        ) : (
          <>
            {/* Tier 1: Group Quick Selectors */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
                  <Layers className="w-3.5 h-3.5 text-[#da291c]" />
                  <span>ชั้นที่ 1: กลุ่มกระแสเงินสด (CASHFLOW GROUPS)</span>
                  <span className="text-[9px] text-slate-500 font-normal">
                    (คลิกที่กลุ่มเพื่อเลือกหรือปลดทุกหมวดในกลุ่มนั้น)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[9.5px] font-black uppercase font-mono tracking-wider">
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className={`hover:text-[#da291c] transition-colors cursor-pointer ${
                      isAllSelected ? 'text-[#da291c]' : 'text-slate-400'
                    }`}
                  >
                    [เลือกทั้งหมด]
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={handleClearAllCategories}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    [ล้างการเลือก]
                  </button>
                </div>
              </div>

              {/* Group Chips Bar */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {groupedCategories.map(({ group, categories: groupCats }) => {
                  const selectedCount = groupCats.filter(c => selectedCatNames.has(c.name)).length;
                  const isGroupFullySelected = selectedCount === groupCats.length && groupCats.length > 0;
                  const isGroupPartiallySelected = selectedCount > 0 && !isGroupFullySelected;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleToggleGroup({ group, categories: groupCats })}
                      className={`px-2.5 py-1 text-[10.5px] font-bold border transition-all flex items-center gap-1.5 rounded-none cursor-pointer font-mono select-none ${
                        isGroupFullySelected
                          ? 'border-[#da291c] bg-[#da291c]/20 text-white font-black'
                          : isGroupPartiallySelected
                            ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 font-bold'
                            : 'border-[#303030] bg-[#181818] text-slate-400 hover:text-slate-200 hover:border-[#484848]'
                      }`}
                      title={`คลิกเพื่อสลับเลือกหมวดหมู่ทั้งหมดในกลุ่ม ${group.name}`}
                    >
                      <span className="text-xs">{group.icon || '📁'}</span>
                      <span>{group.name}</span>
                      <span className={`ml-0.5 px-1.5 py-0.2 rounded-none text-[9px] font-black tabular-nums leading-none ${
                        isGroupFullySelected
                          ? 'bg-[#da291c] text-white'
                          : isGroupPartiallySelected
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            : 'bg-[#222222] text-slate-500'
                      }`}>
                        {selectedCount}/{groupCats.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier 2: All Sub-Categories (โชว์หมดทุกหมวดหมู่ จัดกลุ่มชัดเจน) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#262626]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <span>ชั้นที่ 2: หมวดหมู่ย่อย (SUB-CATEGORIES) — คลิกเพื่อเปิด/ปิดคอลัมน์ในตาราง</span>
                </span>
                <span className="text-[9.5px] font-mono font-bold text-[#da291c]">
                  แสดงอยู่ {selectedCatNames.size} / {expenseCategories.length} หมวด
                </span>
              </div>

              {/* Group-by-group inline chips container */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 pt-1">
                {groupedCategories.map(({ group, categories: groupCats }) => (
                  <div 
                    key={group.id} 
                    className="flex flex-col md:flex-row md:items-center gap-1.5 p-1.5 px-2 bg-[#181818] border border-[#282828] rounded-none"
                  >
                    {/* Group Title Tag */}
                    <div className="w-auto md:w-36 shrink-0 flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono select-none">
                      <span className="text-xs">{group.icon || '📁'}</span>
                      <span className="truncate">{group.name}</span>
                      <span className="text-slate-600 ml-auto hidden md:inline">›</span>
                    </div>

                    {/* Sub-category chips */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {groupCats.map(cat => {
                        const isCatActive = selectedCatNames.has(cat.name);
                        const rgb = hexToRgb(cat.color || '#94a3b8');

                        return (
                          <button
                            key={cat.id || cat.name}
                            type="button"
                            onClick={() => handleToggleCategory(cat.name)}
                            style={{
                              borderColor: isCatActive ? cat.color : '#303030',
                              backgroundColor: isCatActive ? `rgba(${rgb}, 0.2)` : '#121212'
                            }}
                            className={`px-2 py-1 text-[10.5px] font-mono font-bold border rounded-none transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                              isCatActive 
                                ? 'text-white font-extrabold' 
                                : 'text-slate-500 hover:text-slate-300 hover:border-slate-600'
                            }`}
                            title={`คลิกเพื่อเปิด/ปิดคอลัมน์ "${cat.name}"`}
                          >
                            {/* Checkbox indicator */}
                            <div 
                              className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none shrink-0 transition-colors ${
                                isCatActive 
                                  ? 'text-white' 
                                  : 'border-[#444444] bg-[#1a1a1a]'
                              }`}
                              style={{
                                borderColor: isCatActive ? cat.color : undefined,
                                backgroundColor: isCatActive ? cat.color : undefined
                              }}
                            >
                              {isCatActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>

                            <span>{cat.icon || '🏷️'}</span>
                            <span className="truncate">{cat.name}</span>

                            {/* Color pip */}
                            <span 
                              className="w-1.5 h-2.5 shrink-0 rounded-none ml-0.5 transition-opacity" 
                              style={{ backgroundColor: cat.color, opacity: isCatActive ? 1 : 0.35 }} 
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* ============================================================== */}
      {/* DIMENSION & DISPLAY TOGGLES (แถวล่างสุด) */}
      {/* ============================================================== */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#121212]">
        
        {/* 1. Fixed Cost Toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
            ค่าใช้จ่ายคงที่ (Fixed Costs)
          </span>
          <button
            type="button"
            onClick={toggleFixedCosts}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-none text-[10px] font-mono font-bold transition-all select-none cursor-pointer ${
              includeFixedCosts
                ? 'bg-amber-950/30 border-amber-500/60 text-amber-300'
                : 'bg-[#181818] border-[#303030] text-slate-400 hover:text-slate-200 hover:border-[#444444]'
            }`}
            title="สลับการรวมค่าใช้จ่ายคงที่ เช่น ค่าเช่า/ค่าหอพัก ค่าน้ำ ค่าไฟ ค่าเน็ต"
          >
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>รวมค่าคงที่ (หอ/น้ำ/ไฟ/เน็ต)</span>
            </div>
            <div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none ${
              includeFixedCosts ? 'bg-amber-500 border-amber-500 text-black' : 'border-[#404040] bg-[#121212]'
            }`}>
              {includeFixedCosts && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* 2. Hide Zero Days Toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
            การแสดงผลแถววันที่ (Row Display)
          </span>
          <button
            type="button"
            onClick={toggleHideZeroDays}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-none text-[10px] font-mono font-bold transition-all select-none cursor-pointer ${
              hideZeroDays
                ? 'bg-[#da291c]/20 border-[#da291c]/60 text-[#da291c]'
                : 'bg-[#181818] border-[#303030] text-slate-400 hover:text-slate-200 hover:border-[#444444]'
            }`}
            title="ซ่อนแถววันที่ไม่มียอดใช้จ่ายในเดือนนี้"
          >
            <div className="flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อนวันไม่มียอดใช้จ่าย (Hide Zero Days)</span>
            </div>
            <div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-none ${
              hideZeroDays ? 'bg-[#da291c] border-[#da291c] text-white' : 'border-[#404040] bg-[#121212]'
            }`}>
              {hideZeroDays && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* 3. Allocation (Need / Want) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              การจัดสรร (Need / Want)
            </span>
          </div>
          <div className="flex rounded-none p-0.5 border bg-[#181818] border-[#303030]">
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

        {/* 4. Day Type (Workday / Weekend) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              ประเภทวัน (Day Type)
            </span>
          </div>
          <div className="flex rounded-none p-0.5 border bg-[#181818] border-[#303030]">
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

      </div>
    </div>
  );
}
