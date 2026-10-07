import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Layers, Check, Search, X, Sparkles, Tag, ChevronDown
} from 'lucide-react';
import { hexToRgb } from '../../../../utils/formatters';
import { Category, CashflowGroup, GroupType } from '../../../../types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';

import { tc } from '@/constants/theme';
interface GroupedCategory {
  group: {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    type?: GroupType;
  };
  categories: Category[];
}

interface CategoryMatrixFilterProps {
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  selectedCategories?: 'ALL' | string[];
  onChange: (cats: 'ALL' | string[]) => void;
  activeCategoryNames?: Set<string> | null;
  typeFilter?: string; // 'ALL' | 'INCOME' | 'EXPENSE'
  className?: string;
}

export default function CategoryMatrixFilter({
  categories = [],
  cashflowGroups = [],
  selectedCategories = 'ALL',
  onChange,
  activeCategoryNames = null,
  typeFilter = 'ALL',
  className = ''
}: CategoryMatrixFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on initial open WITHOUT scrolling the viewport
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
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
      return categories.filter(c => (c as any).type === 'income');
    }
    if (typeFilter === 'EXPENSE') {
      return categories.filter(c => (c as any).type === 'expense');
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
    const dict: Record<string, GroupedCategory> = {};
    (cashflowGroups || []).forEach(g => {
      dict[g.id] = {
        group: g,
        categories: []
      };
    });

    const unassignedCats: Category[] = [];
    availableCategories.forEach(c => {
      const gId = c.cashflow_group_id || (c as any).cashflowGroup;
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
        group: { id: 'other', name: 'หมวดหมู่อื่นๆ', icon: 'package', color: tc('ink-muted') },
        categories: unassignedCats
      });
    }

    // Filter by search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
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

  // Income groups run few categories in total, so they share a single condensed row
  // instead of each claiming a full-width row like the denser expense groups.
  const { incomeGroupRows, otherGroupRows } = useMemo(() => {
    const income: GroupedCategory[] = [];
    const other: GroupedCategory[] = [];
    groupedCategories.forEach(item => {
      if (item.group.type === 'income') {
        income.push(item);
      } else {
        other.push(item);
      }
    });
    return { incomeGroupRows: income, otherGroupRows: other };
  }, [groupedCategories]);

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

  // 4. Action Handlers with Scroll Preservation
  const preserveScroll = (action: () => void) => {
    const currentScroll = popoverRef.current?.scrollTop;
    action();
    if (currentScroll !== undefined && popoverRef.current) {
      requestAnimationFrame(() => {
        if (popoverRef.current) {
          popoverRef.current.scrollTop = currentScroll;
        }
      });
    }
  };

  const handleToggleCategory = (catName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      const nextSet = new Set(selectedCatNames);
      if (nextSet.has(catName)) {
        nextSet.delete(catName);
      } else {
        nextSet.add(catName);
      }
      onChange(Array.from(nextSet));
    });
  };

  const handleToggleGroup = (groupCats: Category[], e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
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
    });
  };

  const handleIsolateGroup = (groupCats: Category[], e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      const groupCatNames = groupCats.map(c => c.name);
      onChange(groupCatNames);
    });
  };

  const handleIsolateCategory = (catName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      onChange([catName]);
    });
  };

  const handleSelectAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      onChange(allAvailableNames);
    });
  };

  const handleSelectActiveOnly = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      if (!activeCategoryNames || activeCategoryNames.size === 0) {
        onChange('ALL');
        return;
      }
      const activeNames = allAvailableNames.filter(name => activeCategoryNames.has(name));
      onChange(activeNames);
    });
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    preserveScroll(() => {
      onChange([]);
    });
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
      return (
        <span className="inline-flex items-center gap-1.5">
          {names.map((n, idx) => {
            const cat = availableCategories.find(c => c.name === n);
            return (
              <span key={n} className="inline-flex items-center gap-1 shrink-0">
                <CategoryGlyph icon={cat?.icon} color={cat?.color} size={15} fallbackEmoji="tag" />
                <span>{n}{idx < names.length - 1 ? ',' : ''}</span>
              </span>
            );
          })}
        </span>
      );
    }
    return `เลือกแล้ว ${selectedCatNames.size} หมวด (${activeGroupCount} กลุ่ม)`;
  }, [selectedCategories, allAvailableNames.length, selectedCatNames, isOnlyActiveSelected, availableCategories, activeGroupCount]);

  // 6. Shared Tier-2 category chip renderer (single click toggles, double-click isolates it alone)
  const renderCategoryChip = (cat: Category, isIncome = false) => {
    const isCatActive = selectedCatNames.has(cat.name);
    const activeColor = cat.color || (isIncome ? tc('income') : tc('expense'));
    const rgb = hexToRgb(activeColor);

    return (
      <button
        key={cat.id || cat.name}
        type="button"
        onClick={() => handleToggleCategory(cat.name)}
        onDoubleClick={(e) => handleIsolateCategory(cat.name, e)}
        style={{
          borderColor: isCatActive ? activeColor : tc('line'),
          ['--tint-border-color' as any]: isCatActive ? activeColor : tc('line'),
          backgroundColor: isCatActive ? `rgba(${rgb}, 0.2)` : tc('surface')
        }}
        className={`px-1.5 py-0.5 text-[11px] font-mono border tint-border rounded-pill transition-all flex items-center gap-1 select-none cursor-pointer ${
          isCatActive
            ? 'text-ink-display font-black'
            : isIncome
              ? 'text-income/70 hover:text-income hover:border-income/50'
              : 'text-ink-muted hover:text-ink-display hover:border-line-strong'
        }`}
        title={`คลิก: เปิด/ปิดหมวดหมู่ "${cat.name}" • ดับเบิลคลิก: เลือกเฉพาะหมวดนี้`}
      >
        {/* Checkbox indicator */}
        <div
          className={`w-3 h-3 border tint-border flex items-center justify-center rounded-none shrink-0 transition-colors ${
            isCatActive ? 'text-ink-display' : 'border-line-strong bg-canvas'
          }`}
          style={{
            borderColor: isCatActive ? activeColor : tc('line-strong'),
            ['--tint-border-color' as any]: isCatActive ? activeColor : tc('line-strong'),
            backgroundColor: isCatActive ? activeColor : undefined
          }}
        >
          {isCatActive && <Check className="w-2 h-2 stroke-[3]" />}
        </div>

        <CategoryGlyph
          icon={cat.icon}
          color={cat.color || (isIncome ? tc('income') : undefined)}
          size={15}
          className="shrink-0 leading-none"
          fallbackEmoji="tag"
        />
        <span className="truncate">{cat.name}</span>
      </button>
    );
  };

  // 7. Shared Tier-1 group chip renderer
  const renderGroupChip = (
    group: GroupedCategory['group'],
    groupCats: Category[],
    isIncome = false,
    fullWidth = false
  ) => {
    const selectedCount = groupCats.filter(c => selectedCatNames.has(c.name)).length;
    const isGroupFullySelected = selectedCount === groupCats.length && groupCats.length > 0;
    const isGroupPartiallySelected = selectedCount > 0 && !isGroupFullySelected;

    let buttonStyle = 'border-line bg-surface text-ink-body hover:text-ink-display hover:border-line-strong';
    let badgeStyle = 'bg-surface-hover text-ink-muted';

    if (isIncome) {
      if (isGroupFullySelected) {
        buttonStyle = 'border-income bg-income/25 text-ink-display font-black';
        badgeStyle = 'bg-income text-canvas';
      } else if (isGroupPartiallySelected) {
        buttonStyle = 'border-income/70 bg-income/10 text-income font-bold';
        badgeStyle = 'bg-income/30 text-income border border-income/40';
      } else {
        buttonStyle = 'border-income/60 bg-income/10 text-income/80 hover:text-income hover:border-income/50';
        badgeStyle = 'bg-income/15 text-income';
      }
    } else {
      if (isGroupFullySelected) {
        buttonStyle = 'border-accent-ink bg-accent/20 text-ink-display font-black';
        badgeStyle = 'bg-accent text-on-accent';
      } else if (isGroupPartiallySelected) {
        buttonStyle = 'border-warn/70 bg-warn/10 text-warn font-bold';
        badgeStyle = 'bg-warn/30 text-warn border border-warn/40';
      }
    }

    return (
      <button
        key={group.id}
        type="button"
        onClick={() => handleToggleGroup(groupCats)}
        className={`px-2 py-0.5 rounded-pill text-[11px] font-bold border transition-all flex items-center ${
          fullWidth ? 'w-full justify-between' : ''
        } gap-1 rounded-none cursor-pointer font-mono select-none ${buttonStyle}`}
        title={`คลิกเพื่อสลับเลือกหมวดหมู่ทั้งหมดในกลุ่ม ${group.name}`}
      >
        <div className="flex items-center gap-1 truncate">
          <CategoryGlyph
            icon={group.icon}
            color={group.color || (isIncome ? tc('income') : undefined)}
            size={15}
            className="shrink-0"
            fallbackEmoji="folder"
          />
          <span className="truncate max-w-[110px]">{group.name}</span>
        </div>
        <span className={`ml-0.5 px-1 rounded-none text-[11px] font-black tabular-nums leading-none ${badgeStyle}`}>
          {selectedCount}/{groupCats.length}
        </span>
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      
      {/* ── HUD Trigger Button (Matches DatePicker Style in Col 2) ── */}
      <button 
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`relative w-full text-left flex items-center border rounded-none bg-surface cursor-pointer select-none transition-colors ${
          isActive 
            ? 'border-accent-ink text-ink-display bg-surface' 
            : 'border-line text-ink-body hover:border-accent/40 hover:bg-surface-elevated/20'
        }`}
        title="คลิกเพื่อเลือกกลุ่มและหมวดหมู่ย่อย"
      >
        <div className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
          isActive ? 'border-accent/30 text-accent-ink' : 'border-line text-ink-muted'
        }`}>
          <Tag className="w-3 h-3" />
        </div>
        
        <div className="w-full text-[11px] font-black py-1 pl-1.5 pr-14 truncate text-ink-soft font-mono">
          {triggerLabel}
        </div>

        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-accent"></span>
          </span>
        )}
      </button>

      {/* Count, reset and chevron sit over the button's right edge as SIBLINGS (a button inside a button is
          invalid HTML). The strip ignores the pointer so a click on the count / chevron still opens the menu;
          only the reset button takes clicks. */}
      <div className="absolute right-1.5 top-0 bottom-0 flex items-center gap-1 pointer-events-none">
        {isActive && (
          <>
            <span className="px-1.5 py-0.5 rounded-none text-[11px] font-black font-mono bg-accent/20 text-accent-ink border border-accent/40 leading-none">
              {selectedCatNames.size}
            </span>
            <button
              type="button"
              onClick={() => onChange('ALL')}
              className="pointer-events-auto p-0.5 rounded-none text-ink-muted hover:text-ink-display hover:bg-accent/40 transition-colors cursor-pointer"
              title="รีเซ็ตกลับเป็นเลือกทุกหมวดหมู่"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'text-accent-ink' : 'text-ink-muted'} ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* ── Floating 2-Tier Chips Matrix Popover ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[999] rounded-none border border-line-strong shadow-[0_16px_40px_rgb(0_0_0/calc(0.7*var(--shadow-k)))] p-3 bg-canvas select-none flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto"
        >
          {/* Section Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-1.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-accent rounded-none shrink-0" />
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-ink-soft font-mono">
                <Layers className="w-3.5 h-3.5 text-accent-ink" />
                <span>หมวดหมู่ 2 ระดับ</span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-24 sm:w-28 pl-6 pr-5 py-0.5 border rounded-none outline-none text-[11px] font-semibold bg-surface border-line text-ink-soft focus:border-accent-ink placeholder-ink-muted"
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-display"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Quick Select Buttons & Count */}
            <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-line text-[11px] font-black uppercase font-mono tracking-wider">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`hover:text-accent-ink transition-colors cursor-pointer ${
                    isAllSelected ? 'text-accent-ink font-black' : 'text-ink-body'
                  }`}
                  title="เลือกทุกหมวดหมู่ (ติ๊กทั้งหมด)"
                >
                  [เลือกทั้งหมด]
                </button>
                <span className="text-ink-muted">•</span>
                {activeCategoryNames && activeCategoryNames.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectActiveOnly}
                      className={`hover:text-accent-ink transition-colors cursor-pointer flex items-center gap-1 ${
                        isOnlyActiveSelected ? 'text-accent-ink font-black' : 'text-ink-body'
                      }`}
                      title="ติ๊กเฉพาะหมวดที่มีรายการบันทึกในเดือนนี้ (ตัดหมวดที่ไม่มีรายการออก)"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-accent-ink" />
                      <span>[เฉพาะที่มีรายการ ({activeCategoryNames.size})]</span>
                    </button>
                    <span className="text-ink-muted">•</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`hover:text-danger transition-colors cursor-pointer ${
                    selectedCatNames.size === 0 ? 'text-danger font-black' : 'text-ink-body'
                  }`}
                  title="ล้างการเลือกทั้งหมด"
                >
                  [ล้างการเลือก]
                </button>
              </div>

              <span className="text-ink-muted font-normal">
                เลือก {selectedCatNames.size}/{allAvailableNames.length}
              </span>
            </div>
          </div>

          {groupedCategories.length === 0 ? (
            <div className="py-6 px-4 text-center border border-dashed border-line bg-surface">
              <p className="text-xs font-mono font-bold text-ink-body">
                ไม่พบหมวดหมู่ที่ค้นหา
              </p>
            </div>
          ) : (
            <>
              {/* Tier 1: Cashflow Groups Chips */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">
                  <span>ชั้นที่ 1: กลุ่ม (คลิกเพื่อเลือกหรือเอาออกทั้งกลุ่ม)</span>
                  <span className="text-ink-muted font-normal">
                    {activeGroupCount} / {groupedCategories.length} กลุ่ม
                  </span>
                </div>

                <div className="flex flex-wrap items-stretch gap-1.5">
                  {/* Income Groups (Green Box - Stacked 2 lines) */}
                  {incomeGroupRows.length > 0 && (
                    <div className="flex flex-col justify-center gap-1 p-1 bg-income/10 border border-income/40 rounded-none shrink-0 min-w-[125px]">
                      {incomeGroupRows.map(({ group, categories: groupCats }) =>
                        renderGroupChip(group, groupCats, true, true)
                      )}
                    </div>
                  )}

                  {/* Expense & Savings Groups Box */}
                  {otherGroupRows.length > 0 && (
                    <div className="flex-1 flex flex-wrap items-center content-center gap-1 p-1 bg-surface border border-line rounded-none">
                      {otherGroupRows.map(({ group, categories: groupCats }) =>
                        renderGroupChip(group, groupCats, false)
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tier 2: Sub-categories Matrix */}
              <div className="flex flex-col gap-1 pt-1 border-t border-line">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">
                  <span>ชั้นที่ 2: หมวดหมู่ย่อย (คลิก: เปิด/ปิด • ดับเบิลคลิก: เฉพาะหมวดนั้น)</span>
                  <span className="text-accent-ink font-bold">
                    เลือก {selectedCatNames.size} / {allAvailableNames.length} หมวด
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {/* Income groups in a Green Box split in half (50% / 50%) */}
                  {incomeGroupRows.length > 0 && (
                    <div className={`grid ${
                      incomeGroupRows.length === 1
                        ? 'grid-cols-1'
                        : 'grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-income/30'
                    } bg-income/10 border border-income/40 rounded-none hover:border-income/60 transition-colors`}>
                      {incomeGroupRows.map(({ group, categories: groupCats }) => (
                        <div
                          key={group.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-1 px-2 group/row"
                        >
                          {/* Group Title Tag on Left */}
                          <div className="w-auto sm:w-44 shrink-0 flex items-center justify-between gap-1 text-[11px] font-black text-income font-mono select-none">
                            <div className="flex items-center gap-1 min-w-0">
                              <CategoryGlyph
                                icon={group.icon}
                                color={group.color || tc('income')}
                                size={15}
                                className="shrink-0"
                                fallbackEmoji="folder"
                              />
                              <span className="truncate">{group.name}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleIsolateGroup(groupCats, e)}
                                className="opacity-0 group-hover/row:opacity-100 text-[11px] font-black uppercase tracking-wider text-income/70 hover:text-income transition-opacity cursor-pointer font-mono mr-0.5"
                                title={`เลือกเฉพาะกลุ่ม ${group.name}`}
                              >
                                [เฉพาะ]
                              </button>
                            </div>
                          </div>

                          {/* Sub-category Chips on Right */}
                          <div className="flex flex-wrap items-center gap-1 flex-1">
                            {groupCats.map(cat => renderCategoryChip(cat, true))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {otherGroupRows.map(({ group, categories: groupCats }) => (
                    <div
                      key={group.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-1 px-1.5 bg-surface border border-line rounded-none group/row hover:border-line-strong transition-colors"
                    >
                      {/* Group Title Tag on Left */}
                      <div className="w-auto sm:w-44 shrink-0 flex items-center justify-between gap-1 text-[11px] font-black text-ink-body font-mono select-none">
                        <div className="flex items-center gap-1 min-w-0">
                          <CategoryGlyph icon={group.icon} color={group.color} size={15} className="shrink-0" fallbackEmoji="folder" />
                          <span className="truncate">{group.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleIsolateGroup(groupCats, e)}
                            className="opacity-0 group-hover/row:opacity-100 text-[11px] font-black uppercase tracking-wider text-ink-muted hover:text-accent-ink transition-opacity cursor-pointer font-mono mr-0.5"
                            title={`เลือกเฉพาะกลุ่ม ${group.name}`}
                          >
                            [เฉพาะ]
                          </button>
                        </div>
                      </div>

                      {/* Sub-category Chips on Right */}
                      <div className="flex flex-wrap items-center gap-1 flex-1">
                        {groupCats.map(cat => renderCategoryChip(cat, false))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action & Confirmation Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <span className="text-[11px] font-mono text-ink-body">
              เลือก <span className="text-ink-display font-bold">{selectedCatNames.size}</span> จาก {allAvailableNames.length} หมวดหมู่
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-black uppercase rounded-none border border-accent-ink bg-accent text-on-accent hover:bg-accent-active transition-colors font-mono cursor-pointer"
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
