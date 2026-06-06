import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Star, Search, SlidersHorizontal, RotateCcw, X, ChevronDown } from 'lucide-react';
import { hexToRgb } from '../../utils/formatters';

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
  className = ""
}) {
  const dm = true;
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local fallback filters if parent doesn't manage them
  const [localCatFilter, setLocalCatFilter] = useState('ALL');
  const activeCatFilter = suggCatFilter !== undefined ? suggCatFilter : localCatFilter;
  const setActiveCatFilter = setSuggCatFilter !== undefined ? setSuggCatFilter : setLocalCatFilter;

  // Popover state and ref for click-outside detection
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef(null);

  const [allocationFilter, setAllocationFilter] = useState('ALL');
  const [amountFilter, setAmountFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('frequent');
  
  // Default limitCount to 10
  const [limitCount, setLimitCount] = useState('10');

  // Mouse hover states for dynamic category coloring and list-item glowing
  const [hoveredChipId, setHoveredChipId] = useState(null);
  const [hoveredItemKey, setHoveredItemKey] = useState(null);

  // Reset filters when formType (income/expense) changes
  useEffect(() => {
    setActiveCatFilter('ALL');
    setSearchQuery('');
    setAllocationFilter('ALL');
    setAmountFilter('ALL');
    setSortBy('frequent');
    setLimitCount('10');
    setShowFilterMenu(false);
  }, [formType]);

  // Click-Outside Listener to close the filters popover
  useEffect(() => {
    if (!showFilterMenu) return;
    const handler = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterMenu]);

  // Compute active filters count (excluding defaults)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeCatFilter !== 'ALL') count++;
    if (allocationFilter !== 'ALL' && formType === 'expense') count++;
    if (amountFilter !== 'ALL') count++;
    if (sortBy !== 'frequent') count++;
    if (limitCount !== '10') count++;
    return count;
  }, [activeCatFilter, allocationFilter, amountFilter, sortBy, limitCount, formType]);

  // Filter Categories by Form Type
  const activeCategories = useMemo(() => {
    return categories.filter(c => c.type === formType);
  }, [categories, formType]);

  // Handle suggestion filtering logic
  const quickSuggestions = useMemo(() => {
    let sourceItems = [...frequentItems];

    // 1. Filter by Form Type (Income/Expense/Savings)
    sourceItems = sourceItems.filter(s => {
      const c = catMap[s.categoryId] || categories.find(cat => cat.id === s.categoryId || cat.name === s.categoryName);
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

    // 3. Filter by Category
    if (activeCatFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => String(s.categoryId) === String(activeCatFilter));
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
  }, [frequentItems, catMap, formType, searchQuery, activeCatFilter, allocationFilter, amountFilter, sortBy, limitCount, categories]);

  const handleResetAll = () => {
    setActiveCatFilter('ALL');
    setSearchQuery('');
    setAllocationFilter('ALL');
    setAmountFilter('ALL');
    setSortBy('frequent');
    setLimitCount('10');
  };

  const tokens = {
    input: "w-full px-3 py-2 text-sm border rounded-sm outline-none focus:ring-1 transition-colors bg-[#181818] border-[#3e3e3e] text-white focus:border-[#da291c] focus:ring-[#da291c]/30",
    select: "w-full px-2 py-1 text-xs border rounded-sm outline-none bg-[#181818] border-[#3e3e3e] text-slate-200 focus:border-[#da291c] focus:ring-[#da291c]/30 cursor-pointer",
    searchIcon: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400",
    label: "block text-[10px] font-black uppercase text-slate-400 tracking-wide mb-1",
    filterTab: "py-1 text-[10px] font-bold text-center border border-transparent transition-all duration-75 hover:bg-[#303030]/20 hover:text-white cursor-pointer rounded-none",
    filterTabActive: "py-1 text-[10px] font-black text-center border transition-all duration-75 cursor-pointer rounded-none",
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <h4 className="shrink-0 font-bold text-sm flex items-center gap-2 mb-3 text-slate-300">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" /> 
        Quick Suggestions {quickSuggestions.length > 0 && `(${quickSuggestions.length})`}
      </h4>
      
      {/* Filtering Inputs Section */}
      <div className="space-y-2 mb-3 shrink-0 relative z-30" ref={filterMenuRef}>
        {/* Search & Collapse Toggle */}
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
            type="button"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`px-3 py-1.5 flex items-center justify-center gap-1.5 border text-xs font-bold transition-all duration-75 rounded-none relative select-none ${
              showFilterMenu 
                ? 'bg-[#da291c] border-[#da291c] text-white shadow-md' 
                : 'bg-[#181818] border-[#3e3e3e] text-slate-200 hover:bg-[#303030]'
            }`}
            title="ตัวกรองเพิ่มเติม"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ตัวกรอง</span>
            {activeFiltersCount > 0 && (
              <span className={`px-1.5 rounded-full text-[9px] ${showFilterMenu ? 'bg-[#303030] text-[#da291c]' : 'bg-[#da291c] text-white'}`}>
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown Filter Panel (MainChart style) */}
        {showFilterMenu && (
          <div className="absolute right-0 top-full mt-2 w-[320px] max-w-[90vw] rounded-none shadow-2xl border z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 bg-[#1c1c1c] border-[#3e3e3e] shadow-black/80 p-4 space-y-3">
            {/* Popover Header */}
            <div className="pb-2 border-b border-[#303030] flex items-center gap-1.5 text-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#da291c]" />
              <span className="text-[10px] font-black uppercase tracking-wide">ตัวกรองคำแนะนำ</span>
            </div>

            {/* Category Quick Chips */}
            <div>
              <span className={tokens.label}>หมวดหมู่</span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                <button
                  type="button"
                  onClick={() => setActiveCatFilter('ALL')}
                  className={`px-2 py-0.5 text-[10px] font-bold border transition-all duration-75 ${
                    activeCatFilter === 'ALL'
                      ? 'border-[#da291c] bg-[#da291c]/10 text-white font-extrabold'
                      : 'border-[#3e3e3e] bg-[#181818] text-slate-400 hover:text-slate-200 hover:border-[#da291c]/50 hover:bg-[#da291c]/5'
                  }`}
                >
                  ทุกหมวดหมู่
                </button>
                {activeCategories.map(c => {
                  const isActive = String(activeCatFilter) === String(c.id);
                  const isHovered = hoveredChipId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setHoveredChipId(c.id)}
                      onMouseLeave={() => setHoveredChipId(null)}
                      onClick={() => setActiveCatFilter(c.id)}
                      style={{
                        borderColor: isActive ? c.color : (isHovered ? `rgba(${hexToRgb(c.color)}, 0.5)` : '#3e3e3e'),
                        backgroundColor: isActive 
                          ? `rgba(${hexToRgb(c.color)}, 0.15)` 
                          : (isHovered ? `rgba(${hexToRgb(c.color)}, 0.05)` : '#181818'),
                        color: isActive ? '#fff' : (isHovered ? '#fff' : 'rgba(203, 213, 225, 0.8)')
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold border transition-all duration-75 flex items-center gap-1 rounded-none cursor-pointer"
                    >
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allocation Type (Only Expense) */}
            {formType === 'expense' && (
              <div>
                <span className={tokens.label}>ประเภทการจัดสรร (Allocation Type)</span>
                <div className="grid grid-cols-4 gap-1 bg-[#141414] border border-[#303030] p-0.5">
                  {[
                    { val: 'ALL', label: 'ทั้งหมด', color: 'border-slate-500 text-slate-300 bg-slate-800/20' },
                    { val: 'need', label: 'NEED', color: 'border-rose-500/50 text-rose-400 bg-rose-950/20' },
                    { val: 'want', label: 'WANT', color: 'border-sky-500/50 text-sky-400 bg-sky-950/20' },
                    { val: 'savings', label: 'SAVE', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20' }
                  ].map(opt => {
                    const isActive = allocationFilter === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setAllocationFilter(opt.val)}
                        className={isActive ? `${tokens.filterTabActive} ${opt.color}` : `${tokens.filterTab} text-slate-400`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount Tiers */}
            <div>
              <span className={tokens.label}>ช่วงจำนวนเงิน</span>
              <div className="grid grid-cols-5 gap-1 bg-[#141414] border border-[#303030] p-0.5">
                {[
                  { val: 'ALL', label: 'ทั้งหมด', activeClass: 'border-slate-500 text-white bg-slate-800/30', inactiveClass: 'text-slate-500 hover:text-slate-300' },
                  { val: 'under100', label: '<100฿', activeClass: 'border-slate-600 text-slate-300 bg-slate-800/20', inactiveClass: 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40' },
                  { val: '100to500', label: '100-500฿', activeClass: 'border-emerald-500/70 text-emerald-400 bg-emerald-950/20', inactiveClass: 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/10' },
                  { val: '500to2000', label: '500-2K฿', activeClass: 'border-amber-500/70 text-amber-400 bg-amber-950/20', inactiveClass: 'text-slate-500 hover:text-amber-400 hover:bg-amber-950/10' },
                  { val: 'over2000', label: '>2K฿', activeClass: 'border-[#da291c] text-[#da291c] bg-[#da291c]/10', inactiveClass: 'text-slate-500 hover:text-[#da291c] hover:bg-[#da291c]/5' }
                ].map(opt => {
                  const isActive = amountFilter === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setAmountFilter(opt.val)}
                      className={`${tokens.filterTab} ${isActive ? opt.activeClass + ' border-current' : opt.inactiveClass}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Order & Results Limit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={tokens.label}>เรียงลำดับ</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className={tokens.select}
                >
                  <option value="frequent">🔥 ยอดนิยม (จำนวนครั้ง)</option>
                  <option value="recent">🕒 ล่าสุด (ตามวันที่บันทึก)</option>
                  <option value="amountDesc">💸 จากแพงไปถูก (มาก ➔ น้อย)</option>
                  <option value="amountAsc">🪙 จากถูกไปแพง (น้อย ➔ มาก)</option>
                  <option value="alphabetical">🔤 ตามตัวอักษร (A-Z)</option>
                </select>
              </div>

              <div>
                <span className={tokens.label}>จำนวนผลลัพธ์</span>
                <select
                  value={limitCount}
                  onChange={e => setLimitCount(e.target.value)}
                  className={tokens.select}
                >
                  <option value="10">10 รายการ</option>
                  <option value="25">25 รายการ</option>
                  <option value="50">50 รายการ</option>
                  <option value="100">100 รายการ</option>
                  <option value="ALL">ทั้งหมด</option>
                </select>
              </div>
            </div>

            {/* Clear All Filters */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase transition-all duration-75 rounded-none border border-[#3e3e3e] bg-[#1c1c1c] text-slate-400 hover:text-white hover:bg-[#303030]/50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                <span>รีเซ็ตตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 relative z-10">
        {quickSuggestions.length === 0 ? (
          <p className="text-xs text-center py-10 text-slate-500 font-medium">
            ไม่พบคำแนะนำที่ตรงกับตัวกรอง
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {quickSuggestions.map((s, idx) => {
              const catObj = catMap[s.categoryId] || catMap[s.categoryName] || categories.find(c => c.id === s.categoryId || c.name === s.categoryName);
              const catColor = catObj?.color || '#cbd5e1';
              const bgAlpha = dm ? 0.2 : 0.15;
              
              // Allocation Bar Color
              const allocColor = s.allocation_type === 'need' ? '#f43f5e' :
                                 s.allocation_type === 'want' ? '#38bdf8' :
                                 '#34d399';

              const itemKey = `${s.categoryId}-${s.description}-${s.amount}-${idx}`;
              const isHovered = hoveredItemKey === itemKey;

              return (
                <button 
                  type="button" 
                  key={itemKey} 
                  onMouseEnter={() => setHoveredItemKey(itemKey)}
                  onMouseLeave={() => setHoveredItemKey(null)}
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
                    
                    <div className="flex flex-col items-start min-w-0 overflow-hidden leading-tight">
                      <span className="text-xs font-bold truncate w-full group-hover:text-white transition-colors">
                        {s.description || catObj?.name || 'อื่นๆ'}
                      </span>
                      <span className="text-[9px] font-bold truncate w-full mt-0.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                        {catObj?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pl-2 w-24 shrink-0 border-l border-[#303030]/60">
                    <span className={`text-[12px] font-black ${formType === 'expense' ? 'text-red-400 group-hover:text-red-300' : 'text-emerald-400 group-hover:text-emerald-300'} transition-colors`}>
                      {s.amount}฿
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                      {s.count}x
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
