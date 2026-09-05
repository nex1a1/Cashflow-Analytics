import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  Layers, Check, Search, X, Sparkles, Folder, Tag, ChevronDown
} from 'lucide-react';
import { hexToRgb } from '../../../../utils/formatters';

export default function CategoryMatrixFilter({
  categories = [],
  cashflowGroups = [],
  selectedCategories = 'ALL', // 'ALL' | string[]
  onChange,
  activeCategoryNames = null, // Set<string> | null
  typeFilter = 'ALL', // 'ALL' | 'INCOME' | 'EXPENSE'
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 1. Available categories based on high-level type filter (income / expense)
  const availableCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    if (typeFilter === 'INCOME') {
      return categories.filter(c => c.type === 'income');
    }
    if (typeFilter === 'EXPENSE') {
      return categories.filter(c => c.type === 'expense');
    }
    return categories;
  }, [categories, typeFilter]);

  const allAvailableNames = useMemo(() => {
    return availableCategories.map(c => c.name);
  }, [availableCategories]);

  // 2. Normalized Set of selected category names
  const selectedCatNames = useMemo(() => {
    if (!selectedCategories || selectedCategories === 'ALL') {
      // If activeCategoryNames is available, default to checking only categories with records ("ถ้าอันไหนไม่มี ก็เอาติ๊กออก")
      if (activeCategoryNames && activeCategoryNames.size > 0) {
        const activeInAvailable = allAvailableNames.filter(name => activeCategoryNames.has(name));
        if (activeInAvailable.length > 0) {
          return new Set(activeInAvailable);
        }
      }
      return new Set(allAvailableNames);
    }
    if (Array.isArray(selectedCategories)) {
      const validNames = new Set(allAvailableNames);
      return new Set(selectedCategories.filter(name => validNames.has(name)));
    }
    if (typeof selectedCategories === 'string' && allAvailableNames.includes(selectedCategories)) {
      return new Set([selectedCategories]);
    }
    return new Set(allAvailableNames);
  }, [selectedCategories, allAvailableNames, activeCategoryNames]);

  const isAllSelected = useMemo(() => {
    return allAvailableNames.length > 0 && selectedCatNames.size === allAvailableNames.length;
  }, [allAvailableNames.length, selectedCatNames.size]);

  const isOnlyActiveSelected = useMemo(() => {
    if (!activeCategoryNames || activeCategoryNames.size === 0) return false;
    const activeNames = allAvailableNames.filter(n => activeCategoryNames.has(n));
    if (activeNames.length === 0) return false;
    return selectedCatNames.size === activeNames.length &&
      activeNames.every(n => selectedCatNames.has(n));
  }, [activeCategoryNames, allAvailableNames, selectedCatNames]);

  const isActive = selectedCategories !== 'ALL';

  // 3. Build 2-Tier Grouped Categories structure
  const groupedCategories = useMemo(() => {
    const dict = {};
    (cashflowGroups || []).forEach(g => {
      dict[g.id] = {
        group: g,
        categories: []
      };
    });

    const unassignedCats = [];
    availableCategories.forEach(c => {
      const gId = c.cashflow_group_id || c.cashflowGroup;
      if (gId && dict[gId]) {
        dict[gId].categories.push(c);
      } else {
        unassignedCats.push(c);
      }
    });

    let result = Object.values(dict).filter(item => item.categories.length > 0);

    // Sort categories within each group
    result.forEach(item => {
      item.categories.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
    });

    // Handle categories with no mapped group
    if (unassignedCats.length > 0) {
      unassignedCats.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
      result.push({
        group: { id: 'other', name: 'หมวดหมู่อื่นๆ', icon: '📦', color: '#64748b' },
        categories: unassignedCats
      });
    }

    // Filter by search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result
        .map(item => {
          const groupMatches = item.group.name?.toLowerCase().includes(q);
          if (groupMatches) return item; // keep all categories in matching group
          return {
            ...item,
            categories: item.categories.filter(c => c.name.toLowerCase().includes(q))
          };
        })
        .filter(item => item.categories.length > 0);
    }

    return result;
  }, [cashflowGroups, availableCategories, searchTerm]);

  // Count active groups that have at least one selected category
  const activeGroupCount = useMemo(() => {
    let count = 0;
    groupedCategories.forEach(item => {
      if (item.categories.some(c => selectedCatNames.has(c.name))) {
        count++;
      }
    });
    return count;
  }, [groupedCategories, selectedCatNames]);

  // 4. Action Handlers
  const handleToggleCategory = (catName) => {
    const nextSet = new Set(selectedCatNames);
    if (nextSet.has(catName)) {
      nextSet.delete(catName);
    } else {
      nextSet.add(catName);
    }
    onChange(Array.from(nextSet));
  };

  const handleToggleGroup = (groupCats) => {
    const groupCatNames = groupCats.map(c => c.name);
    const isGroupFullySelected = groupCatNames.every(name => selectedCatNames.has(name));
    const nextSet = new Set(selectedCatNames);

    if (isGroupFullySelected) {
      // Deselect all categories in this group
      groupCatNames.forEach(name => nextSet.delete(name));
    } else {
      // Select all categories in this group
      groupCatNames.forEach(name => nextSet.add(name));
    }

    onChange(Array.from(nextSet));
  };

  const handleIsolateGroup = (groupCats, e) => {
    if (e) e.stopPropagation();
    const groupCatNames = groupCats.map(c => c.name);
    onChange(groupCatNames);
  };

  const handleSelectAll = () => {
    onChange(allAvailableNames);
  };

  const handleSelectActiveOnly = () => {
    if (!activeCategoryNames || activeCategoryNames.size === 0) {
      onChange('ALL');
      return;
    }
    const activeNames = allAvailableNames.filter(name => activeCategoryNames.has(name));
    onChange(activeNames);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // 5. Trigger Display Label
  const triggerLabel = useMemo(() => {
    if (selectedCategories === 'ALL') {
      return `หมวดหมู่ทั้งหมด (${allAvailableNames.length})`;
    }
    if (selectedCatNames.size === 0) {
      return 'ไม่ได้เลือกหมวดหมู่ (0)';
    }
    if (selectedCatNames.size === allAvailableNames.length) {
      return `เลือกทุกหมวดหมู่ (${allAvailableNames.length})`;
    }
    if (isOnlyActiveSelected) {
      return `เฉพาะที่มีรายการ (${selectedCatNames.size}/${allAvailableNames.length})`;
    }
    if (selectedCatNames.size <= 2) {
      const names = Array.from(selectedCatNames);
      return names.map(n => {
        const cat = availableCategories.find(c => c.name === n);
        return `${cat?.icon || '🏷️'} ${n}`;
      }).join(', ');
    }
    return `เลือกแล้ว ${selectedCatNames.size} หมวด (${activeGroupCount} กลุ่ม)`;
  }, [selectedCategories, allAvailableNames.length, selectedCatNames, isOnlyActiveSelected, availableCategories, activeGroupCount]);

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      
      {/* ── HUD Trigger Button (Matches DatePicker Style in Col 2) ── */}
      <button 
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`relative w-full text-left flex items-center border rounded-none bg-[#121212] cursor-pointer select-none transition-colors ${
          isActive 
            ? 'border-[#da291c] text-white bg-[#121212]' 
            : 'border-[#303030] text-[#888888] hover:border-[#da291c]/40 hover:bg-[#303030]/20'
        }`}
        title="คลิกเพื่อเลือกกลุ่มและหมวดหมู่ย่อย (2-Tier Matrix)"
      >
        <div className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
          isActive ? 'border-[#da291c]/30 text-[#da291c]' : 'border-[#303030] text-[#666666]'
        }`}>
          <Tag className="w-3 h-3" />
        </div>
        
        <div className="w-full text-[11px] font-black py-1 pl-1.5 pr-14 truncate text-[#cbd5e1] font-mono">
          {triggerLabel}
        </div>
        
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0">
          {isActive && (
            <>
              <span className="px-1.5 py-0.2 rounded-none text-[9px] font-black font-mono bg-[#da291c]/20 text-[#da291c] border border-[#da291c]/40 leading-none">
                {selectedCatNames.size}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('ALL');
                }}
                className="p-0.5 rounded-none text-slate-500 hover:text-white hover:bg-[#da291c]/40 transition-colors cursor-pointer"
                title="รีเซ็ตกลับเป็นเลือกทุกหมวดหมู่"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'text-[#da291c]' : 'text-[#666666]'} ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
          </span>
        )}
      </button>

      {/* ── Floating 2-Tier Chips Matrix Popover ── */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[999] rounded-none border border-[#3e3e3e] shadow-2xl p-3 bg-[#181818] select-none flex flex-col gap-2.5"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {/* Section Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-1.5 pb-2 border-b border-[#282828]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#da291c] rounded-none shrink-0" />
              <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
                <Layers className="w-3.5 h-3.5 text-[#da291c]" />
                <span>2-TIER CATEGORY MATRIX</span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-24 sm:w-28 pl-6 pr-5 py-0.5 border rounded-none outline-none text-[10px] font-semibold bg-[#121212] border-[#303030] text-[#cbd5e1] focus:border-[#da291c] placeholder-[#555555]"
                autoFocus
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Quick Select Buttons & Count */}
            <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-[#242424] text-[9.5px] font-black uppercase font-mono tracking-wider">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`hover:text-[#da291c] transition-colors cursor-pointer ${
                    isAllSelected ? 'text-[#da291c] font-black' : 'text-slate-400'
                  }`}
                  title="เลือกทุกหมวดหมู่ (ติ๊กทั้งหมด)"
                >
                  [เลือกทั้งหมด]
                </button>
                <span className="text-slate-700">•</span>
                {activeCategoryNames && activeCategoryNames.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectActiveOnly}
                      className={`hover:text-[#da291c] transition-colors cursor-pointer flex items-center gap-1 ${
                        isOnlyActiveSelected ? 'text-[#da291c] font-black' : 'text-slate-400'
                      }`}
                      title="ติ๊กเฉพาะหมวดที่มีรายการบันทึกในเดือนนี้ (ตัดหมวดที่ไม่มีรายการออก)"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#da291c]" />
                      <span>[เฉพาะที่มีรายการ ({activeCategoryNames.size})]</span>
                    </button>
                    <span className="text-slate-700">•</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`hover:text-rose-400 transition-colors cursor-pointer ${
                    selectedCatNames.size === 0 ? 'text-rose-400 font-black' : 'text-slate-400'
                  }`}
                  title="ล้างการเลือกทั้งหมด"
                >
                  [ล้างการเลือก]
                </button>
              </div>

              <span className="text-slate-500 font-normal">
                เลือก {selectedCatNames.size}/{allAvailableNames.length}
              </span>
            </div>
          </div>

          {groupedCategories.length === 0 ? (
            <div className="py-6 px-4 text-center border border-dashed border-[#282828] bg-[#121212]">
              <p className="text-xs font-mono font-bold text-slate-400">
                ไม่พบหมวดหมู่ที่ค้นหา
              </p>
            </div>
          ) : (
            <>
              {/* Tier 1: Cashflow Groups Chips */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  <span>ชั้นที่ 1: กลุ่มกระแสเงินสด (คลิกเพื่อเลือก/ปลดยกกลุ่ม)</span>
                  <span className="text-slate-500 font-normal">
                    {activeGroupCount} / {groupedCategories.length} กลุ่ม
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {groupedCategories.map(({ group, categories: groupCats }) => {
                    const selectedCount = groupCats.filter(c => selectedCatNames.has(c.name)).length;
                    const isGroupFullySelected = selectedCount === groupCats.length && groupCats.length > 0;
                    const isGroupPartiallySelected = selectedCount > 0 && !isGroupFullySelected;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => handleToggleGroup(groupCats)}
                        className={`px-2 py-0.5 text-[10px] font-bold border transition-all flex items-center gap-1 rounded-none cursor-pointer font-mono select-none ${
                          isGroupFullySelected
                            ? 'border-[#da291c] bg-[#da291c]/20 text-white font-black shadow-[0_0_8px_rgba(218,41,28,0.12)]'
                            : isGroupPartiallySelected
                              ? 'border-amber-500/70 bg-amber-950/25 text-amber-300 font-bold'
                              : 'border-[#303030] bg-[#141414] text-slate-400 hover:text-slate-200 hover:border-[#484848]'
                        }`}
                        title={`คลิกเพื่อสลับเลือกหมวดหมู่ทั้งหมดในกลุ่ม ${group.name}`}
                      >
                        <span className="text-xs shrink-0">{group.icon || '📁'}</span>
                        <span className="truncate max-w-[110px]">{group.name}</span>
                        <span className={`ml-0.5 px-1 rounded-none text-[8.5px] font-black tabular-nums leading-none ${
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

              {/* Tier 2: Sub-categories Matrix */}
              <div className="flex flex-col gap-1 pt-1 border-t border-[#242424]">
                <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  <span>ชั้นที่ 2: หมวดหมู่ย่อย (คลิกเพื่อเปิด/ปิดทีละรายการ)</span>
                  <span className="text-[#da291c] font-bold">
                    เลือก {selectedCatNames.size} / {allAvailableNames.length} หมวด
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {groupedCategories.map(({ group, categories: groupCats }) => (
                    <div 
                      key={group.id} 
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-1 px-1.5 bg-[#141414] border border-[#242424] rounded-none group/row hover:border-[#383838] transition-colors"
                    >
                      {/* Group Title Tag on Left */}
                      <div className="w-auto sm:w-28 shrink-0 flex items-center justify-between gap-1 text-[9.5px] font-black text-slate-400 font-mono select-none">
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-xs shrink-0">{group.icon || '📁'}</span>
                          <span className="truncate">{group.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleIsolateGroup(groupCats, e)}
                            className="opacity-0 group-hover/row:opacity-100 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-[#da291c] transition-opacity cursor-pointer font-mono mr-0.5"
                            title={`เลือกเฉพาะกลุ่ม ${group.name}`}
                          >
                            [เฉพาะ]
                          </button>
                          <span className="text-slate-600 hidden sm:inline">›</span>
                        </div>
                      </div>

                      {/* Sub-category Chips on Right */}
                      <div className="flex flex-wrap items-center gap-1 flex-1">
                        {groupCats.map(cat => {
                          const isCatActive = selectedCatNames.has(cat.name);
                          const rgb = hexToRgb(cat.color || '#94a3b8');

                          return (
                            <button
                              key={cat.id || cat.name}
                              type="button"
                              onClick={() => handleToggleCategory(cat.name)}
                              style={{
                                borderColor: isCatActive ? (cat.color || '#da291c') : '#2c2c2c',
                                backgroundColor: isCatActive ? `rgba(${rgb}, 0.2)` : '#121212'
                              }}
                              className={`px-1.5 py-0.5 text-[10px] font-mono border rounded-none transition-all flex items-center gap-1 select-none cursor-pointer ${
                                isCatActive 
                                  ? 'text-white font-black shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-300 hover:border-slate-600'
                              }`}
                              title={`คลิกเพื่อเปิด/ปิดหมวดหมู่ "${cat.name}"`}
                            >
                              {/* Checkbox indicator */}
                              <div 
                                className={`w-3 h-3 border flex items-center justify-center rounded-none shrink-0 transition-colors ${
                                  isCatActive ? 'text-white' : 'border-[#404040] bg-[#181818]'
                                }`}
                                style={{
                                  borderColor: isCatActive ? (cat.color || '#da291c') : undefined,
                                  backgroundColor: isCatActive ? (cat.color || '#da291c') : undefined
                                }}
                              >
                                {isCatActive && <Check className="w-2 h-2 stroke-[3]" />}
                              </div>

                              <span className="text-xs shrink-0 leading-none">{cat.icon || '🏷️'}</span>
                              <span className="truncate">{cat.name}</span>
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

          {/* Action & Confirmation Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#303030]">
            <span className="text-[10px] font-mono text-slate-400">
              เลือก <span className="text-white font-bold">{selectedCatNames.size}</span> จาก {allAvailableNames.length} หมวดหมู่
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-black uppercase rounded-none border border-[#da291c] bg-[#da291c] text-white hover:bg-[#b81d13] transition-colors shadow-sm font-mono cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>เสร็จสิ้น</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
