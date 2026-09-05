import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Star, Search, SlidersHorizontal, RotateCcw, X, ChevronDown, Check } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../utils/formatters';

const ALLOC_COLORS = {
  need: '#f43f5e',
  want: '#38bdf8',
  savings: '#34d399'
};

export default function QuickSuggest({
  transactions,
  categories,
  catMap,
  formType,
  suggCatFilter,
  setSuggCatFilter,
  onApplySuggestion,
  isProcessing,
  frequentItems = [],
  className = "",
  cashflowGroups = []
}) {
  const dm = true;
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local category filter array for multi-category selection
  const [localCatIds, setLocalCatIds] = useState([]);
  
  // Normalize selected category IDs from prop or local state
  const selectedCatIds = useMemo(() => {
    const raw = suggCatFilter !== undefined ? suggCatFilter : localCatIds;
    if (Array.isArray(raw)) return raw;
    if (!raw || raw === 'ALL') return [];
    return [raw];
  }, [suggCatFilter, localCatIds]);

  const setSelectedCatIds = (updater) => {
    if (setSuggCatFilter !== undefined) {
      setSuggCatFilter(prev => {
        const current = Array.isArray(prev) ? prev : (!prev || prev === 'ALL' ? [] : [prev]);
        return typeof updater === 'function' ? updater(current) : updater;
      });
    } else {
      setLocalCatIds(updater);
    }
  };

  const handleToggleCategory = (catId) => {
    setSelectedCatIds(prev => {
      const exists = prev.some(id => String(id) === String(catId));
      if (exists) {
        return prev.filter(id => String(id) !== String(catId));
      } else {
        return [...prev, catId];
      }
    });
  };

  // Selected cashflow group in Tier 1 (null means no specific group expanded)
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Accordion / Modal drawer state and refs for click-outside
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterOverlayRef = useRef(null);
  const filterButtonRef = useRef(null);

  const [allocationFilter, setAllocationFilter] = useState('ALL');
  const [amountFilter, setAmountFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('frequent');
  
  // Default limitCount to 10
  const [limitCount, setLimitCount] = useState('10');

  // Mouse hover states for dynamic category coloring and list-item glowing
  const [hoveredChipId, setHoveredChipId] = useState(null);
  const [hoveredItemKey, setHoveredItemKey] = useState('');

  // Reset filters when formType (income/expense) changes
  useEffect(() => {
    setSelectedGroup(null);
    setSelectedCatIds([]);
    setSearchQuery('');
    setAllocationFilter('ALL');
    setAmountFilter('ALL');
    setSortBy('frequent');
    setLimitCount('10');
    setShowFilterMenu(false);
  }, [formType]);

  // Click-Outside Listener to close floating overlay filter
  useEffect(() => {
    if (!showFilterMenu) return;
    const handleClickOutside = (e) => {
      if (
        filterOverlayRef.current && 
        !filterOverlayRef.current.contains(e.target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(e.target)
      ) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  // Compute active filters count (excluding defaults)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCatIds.length > 0) {
      count += selectedCatIds.length;
    } else if (selectedGroup !== null && selectedGroup !== 'ALL') {
      count += 1;
    }
    if (allocationFilter !== 'ALL' && formType === 'expense') count++;
    if (amountFilter !== 'ALL') count++;
    if (sortBy !== 'frequent') count++;
    if (limitCount !== '10') count++;
    return count;
  }, [selectedGroup, selectedCatIds, allocationFilter, amountFilter, sortBy, limitCount, formType]);

  // Filter Categories by Form Type
  const activeCategories = useMemo(() => {
    return categories.filter(c => c.type === formType);
  }, [categories, formType]);

  // Derive active groups for Tier 1
  const activeGroups = useMemo(() => {
    if (cashflowGroups && cashflowGroups.length > 0) {
      const filtered = cashflowGroups.filter(g => g.type === formType);
      if (filtered.length > 0) {
        return [...filtered].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
      }
    }
    const groupDict = {};
    activeCategories.forEach(cat => {
      const g = catMap[cat.id]?._group || cat._group;
      if (g && g.id) {
        groupDict[g.id] = g;
      } else if (cat.cashflowGroup) {
        groupDict[cat.cashflowGroup] = {
          id: cat.cashflowGroup,
          name: cat.cashflowGroup,
          icon: '📁',
          type: cat.type
        };
      }
    });
    return Object.values(groupDict).sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  }, [cashflowGroups, activeCategories, catMap, formType]);

  // Derive categories for Tier 2 based on selectedGroup
  const groupCategories = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'ALL') {
      return [];
    }
    return activeCategories.filter(c => {
      const gId = c.cashflowGroup || catMap[c.id]?._group?.id || c._group?.id;
      return String(gId) === String(selectedGroup);
    });
  }, [activeCategories, selectedGroup, catMap]);

  // Active Category Objects (for quick chip summary)
  const selectedCatObjs = useMemo(() => {
    return selectedCatIds.map(id => {
      return catMap[id] || categories.find(c => String(c.id) === String(id)) || { id, name: String(id), icon: '📌' };
    });
  }, [selectedCatIds, catMap, categories]);

  // Active Group Name (for quick chip summary)
  const activeGroupObj = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'ALL') return null;
    return activeGroups.find(g => String(g.id) === String(selectedGroup));
  }, [selectedGroup, activeGroups]);

  // Handle suggestion filtering logic
  const quickSuggestions = useMemo(() => {
    let sourceItems = [...frequentItems];

    // 1. Filter by Form Type (Income/Expense/Savings)
    sourceItems = sourceItems.filter(s => {
      const c = catMap[s.categoryId] || categories.find(cat => cat.id == s.categoryId || cat.name === s.categoryName);
      return c?.type === formType;
    });

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sourceItems = sourceItems.filter(s => 
        (s.description || '').toLowerCase().includes(q) || 
        (s.categoryName || '').toLowerCase().includes(q) ||
        String(s.amount).includes(q)
      );
    }

    // 3. Filter by Category or Group
    if (selectedCatIds.length > 0) {
      sourceItems = sourceItems.filter(s => 
        selectedCatIds.some(id => String(id) === String(s.categoryId))
      );
    } else if (selectedGroup !== null && selectedGroup !== 'ALL') {
      sourceItems = sourceItems.filter(s => {
        const c = catMap[s.categoryId] || categories.find(cat => cat.id == s.categoryId || cat.name === s.categoryName);
        const gId = c?.cashflowGroup || c?._group?.id || catMap[s.categoryId]?._group?.id;
        return String(gId) === String(selectedGroup);
      });
    }

    // 4. Filter by Allocation Type (Only relevant for expenses)
    if (formType === 'expense' && allocationFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => s.allocation_type === allocationFilter);
    }

    // 5. Filter by Amount Range
    if (amountFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => {
        const amt = Number(s.amount);
        if (amountFilter === 'under100') return amt < 100;
        if (amountFilter === '100to500') return amt >= 100 && amt <= 500;
        if (amountFilter === '500to2000') return amt > 500 && amt <= 2000;
        if (amountFilter === 'over2000') return amt > 2000;
        return true;
      });
    }

    // 6. Apply Sorting
    sourceItems.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.lastDate) - new Date(a.lastDate);
      }
      if (sortBy === 'amountDesc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amountAsc') {
        return a.amount - b.amount;
      }
      if (sortBy === 'alphabetical') {
        return (a.description || '').localeCompare(b.description || '');
      }
      // Default: 'frequent' (by count descending, then by lastDate descending)
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return new Date(b.lastDate) - new Date(a.lastDate);
    });

    // 7. Apply Limit
    if (limitCount !== 'ALL') {
      const limit = Number(limitCount);
      return sourceItems.slice(0, limit);
    }

    return sourceItems;
  }, [frequentItems, catMap, formType, searchQuery, selectedCatIds, selectedGroup, allocationFilter, amountFilter, sortBy, limitCount, categories]);

  const handleResetAll = () => {
    setSelectedGroup(null);
    setSelectedCatIds([]);
    setSearchQuery('');
    setAllocationFilter('ALL');
    setAmountFilter('ALL');
    setSortBy('frequent');
    setLimitCount('10');
  };

  const tokens = {
    input: "w-full px-3 py-1.5 text-xs border rounded-sm outline-none focus:ring-1 transition-colors bg-[#181818] border-[#3e3e3e] text-white focus:border-[#da291c] focus:ring-[#da291c]/30",
    select: "w-full px-2 py-1.5 text-[11px] font-bold border rounded-sm outline-none bg-[#141414] border-[#303030] text-slate-200 focus:border-[#da291c] cursor-pointer",
    searchIcon: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400",
    label: "block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1",
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <h4 className="shrink-0 font-bold text-sm flex items-center gap-2 mb-3 text-slate-300">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" /> 
        Quick Suggestions {quickSuggestions.length > 0 && `(${quickSuggestions.length})`}
      </h4>
      
      {/* Filtering Inputs Section */}
      <div className="space-y-2 mb-3 shrink-0">
        {/* Search & In-line Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="ค้นหาที่เคยบันทึก..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={tokens.input}
            />
            {searchQuery ? (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#303030] text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className={tokens.searchIcon} />
            )}
          </div>

          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`px-3 py-1.5 flex items-center justify-center gap-1.5 border text-xs font-bold transition-all duration-75 rounded-none select-none cursor-pointer ${
              showFilterMenu 
                ? 'bg-[#222222] border-[#da291c] text-white shadow-sm' 
                : activeFiltersCount > 0
                  ? 'bg-[#1e1e1e] border-[#da291c]/70 text-slate-200 hover:bg-[#252525]'
                  : 'bg-[#181818] border-[#3e3e3e] text-slate-300 hover:bg-[#262626] hover:text-white'
            }`}
            title="ตัวกรองเพิ่มเติม"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${showFilterMenu || activeFiltersCount > 0 ? 'text-[#da291c]' : 'text-slate-400'}`} />
            <span>ตัวกรอง</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#da291c] text-white">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showFilterMenu ? 'rotate-180 text-[#da291c]' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Quick Filter Tag Summary (Shows when filter panel is closed but filters are active) */}
        {!showFilterMenu && activeFiltersCount > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {/* Multi-Category Chips */}
            {selectedCatObjs.map(cat => (
              <span 
                key={cat.id} 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border text-[9px] font-bold"
                style={{ 
                  borderColor: `rgba(${hexToRgb(cat.color || '#64748b')}, 0.5)`, 
                  color: cat.color || '#e2e8f0' 
                }}
              >
                <span>{cat.icon || '📌'}</span>
                <span>{cat.name}</span>
                <button 
                  type="button" 
                  onClick={() => handleToggleCategory(cat.id)}
                  className="hover:text-red-400 ml-0.5 cursor-pointer"
                  title={`ลบหมวด ${cat.name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {/* Active Group Chip (Only shown when no specific categories in this group are selected) */}
            {selectedCatObjs.length === 0 && activeGroupObj && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border border-slate-700 text-[9px] font-bold text-slate-300">
                <span>{activeGroupObj.icon || '📁'}</span>
                <span>กลุ่ม: {activeGroupObj.name}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedGroup(null)}
                  className="hover:text-red-400 ml-0.5 cursor-pointer"
                  title="ลบตัวกรองกลุ่ม"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {formType === 'expense' && allocationFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border border-slate-700 text-[9px] font-bold text-slate-300 uppercase">
                <span>{allocationFilter}</span>
                <button 
                  type="button" 
                  onClick={() => setAllocationFilter('ALL')}
                  className="hover:text-red-400 ml-0.5 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {amountFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border border-slate-700 text-[9px] font-bold text-slate-300">
                <span>ช่วงราคา</span>
                <button 
                  type="button" 
                  onClick={() => setAmountFilter('ALL')}
                  className="hover:text-red-400 ml-0.5 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {limitCount !== '10' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1e1e1e] border border-slate-700 text-[9px] font-bold text-slate-300">
                <span>{limitCount === 'ALL' ? 'แสดงทั้งหมด' : `แสดง ${limitCount}`}</span>
                <button 
                  type="button" 
                  onClick={() => setLimitCount('10')}
                  className="hover:text-red-400 ml-0.5 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[9px] text-[#da291c] hover:underline font-bold ml-auto cursor-pointer"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Main Container for Suggestions List and Floating Overlay Filter Window */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* Suggestions List (Always full height, never pushed or shrunk!) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 relative z-10">
          {quickSuggestions.length === 0 ? (
            <p className="text-xs text-center py-10 text-slate-500 font-medium">
              ไม่พบคำแนะนำที่ตรงกับตัวกรอง
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {quickSuggestions.map((s, idx) => {
                const catObj = catMap[s.categoryId] || catMap[s.categoryName] || categories.find(c => c.id == s.categoryId || c.name === s.categoryName);
                const catColor = catObj?.color || '#cbd5e1';
                const bgAlpha = dm ? 0.2 : 0.15;
                
                // Allocation Bar Color
                const allocColor = ALLOC_COLORS[s.allocation_type] || '#34d399';

                const itemKey = `${s.categoryId}-${s.description}-${s.amount}-${idx}`;
                const isHovered = hoveredItemKey === itemKey;

                return (
                  <button 
                    type="button" 
                    key={itemKey} 
                    onMouseEnter={() => setHoveredItemKey(itemKey)}
                    onMouseLeave={() => setHoveredItemKey('')}
                    onClick={() => onApplySuggestion(s)} 
                    disabled={isProcessing}
                    style={{
                      borderColor: isHovered ? `rgba(${hexToRgb(catColor)}, 0.45)` : '#3e3e3e',
                      backgroundColor: isHovered ? `rgba(${hexToRgb(catColor)}, 0.04)` : '#181818',
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-none border transition-all duration-75 relative overflow-hidden text-left text-slate-200 select-none group"
                  >
                    {/* Left Color Accents: Category (wide) + Allocation (narrow) */}
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catColor }} />
                    {s.allocation_type && formType === 'expense' && (
                      <div className="absolute left-1 top-0 bottom-0 w-1" style={{ backgroundColor: allocColor }} title={s.allocation_type.toUpperCase()} />
                    )}
                    
                    <div className="flex items-center flex-1 min-w-0 pl-1.5 gap-2">
                      {/* Icon with colored background */}
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-transform duration-75 group-hover:scale-105"
                        style={{ backgroundColor: `rgba(${hexToRgb(catColor)}, ${bgAlpha})` }}
                      >
                        {catObj?.icon || '📌'}
                      </div>
                      
                      <div className="flex flex-col items-start min-w-0 overflow-hidden leading-tight flex-1">
                        <span className="text-xs font-bold truncate w-full group-hover:text-white transition-colors">
                          {s.description || catObj?.name || 'อื่นๆ'}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-medium truncate w-full mt-0.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                          {catObj?._group?.name && (
                            <>
                              <span className="opacity-75 truncate max-w-[80px]" title={`กลุ่ม: ${catObj._group.name}`}>
                                {catObj._group.name}
                              </span>
                              <span className="opacity-40 text-[8px] select-none">›</span>
                            </>
                          )}
                          <span className="truncate">{catObj?.name || s.categoryName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pl-2 shrink-0 border-l border-[#303030]/60">
                      <span className={`text-xs font-bold tabular-nums tracking-tight ${formType === 'expense' ? 'text-[#f87171] group-hover:text-red-300' : 'text-[#34d399] group-hover:text-emerald-300'} transition-colors`}>
                        {formType === 'expense' ? '-฿' : '+฿'}{formatMoney(s.amount)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                        {s.count}x
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Filter Overlay Modal (หน้าต่างทับมาอีกที ไม่ดันเนื้อหา) */}
        {showFilterMenu && (
          <div 
            ref={filterOverlayRef}
            className="absolute top-0 left-0 right-0 z-30 bg-[#181818] border border-[#3e3e3e] shadow-md shadow-black/40 p-3 flex flex-col justify-between max-h-[85%] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="pb-1.5 border-b border-[#282828] flex items-center justify-between text-slate-300 shrink-0">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#da291c]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white">ตัวกรองคำแนะนำ</span>
                {activeFiltersCount > 0 && (
                  <span className="text-[9px] font-bold text-[#da291c] bg-[#da291c]/10 border border-[#da291c]/30 px-1.5 py-0.2 rounded-none">
                    {activeFiltersCount} ตัวกรอง
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterMenu(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-[#252525] border border-transparent hover:border-[#383838] cursor-pointer"
                title="ปิดหน้าต่างตัวกรอง"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-2.5 pr-0.5">
              {/* 2-Tier Grouped Categories */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={tokens.label}>กลุ่ม & หมวดหมู่</span>
                  {(selectedGroup !== null || selectedCatIds.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(null);
                        setSelectedCatIds([]);
                      }}
                      className="text-[9px] text-[#da291c] hover:underline flex items-center gap-0.5 font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <span>ล้างหมวด {selectedCatIds.length > 0 && `(${selectedCatIds.length})`}</span>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Tier 1: Group Chips (Wrapped into lines, NO horizontal scrollbar, NO "ทุกกลุ่ม" button) */}
                <div className="flex flex-wrap gap-1 text-slate-200">
                  {activeGroups.map(g => {
                    const isGrpActive = selectedGroup === g.id;
                    const selectedCountInGroup = selectedCatIds.filter(catId => {
                      const c = catMap[catId] || categories.find(cat => cat.id == catId);
                      const gId = c?.cashflowGroup || c?._group?.id || catMap[catId]?._group?.id;
                      return String(gId) === String(g.id);
                    }).length;

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (selectedGroup === g.id) {
                            setSelectedGroup(null);
                          } else {
                            setSelectedGroup(g.id);
                          }
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold border transition-all flex items-center gap-1 rounded-none cursor-pointer ${
                          isGrpActive
                            ? 'border-[#da291c] bg-[#da291c]/20 text-white font-black'
                            : selectedCountInGroup > 0
                              ? 'border-slate-500 bg-[#222222] text-slate-200 font-bold'
                              : 'border-[#303030] bg-[#181818] text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {g.icon && <span className="text-[11px]">{g.icon}</span>}
                        <span>{g.name}</span>
                        {selectedCountInGroup > 0 && (
                          <span className="ml-0.5 px-1 py-0.2 rounded-full text-[8px] font-black bg-[#da291c] text-white leading-none">
                            {selectedCountInGroup}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tier 2: Sub-categories ONLY when a specific group is selected (NO "ทุกหมวดในกลุ่มนี้" button) */}
                {selectedGroup !== null && (
                  <div className="mt-1.5 p-1.5 bg-[#121212] border border-[#262626]">
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#222222] text-[9px]">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        {activeGroupObj?.icon && <span>{activeGroupObj.icon}</span>}
                        <span>หมวดในกลุ่ม: <strong className="text-white">{activeGroupObj?.name}</strong></span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const groupCatIds = groupCategories.map(c => c.id);
                            setSelectedCatIds(prev => {
                              const set = new Set([...prev.map(String), ...groupCatIds.map(String)]);
                              return Array.from(set);
                            });
                          }}
                          className="text-slate-400 hover:text-white hover:underline cursor-pointer"
                        >
                          เลือกทั้งหมดในกลุ่ม
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            const groupCatIdSet = new Set(groupCategories.map(c => String(c.id)));
                            setSelectedCatIds(prev => prev.filter(id => !groupCatIdSet.has(String(id))));
                          }}
                          className="text-slate-400 hover:text-red-400 hover:underline cursor-pointer"
                        >
                          ยกเลิกในกลุ่ม
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar w-full">
                      {groupCategories.map(c => {
                        const isCatActive = selectedCatIds.some(id => String(id) === String(c.id));
                        const isHovered = hoveredChipId == c.id;
                        const rgb = hexToRgb(c.color || '#94a3b8');

                        let borderColor = '#333333';
                        let backgroundColor = '#181818';
                        let color = 'rgba(203, 213, 225, 0.85)';

                        if (isCatActive) {
                          borderColor = c.color || '#da291c';
                          backgroundColor = `rgba(${rgb}, 0.25)`;
                          color = '#ffffff';
                        } else if (isHovered) {
                          borderColor = `rgba(${rgb}, 0.5)`;
                          backgroundColor = `rgba(${rgb}, 0.08)`;
                          color = '#ffffff';
                        }

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseEnter={() => setHoveredChipId(c.id)}
                            onMouseLeave={() => setHoveredChipId(null)}
                            onClick={() => handleToggleCategory(c.id)}
                            style={{ borderColor, backgroundColor, color }}
                            className={`px-2 py-0.5 text-[10px] font-bold border transition-all flex items-center gap-1 rounded-none cursor-pointer ${
                              isCatActive ? 'font-black shadow-sm ring-1 ring-white/10' : ''
                            }`}
                          >
                            {isCatActive && <Check className="w-2.5 h-2.5 text-white shrink-0" />}
                            {c.icon && <span className="text-[10px]">{c.icon}</span>}
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Allocation Type (Only Expense) */}
              {formType === 'expense' && (
                <div>
                  <span className={tokens.label}>ประเภทการจัดสรร (ALLOCATION)</span>
                  <div className="grid grid-cols-4 gap-1 bg-[#121212] border border-[#262626] p-0.5">
                    {[
                      { val: 'ALL', label: 'ทั้งหมด', color: 'border-slate-500 text-slate-200 bg-slate-800/30' },
                      { val: 'need', label: 'NEED', color: 'border-rose-500/60 text-rose-400 bg-rose-950/30' },
                      { val: 'want', label: 'WANT', color: 'border-sky-500/60 text-sky-400 bg-sky-950/30' },
                      { val: 'savings', label: 'SAVE', color: 'border-emerald-500/60 text-emerald-400 bg-emerald-950/30' }
                    ].map(opt => {
                      const isActive = allocationFilter === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setAllocationFilter(opt.val)}
                          className={`py-1 text-[10px] font-bold text-center border transition-all cursor-pointer rounded-none ${
                            isActive
                              ? `${opt.color} font-black`
                              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Range & Sort Order (2-Column Compact Row) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={tokens.label}>ช่วงจำนวนเงิน</span>
                  <select
                    value={amountFilter}
                    onChange={e => setAmountFilter(e.target.value)}
                    className={tokens.select}
                  >
                    <option value="ALL">ทั้งหมด (ทุกช่วงราคา)</option>
                    <option value="under100">&lt; 100 ฿</option>
                    <option value="100to500">100 - 500 ฿</option>
                    <option value="500to2000">500 - 2,000 ฿</option>
                    <option value="over2000">&gt; 2,000 ฿</option>
                  </select>
                </div>

                <div>
                  <span className={tokens.label}>เรียงลำดับ</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className={tokens.select}
                  >
                    <option value="frequent">🔥 ยอดนิยม (ความถี่)</option>
                    <option value="recent">🕒 ล่าสุด (วันที่)</option>
                    <option value="amountDesc">💸 แพง ➔ ถูก</option>
                    <option value="amountAsc">🪙 ถูก ➔ แพง</option>
                    <option value="alphabetical">🔤 ตามตัวอักษร</option>
                  </select>
                </div>
              </div>

              {/* Items Display Limit (10, 20, 30, ทั้งหมด) */}
              <div>
                <span className={tokens.label}>จำนวนที่แสดงรายการ</span>
                <div className="grid grid-cols-4 gap-1 bg-[#121212] border border-[#262626] p-0.5">
                  {[
                    { val: '10', label: '10 รายการ' },
                    { val: '20', label: '20 รายการ' },
                    { val: '30', label: '30 รายการ' },
                    { val: 'ALL', label: 'ทั้งหมด' }
                  ].map(opt => {
                    const isActive = limitCount === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setLimitCount(opt.val)}
                        className={`py-1 text-[10px] font-bold text-center border transition-all cursor-pointer rounded-none ${
                          isActive
                            ? 'border-[#da291c] bg-[#da291c]/20 text-white font-black'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#202020]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-2 border-t border-[#282828] flex items-center gap-2 shrink-0">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-white border border-[#3e3e3e] bg-[#1a1a1a] hover:bg-[#252525] flex items-center gap-1 cursor-pointer rounded-none"
                  title="รีเซ็ตตัวกรองทั้งหมด"
                >
                  <RotateCcw className="w-3 h-3 text-red-400" />
                  <span>รีเซ็ต</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilterMenu(false)}
                className="flex-1 py-1.5 px-3 text-xs font-black uppercase tracking-wider text-white bg-[#da291c] hover:bg-red-700 border border-red-600 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer rounded-none transition-colors"
              >
                <span>แสดงผลลัพธ์ ({quickSuggestions.length} รายการ)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
