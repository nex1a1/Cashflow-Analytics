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

import { tc } from '@/constants/theme';
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
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpwards: boolean;
  }>({
    left: 0,
    width: 480,
    maxHeight: 480,
    openUpwards: false
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
      searchQuery
    });
  }, [categories, cashflowGroups, type, searchQuery]);

  // Flat list of visible categories for keyboard navigation
  const flatCategories = useMemo(() => {
    return groupedCategories.flatMap(g => g.categories);
  }, [groupedCategories]);

  // Calculate & update popover position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const rawWidth = variant === 'default'
      ? Math.max(460, Math.min(rect.width, 540))
      : 480;
    const popoverWidth = Math.min(rawWidth, window.innerWidth - 32);
    const estimatedHeight = 480;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    // Flip upwards if space below cannot accommodate the desired height AND space above is larger than space below
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let maxHeight = estimatedHeight;
    let top: number | undefined;
    let bottom: number | undefined;

    if (openUpwards) {
      maxHeight = Math.min(estimatedHeight, Math.max(240, spaceAbove));
      bottom = window.innerHeight - rect.top + 4;
    } else {
      maxHeight = Math.min(estimatedHeight, Math.max(240, spaceBelow));
      top = rect.bottom + 4;
    }

    setCoords({ top, bottom, left, width: popoverWidth, maxHeight, openUpwards });
  }, [variant]);

  // Toggle open
  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
    setSearchQuery('');
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
      e.stopPropagation();
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
  const pillColor = selectedCategory?.color || (type === 'income' ? tc('income') : tc('expense'));
  const pillStyles = useMemo(() => {
    const defaultRgb = '148, 163, 184';
    const rgb = hexToRgb(pillColor || '') || defaultRgb;

    let hex = (pillColor || tc('ink-body')).replace('#', '');
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

    const targetL = Math.max(l * 100, 72); // ≥72% lightness keeps even deep indigo/purple ≥4.5:1 on the pill
    const targetS = Math.max(s, 60);
    const textColor = `hsl(${h}, ${targetS}%, ${targetL}%)`;

    return {
      bg: `rgba(${rgb}, 0.15)`,
      border: `rgba(${rgb}, 0.35)`,
      borderLeft: pillColor,
      textColor
    };
  }, [pillColor]);


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
          className={`category-pill-trigger relative flex items-center justify-between rounded-sm border transition-all h-7 w-full overflow-hidden text-left cursor-pointer outline-none focus:ring-1 focus:ring-accent/50 ${className}`}
          style={{
            backgroundColor: pillStyles.bg,
            borderColor: pillStyles.border,
            borderLeftWidth: '3px',
            borderLeftColor: pillStyles.borderLeft
          }}
          title={selectedCategory ? `หมวดหมู่: ${selectedCategory.name}` : placeholder}
        >
          <div className="w-full flex items-center pl-2 pr-6 py-1 text-xs select-none min-w-0">
            <CategoryGlyph icon={selectedCategory?.icon} color={selectedCategory?.color} size={20} className="shrink-0 mr-2" />
            <div className="truncate flex items-center gap-1 min-w-0" style={{ color: pillStyles.textColor }}>
              {selectedCategoryGroup?.name && (
                <>
                  <span className="text-ink-body font-medium text-[11px] truncate max-w-[80px]">
                    {selectedCategoryGroup.name}
                  </span>
                  <span className="text-ink-muted text-[11px] select-none" aria-hidden="true">›</span>
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
              ? 'bg-canvas border-danger text-red-200 focus:ring-1 focus:ring-danger/30'
              : 'bg-canvas border-line-strong text-white hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedCategory ? (
              <>
                <CategoryGlyph
                  icon={selectedCategory.icon}
                  color={selectedCategory.color}
                  size={20}
                  className="shrink-0"
                />
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  {selectedCategoryGroup?.name && (
                    <>
                      <span className="text-[11px] font-medium text-slate-400 truncate max-w-[100px]">
                        {selectedCategoryGroup.name}
                      </span>
                      <span className="text-[11px] text-slate-600 select-none">›</span>
                    </>
                  )}
                  <span className="text-white font-black truncate">{selectedCategory.name}</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 font-medium">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center shrink-0 ml-2">
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </button>
      )}

      {/* 2. FLOATING POPOVER PORTAL */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] bg-surface border border-neutral-800/90 shadow-[0_24px_50px_rgba(0,0,0,0.92),0_0_1px_1px_rgba(255,255,255,0.05)] rounded-md flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            style={{
              ...(coords.openUpwards
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
            }}
          >
            {/* LASER HAIRLINE ACCENT */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent shrink-0 opacity-80" />

            {/* ZONE 1: SEAMLESS COMMAND SEARCH */}
            <div className="px-3 py-2.5 border-b border-neutral-800/80 bg-canvas/90 shrink-0 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 pointer-events-none" />
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
                className="w-full bg-transparent border-none p-0 text-xs text-white placeholder-neutral-500 outline-none focus:ring-0 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-neutral-500 hover:text-neutral-300 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* ZONE 2: QUICK PICKS (FREQUENT ITEMS) */}
            {quickPicks.length > 0 && !searchQuery && (
              <div className="px-3 py-2 border-b border-neutral-800/70 bg-surface shrink-0">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-amber-500/90 mb-1.5 tracking-wider">
                  <Zap className="w-2.5 h-2.5" />
                  <span>ใช้บ่อย</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickPicks.map(cat => {
                    const isSelected = value === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelect(cat.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent/15 border-accent/70 text-white font-bold'
                            : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white hover:bg-neutral-800/60'
                        }`}
                      >
                        <CategoryGlyph icon={cat.icon} color={cat.color} size={13} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ZONE 3: CATEGORY LIST WITH GROUP HEADERS */}
            <div className="flex-1 overflow-y-auto tactical-scrollbar min-h-0 py-1 divide-y divide-neutral-800/40">
              {groupedCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 font-medium">
                  ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา
                </div>
              ) : (
                (() => {
                  let flatCounter = -1;
                  return groupedCategories.map(group => (
                    <div key={group.id} className="py-1">
                      {/* Group Header */}
                      <div className="px-3 py-1.5 flex items-center gap-2 sticky top-0 bg-surface z-10 select-none">
                        <span
                          className="w-1 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: group.color || tc('expense') }}
                        />
                        <CategoryGlyph icon={group.icon} color={group.color} size={16} className="shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                          {group.name}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-500 ml-auto bg-neutral-800/60 px-1.5 py-0.5 rounded-full">
                          {group.categories.length}
                        </span>
                      </div>

                      {/* Group Category Items */}
                      <div className="mt-0.5 space-y-0.5 px-1.5">
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
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left rounded-md transition-colors cursor-pointer group ${
                                isActive
                                  ? 'bg-neutral-800 text-white ring-1 ring-neutral-700/80 shadow-sm'
                                  : isSelected
                                  ? 'bg-neutral-800/60 text-white'
                                  : 'hover:bg-neutral-800/40 text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <span
                                  className="w-7 h-7 flex items-center justify-center rounded-md shrink-0 transition-transform group-hover:scale-105"
                                  style={{
                                    backgroundColor: `rgba(${hexToRgb(cat.color || tc('ink-body'))}, 0.14)`,
                                  }}
                                >
                                  <CategoryGlyph icon={cat.icon} color={cat.color} size={16} />
                                </span>
                                <div className="min-w-0 truncate">
                                  <span className="text-xs font-semibold block truncate text-neutral-200 group-hover:text-white">
                                    {cat.name}
                                  </span>
                                  {searchQuery && (
                                    <span className="text-[11px] text-neutral-400 block truncate">
                                      {group.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div className="flex items-center shrink-0 ml-2">
                                  <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                                </div>
                              )}
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
            <div className="px-3 py-2 bg-canvas border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 select-none shrink-0 font-medium">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-none bg-neutral-800/90 border border-neutral-700/60 text-neutral-300 font-mono text-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)]">↑↓</kbd>
                  <span>เลือก</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-none bg-neutral-800/90 border border-neutral-700/60 text-neutral-300 font-mono text-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)]">Enter</kbd>
                  <span>ยืนยัน</span>
                </span>
              </div>
              <div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-none bg-neutral-800/90 border border-neutral-700/60 text-neutral-300 font-mono text-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)]">Esc</kbd>
                  <span>ปิด</span>
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
