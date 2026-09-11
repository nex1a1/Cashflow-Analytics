import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Plus, Sparkles, Filter, Search, ChevronDown, ChevronRight, ChevronUp,
  ShieldCheck, AlertTriangle, Archive, Tag, RefreshCw, XCircle, ShoppingBag,
  Layers, List, ChevronsDownUp, ChevronsUpDown, ArrowUpDown
} from 'lucide-react';
import { ItemWithDetails, ItemCategory, ItemStatus, CreateItemPayload, UpdateItemPayload } from '../../types';
import { itemService } from '../../services/api';
import { formatMoney } from '../../utils/formatters';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  groupItemsByCategory,
  calculateItemStats,
  STATUS_CONFIG,
  CategoryItemGroup,
  getCategoryAccent,
  WishlistSortOption,
  InventorySortOption,
  sortWishlistItems,
  sortInventoryItems,
  WISHLIST_SORT_OPTIONS,
  INVENTORY_SORT_OPTIONS
} from '../../utils/itemHelpers';

import ItemCard from './ItemCard';
import ItemFormModal from './ItemFormModal';
import LinkTransactionsModal from './LinkTransactionsModal';
import ItemCategoryModal from './ItemCategoryModal';
import ItemSortDropdown from './ItemSortDropdown';

export default function ItemsView() {
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  
  // View mode: 'grouped' by category vs 'flat' continuous dense list
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Right-column status filter: 'purchased' | 'stored' | 'archived' | 'ALL'
  const [rightColumnFilter, setRightColumnFilter] = useState<'purchased' | 'stored' | 'archived' | 'ALL'>('purchased');
  const [showCancelled, setShowCancelled] = useState(false);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'wishlist' | 'inventory'>('wishlist');
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [defaultFormStatus, setDefaultFormStatus] = useState<ItemStatus>('planned');
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalMode, setLinkModalMode] = useState<'manage' | 'purchase'>('manage');
  const [linkingItem, setLinkingItem] = useState<ItemWithDetails | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [lastCreatedCategory, setLastCreatedCategory] = useState<ItemCategory | null>(null);

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Sorting states with localStorage persistence
  const [wishlistSort, setWishlistSort] = useState<WishlistSortOption>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ITEMS_WISHLIST_SORT) as WishlistSortOption) || 'priority_desc';
  });
  const [inventorySort, setInventorySort] = useState<InventorySortOption>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ITEMS_INVENTORY_SORT) as InventorySortOption) || 'purchased_desc';
  });

  const handleWishlistSortChange = (newSort: WishlistSortOption) => {
    setWishlistSort(newSort);
    localStorage.setItem(STORAGE_KEYS.ITEMS_WISHLIST_SORT, newSort);
  };

  const handleInventorySortChange = (newSort: InventorySortOption) => {
    setInventorySort(newSort);
    localStorage.setItem(STORAGE_KEYS.ITEMS_INVENTORY_SORT, newSort);
  };

  // Load items and categories
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsData, catsData] = await Promise.all([
        itemService.getAll({ includeCancelled: true }),
        itemService.getCategories()
      ]);
      setItems(itemsData);
      setCategories(catsData);
    } catch (err) {
      console.error('Failed to load item tracker data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategoryCollapse = (catKey: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catKey)) next.delete(catKey);
      else next.add(catKey);
      return next;
    });
  };

  // KPIs
  const stats = useMemo(() => calculateItemStats(items), [items]);

  // Filter items by search and category filter
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedCategoryFilter !== 'ALL' && String(item.category_id) !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = item.brand_model?.toLowerCase().includes(q) || false;
        const matchSource = item.source?.toLowerCase().includes(q) || false;
        const matchDesc = item.description?.toLowerCase().includes(q) || false;
        if (!matchName && !matchBrand && !matchSource && !matchDesc) return false;
      }
      return true;
    });
  }, [items, selectedCategoryFilter, searchQuery]);

  // Split into Planned (Left) and Possessions (Right) with Active Sorting
  const plannedItems = useMemo(() => {
    const raw = filteredItems.filter(i => i.status === 'planned');
    return sortWishlistItems(raw, wishlistSort);
  }, [filteredItems, wishlistSort]);

  const cancelledItems = useMemo(() => {
    return filteredItems.filter(i => i.status === 'cancelled');
  }, [filteredItems]);

  const possessionItems = useMemo(() => {
    const raw = filteredItems.filter(i => {
      if (i.status === 'planned' || i.status === 'cancelled') return false;
      if (rightColumnFilter === 'purchased') return i.status === 'purchased';
      if (rightColumnFilter === 'stored') return i.status === 'stored';
      if (rightColumnFilter === 'archived') return i.status === 'broken' || i.status === 'sold';
      return true; // 'ALL'
    });
    return sortInventoryItems(raw, inventorySort);
  }, [filteredItems, rightColumnFilter, inventorySort]);

  // Group items by category (respecting custom order_index)
  const plannedGroups = useMemo(() => groupItemsByCategory(plannedItems, categories), [plannedItems, categories]);
  const possessionGroups = useMemo(() => groupItemsByCategory(possessionItems, categories), [possessionItems, categories]);

  // All category keys for batch expand/collapse
  const allGroupKeys = useMemo(() => {
    const keys: string[] = [];
    plannedGroups.forEach(g => keys.push(`planned-${g.categoryId}`));
    possessionGroups.forEach(g => keys.push(`possessions-${g.categoryId}`));
    return keys;
  }, [plannedGroups, possessionGroups]);

  const areAllCollapsed = useMemo(() => {
    return allGroupKeys.length > 0 && allGroupKeys.every(k => collapsedCategories.has(k));
  }, [allGroupKeys, collapsedCategories]);

  const toggleCollapseAll = () => {
    if (areAllCollapsed) {
      setCollapsedCategories(new Set());
    } else {
      setCollapsedCategories(new Set(allGroupKeys));
    }
  };

  // CRUD Actions
  const handleSaveItem = async (
    payload: CreateItemPayload | UpdateItemPayload,
    id?: number,
    options?: { openLinkModalAfter?: boolean }
  ) => {
    let savedItem: ItemWithDetails;
    if (id) {
      savedItem = await itemService.update(id, payload);
    } else {
      savedItem = await itemService.create(payload as CreateItemPayload);
    }
    await fetchData();

    if (options?.openLinkModalAfter && savedItem) {
      setLinkingItem(savedItem);
      setLinkModalOpen(true);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการสิ่งของนี้?')) return;
    try {
      await itemService.delete(id);
      await fetchData();
    } catch (err) {
      console.error('Delete item failed:', err);
    }
  };

  const handleChangeStatus = async (id: number, status: ItemStatus) => {
    try {
      await itemService.updateStatus(id, status);
      await fetchData();
    } catch (err) {
      console.error('Change status failed:', err);
    }
  };

  const handleQuickCancel = async (id: number) => {
    try {
      await itemService.updateStatus(id, 'cancelled');
      await fetchData();
    } catch (err) {
      console.error('Quick cancel failed:', err);
    }
  };

  // Purchase & link confirmation
  const handleConfirmPurchase = async (itemId: number, purchasedAt: string, selectedTxIds: string[]) => {
    try {
      await itemService.updateStatus(itemId, 'purchased', { purchased_at: purchasedAt });
      if (selectedTxIds && selectedTxIds.length > 0) {
        await itemService.linkTransactions(itemId, selectedTxIds);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to confirm purchase:', err);
    }
  };

  // Reorder categories handler
  const handleMoveCategoryOrder = async (
    categoryId: number,
    direction: 'up' | 'down',
    groupList?: CategoryItemGroup[]
  ) => {
    const sorted = [...categories].sort((a, b) => (a.order_index ?? a.id) - (b.order_index ?? b.id));

    if (groupList && groupList.length > 1) {
      const currentVisibleIdx = groupList.findIndex(g => g.categoryId === categoryId);
      if (currentVisibleIdx === -1) return;
      const targetVisibleIdx = direction === 'up' ? currentVisibleIdx - 1 : currentVisibleIdx + 1;
      if (targetVisibleIdx < 0 || targetVisibleIdx >= groupList.length) return;

      const targetCatId = groupList[targetVisibleIdx].categoryId;
      const fromIdx = sorted.findIndex(c => c.id === categoryId);
      if (fromIdx === -1) return;

      const itemToMove = sorted.splice(fromIdx, 1)[0];
      const targetPosInSorted = sorted.findIndex(c => c.id === targetCatId);
      if (targetPosInSorted === -1) return;

      const insertIdx = direction === 'up' ? targetPosInSorted : targetPosInSorted + 1;
      sorted.splice(insertIdx, 0, itemToMove);
    } else {
      const idx = sorted.findIndex(c => c.id === categoryId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return;

      const temp = sorted[idx];
      sorted[idx] = sorted[targetIdx];
      sorted[targetIdx] = temp;
    }

    try {
      await itemService.reorderCategories(sorted.map(c => c.id));
      await fetchData();
    } catch (err) {
      console.error('Failed to reorder categories:', err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Cockpit Asset HUD (Top High-Density Overview) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#2e2e2e] border border-[#2e2e2e] shadow-lg">
        {/* Card 1: Active Possessions */}
        <div className="p-3 md:p-3.5 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ทรัพย์สินที่ใช้งานอยู่
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1.5 font-mono">
            <div className="text-xl md:text-2xl font-black text-slate-100 tabular-nums">
              ฿{formatMoney(stats.activePossessionsValue)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {stats.activeCount} รายการที่กำลังใช้งาน
            </div>
          </div>
        </div>

        {/* Card 2: Stored Possessions */}
        <div className="p-3 md:p-3.5 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ของในกรุ / สำรอง
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <div className="mt-1.5 font-mono">
            <div className="text-xl md:text-2xl font-black text-slate-100 tabular-nums">
              ฿{formatMoney(stats.storedValue)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {stats.storedCount} รายการเก็บสำรองไว้
            </div>
          </div>
        </div>

        {/* Card 3: Wishlist Planned */}
        <div className="p-3 md:p-3.5 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ราคาประเมิน Wishlist
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-1.5 font-mono">
            <div className="text-xl md:text-2xl font-black text-amber-400 tabular-nums">
              ฿{formatMoney(stats.wishlistValue)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {stats.plannedCount} รายการที่วางแผนจะซื้อ
            </div>
          </div>
        </div>

        {/* Card 4: Archived & Sold */}
        <div className="p-3 md:p-3.5 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ประวัติ พัง / ขายแล้ว
            </span>
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
          </div>
          <div className="mt-1.5 font-mono">
            <div className="text-xl md:text-2xl font-black text-neutral-300 tabular-nums">
              {stats.archivedCount} <span className="text-xs font-normal text-neutral-500">ชิ้น</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              เก็บประวัติ {stats.cancelledCount > 0 ? `· ยกเลิก ${stats.cancelledCount}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Filter & Action Bar ── */}
      <div className="p-2.5 bg-[#141414] border border-[#282828] flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Quick Search & Category Filter */}
        <div className="flex items-center gap-2 flex-grow max-w-xl">
          <div className="relative flex-grow">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสิ่งของ, ยี่ห้อ, แหล่งซื้อ หรือโน้ต..."
              className="w-full pl-8 pr-3 py-1 bg-[#1a1a1a] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
            />
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-[#1a1a1a] border border-[#333] text-slate-200 text-xs rounded-none focus:outline-none focus:border-[#da291c] shrink-0"
          >
            <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
            {categories.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Right: View Mode, Collapse All & Category Manager */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Switcher: Grouped vs Flat List */}
          <div className="flex items-center border border-[#333] bg-[#1a1a1a]">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2 py-1 text-xs font-bold flex items-center gap-1 transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="จัดกลุ่มตามหมวดหมู่"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จัดกลุ่ม</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`px-2 py-1 text-xs font-bold flex items-center gap-1 transition-colors ${
                viewMode === 'flat'
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="รายการรวมทั้งหมดต่อเนื่อง"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">รวมทั้งหมด</span>
            </button>
          </div>

          {/* Collapse / Expand All (only useful in grouped mode) */}
          {viewMode === 'grouped' && (
            <button
              type="button"
              onClick={toggleCollapseAll}
              className="px-2.5 py-1 text-xs font-bold text-neutral-300 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-none flex items-center gap-1 transition-colors"
              title={areAllCollapsed ? 'ขยายทุกหมวดหมู่' : 'ยุบทุกหมวดหมู่'}
            >
              {areAllCollapsed ? (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  <span>ขยายทั้งหมด</span>
                </>
              ) : (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5 text-neutral-400" />
                  <span>ยุบทั้งหมด</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setCategoryModalOpen(true)}
            className="px-2.5 py-1 text-xs font-bold text-neutral-300 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-none flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">หมวดหมู่</span>
          </button>

          <button
            onClick={fetchData}
            title="รีเฟรชข้อมูล"
            className="p-1 text-neutral-400 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-none transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2-Column Tactical Layout (50/50 Balanced Full-Width Grid) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* ── LEFT COLUMN: Planned / Wishlist ── */}
        <div className="space-y-3">
          {/* Column Header */}
          <div className="p-2.5 px-3 bg-[#181818] border-t-2 border-t-amber-500 border-x border-b border-[#282828] flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-none bg-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  วางแผนจะซื้อ (Wishlist)
                </h3>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-amber-950/40 text-amber-300 border border-amber-500/30">
                  {plannedItems.length}
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                รวมราคาประเมิน: <strong className="text-amber-400">฿{formatMoney(stats.wishlistValue)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Wishlist Sort Selector */}
              <ItemSortDropdown
                value={wishlistSort}
                onChange={handleWishlistSortChange}
                options={WISHLIST_SORT_OPTIONS}
                accentColor="amber"
                title="จัดเรียงรายการใน Wishlist"
              />

              <button
                onClick={() => {
                  setEditingItem(null);
                  setFormModalMode('wishlist');
                  setDefaultFormStatus('planned');
                  setFormModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/40 rounded-none flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่ม Wishlist
              </button>
            </div>
          </div>

          {/* Planned Items Content */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-neutral-500">กำลังโหลดรายการ Wishlist...</div>
          ) : viewMode === 'grouped' ? (
            /* Grouped View */
            plannedGroups.length > 0 ? (
              <div className="space-y-3.5">
                {plannedGroups.map((group, groupIndex) => {
                  const groupKey = `planned-${group.categoryId}`;
                  const isCollapsed = collapsedCategories.has(groupKey);
                  const accent = getCategoryAccent(group.categoryId, group.categoryName);

                  return (
                    <div key={groupKey} className="border border-[#282828] bg-[#121212] shadow-sm">
                      {/* Category Subheader */}
                      <div className={`w-full px-3 py-2 bg-[#181818] border-b border-[#282828] border-l-4 ${accent.border} flex items-center justify-between transition-colors`}>
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapse(groupKey)}
                          className="flex items-center gap-2 text-left hover:text-white flex-1 transition-colors min-w-0"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          )}
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />
                          <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wide truncate">
                            {group.categoryName}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-none border shrink-0 ${accent.pill}`}>
                            {group.items.length} รายการ
                          </span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-mono font-bold text-amber-400 tabular-nums">
                            ฿{formatMoney(group.totalValue)}
                          </span>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCategoryOrder(group.categoryId, 'up', plannedGroups);
                              }}
                              disabled={groupIndex === 0}
                              title="เลื่อนหมวดหมู่นี้ขึ้น"
                              className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 transition-colors"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCategoryOrder(group.categoryId, 'down', plannedGroups);
                              }}
                              disabled={groupIndex === plannedGroups.length - 1}
                              title="เลื่อนหมวดหมู่นี้ลง"
                              className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 transition-colors"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items List - Hairline divide */}
                      {!isCollapsed && (
                        <div className="divide-y divide-[#1e1e1e]">
                          {group.items.map(item => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              onEdit={(it) => {
                                setEditingItem(it);
                                setFormModalMode('wishlist');
                                setDefaultFormStatus('planned');
                                setFormModalOpen(true);
                              }}
                              onDelete={handleDeleteItem}
                              onQuickPurchase={(it) => {
                                setLinkingItem(it);
                                setLinkModalMode('purchase');
                                setLinkModalOpen(true);
                              }}
                              onOpenLinkModal={(it) => {
                                setLinkingItem(it);
                                setLinkModalMode('manage');
                                setLinkModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-[#282828] text-center text-xs text-neutral-500">
                ไม่มีรายการที่วางแผนจะซื้อในขณะนี้
              </div>
            )
          ) : (
            /* Flat Continuous List View */
            plannedItems.length > 0 ? (
              <div className="border border-[#262626] bg-[#121212] divide-y divide-[#1e1e1e]">
                {plannedItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    showCategoryBadge={true}
                    onEdit={(it) => {
                      setEditingItem(it);
                      setFormModalMode('wishlist');
                      setDefaultFormStatus('planned');
                      setFormModalOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    onQuickPurchase={(it) => {
                      setLinkingItem(it);
                      setLinkModalMode('purchase');
                      setLinkModalOpen(true);
                    }}
                    onOpenLinkModal={(it) => {
                      setLinkingItem(it);
                      setLinkModalMode('manage');
                      setLinkModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-[#282828] text-center text-xs text-neutral-500">
                ไม่มีรายการที่วางแผนจะซื้อในขณะนี้
              </div>
            )
          )}

          {/* Cancelled Items Toggle Section */}
          {cancelledItems.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCancelled(!showCancelled)}
                className="w-full py-1.5 px-3 text-xs font-bold text-neutral-400 hover:text-neutral-200 bg-[#141414] border border-[#262626] flex items-center justify-between transition-colors"
              >
                <span>รายการที่ยกเลิกไปแล้ว ({cancelledItems.length})</span>
                <span className="text-[10px] uppercase text-neutral-500">
                  {showCancelled ? 'ซ่อน' : 'แสดง'}
                </span>
              </button>

              {showCancelled && (
                <div className="mt-1.5 border border-[#222] bg-[#101010] divide-y divide-[#1e1e1e]">
                  {cancelledItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      showCategoryBadge={true}
                      onEdit={(it) => {
                        setEditingItem(it);
                        setFormModalMode('wishlist');
                        setDefaultFormStatus('cancelled');
                        setFormModalOpen(true);
                      }}
                      onDelete={handleDeleteItem}
                      onOpenLinkModal={(it) => {
                        setLinkingItem(it);
                        setLinkModalMode('manage');
                        setLinkModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Possessions & Inventory ── */}
        <div className="space-y-3">
          {/* Column Header & Filter Tabs */}
          <div className="p-2.5 px-3 bg-[#181818] border-t-2 border-t-[#da291c] border-x border-b border-[#282828] space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-none bg-[#da291c]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                    สิ่งของที่มี / ซื้อแล้ว (Inventory)
                  </h3>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-red-950/40 text-red-300 border border-red-900/40">
                    {possessionItems.length}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  มูลค่ารวมกลุ่มนี้: <strong className="text-slate-100">
                    ฿{formatMoney(possessionItems.reduce((acc, i) => acc + i.display_price, 0))}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Inventory Sort Selector */}
                <ItemSortDropdown
                  value={inventorySort}
                  onChange={handleInventorySortChange}
                  options={INVENTORY_SORT_OPTIONS}
                  accentColor="red"
                  title="จัดเรียงรายการใน Inventory"
                />

                <button
                  onClick={() => {
                    setEditingItem(null);
                    setFormModalMode('inventory');
                    setDefaultFormStatus('purchased');
                    setFormModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-[#da291c] text-white hover:bg-red-700 rounded-none flex items-center gap-1.5 transition-colors shadow-md shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  บันทึกของใหม่
                </button>
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 border-t border-[#252525] pt-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setRightColumnFilter('purchased')}
                className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  rightColumnFilter === 'purchased'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ใช้งานอยู่ ({stats.activeCount})
              </button>

              <button
                onClick={() => setRightColumnFilter('stored')}
                className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  rightColumnFilter === 'stored'
                    ? 'bg-sky-950/40 text-sky-300 border-sky-500/50 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                <Archive className="w-3 h-3 text-sky-400" />
                เก็บเข้ากรุ ({stats.storedCount})
              </button>

              <button
                onClick={() => setRightColumnFilter('archived')}
                className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  rightColumnFilter === 'archived'
                    ? 'bg-red-950/40 text-red-300 border-red-700/50 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-[#da291c]" />
                พัง / ขายแล้ว ({stats.archivedCount})
              </button>

              <button
                onClick={() => setRightColumnFilter('ALL')}
                className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap ${
                  rightColumnFilter === 'ALL'
                    ? 'bg-[#2a2a2a] text-white border-neutral-500 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          {/* Possessions Content */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-neutral-500">กำลังโหลดรายการสิ่งของ...</div>
          ) : viewMode === 'grouped' ? (
            /* Grouped View */
            possessionGroups.length > 0 ? (
              <div className="space-y-3.5">
                {possessionGroups.map((group, groupIndex) => {
                  const groupKey = `possessions-${group.categoryId}`;
                  const isCollapsed = collapsedCategories.has(groupKey);
                  const accent = getCategoryAccent(group.categoryId, group.categoryName);

                  return (
                    <div key={groupKey} className="border border-[#282828] bg-[#121212] shadow-sm">
                      {/* Category Subheader */}
                      <div className={`w-full px-3 py-2 bg-[#181818] border-b border-[#282828] border-l-4 ${accent.border} flex items-center justify-between transition-colors`}>
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapse(groupKey)}
                          className="flex items-center gap-2 text-left hover:text-white flex-1 transition-colors min-w-0"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          )}
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />
                          <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wide truncate">
                            {group.categoryName}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-none border shrink-0 ${accent.pill}`}>
                            {group.items.length} รายการ
                          </span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-mono font-bold text-slate-100 tabular-nums">
                            ฿{formatMoney(group.totalValue)}
                          </span>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCategoryOrder(group.categoryId, 'up', possessionGroups);
                              }}
                              disabled={groupIndex === 0}
                              title="เลื่อนหมวดหมู่นี้ขึ้น"
                              className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 transition-colors"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCategoryOrder(group.categoryId, 'down', possessionGroups);
                              }}
                              disabled={groupIndex === possessionGroups.length - 1}
                              title="เลื่อนหมวดหมู่นี้ลง"
                              className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 transition-colors"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items List - Hairline divide */}
                      {!isCollapsed && (
                        <div className="divide-y divide-[#1e1e1e]">
                          {group.items.map(item => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              onEdit={(it) => {
                                setEditingItem(it);
                                setFormModalMode('inventory');
                                setDefaultFormStatus(it.status);
                                setFormModalOpen(true);
                              }}
                              onDelete={handleDeleteItem}
                              onOpenLinkModal={(it) => {
                                setLinkingItem(it);
                                setLinkModalMode('manage');
                                setLinkModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-[#282828] text-center text-xs text-neutral-500">
                ไม่พบรายการสิ่งของในหมวดนี้
              </div>
            )
          ) : (
            /* Flat Continuous List View */
            possessionItems.length > 0 ? (
              <div className="border border-[#262626] bg-[#121212] divide-y divide-[#1e1e1e]">
                {possessionItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    showCategoryBadge={true}
                    onEdit={(it) => {
                      setEditingItem(it);
                      setFormModalMode('inventory');
                      setDefaultFormStatus(it.status);
                      setFormModalOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    onOpenLinkModal={(it) => {
                      setLinkingItem(it);
                      setLinkModalMode('manage');
                      setLinkModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-[#282828] text-center text-xs text-neutral-500">
                ไม่พบรายการสิ่งของในหมวดนี้
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ItemFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        categories={categories}
        defaultStatus={defaultFormStatus}
        initialMode={formModalMode}
        onOpenCategoryManager={() => setCategoryModalOpen(true)}
        onQuickPurchaseWishlist={(it) => {
          setLinkingItem(it);
          setLinkModalMode('purchase');
          setLinkModalOpen(true);
        }}
        onOpenLinkModal={(it) => {
          setLinkingItem(it);
          setLinkModalMode('manage');
          setLinkModalOpen(true);
        }}
        onRefreshCategories={fetchData}
        lastCreatedCategory={lastCreatedCategory}
      />

      <LinkTransactionsModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        item={linkingItem}
        mode={linkModalMode}
        onLinkSuccess={() => {
          fetchData();
        }}
        onConfirmPurchase={handleConfirmPurchase}
      />

      <ItemCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onRefreshCategories={fetchData}
        onCategoryCreated={(cat) => setLastCreatedCategory(cat)}
      />
    </div>
  );
}
