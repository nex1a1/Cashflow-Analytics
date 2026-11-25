import React, { useMemo, useState, useEffect } from 'react';
import { Star, Search, X, Check, Repeat, Clock } from 'lucide-react';
import { formatAmount, formatMoney, hexToRgb } from '../../utils/formatters';
import { TransactionDisplay, Category, CashflowGroup, FrequentItem } from '../../types';
import CategoryGlyph from './CategoryGlyph';

import { tc, ALLOCATION_COLORS } from '@/constants/theme';
const ALLOC_COLORS: Record<string, string> = {
  need: ALLOCATION_COLORS.need,
  want: ALLOCATION_COLORS.want,
  savings: tc('savings')
};

export interface QuickSuggestProps {
  transactions?: TransactionDisplay[];
  categories?: Category[];
  catMap?: Record<string, any>;
  formType: string;
  suggCatFilter?: string | string[];
  setSuggCatFilter?: React.Dispatch<React.SetStateAction<any>>;
  onApplySuggestion: (item: any) => void;
  isProcessing?: boolean;
  frequentItems?: FrequentItem[];
  className?: string;
  cashflowGroups?: CashflowGroup[];
  defaultLimit?: number;
  /** แถวใต้หัวข้อ (ปุ่มรายการประจำ) — แผงของมันลอยทับรายการ ไม่ดันเนื้อหา */
  headerSlot?: React.ReactNode;
}

export interface SuggestionGroup extends FrequentItem {
  /** Times bought at any price */
  totalCount: number;
  /** Other prices of the same item, most used first */
  variants: FrequentItem[];
}

/** Merge rows that differ only by price, keeping the order given (the first row of a group leads it). */
export function groupSuggestions(items: FrequentItem[]): SuggestionGroup[] {
  const byKey = new Map<string, SuggestionGroup>();
  for (const it of items) {
    const key = `${it.categoryId}|${(it.description || '').trim().toLowerCase()}`;
    const g = byKey.get(key);
    if (g) {
      g.totalCount += it.count;
      g.variants.push(it);
    } else {
      byKey.set(key, { ...it, totalCount: it.count, variants: [] });
    }
  }
  for (const g of byKey.values()) g.variants.sort((a, b) => b.count - a.count);
  return [...byKey.values()];
}

const MAX_PRICE_CHIPS = 3;

type SortBy = 'frequent' | 'recent';
const SORTS: { val: SortBy; label: string; Icon: typeof Repeat }[] = [
  { val: 'frequent', label: 'บ่อยสุด', Icon: Repeat },
  { val: 'recent', label: 'ล่าสุด', Icon: Clock },
];

const chipBase = 'px-2 py-0.5 text-[11px] font-bold border flex items-center gap-1 rounded-pill cursor-pointer active:scale-95';
const chipIdle = 'border-line bg-canvas text-slate-400 hover:text-slate-200 hover:border-slate-500';

function QuickSuggest({
  categories = [],
  catMap = {},
  formType,
  suggCatFilter,
  setSuggCatFilter,
  onApplySuggestion,
  isProcessing,
  frequentItems = [],
  className = "",
  cashflowGroups = [],
  defaultLimit = 10,
  headerSlot
}: QuickSuggestProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Categories picked inside the open group: owned by the parent when it passes suggCatFilter, else local
  const [localCatIds, setLocalCatIds] = useState<string[]>([]);
  const selectedCatIds = useMemo(() => {
    const raw = suggCatFilter !== undefined ? suggCatFilter : localCatIds;
    if (Array.isArray(raw)) return raw;
    if (!raw || raw === 'ALL') return [];
    return [raw];
  }, [suggCatFilter, localCatIds]);

  const setSelectedCatIds = (updater: any) => {
    if (setSuggCatFilter !== undefined) {
      setSuggCatFilter((prev: any) => {
        const current = Array.isArray(prev) ? prev : (!prev || prev === 'ALL' ? [] : [prev]);
        return typeof updater === 'function' ? updater(current) : updater;
      });
    } else {
      setLocalCatIds(updater);
    }
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCatIds((prev: string[]) =>
      prev.some(id => String(id) === String(catId))
        ? prev.filter(id => String(id) !== String(catId))
        : [...prev, catId]);
  };

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [allocationFilter, setAllocationFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('frequent');
  const [showAll, setShowAll] = useState(false);

  // A new form type (income / expense / savings) starts everything over
  useEffect(() => {
    setSelectedGroup(null);
    setSelectedCatIds([]);
    setSearchQuery('');
    setAllocationFilter('ALL');
    setSortBy('frequent');
    setShowAll(false);
  }, [formType]);

  // Picking another group (or closing it) drops the categories picked in the old one
  const pickGroup = (id: string) => {
    setSelectedGroup(prev => (String(prev) === String(id) ? null : id));
    setSelectedCatIds([]);
  };

  const hasFilter = selectedGroup !== null || selectedCatIds.length > 0 || allocationFilter !== 'ALL';
  const handleResetAll = () => {
    setSelectedGroup(null);
    setSelectedCatIds([]);
    setAllocationFilter('ALL');
  };

  const activeCategories = useMemo(() => categories.filter(c => c.type === formType), [categories, formType]);

  // Groups of this form type; derived from the categories when no group list is given
  const activeGroups = useMemo<any[]>(() => {
    if (cashflowGroups && cashflowGroups.length > 0) {
      const filtered = cashflowGroups.filter(g => g.type === formType);
      if (filtered.length > 0) {
        return [...filtered].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
      }
    }
    const groupDict: Record<string, any> = {};
    activeCategories.forEach(cat => {
      const g = catMap[cat.id]?._group || (cat as any)._group;
      if (g && g.id) {
        groupDict[g.id] = g;
      } else if (cat.cashflowGroup) {
        groupDict[cat.cashflowGroup] = { id: cat.cashflowGroup, name: cat.cashflowGroup, type: cat.type };
      }
    });
    return (Object.values(groupDict) as any[]).sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  }, [cashflowGroups, activeCategories, catMap, formType]);

  const groupCategories = useMemo(() => {
    if (selectedGroup === null) return [];
    return activeCategories.filter(c => {
      const gId = c.cashflowGroup || catMap[c.id]?._group?.id || (c as any)._group?.id;
      return String(gId) === String(selectedGroup);
    });
  }, [activeCategories, selectedGroup, catMap]);

  // Fast O(1) category lookup map
  const catLookup = useMemo(() => {
    const map: Record<string, any> = { ...catMap };
    categories.forEach(c => {
      if (!map[c.id]) map[c.id] = c;
      if (!map[String(c.id)]) map[String(c.id)] = c;
      if (c.name && !map[c.name]) map[c.name] = c;
    });
    return map;
  }, [catMap, categories]);

  // Every matching row, one per item (other prices folded in); the list shows the first defaultLimit unless showAll
  const allSuggestions = useMemo(() => {
    let sourceItems: FrequentItem[] = frequentItems.filter(s => {
      const c = catLookup[s.categoryId] || catLookup[s.categoryName];
      return c?.type === formType;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sourceItems = sourceItems.filter(s =>
        (s.description || '').toLowerCase().includes(q) ||
        (s.categoryName || '').toLowerCase().includes(q) ||
        String(s.amount).includes(q)
      );
    }

    if (selectedCatIds.length > 0) {
      sourceItems = sourceItems.filter(s => selectedCatIds.some(id => String(id) === String(s.categoryId)));
    } else if (selectedGroup !== null) {
      sourceItems = sourceItems.filter(s => {
        const c = catLookup[s.categoryId] || catLookup[s.categoryName];
        const gId = c?.cashflowGroup || c?._group?.id || catLookup[s.categoryId]?._group?.id;
        return String(gId) === String(selectedGroup);
      });
    }

    if (formType === 'expense' && allocationFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => s.allocation_type === allocationFilter);
    }

    sourceItems.sort((a, b) => {
      const byDate = new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      if (sortBy === 'recent') return byDate;
      return b.count !== a.count ? b.count - a.count : byDate;
    });

    return groupSuggestions(sourceItems);
  }, [frequentItems, catLookup, formType, searchQuery, selectedCatIds, selectedGroup, allocationFilter, sortBy]);

  const quickSuggestions = showAll ? allSuggestions : allSuggestions.slice(0, defaultLimit);
  const hiddenCount = allSuggestions.length - quickSuggestions.length;

  // Changes whenever a filter does (not the search box: re-animating on every keystroke would jitter).
  const listKey = [formType, selectedGroup, selectedCatIds.join('|'), allocationFilter, sortBy].join('~');

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <h4 className="shrink-0 font-bold text-sm flex items-center gap-2 mb-2 text-slate-300">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        รายการแนะนำ {allSuggestions.length > 0 && <span key={allSuggestions.length} className="m-pop-in inline-block">({allSuggestions.length})</span>}
      </h4>

      {/* own full-width row: the right end of the header sits under DayDetail's close button */}
      {headerSlot}

      <div className="space-y-2 mb-2 shrink-0">
        {/* Search + sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหาที่เคยบันทึก..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-0.5 text-xs leading-6 border rounded-sm outline-hidden focus:ring-1 transition-colors bg-canvas border-line-strong text-white focus:border-accent-ink focus:ring-accent/30"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="ล้างคำค้น"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-elevated text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            )}
          </div>

          <div role="group" aria-label="เรียงตาม" className="relative grid grid-cols-2 p-0.5 rounded-pill border border-line-strong bg-surface shrink-0">
            <span aria-hidden className="m-slide absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/2)] rounded-pill bg-accent/15"
              style={{ translate: sortBy === 'recent' ? '100% 0' : '0 0' }} />
            {SORTS.map(({ val, label, Icon }) => (
              <button
                key={val}
                type="button"
                onClick={() => setSortBy(val)}
                aria-pressed={sortBy === val}
                title={val === 'frequent' ? 'เรียงตามที่ใช้บ่อย' : 'เรียงตามที่ใช้ล่าสุด'}
                className={`relative flex items-center justify-center gap-1 px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  sortBy === val ? 'text-accent-ink' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Groups (and NEED / WANT for expenses): one click filters, the list shows the result at once */}
        <div role="group" aria-label="กรองตามกลุ่ม" className="flex flex-wrap items-center gap-1">
          {activeGroups.map(g => {
            const on = String(selectedGroup) === String(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => pickGroup(g.id)}
                aria-pressed={on}
                className={`${chipBase} ${on ? 'border-accent-ink bg-accent/20 text-white m-pick' : chipIdle}`}
              >
                {g.icon && <CategoryGlyph icon={g.icon} color={g.color} size={15} />}
                <span>{g.name}</span>
              </button>
            );
          })}
          {formType === 'expense' && (
            <>
              <span aria-hidden className="w-px h-4 bg-line mx-0.5" />
              {(['need', 'want'] as const).map(a => {
                const on = allocationFilter === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAllocationFilter(on ? 'ALL' : a)}
                    aria-pressed={on}
                    className={`${chipBase} uppercase ${on ? (a === 'need' ? 'border-rose-500/60 text-rose-400 bg-rose-950/30 m-pick' : 'border-amber-500/60 text-amber-400 bg-amber-950/30 m-pick') : chipIdle}`}
                  >
                    {a}
                  </button>
                );
              })}
            </>
          )}
          {hasFilter && (
            <button type="button" onClick={handleResetAll} className="ml-auto text-[11px] font-bold text-accent-ink hover:underline cursor-pointer">
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Categories of the open group, several at a time */}
        {groupCategories.length > 0 && (
          <div role="group" aria-label="หมวดในกลุ่ม" className="m-reveal flex flex-wrap gap-1 pl-2 border-l border-line">
            {groupCategories.map(c => {
              const on = selectedCatIds.some(id => String(id) === String(c.id));
              const rgb = hexToRgb(c.color || tc('ink-body'));
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleToggleCategory(c.id)}
                  aria-pressed={on}
                  style={on
                    ? { borderColor: c.color || tc('expense'), backgroundColor: `rgba(${rgb}, 0.25)`, color: tc('ink-display') }
                    : ({ ['--chip-rgb' as any]: rgb } as React.CSSProperties)}
                  className={`${chipBase} ${on ? 'm-pick' : 'cat-chip-btn'}`}
                >
                  {on && <Check className="m-pop-in w-2.5 h-2.5 shrink-0" />}
                  {c.icon && <CategoryGlyph icon={c.icon} color={c.color} size={15} />}
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="@container flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {quickSuggestions.length === 0 ? (
          <p key={listKey} className="m-fade-in text-xs text-center py-10 text-slate-500 font-medium">
            ไม่พบคำแนะนำที่ตรงกับตัวกรอง
          </p>
        ) : (
          // keyed by the filters: picking / removing a group, category or option re-mounts the list,
          // so the rows rise back in one after another (m-stagger)
          // one grid for the whole list (rows are subgrids of it): the price column is as wide as the widest row,
          // so its divider runs in one straight line down the list
          <div key={listKey} className="m-stagger grid grid-cols-[minmax(0,1fr)_auto] gap-y-1">
              {quickSuggestions.map((s, idx) => {
                const catObj = catLookup[s.categoryId] || catLookup[s.categoryName];
                const catColor = catObj?.color || tc('gray-300');
                const bgAlpha = 0.2;
                
                // Allocation Bar Color
                const allocColor = (s.allocation_type && ALLOC_COLORS[s.allocation_type]) || tc('income');

                const itemKey = `${s.categoryId}-${s.description}-${s.amount}-${idx}`;

                const sign = formType === 'savings' ? '฿' : formType === 'expense' ? '−฿' : '+฿';
                const hasAlt = s.variants.length > 0;
                // The card button is a subgrid over its row, so the other-price chips (buttons of their own, never nested
                // in the card) can sit in the card's lower-right cell, right under the main price, when the list is wide
                // enough (@md). Narrower, they drop to a line under the card.
                // The press is on the row, card and chips together, eased like any button (the card's own nudge is off).
                return (
                  <div key={itemKey} className="sugg-row col-span-2 grid grid-cols-subgrid transition-[scale,translate] duration-150 ease-(--m-ease) has-[>.sugg-item:active]:scale-[0.985] has-[>.sugg-item:active]:translate-y-(--m-press) has-[>.sugg-item:active]:duration-[60ms]">
                  <button
                    type="button"
                    onClick={() => { const { totalCount: _n, variants: _v, ...plain } = s; onApplySuggestion(plain); }}
                    disabled={isProcessing}
                    style={{
                      ['--cat-rgb' as any]: hexToRgb(catColor),
                    }}
                    className="sugg-item col-start-1 row-start-1 col-span-2 row-span-2 grid grid-cols-subgrid grid-rows-subgrid duration-75 active:translate-none rounded-none border relative overflow-hidden text-left text-slate-200 select-none group cursor-pointer"
                  >
                    {/* Left Color Accents: Category (wide) + Allocation (narrow) */}
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catColor }} />
                    {s.allocation_type && formType === 'expense' && (
                      <div className="absolute left-1 top-0 bottom-0 w-1" style={{ backgroundColor: allocColor }} title={s.allocation_type.toUpperCase()} />
                    )}

                    <div className="row-span-2 flex items-center min-w-0 pl-4.5 pr-2 py-[5px] gap-2.5">
                      {/* Icon with colored background */}
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] transition-transform duration-75 group-hover:scale-105"
                        style={{ backgroundColor: `rgba(${hexToRgb(catColor)}, ${bgAlpha})` }}
                      >
                        <CategoryGlyph icon={catObj?.icon} color={catColor} size={18} fallbackEmoji="📌" />
                      </div>
                      
                      <div className="flex flex-col items-start min-w-0 overflow-hidden leading-tight flex-1">
                        <span className="text-xs font-bold truncate w-full group-hover:text-white transition-colors">
                          {s.description || catObj?.name || 'อื่นๆ'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-medium truncate w-full mt-0.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                          {catObj?._group?.name && (
                            <>
                              <span className="opacity-75 truncate max-w-[80px]" title={`กลุ่ม: ${catObj._group.name}`}>
                                {catObj._group.name}
                              </span>
                              <span className="opacity-40 text-[11px] select-none">›</span>
                            </>
                          )}
                          <span className="truncate">{catObj?.name || s.categoryName}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`row-span-2 flex items-center justify-end gap-1.5 pl-2 pr-3 border-l border-line/60 ${hasAlt ? '@md:row-span-1 @md:items-end @md:pt-1' : ''}`}>
                      <span className={`text-xs font-bold tabular-nums tracking-tight ${formType === 'expense' ? 'text-expense group-hover:text-red-300' : 'text-emerald-400 group-hover:text-emerald-300'} transition-colors`}>
                        {sign}{formatMoney(s.amount)}
                      </span>
                      <span className="text-[11px] leading-4 font-bold text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                        {s.totalCount}x
                      </span>
                    </div>
                  </button>
                  {hasAlt && (
                    <div role="group" aria-label="ราคาอื่น" className="col-span-2 row-start-3 flex items-center gap-1 flex-wrap pl-10 pt-0.5 @md:relative @md:col-span-1 @md:col-start-2 @md:row-start-2 @md:flex-nowrap @md:justify-end @md:pl-2 @md:pr-3 @md:pt-0 @md:pb-1 @md:border-l @md:border-line/60">
                      <span className="text-[11px] text-ink-muted @md:hidden">ราคาอื่น</span>
                      {s.variants.slice(0, MAX_PRICE_CHIPS).map(v => (
                        <button
                          key={`${v.amount}`}
                          type="button"
                          onClick={() => onApplySuggestion(v)}
                          disabled={isProcessing}
                          title={`ใช้ราคา ${formatMoney(v.amount)} (${v.count} ครั้ง)`}
                          className="px-1.5 rounded-pill border border-line text-[11px] leading-4 font-bold tabular-nums text-ink-body hover:text-ink-display hover:bg-surface-hover cursor-pointer"
                        >
                          {sign}{formatAmount(v.amount)}<span className="text-ink-muted @md:hidden"> {v.count}x</span>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}
          </div>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full mt-1 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-surface-elevated border border-line cursor-pointer"
          >
            ดูทั้งหมด (อีก {hiddenCount} รายการ)
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(QuickSuggest);
