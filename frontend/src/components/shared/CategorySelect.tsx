// frontend/src/components/shared/CategorySelect.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Zap } from 'lucide-react';
import { Category, CashflowGroup, GroupType, TransactionDisplay, FrequentItem } from '@/types';
import CategoryGlyph from './CategoryGlyph';
import {
  filterAndGroupCategories,
  getTopCategoriesFromTransactions,
  GroupedCategoryList
} from '@/utils/categorySelectHelpers';
import { hexToRgb } from '@/utils/formatters';

export interface CategorySelectProps {
  value?: string | null;
  onChange: (categoryId: string) => void;
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  type?: GroupType | string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'pill';
  size?: 'sm' | 'md';
  onSelectNextFocus?: () => void;
  transactions?: TransactionDisplay[];
  frequentItems?: FrequentItem[];
  id?: string;
}

export default function CategorySelect({
  value,
  onChange,
  categories = [],
  cashflowGroups = [],
  type,
  placeholder = 'เลือกหมวดหมู่...',
  error = false,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'md',
  onSelectNextFocus,
  transactions = [],
  frequentItems = [],
  id
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 360,
    maxHeight: 420
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Fast Category Lookup Map
  const categoryMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [categories]);

  // Fast Group Lookup Map
  const groupMap = useMemo(() => {
    return cashflowGroups.reduce<Record<string, CashflowGroup>>((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [cashflowGroups]);

  // Currently selected category & its parent group
  const selectedCategory = value ? categoryMap[value] : undefined;
  const selectedCategoryGroup = selectedCategory
    ? groupMap[selectedCategory.cashflowGroup || selectedCategory.cashflow_group_id || '']
    : undefined;

  // Available Cashflow Groups for this type (for the Group Ribbon)
  const availableGroups = useMemo(() => {
    const relevantCats = type && type !== 'all'
      ? categories.filter(c => c.type === type)
      : categories;

    const groupIds = new Set(
      relevantCats.map(c => c.cashflowGroup || c.cashflow_group_id || 'other')
    );

    const list = Array.from(groupIds)
      .map(gId => groupMap[gId])
      .filter((g): g is CashflowGroup => Boolean(g));

    return list.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  }, [categories, cashflowGroups, groupMap, type]);

  // Top Frequent Categories for quick picks
  const quickPicks = useMemo(() => {
    if (frequentItems.length > 0) {
      const filtered = frequentItems
        .filter(f => {
          const cat = categoryMap[f.categoryId];
          return cat && (!type || type === 'all' || cat.type === type);
        })
        .map(f => categoryMap[f.categoryId])
        .filter((c): c is Category => Boolean(c));

      // Remove duplicates
      const unique: Category[] = [];
      filtered.forEach(c => {
        if (!unique.some(u => u.id === c.id)) unique.push(c);
      });
      if (unique.length > 0) return unique.slice(0, 5);
    }

    if (transactions.length > 0) {
      return getTopCategoriesFromTransactions(transactions, categories, type || 'expense', 5);
    }

    return [];
  }, [frequentItems, transactions, categories, categoryMap, type]);

  // Filtered and grouped categories
  const groupedCategories: GroupedCategoryList[] = useMemo(() => {
    return filterAndGroupCategories({
      categories,
      cashflowGroups,
      type,
      searchQuery,
      selectedGroupId
    });
  }, [categories, cashflowGroups, type, searchQuery, selectedGroupId]);

  // Flat list of visible categories for keyboard navigation
  const flatCategories = useMemo(() => {
    return groupedCategories.flatMap(g => g.categories);
  }, [groupedCategories]);

  // Calculate & update popover position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = variant === 'default'
      ? Math.max(340, Math.min(rect.width, 460))
      : 360;
    const estimatedHeight = 420;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    let top = rect.bottom + 4;
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    let maxHeight = 420;
    // Flip above if tight below and more space above
    if (spaceBelow < 280 && spaceAbove > spaceBelow) {
      maxHeight = Math.min(estimatedHeight, Math.max(200, spaceAbove));
      top = Math.max(16, rect.top - maxHeight - 4);
    } else {
      maxHeight = Math.min(estimatedHeight, Math.max(200, spaceBelow));
    }

    setCoords({ top, left, width: popoverWidth, maxHeight });
  }, [variant]);

  // Toggle open
  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
    setSearchQuery('');
    setSelectedGroupId('ALL');
    setActiveIndex(-1);
  }, [disabled, updatePosition]);

  // Close and clean up
  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  // Selection handler
  const handleSelect = useCallback((categoryId: string) => {
    onChange(categoryId);
    setOpen(false);
    setSearchQuery('');
    if (onSelectNextFocus) {
      setTimeout(onSelectNextFocus, 20);
    }
  }, [onChange, onSelectNextFocus]);

  // Auto-focus search input on open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // Outside click & scroll listeners
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    const handleWindowResize = () => {
      updatePosition();
    };

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside popover
      if (popoverRef.current?.contains(e.target as Node)) return;
      handleClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, handleClose, updatePosition]);

  // Keyboard navigation inside popover
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatCategories.length === 0) return;
      setActiveIndex(prev => {
        const next = (prev + 1) % flatCategories.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatCategories.length === 0) return;
      setActiveIndex(prev => {
        const next = (prev - 1 + flatCategories.length) % flatCategories.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatCategories.length) {
        handleSelect(flatCategories[activeIndex].id);
      } else if (flatCategories.length === 1) {
        handleSelect(flatCategories[0].id);
      }
    }
  }, [open, flatCategories, activeIndex, handleOpen, handleClose, handleSelect]);

  // Pill variant styles for table cell with lightness boost for legibility
  const pillColor = selectedCategory?.color || (type === 'income' ? '#10b981' : '#f43f5e');
  const pillStyles = useMemo(() => {
    const defaultRgb = '148, 163, 184';
    const rgb = hexToRgb(pillColor || '') || defaultRgb;

    let hex = (pillColor || '#94a3b8').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = 148, g = 163, b = 184;
    if (hex.length === 6) {
      r = Number.parseInt(hex.substring(0, 2), 16);
      g = Number.parseInt(hex.substring(2, 4), 16);
      b = Number.parseInt(hex.substring(4, 6), 16);
    }

    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);

    const targetL = Math.max(l * 100, 65);
    const targetS = Math.max(s, 60);
    const textColor = `hsl(${h}, ${targetS}%, ${targetL}%)`;

    return {
      bg: `rgba(${rgb}, 0.15)`,
      border: `rgba(${rgb}, 0.35)`,
      borderLeft: pillColor,
      textColor
    };
  }, [pillColor]);

  // Allocation Tag Helper
  const renderAllocationBadge = (alloc?: string | null) => {
    if (!alloc) return null;
    let colorClass = 'bg-sky-950/60 text-sky-400 border-sky-800/40';
    let label = 'WANT';
    if (alloc === 'need') {
      colorClass = 'bg-rose-950/60 text-rose-400 border-rose-800/40';
      label = 'NEED';
    } else if (alloc === 'savings') {
      colorClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
      label = 'SAVE';
    }
    return (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-none border shrink-0 ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <>
      {/* 1. TRIGGER BUTTON */}
      {variant === 'pill' ? (
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          className={`category-pill-trigger relative flex items-center justify-between rounded-none border transition-all h-7 w-full overflow-hidden text-left cursor-pointer outline-none focus:ring-1 focus:ring-[#da291c]/50 ${className}`}
          style={{
            backgroundColor: pillStyles.bg,
            borderColor: pillStyles.border,
            borderLeftWidth: '3px',
            borderLeftColor: pillStyles.borderLeft
          }}
          title={selectedCategory ? `หมวดหมู่: ${selectedCategory.name}` : placeholder}
        >
          <div className="w-full flex items-center pl-2 pr-6 py-1 text-xs select-none min-w-0">
            <CategoryGlyph icon={selectedCategory?.icon} color={selectedCategory?.color} size={12} className="shrink-0 mr-1.5" />
            <div className="truncate flex items-center gap-1 min-w-0" style={{ color: pillStyles.textColor }}>
              {selectedCategoryGroup?.name && (
                <>
                  <span className="opacity-60 font-medium text-[11px] truncate max-w-[80px]">
                    {selectedCategoryGroup.name}
                  </span>
                  <span className="opacity-35 text-[10px] select-none">›</span>
                </>
              )}
              <span className="truncate font-extrabold">{selectedCategory?.name || placeholder}</span>
            </div>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-75" style={{ color: pillStyles.textColor }}>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        </button>
      ) : (
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          className={`w-full flex items-center justify-between px-3 rounded-sm border outline-none font-bold text-xs transition-colors cursor-pointer select-none ${
            size === 'sm' ? 'h-8 py-1' : 'h-9 py-2'
          } ${
            error
              ? 'bg-[#181818] border-red-500 text-red-200 focus:ring-1 focus:ring-red-500/30'
              : 'bg-[#181818] border-[#3e3e3e] text-white hover:border-[#da291c] focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedCategory ? (
              <>
                <CategoryGlyph
                  icon={selectedCategory.icon}
                  color={selectedCategory.color}
                  size={14}
                  className="shrink-0"
                />
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  {selectedCategoryGroup?.name && (
                    <>
                      <span className="text-[11px] font-medium text-slate-400 truncate max-w-[100px]">
                        {selectedCategoryGroup.name}
                      </span>
                      <span className="text-[10px] text-slate-600 select-none">›</span>
                    </>
                  )}
                  <span className="text-white font-black truncate">{selectedCategory.name}</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 font-medium">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedCategory?.allocation_type && renderAllocationBadge(selectedCategory.allocation_type)}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </button>
      )}

      {/* 2. FLOATING POPOVER PORTAL */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] bg-[#141414] border border-[#3e3e3e] shadow-[0_16px_40px_rgba(0,0,0,0.95)] rounded-none flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              borderTop: '3px solid #da291c'
            }}
          >
            {/* ZONE 1: SEARCH BAR */}
            <div className="p-2 border-b border-[#282828] bg-[#181818] shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ค้นหาหมวดหมู่ หรือ กลุ่ม..."
                  className="w-full bg-[#101010] border border-[#333333] pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 rounded-none outline-none focus:border-[#da291c] font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ZONE 2: GROUP FILTER RIBBON */}
            {availableGroups.length > 1 && !searchQuery && (
              <div className="px-2 py-1.5 border-b border-[#282828] bg-[#161616] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId('ALL')}
                  className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-none shrink-0 transition-colors ${
                    selectedGroupId === 'ALL'
                      ? 'bg-[#da291c] text-white'
                      : 'bg-[#222222] text-slate-400 hover:text-slate-200 border border-[#303030]'
                  }`}
                >
                  ทั้งหมด
                </button>
                {availableGroups.map(g => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-none shrink-0 flex items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-[#da291c] text-white'
                          : 'bg-[#222222] text-slate-400 hover:text-slate-200 border border-[#303030]'
                      }`}
                    >
                      <CategoryGlyph icon={g.icon} color={isSelected ? '#ffffff' : g.color} size={10} />
                      <span>{g.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ZONE 3: QUICK PICKS (FREQUENT ITEMS) */}
            {quickPicks.length > 0 && !searchQuery && selectedGroupId === 'ALL' && (
              <div className="px-2.5 py-1.5 border-b border-[#222222] bg-[#121212] shrink-0">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500/80 mb-1 tracking-wider">
                  <Zap className="w-2.5 h-2.5" />
                  <span>ใช้บ่อย</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {quickPicks.map(cat => {
                    const isSelected = value === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelect(cat.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-none border transition-colors ${
                          isSelected
                            ? 'bg-[#da291c]/20 border-[#da291c] text-white'
                            : 'bg-[#1a1a1a] border-[#303030] text-slate-300 hover:border-slate-400 hover:text-white'
                        }`}
                      >
                        <CategoryGlyph icon={cat.icon} color={cat.color} size={10} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ZONE 4: CATEGORY LIST WITH GROUP HEADERS */}
            <div className="flex-1 overflow-y-auto min-h-0 py-1 divide-y divide-[#222222]/60">
              {groupedCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา
                </div>
              ) : (
                (() => {
                  let flatCounter = -1;
                  return groupedCategories.map(group => (
                    <div key={group.id} className="py-1">
                      {/* Group Header */}
                      <div className="px-2.5 py-1 flex items-center gap-1.5 sticky top-0 bg-[#141414]/95 backdrop-blur-sm z-10 select-none">
                        <span
                          className="w-1.5 h-3 rounded-none shrink-0"
                          style={{ backgroundColor: group.color || '#da291c' }}
                        />
                        <CategoryGlyph icon={group.icon} color={group.color} size={11} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                          {group.name}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-600 ml-auto">
                          {group.categories.length}
                        </span>
                      </div>

                      {/* Group Category Items */}
                      <div className="mt-0.5 space-y-0.5 px-1">
                        {group.categories.map(cat => {
                          flatCounter += 1;
                          const currentFlatIndex = flatCounter;
                          const isSelected = value === cat.id;
                          const isActive = activeIndex === currentFlatIndex;

                          return (
                            <button
                              key={cat.id}
                              ref={el => {
                                itemRefs.current[currentFlatIndex] = el;
                              }}
                              type="button"
                              onClick={() => handleSelect(cat.id)}
                              onMouseEnter={() => setActiveIndex(currentFlatIndex)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded-none transition-colors cursor-pointer group ${
                                isActive
                                  ? 'bg-[#2a2a2a] text-white ring-1 ring-[#da291c]/50'
                                  : isSelected
                                  ? 'bg-[#202020] text-white'
                                  : 'hover:bg-[#1f1f1f] text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                <span
                                  className="w-6 h-6 flex items-center justify-center rounded-none shrink-0 border"
                                  style={{
                                    backgroundColor: `rgba(${hexToRgb(cat.color || '#94a3b8')}, 0.12)`,
                                    borderColor: `rgba(${hexToRgb(cat.color || '#94a3b8')}, 0.35)`
                                  }}
                                >
                                  <CategoryGlyph icon={cat.icon} color={cat.color} size={12} />
                                </span>
                                <div className="min-w-0 truncate">
                                  <span className="text-xs font-bold block truncate text-slate-100 group-hover:text-white">
                                    {cat.name}
                                  </span>
                                  {searchQuery && (
                                    <span className="text-[9px] text-slate-400 block truncate">
                                      {group.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {cat.allocation_type && renderAllocationBadge(cat.allocation_type)}
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#da291c] shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            {/* ZONE 5: FOOTER KEYBOARD HINTS */}
            <div className="px-2.5 py-1.5 bg-[#101010] border-t border-[#262626] flex items-center justify-between text-[10px] text-slate-400 select-none shrink-0 font-medium">
              <div className="flex items-center gap-2">
                <span><kbd className="px-1 py-0.5 bg-[#202020] border border-[#333333] text-slate-300">↑↓</kbd> เลือก</span>
                <span><kbd className="px-1 py-0.5 bg-[#202020] border border-[#333333] text-slate-300">Enter</kbd> ยืนยัน</span>
              </div>
              <div>
                <span><kbd className="px-1 py-0.5 bg-[#202020] border border-[#333333] text-slate-300">Esc</kbd> ปิด</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
