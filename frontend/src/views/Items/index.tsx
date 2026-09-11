import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Plus, Sparkles, Filter, Search, ChevronDown, ChevronRight,
  ShieldCheck, AlertTriangle, Archive, Tag, RefreshCw, XCircle, ShoppingBag
} from 'lucide-react';
import { ItemWithDetails, ItemCategory, ItemStatus, CreateItemPayload, UpdateItemPayload } from '../../types';
import { itemService } from '../../services/api';
import { formatMoney } from '../../utils/formatters';
import {
  groupItemsByCategory,
  calculateItemStats,
  STATUS_CONFIG
} from '../../utils/itemHelpers';

import ItemCard from './ItemCard';
import ItemFormModal from './ItemFormModal';
import LinkTransactionsModal from './LinkTransactionsModal';
import QuickPurchaseModal from './QuickPurchaseModal';
import ItemCategoryModal from './ItemCategoryModal';

export default function ItemsView() {
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  
  // Right-column status filter: 'purchased' | 'stored' | 'archived' | 'ALL'
  const [rightColumnFilter, setRightColumnFilter] = useState<'purchased' | 'stored' | 'archived' | 'ALL'>('purchased');
  const [showCancelled, setShowCancelled] = useState(false);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [defaultFormStatus, setDefaultFormStatus] = useState<ItemStatus>('planned');
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingItem, setLinkingItem] = useState<ItemWithDetails | null>(null);

  const [quickPurchaseModalOpen, setQuickPurchaseModalOpen] = useState(false);
  const [quickPurchaseItem, setQuickPurchaseItem] = useState<ItemWithDetails | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Collapsed categories tracking
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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

  // Split into Planned (Left) and Possessions (Right)
  const plannedItems = useMemo(() => {
    return filteredItems.filter(i => i.status === 'planned');
  }, [filteredItems]);

  const cancelledItems = useMemo(() => {
    return filteredItems.filter(i => i.status === 'cancelled');
  }, [filteredItems]);

  const possessionItems = useMemo(() => {
    return filteredItems.filter(i => {
      if (i.status === 'planned' || i.status === 'cancelled') return false;
      if (rightColumnFilter === 'purchased') return i.status === 'purchased';
      if (rightColumnFilter === 'stored') return i.status === 'stored';
      if (rightColumnFilter === 'archived') return i.status === 'broken' || i.status === 'sold';
      return true; // 'ALL'
    });
  }, [filteredItems, rightColumnFilter]);

  // Group items by category
  const plannedGroups = useMemo(() => groupItemsByCategory(plannedItems), [plannedItems]);
  const possessionGroups = useMemo(() => groupItemsByCategory(possessionItems), [possessionItems]);

  // CRUD Actions
  const handleSaveItem = async (payload: CreateItemPayload | UpdateItemPayload, id?: number) => {
    if (id) {
      await itemService.update(id, payload);
    } else {
      await itemService.create(payload as CreateItemPayload);
    }
    await fetchData();
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

  // Quick purchase confirmation
  const handleConfirmQuickPurchase = async (itemId: number, purchasedAt: string, openLinkModalAfter: boolean) => {
    const updated = await itemService.updateStatus(itemId, 'purchased', { purchased_at: purchasedAt });
    await fetchData();

    if (openLinkModalAfter) {
      setLinkingItem(updated);
      setLinkModalOpen(true);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Cockpit Asset HUD (Top High-Density Overview) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#2e2e2e] border border-[#2e2e2e] shadow-lg">
        {/* Card 1: Active Possessions */}
        <div className="p-4 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ทรัพย์สินที่ใช้งานอยู่
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="mt-2 font-mono">
            <div className="text-xl md:text-2xl font-black text-slate-100 tabular-nums">
              ฿{formatMoney(stats.activePossessionsValue)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {stats.activeCount} รายการที่กำลังใช้งาน
            </div>
          </div>
        </div>

        {/* Card 2: Stored Possessions */}
        <div className="p-4 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ของในกรุ / สำรอง
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
          </div>
          <div className="mt-2 font-mono">
            <div className="text-xl md:text-2xl font-black text-slate-100 tabular-nums">
              ฿{formatMoney(stats.storedValue)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {stats.storedCount} รายการเก็บสำรองไว้
            </div>
          </div>
        </div>

        {/* Card 3: Wishlist Planned */}
        <div className="p-4 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ประมาณการ Wishlist
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </div>
          <div className="mt-2 font-mono">
            <div className="text-xl md:text-2xl font-black text-amber-400 tabular-nums">
              ฿{formatMoney(stats.wishlistValue)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {stats.plannedCount} รายการที่วางแผนจะซื้อ
            </div>
          </div>
        </div>

        {/* Card 4: Archived & Sold */}
        <div className="p-4 bg-[#121212] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              ประวัติ พัง / ขายแล้ว
            </span>
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
          </div>
          <div className="mt-2 font-mono">
            <div className="text-xl md:text-2xl font-black text-neutral-300 tabular-nums">
              {stats.archivedCount} <span className="text-sm font-normal text-neutral-500">ชิ้น</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              เก็บประวัติ {stats.cancelledCount > 0 ? `· ยกเลิก ${stats.cancelledCount}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Filter & Action Bar ── */}
      <div className="p-3 bg-[#141414] border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Search & Category Filter */}
        <div className="flex items-center gap-2 flex-grow max-w-xl">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสิ่งของ, ยี่ห้อ, แหล่งซื้อ หรือโน้ต..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#1a1a1a] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
            />
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333] text-slate-200 text-xs rounded-none focus:outline-none focus:border-[#da291c] shrink-0"
          >
            <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
            {categories.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold text-neutral-300 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-none flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-neutral-400" />
            หมวดหมู่สิ่งของ
          </button>

          <button
            onClick={fetchData}
            title="รีเฟรชข้อมูล"
            className="p-1.5 text-neutral-400 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-none transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2-Column Tactical Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN (lg:col-span-5): Planned / Wishlist ── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Column Header */}
          <div className="p-3 bg-[#181818] border-t-2 border-t-amber-500 border-x border-b border-[#282828] flex items-center justify-between gap-2">
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
                รวมประมาณการ: <strong className="text-amber-400">฿{formatMoney(stats.wishlistValue)}</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setDefaultFormStatus('planned');
                setFormModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/40 rounded-none flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม Wishlist
            </button>
          </div>

          {/* Planned Items Grouped by Category */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-neutral-500">กำลังโหลดรายการ Wishlist...</div>
          ) : plannedGroups.length > 0 ? (
            <div className="space-y-4">
              {plannedGroups.map(group => {
                const groupKey = `planned-${group.categoryId}`;
                const isCollapsed = collapsedCategories.has(groupKey);

                return (
                  <div key={groupKey} className="border border-[#262626] bg-[#121212]">
                    {/* Category Subheader */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(groupKey)}
                      className="w-full px-3 py-2 bg-[#161616] border-b border-[#262626] flex items-center justify-between text-left hover:bg-[#1c1c1c] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                        )}
                        <span className="text-xs font-bold text-slate-200">{group.categoryName}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({group.items.length})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                        ฿{formatMoney(group.totalValue)}
                      </span>
                    </button>

                    {/* Items List */}
                    {!isCollapsed && (
                      <div className="p-2.5 space-y-2">
                        {group.items.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onEdit={(it) => {
                              setEditingItem(it);
                              setFormModalOpen(true);
                            }}
                            onDelete={handleDeleteItem}
                            onQuickPurchase={(it) => {
                              setQuickPurchaseItem(it);
                              setQuickPurchaseModalOpen(true);
                            }}
                            onQuickCancel={handleQuickCancel}
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
          )}

          {/* Cancelled Items Toggle Section */}
          {cancelledItems.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCancelled(!showCancelled)}
                className="w-full py-2 px-3 text-xs font-bold text-neutral-400 hover:text-neutral-200 bg-[#141414] border border-[#262626] flex items-center justify-between transition-colors"
              >
                <span>รายการที่ยกเลิกไปแล้ว ({cancelledItems.length})</span>
                <span className="text-[10px] uppercase text-neutral-500">
                  {showCancelled ? 'ซ่อน' : 'แสดง'}
                </span>
              </button>

              {showCancelled && (
                <div className="mt-2 p-2 bg-[#101010] border border-[#222] space-y-2">
                  {cancelledItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={(it) => {
                        setEditingItem(it);
                        setFormModalOpen(true);
                      }}
                      onDelete={handleDeleteItem}
                      onChangeStatus={handleChangeStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (lg:col-span-7): Possessions & Inventory ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Column Header & Filter Tabs */}
          <div className="p-3 bg-[#181818] border-t-2 border-t-[#da291c] border-x border-b border-[#282828] space-y-3">
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
                  มูลค่ารวมกลุ่มนี้: <strong className="text-emerald-400">
                    ฿{formatMoney(possessionItems.reduce((acc, i) => acc + i.display_price, 0))}
                  </strong>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingItem(null);
                  setDefaultFormStatus('purchased');
                  setFormModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-[#da291c] text-white hover:bg-red-700 rounded-none flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                บันทึกของใหม่
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 border-t border-[#252525] pt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setRightColumnFilter('purchased')}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
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
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  rightColumnFilter === 'stored'
                    ? 'bg-sky-950/40 text-sky-300 border-sky-500/50 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-sky-400" />
                เก็บเข้ากรุ ({stats.storedCount})
              </button>

              <button
                onClick={() => setRightColumnFilter('archived')}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  rightColumnFilter === 'archived'
                    ? 'bg-red-950/40 text-red-300 border-red-700/50 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#da291c]" />
                พัง / ขายแล้ว ({stats.archivedCount})
              </button>

              <button
                onClick={() => setRightColumnFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none border transition-colors whitespace-nowrap ${
                  rightColumnFilter === 'ALL'
                    ? 'bg-[#2a2a2a] text-white border-neutral-500 shadow-sm'
                    : 'bg-[#141414] text-neutral-400 border-[#282828] hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          {/* Possessions Grouped by Category */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-neutral-500">กำลังโหลดรายการสิ่งของ...</div>
          ) : possessionGroups.length > 0 ? (
            <div className="space-y-4">
              {possessionGroups.map(group => {
                const groupKey = `possessions-${group.categoryId}`;
                const isCollapsed = collapsedCategories.has(groupKey);

                return (
                  <div key={groupKey} className="border border-[#262626] bg-[#121212]">
                    {/* Category Subheader */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(groupKey)}
                      className="w-full px-3 py-2 bg-[#161616] border-b border-[#262626] flex items-center justify-between text-left hover:bg-[#1c1c1c] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                        )}
                        <span className="text-xs font-bold text-slate-200">{group.categoryName}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({group.items.length})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                        ฿{formatMoney(group.totalValue)}
                      </span>
                    </button>

                    {/* Items List */}
                    {!isCollapsed && (
                      <div className="p-2.5 space-y-2">
                        {group.items.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onEdit={(it) => {
                              setEditingItem(it);
                              setFormModalOpen(true);
                            }}
                            onDelete={handleDeleteItem}
                            onOpenLinkModal={(it) => {
                              setLinkingItem(it);
                              setLinkModalOpen(true);
                            }}
                            onChangeStatus={handleChangeStatus}
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
        onOpenCategoryManager={() => setCategoryModalOpen(true)}
      />

      <LinkTransactionsModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        item={linkingItem}
        onLinkSuccess={() => {
          fetchData();
        }}
      />

      <QuickPurchaseModal
        isOpen={quickPurchaseModalOpen}
        onClose={() => setQuickPurchaseModalOpen(false)}
        item={quickPurchaseItem}
        onConfirm={handleConfirmQuickPurchase}
      />

      <ItemCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onRefreshCategories={fetchData}
      />
    </div>
  );
}
