import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Sparkles, Tag, ShieldCheck, ShieldOff, Shield, Calendar, Info, Package,
  Archive, AlertTriangle, CheckCircle2, DollarSign, ExternalLink,
  Layers, Check, Clock, Link as LinkIcon, Lightbulb
} from 'lucide-react';
import {
  ItemWithDetails, ItemCategory, ItemStatus, CreateItemPayload, UpdateItemPayload, LinkedTransactionInfo
} from '../../types';
import { itemService } from '../../services/api';
import { getWarrantyStatus } from '../../utils/itemHelpers';
import { formatNumberWithCommas, parseCleanNumber } from '../../utils/formatters';
import DatePicker from '../../components/ui/DatePicker';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    payload: CreateItemPayload | UpdateItemPayload,
    id?: number,
    options?: { openLinkModalAfter?: boolean }
  ) => Promise<void>;
  editingItem?: ItemWithDetails | null;
  categories: ItemCategory[];
  defaultStatus?: ItemStatus;
  initialMode?: 'wishlist' | 'inventory';
  onOpenCategoryManager?: () => void;
  onQuickPurchaseWishlist?: (item: ItemWithDetails) => void;
  onOpenLinkModal?: (item: ItemWithDetails) => void;
  onRefreshCategories?: () => void;
  lastCreatedCategory?: ItemCategory | null;
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  categories,
  defaultStatus = 'planned',
  initialMode,
  onOpenCategoryManager,
  onQuickPurchaseWishlist,
  onOpenLinkModal,
  onRefreshCategories,
  lastCreatedCategory
}: ItemFormModalProps) {
  // Mode: 'wishlist' (วางแผนจะซื้อ) vs 'inventory' (สิ่งของที่มีในครอบครอง)
  const [activeMode, setActiveMode] = useState<'wishlist' | 'inventory'>('wishlist');

  // Common Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [brandModel, setBrandModel] = useState('');
  const [source, setSource] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');

  // Wishlist-Specific Fields
  const [priority, setPriority] = useState<number>(5);

  // Inventory-Specific Fields
  const [inventoryStatus, setInventoryStatus] = useState<ItemStatus>('purchased');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [brokenAt, setBrokenAt] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [warrantyYears, setWarrantyYears] = useState<number | null>(null);
  const [hasWarranty, setHasWarranty] = useState<boolean>(false);
  const [openLinkModalAfter, setOpenLinkModalAfter] = useState(false);
  const [linkedTxs, setLinkedTxs] = useState<LinkedTransactionInfo[]>([]);

  // Helper to calculate target warranty date from baseDate + years
  const calcWarrantyDate = (baseDateStr: string, years: number): string => {
    if (!baseDateStr) return '';
    const [y, m, d] = baseDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const target = new Date(y, m - 1, d);
    target.setFullYear(target.getFullYear() + years);
    const cy = target.getFullYear();
    const cm = String(target.getMonth() + 1).padStart(2, '0');
    const cd = String(target.getDate()).padStart(2, '0');
    return `${cy}-${cm}-${cd}`;
  };

  // Inline Category Quick Creation
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync category when newly created externally
  useEffect(() => {
    if (lastCreatedCategory) {
      setCategoryId(lastCreatedCategory.id);
    }
  }, [lastCreatedCategory]);

  // Track modal open state to prevent unwanted wipes when categories reload
  const prevIsOpenRef = React.useRef(false);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = true;

    // Only reset form when opening freshly or when editingItem changes
    if (!wasOpen || editingItem) {
      if (editingItem) {
        // Determine mode from existing item status
        const isWishlist = editingItem.status === 'planned' || editingItem.status === 'cancelled';
        setActiveMode(isWishlist ? 'wishlist' : 'inventory');

        setName(editingItem.name || '');
        setCategoryId(editingItem.category_id);
        setBrandModel(editingItem.brand_model || '');
        setSource(editingItem.source || '');
        setPrice(editingItem.price != null ? formatNumberWithCommas(editingItem.price) : '');
        setDescription(editingItem.description || '');

        // Wishlist fields
        setPriority(editingItem.priority ?? 0);

        // Inventory fields
        setInventoryStatus(
          ['purchased', 'stored', 'broken', 'sold'].includes(editingItem.status)
            ? editingItem.status
            : 'purchased'
        );
        const pDate = editingItem.purchased_at || '';
        const wDate = editingItem.warranty_until || '';
        setPurchasedAt(pDate);
        setBrokenAt(editingItem.broken_at || '');
        setWarrantyUntil(wDate);
        setHasWarranty(Boolean(wDate));

        // Auto-detect if existing warranty date matches a preset
        if (pDate && wDate) {
          const matched = [1, 2, 3, 5].find(y => calcWarrantyDate(pDate, y) === wDate);
          setWarrantyYears(matched ?? null);
        } else {
          setWarrantyYears(null);
        }

        // Fetch linked transactions if this item has links
        if (editingItem.linked_count > 0) {
          itemService.getById(editingItem.id).then((detailed) => {
            if (detailed?.linked_transactions) {
              setLinkedTxs(detailed.linked_transactions);
            }
          }).catch((err) => {
            console.error('Failed to load item linked transactions:', err);
          });
        } else {
          setLinkedTxs([]);
        }

        setOpenLinkModalAfter(false);
      } else {
        // New Item: Set mode based on explicit initialMode or defaultStatus
        const mode = initialMode || (defaultStatus === 'planned' || defaultStatus === 'cancelled' ? 'wishlist' : 'inventory');
        setActiveMode(mode);

        setName('');
        setCategoryId(categories[0]?.id || 1);
        setBrandModel('');
        setSource('');
        setPrice('');
        setDescription('');

        // Wishlist
        setPriority(5);

        // Inventory
        setInventoryStatus('purchased');
        setPurchasedAt(new Date().toISOString().split('T')[0]);
        setBrokenAt('');
        setWarrantyUntil('');
        setWarrantyYears(null);
        setHasWarranty(false);
        setLinkedTxs([]);
        setOpenLinkModalAfter(false);
      }

      setShowInlineCat(false);
      setInlineCatName('');
      setError('');
    }
  }, [isOpen, editingItem, defaultStatus, initialMode]);

  // Live Dynamic Warranty Status
  const liveWarranty = useMemo(() => {
    if (!warrantyUntil) return null;
    return getWarrantyStatus(warrantyUntil);
  }, [warrantyUntil]);

  // Sorted linked transaction dates (earliest to latest)
  const linkedTxDatesSorted = useMemo(() => {
    if (!linkedTxs || linkedTxs.length === 0) return [];
    return [...linkedTxs].sort((a, b) => a.date.localeCompare(b.date));
  }, [linkedTxs]);

  const earliestLinkedTx = linkedTxDatesSorted[0];
  const latestLinkedTx = linkedTxDatesSorted[linkedTxDatesSorted.length - 1];
  const hasMultipleLinkedDates = earliestLinkedTx && latestLinkedTx && earliestLinkedTx.date !== latestLinkedTx.date;

  // Quick Warranty Preset Adder (Synced with purchase date)
  const handleSetWarrantyYears = (years: number | null) => {
    setWarrantyYears(years);
    if (years === null) {
      setWarrantyUntil('');
      setHasWarranty(false);
      return;
    }
    setHasWarranty(true);
    const base = purchasedAt || new Date().toISOString().split('T')[0];
    if (!purchasedAt) {
      setPurchasedAt(base);
    }
    const targetDateStr = calcWarrantyDate(base, years);
    setWarrantyUntil(targetDateStr);
  };

  // Toggle warranty tracking mode (has warranty vs no warranty)
  const handleToggleWarranty = (enable: boolean) => {
    setHasWarranty(enable);
    if (!enable) {
      setWarrantyUntil('');
      setWarrantyYears(null);
    } else {
      if (!warrantyUntil) {
        handleSetWarrantyYears(1);
      }
    }
  };

  // When purchase date changes, auto-sync warrantyUntil if a preset is active
  const handlePurchasedAtChange = (newDate: string) => {
    setPurchasedAt(newDate);
    if (hasWarranty && warrantyYears !== null && newDate) {
      const syncedWarranty = calcWarrantyDate(newDate, warrantyYears);
      setWarrantyUntil(syncedWarranty);
    }
  };

  // When warrantyUntil date changes directly from DatePicker
  const handleWarrantyUntilChange = (newDate: string) => {
    setWarrantyUntil(newDate);
    if (!newDate) {
      setWarrantyYears(null);
      setHasWarranty(false);
      return;
    }
    setHasWarranty(true);
    if (purchasedAt) {
      const matched = [1, 2, 3, 5].find(y => calcWarrantyDate(purchasedAt, y) === newDate);
      setWarrantyYears(matched ?? null);
    } else {
      setWarrantyYears(null);
    }
  };

  // Comma-separated price input handling
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only digits and dot
    const clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return; // Prevent multiple dots

    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }

    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length === 2 ? `${intFormatted}.${parts[1]}` : intFormatted;
    setPrice(formatted);
  };

  const handlePriceBlur = () => {
    if (!price) return;
    const clean = price.replace(/,/g, '').trim();
    if (clean.endsWith('.')) {
      setPrice(formatNumberWithCommas(clean.slice(0, -1)));
    }
  };

  if (!isOpen) return null;

  // Inline Category Creator
  const handleCreateInlineCategory = async () => {
    const trimmed = inlineCatName.trim();
    if (!trimmed) return;

    setIsCreatingCat(true);
    setError('');
    try {
      const created = await itemService.createCategory(trimmed);
      if (onRefreshCategories) onRefreshCategories();
      setCategoryId(created.id);
      setShowInlineCat(false);
      setInlineCatName('');
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้างหมวดหมู่ใหม่ได้');
    } finally {
      setIsCreatingCat(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(activeMode === 'wishlist' ? 'กรุณาระบุชื่อเป้าหมายที่อยากได้' : 'กรุณาระบุชื่อสิ่งของ / ทรัพย์สิน');
      return;
    }
    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const numPrice = parseCleanNumber(price);
      if (price.trim() !== '' && (numPrice === null || numPrice < 0)) {
        setError('กรุณาระบุราคาที่ถูกต้อง');
        setIsSubmitting(false);
        return;
      }

      let payload: CreateItemPayload;

      if (activeMode === 'wishlist') {
        // Wishlist Payload
        payload = {
          name: name.trim(),
          category_id: categoryId,
          brand_model: brandModel.trim() || null,
          source: source.trim() || null,
          status: editingItem?.status === 'cancelled' ? 'cancelled' : 'planned',
          price: numPrice,
          priority: Number(priority) || 0,
          description: description.trim() || null,
          purchased_at: null,
          broken_at: null,
          warranty_until: null
        };
      } else {
        // Inventory / Asset Payload
        const isMovedToPlanned = inventoryStatus === 'planned';
        payload = {
          name: name.trim(),
          category_id: categoryId,
          brand_model: brandModel.trim() || null,
          source: source.trim() || null,
          status: inventoryStatus,
          price: numPrice,
          purchased_at: isMovedToPlanned ? null : (purchasedAt || null),
          broken_at: (!isMovedToPlanned && inventoryStatus === 'broken') ? (brokenAt || null) : null,
          warranty_until: (!isMovedToPlanned && hasWarranty && warrantyUntil) ? warrantyUntil : null,
          priority: isMovedToPlanned ? 5 : 0,
          description: description.trim() || null
        };
      }

      await onSave(payload, editingItem?.id, { openLinkModalAfter: activeMode === 'inventory' && !editingItem && openLinkModalAfter });
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className={`w-full max-w-4xl xl:max-w-5xl bg-[#141414] border shadow-2xl rounded-none flex flex-col my-auto max-h-[92vh] transition-colors duration-150 ${
        activeMode === 'wishlist'
          ? 'border-amber-500/40'
          : 'border-[#da291c]/50'
      }`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#282828] bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-none ${
              activeMode === 'wishlist'
                ? 'bg-amber-500'
                : 'bg-[#da291c]'
            }`} />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  {editingItem
                    ? (activeMode === 'wishlist' ? 'แก้ไขเป้าหมาย Wishlist' : 'แก้ไขข้อมูลทรัพย์สิน')
                    : (activeMode === 'wishlist' ? 'เพิ่มรายการสิ่งที่อยากได้ (Wishlist Planner)' : 'บันทึกของที่มีในครอบครอง (Inventory Asset)')
                  }
                </h3>
                <span className={`text-[10px] font-mono font-black px-2 py-0.5 uppercase tracking-widest border ${
                  activeMode === 'wishlist'
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                    : 'bg-red-950/40 text-red-200 border-red-800/40'
                }`}>
                  {activeMode === 'wishlist' ? 'WISHLIST TARGET' : 'ASSET RECORD'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {activeMode === 'wishlist'
                  ? 'วางแผนงบประมาณ จัดลำดับความสำคัญ และบันทึกแหล่งซื้อที่เล็งไว้'
                  : 'บันทึกทรัพย์สิน วันที่ซื้อ ข้อมูลประกัน และสภาพการใช้งานจริง'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Mode Switcher Tabs (Only displayed when creating new item) */}
        {!editingItem && (
          <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#0e0e0e] border-b border-[#252525] shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('wishlist')}
              className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeMode === 'wishlist'
                  ? 'bg-amber-950/50 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#141414] text-neutral-400 hover:text-neutral-200 border border-[#222]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>วางแผนจะซื้อ (Wishlist Planner)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('inventory')}
              className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeMode === 'inventory'
                  ? 'bg-red-950/50 text-red-200 border border-[#da291c]/60 shadow-sm'
                  : 'bg-[#141414] text-neutral-400 hover:text-neutral-200 border border-[#222]'
              }`}
            >
              <Package className="w-4 h-4 text-[#da291c]" />
              <span>สิ่งของที่มีในครอบครอง (Inventory Asset)</span>
            </button>
          </div>
        )}

        {/* Quick Convert Banner in Edit Mode (If this is a planned wishlist item) */}
        {editingItem && activeMode === 'wishlist' && editingItem.status === 'planned' && onQuickPurchaseWishlist && (
          <div className="px-6 py-2.5 bg-emerald-950/30 border-b border-emerald-500/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ซื้อสิ่งของชิ้นนี้แล้ว? สามารถย้ายเข้าสู่คลังสิ่งของได้ทันที</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onQuickPurchaseWishlist(editingItem);
              }}
              className="px-3 py-1 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-black rounded-none shadow-sm transition-colors whitespace-nowrap"
            >
              บันทึกซื้อแล้ว
            </button>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-red-950/40 text-red-300 border border-red-800/60 rounded-none flex items-start gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Item Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 1. Item Name */}
            <div className="md:col-span-7">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center gap-1">
                <span>{activeMode === 'wishlist' ? 'ชื่อสินค้า / สิ่งที่อยากได้' : 'ชื่อสิ่งของ / ทรัพย์สิน'}</span>
                <span className={activeMode === 'wishlist' ? 'text-amber-400' : 'text-[#da291c]'}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  activeMode === 'wishlist'
                    ? 'เช่น คีย์บอร์ด Custom, จอคอม 4K, หูฟังไร้สาย'
                    : 'เช่น MacBook Pro M3 Max, เก้าอี้ Herman Miller Aeron, iPhone 15 Pro'
                }
                className={`w-full px-3.5 py-2 bg-[#1b1b1b] border text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none transition-colors ${
                  activeMode === 'wishlist'
                    ? 'border-[#333] focus:border-amber-500'
                    : 'border-[#333] focus:border-[#da291c]'
                }`}
                autoFocus
              />
            </div>

            {/* 2. Category & Quick Category Adder */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                  <span>หมวดหมู่</span>
                  <span className={activeMode === 'wishlist' ? 'text-amber-400' : 'text-[#da291c]'}>*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInlineCat(!showInlineCat)}
                    className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
                      showInlineCat
                        ? 'text-neutral-400 hover:text-white'
                        : (activeMode === 'wishlist' ? 'text-amber-400 hover:text-amber-300' : 'text-[#da291c] hover:text-red-400')
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showInlineCat ? 'ปิดเพิ่มด่วน' : 'เพิ่มหมวดหมู่ด่วน'}</span>
                  </button>

                  {onOpenCategoryManager && (
                    <button
                      type="button"
                      onClick={onOpenCategoryManager}
                      className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 border-l border-neutral-700 pl-2"
                    >
                      <Layers className="w-3 h-3" />
                      <span>จัดการหมวดหมู่</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Quick Add Input */}
              {showInlineCat && (
                <div className="mb-2 p-2.5 bg-[#181818] border border-[#2e2e2e] space-y-1.5 animate-in fade-in duration-150">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">สร้างหมวดหมู่ใหม่ทันที:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inlineCatName}
                      onChange={(e) => setInlineCatName(e.target.value)}
                      placeholder="พิมพ์ชื่อหมวดหมู่ใหม่ เช่น กล้อง & เลนส์..."
                      className="flex-grow px-2.5 py-1.5 bg-[#121212] border border-[#333] text-slate-100 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateInlineCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateInlineCategory}
                      disabled={isCreatingCat || !inlineCatName.trim()}
                      className="px-3 py-1.5 text-xs font-bold bg-[#da291c] text-white hover:bg-red-700 rounded-none disabled:opacity-50 transition-colors shrink-0"
                    >
                      {isCreatingCat ? '...' : '+ เพิ่ม'}
                    </button>
                  </div>
                </div>
              )}

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 (Inventory Only): Status Selector */}
          {activeMode === 'inventory' && (
            <div className="p-3.5 bg-[#181818] border border-[#282828] space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-300">
                สถานะการใช้งานจริง
              </label>
              <div className={`grid gap-2 ${editingItem ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                <button
                  type="button"
                  onClick={() => setInventoryStatus('purchased')}
                  className={`p-2.5 border text-left transition-all rounded-none ${
                    inventoryStatus === 'purchased'
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-[#141414] border-[#2c2c2c] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-xs">ใช้งานอยู่</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 truncate">กำลังใช้งานจริงในชีวิตประจำวัน</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryStatus('stored')}
                  className={`p-2.5 border text-left transition-all rounded-none ${
                    inventoryStatus === 'stored'
                      ? 'bg-sky-950/50 border-sky-500 text-sky-300 shadow-sm'
                      : 'bg-[#141414] border-[#2c2c2c] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-bold text-xs">เก็บเข้ากรุ</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 truncate">สำรอง / เก็บไว้ในตู้</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryStatus('broken')}
                  className={`p-2.5 border text-left transition-all rounded-none ${
                    inventoryStatus === 'broken'
                      ? 'bg-red-950/50 border-[#da291c] text-red-300 shadow-sm'
                      : 'bg-[#141414] border-[#2c2c2c] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#da291c] shrink-0" />
                    <span className="font-bold text-xs">พัง / ชำรุด</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 truncate">เสีย / ใช้งานไม่ได้ / รอซ่อม</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryStatus('sold')}
                  className={`p-2.5 border text-left transition-all rounded-none ${
                    inventoryStatus === 'sold'
                      ? 'bg-[#232323] border-neutral-400 text-neutral-200 shadow-sm'
                      : 'bg-[#141414] border-[#2c2c2c] text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-bold text-xs">ขายแล้ว</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 truncate">ส่งต่อ / ปลดระวาง / มีรายรับคืน</div>
                </button>

                {editingItem && (
                  <button
                    type="button"
                    onClick={() => setInventoryStatus('planned')}
                    className={`p-2.5 border text-left transition-all rounded-none ${
                      inventoryStatus === 'planned'
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-[#141414] border-[#2c2c2c] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-bold text-xs">กลับ Wishlist</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1 truncate">ย้ายไปวางแผนซื้อใหม่</div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Balanced 2-Column Desktop Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Acquisition & Pricing */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  {activeMode === 'wishlist' ? 'แบรนด์ / ยี่ห้อ / รุ่น' : 'ยี่ห้อ / รุ่น'}
                </label>
                <input
                  type="text"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  placeholder={
                    activeMode === 'wishlist'
                      ? 'เช่น Keychron Q1 Pro, Dell U2723QE, Sony WH-1000XM5'
                      : 'เช่น Apple, Sony, Herman Miller'
                  }
                  className={`w-full px-3 py-2 bg-[#1b1b1b] border text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none transition-colors ${
                    activeMode === 'wishlist' ? 'border-[#333] focus:border-amber-500' : 'border-[#333] focus:border-[#da291c]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  {activeMode === 'wishlist' ? 'ร้านค้า / แหล่งซื้อที่เล็งไว้' : 'ร้านค้า / ซื้อจากที่ไหน'}
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={
                    activeMode === 'wishlist'
                      ? 'เช่น Shopee Mall, Banana IT, Central World, หน้าร้านฟอร์จูน'
                      : 'เช่น Studio 7, Advice, HomePro, Shopee'
                  }
                  className={`w-full px-3 py-2 bg-[#1b1b1b] border text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none transition-colors ${
                    activeMode === 'wishlist' ? 'border-[#333] focus:border-amber-500' : 'border-[#333] focus:border-[#da291c]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>{activeMode === 'wishlist' ? 'งบประมาณ / ราคาประเมิน (บาท)' : 'ราคาที่ซื้อมา (บาท)'}</span>
                  {activeMode === 'wishlist' && (
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      * ราคาประเมิน
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={handlePriceChange}
                  onBlur={handlePriceBlur}
                  placeholder={activeMode === 'wishlist' ? '0.00 (ราคาประเมิน)' : '0.00'}
                  className={`w-full px-3 py-2 bg-[#1b1b1b] border text-slate-100 placeholder-neutral-500 rounded-sm text-sm font-mono tabular-nums focus:outline-none transition-colors ${
                    activeMode === 'wishlist' ? 'border-[#333] focus:border-amber-500' : 'border-[#333] focus:border-[#da291c]'
                  }`}
                />
                <p className="mt-1 text-[10px] text-neutral-500 flex items-center gap-1">
                  <Info className="w-3 h-3 text-neutral-500 shrink-0" />
                  {activeMode === 'wishlist'
                    ? 'ราคาประเมินล่วงหน้าเพื่อคำนวณงบประมาณ (เมื่อซื้อจริงสามารถกดแปลงและผูกกับ Transaction ในบัญชีได้)'
                    : 'ราคาที่ซื้อจริงตามใบเสร็จ (สามารถกดผูกกับ Transaction ในระบบเพื่อบันทึกงวดและราคาอัตโนมัติ)'
                  }
                </p>
              </div>

              {/* Next Action: Link Transaction Checkbox (Only when creating new Inventory item) */}
              {activeMode === 'inventory' && !editingItem && (
                <div className="p-3 bg-[#181818] border border-[#2a2a2a] flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="linkAfterSave"
                    checked={openLinkModalAfter}
                    onChange={(e) => setOpenLinkModalAfter(e.target.checked)}
                    className="w-4 h-4 accent-[#da291c] rounded-none cursor-pointer"
                  />
                  <label htmlFor="linkAfterSave" className="text-xs text-neutral-300 cursor-pointer select-none">
                    <strong className="text-white">เปิดหน้าต่างผูก Transaction รายจ่ายทันที</strong> หลังบันทึกเสร็จ
                  </label>
                </div>
              )}

              {/* Editing Mode: Direct Linked Transactions Management HUD */}
              {editingItem && (
                <div className="p-3 bg-[#141414] border border-[#282828] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>รายการบัญชีที่ผูกไว้ ({editingItem.linked_count || 0})</span>
                    </span>
                    {onOpenLinkModal && (
                      <button
                        type="button"
                        onClick={() => onOpenLinkModal(editingItem)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#1b1b1b] hover:bg-[#252525] text-blue-400 hover:text-blue-300 border border-blue-900/50 hover:border-blue-700 transition-colors flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>จัดการรายการผูก</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-[#222]">
                    <span className="text-neutral-500 text-[11px]">ยอดเงินรวมที่ผูกในบัญชี:</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {(editingItem.linked_satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Mode Specific */}
            <div>
              {activeMode === 'wishlist' ? (
                /* Wishlist Mode: Tactical Priority Selector */
                <div className="p-4 bg-[#181818] border border-[#282828] h-full flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>ระดับความอยากได้ / Tactical Priority</span>
                      </label>
                      <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${
                        priority >= 8
                          ? 'bg-red-950/60 text-red-300 border-red-700'
                          : priority >= 4
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-500'
                      }`}>
                        ระดับ {priority} / 10
                      </span>
                    </div>

                    {/* Priority Preset Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPriority(2)}
                        className={`py-2 px-2 text-[11px] font-bold rounded-none border text-center transition-all ${
                          priority <= 3
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/60'
                            : 'bg-[#141414] text-neutral-400 border-[#2a2a2a] hover:text-white'
                        }`}
                      >
                        🟢 ปกติ (0-3)
                      </button>

                      <button
                        type="button"
                        onClick={() => setPriority(5)}
                        className={`py-2 px-2 text-[11px] font-bold rounded-none border text-center transition-all ${
                          priority >= 4 && priority <= 7
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/60'
                            : 'bg-[#141414] text-neutral-400 border-[#2a2a2a] hover:text-white'
                        }`}
                      >
                        🟡 ปานกลาง (4-7)
                      </button>

                      <button
                        type="button"
                        onClick={() => setPriority(9)}
                        className={`py-2 px-2 text-[11px] font-bold rounded-none border text-center transition-all ${
                          priority >= 8
                            ? 'bg-red-950/40 text-red-300 border-red-600/60'
                            : 'bg-[#141414] text-neutral-400 border-[#2a2a2a] hover:text-white'
                        }`}
                      >
                        🔴 สำคัญมาก (8-10)
                      </button>
                    </div>

                    {/* Tactical 0-10 Number Button Strip */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                        เลือกระดับความสำคัญอย่างละเอียด (0 - 10):
                      </span>
                      <div className="grid grid-cols-11 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = priority === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setPriority(num)}
                              className={`py-2 text-xs font-mono font-bold transition-all rounded-none border ${
                                isSelected
                                  ? num >= 8
                                    ? 'bg-[#da291c] text-white border-red-600 shadow-md font-black scale-105'
                                    : num >= 4
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black scale-105'
                                    : 'bg-emerald-500 text-black border-emerald-400 shadow-md font-black scale-105'
                                  : 'bg-[#131313] text-neutral-400 border-[#2a2a2a] hover:text-white hover:bg-[#202020]'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#121212] border border-[#222] flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      <strong className="text-neutral-300">คำแนะนำเชิงกลยุทธ์:</strong> ระดับ 0-3 (ยังไม่รีบ / ไว้มีงบเหลือ) · 4-7 (อยากได้ / รอจังหวะโปร 10.10) · 8-10 (จำเป็นเร่งด่วน / จัดลำดับไว้สูงสุดบนตาราง Wishlist)
                    </p>
                  </div>
                </div>
              ) : (
                /* Inventory Mode: Dates & Warranty Engine */
                <div className="p-4 bg-[#181818] border border-[#282828] h-full flex flex-col justify-between space-y-3">
                  <div className="space-y-3.5">
                    {/* Purchase Date Row */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>วันที่ซื้อ / ได้มา</span>
                        </label>
                        {purchasedAt && (
                          <span className="text-[10px] font-mono text-neutral-500">
                            วันที่เริ่มครอบครอง
                          </span>
                        )}
                      </div>
                      <DatePicker
                        value={purchasedAt}
                        onChange={handlePurchasedAtChange}
                        allowAll={false}
                        isMulti={false}
                        placeholder="เลือกวันที่ซื้อ"
                        className="w-full h-10 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-mono font-bold transition-colors outline-none bg-[#1b1b1b] border-[#333] text-slate-100 hover:border-[#da291c] focus:border-[#da291c]"
                      />

                      {/* Smart Transaction Date Sync Pills */}
                      {linkedTxDatesSorted.length > 0 && (
                        <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-blue-400" />
                            <span>ดึงจากธุรกรรม:</span>
                          </span>
                          {hasMultipleLinkedDates ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePurchasedAtChange(earliestLinkedTx.date)}
                                className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                  purchasedAt === earliestLinkedTx.date
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500 shadow-sm'
                                    : 'bg-[#141414] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                                }`}
                                title="เริ่มนับประกันตั้งแต่งวดแรก (เหมาะกับแบบผ่อนชำระหลายงวด)"
                              >
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>งวดแรก ({earliestLinkedTx.date})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePurchasedAtChange(latestLinkedTx.date)}
                                className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                  purchasedAt === latestLinkedTx.date
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500 shadow-sm'
                                    : 'bg-[#141414] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                                }`}
                                title="เริ่มนับประกัน ณ วันรับของ/จ่ายส่วนที่เหลือ (เหมาะกับจอง/มัดจำก่อนแล้วรับของ)"
                              >
                                <Calendar className="w-3 h-3 text-sky-400" />
                                <span>วันรับของ/ล่าสุด ({latestLinkedTx.date})</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePurchasedAtChange(earliestLinkedTx.date)}
                              className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                purchasedAt === earliestLinkedTx.date
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500 shadow-sm'
                                  : 'bg-[#141414] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                              }`}
                            >
                              <Clock className="w-3 h-3 text-emerald-400" />
                              <span>ใช้วันที่ของรายการที่ผูก ({earliestLinkedTx.date})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Warranty Engine Section */}
                    <div className="pt-3 border-t border-[#262626] space-y-2.5">
                      {/* Section Header & Segmented Mode Switch */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 whitespace-nowrap">
                          {hasWarranty ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <ShieldOff className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          )}
                          <span>การรับประกันสินค้า</span>
                        </div>

                        {/* Tactical Segmented Selector */}
                        <div className="flex border border-[#333] bg-[#121212] p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleWarranty(false)}
                            className={`px-2.5 py-1 text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                              !hasWarranty
                                ? 'bg-[#252525] text-white border-b-2 border-neutral-400 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            <ShieldOff className="w-3 h-3" />
                            <span>ไม่มีประกัน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleWarranty(true)}
                            className={`px-2.5 py-1 text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                              hasWarranty
                                ? 'bg-emerald-950/60 text-emerald-300 border-b-2 border-emerald-500 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>มีประกัน</span>
                          </button>
                        </div>
                      </div>

                      {/* State A: ไม่กรอกวันประกัน (ไม่มีประกัน / ไม่ระบุ) */}
                      {!hasWarranty ? (
                        <div className="p-3 bg-[#131313] border border-[#262626] space-y-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-neutral-900 border border-neutral-800 shrink-0 mt-0.5">
                              <ShieldOff className="w-4 h-4 text-neutral-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-300">
                                สินค้าไม่มีประกัน / ไม่ระบุวันหมดอายุ
                              </div>
                              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                                รายการนี้จะไม่แสดงแถบเตือนหมดอายุ และไม่นำไปคำนวณในระบบแจ้งเตือน
                              </p>
                            </div>
                          </div>

                          {/* Quick 1-Click Activation Presets */}
                          <div className="pt-2 border-t border-[#1f1f1f]">
                            <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>ต้องการกำหนดประกันด่วน:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 5].map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => handleSetWarrantyYears(yr)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-[#1b1b1b] hover:bg-[#252525] text-neutral-300 hover:text-white border border-[#333] transition-colors"
                                >
                                  +{yr} ปี
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setHasWarranty(true);
                                  const base = purchasedAt || new Date().toISOString().split('T')[0];
                                  setWarrantyUntil(calcWarrantyDate(base, 1));
                                  setWarrantyYears(1);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-[#1b1b1b] hover:bg-[#252525] text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 transition-colors flex items-center gap-1"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>ระบุวันเอง</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* State B: มีการรับประกัน (Track Warranty) */
                        <div className="p-3 bg-[#131313] border border-[#262626] space-y-3">
                          {/* DatePicker Row with Never-Wrapping Status Badge */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5 gap-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 whitespace-nowrap">
                                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <span>ประกันถึงวันที่</span>
                              </label>
                              {liveWarranty && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${liveWarranty.className}`}>
                                  {liveWarranty.shortLabel}
                                </span>
                              )}
                            </div>
                            <DatePicker
                              value={warrantyUntil}
                              onChange={handleWarrantyUntilChange}
                              allowAll={false}
                              isMulti={false}
                              align="right"
                              placeholder="เลือกวันหมดประกัน"
                              className="w-full h-10 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-mono font-bold transition-colors outline-none bg-[#1b1b1b] border-[#333] text-slate-100 hover:border-[#da291c] focus:border-[#da291c]"
                            />
                          </div>

                          {/* Warranty Quick Calculation Presets */}
                          <div>
                            <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>ปุ่มลัดคำนวณจากวันที่ซื้อ:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 5].map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => handleSetWarrantyYears(yr)}
                                  className={`px-2.5 py-1 rounded-none text-[11px] font-bold border transition-colors ${
                                    warrantyYears === yr
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500'
                                      : 'bg-[#1b1b1b] hover:bg-[#252525] text-neutral-300 hover:text-white border-[#333]'
                                  }`}
                                >
                                  +{yr} ปี
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleToggleWarranty(false)}
                                className="px-2.5 py-1 rounded-none text-[11px] font-bold bg-[#1b1b1b] hover:bg-[#252525] text-neutral-400 hover:text-neutral-200 border border-[#333] transition-colors flex items-center gap-1"
                                title="ล้างข้อมูลประกันและสลับเป็นไม่มีประกัน"
                              >
                                <X className="w-3 h-3" />
                                <span>ไม่มีประกัน</span>
                              </button>
                            </div>
                          </div>

                          {/* Tactical Status Feedback Pill */}
                          {liveWarranty && (
                            <div className="p-2 bg-[#181818] border border-[#252525] flex items-center justify-between text-[11px] gap-2 flex-wrap">
                              <span className="text-neutral-400">สถานะความคุ้มครอง:</span>
                              <span className="font-bold text-slate-200">
                                {liveWarranty.label}
                              </span>
                            </div>
                          )}

                          {/* Validation Warning */}
                          {purchasedAt && warrantyUntil && warrantyUntil < purchasedAt && (
                            <div className="p-2 bg-red-950/30 border border-red-800/60 flex items-center gap-2 text-xs text-red-300">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>วันหมดประกันต้องไม่เกิดขึ้นก่อนวันที่ซื้อ</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Conditional Broken Date Field */}
                    {inventoryStatus === 'broken' && (
                      <div className="pt-2.5 border-t border-[#262626]">
                        <label className="block text-xs font-bold uppercase tracking-wider text-red-400 mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#da291c]" />
                          <span>วันที่พัง / ยืนยันว่าชำรุด</span>
                        </label>
                        <DatePicker
                          value={brokenAt}
                          onChange={setBrokenAt}
                          allowAll={false}
                          isMulti={false}
                          placeholder="เลือกวันที่พัง"
                          className="w-full h-10 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-mono font-bold transition-colors outline-none bg-[#1b1b1b] border-red-900/50 text-slate-100 hover:border-[#da291c] focus:border-[#da291c]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Strategic Tip Box */}
                  <div className="p-2.5 bg-[#121212] border border-[#222] flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      <strong className="text-neutral-300">ระบบติดตามประกัน:</strong> คำนวณวันหมดอายุและแจ้งเตือนสถานะอัตโนมัติ ช่วยให้ส่งซ่อมหรือเคลมสินค้าได้ทันเวลา
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Description / Notes / Specs / Serial Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              {activeMode === 'wishlist'
                ? 'รายละเอียดเพิ่มเติม / สเปกที่เล็งไว้ / โน้ตเตือนใจ'
                : 'หมายเลขเครื่อง (S/N) / สภาพ / บันทึกการใช้งาน'
              }
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeMode === 'wishlist'
                  ? 'เช่น เล็งสี Dark Grey สวิตช์ Red, รอโปร 10.10 หรือโบนัสออก, เช็คโค้ดลด 1,000 บาท...'
                  : 'เช่น S/N: C02G..., สภาพ 95%, อุปกรณ์ครบกล่อง, เก็บไว้ที่ลิ้นชักโต๊ะทำงาน...'
              }
              className={`w-full px-3 py-2 bg-[#1b1b1b] border text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none transition-colors ${
                activeMode === 'wishlist' ? 'border-[#333] focus:border-amber-500' : 'border-[#333] focus:border-[#da291c]'
              }`}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#282828] flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-neutral-500 font-mono hidden sm:block">
              {activeMode === 'wishlist' ? 'WISHLIST ENGINE · CASHFLOW SHARK' : 'INVENTORY ENGINE · CASHFLOW SHARK'}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-[#333] rounded-none hover:bg-[#222] transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                  activeMode === 'wishlist'
                    ? 'bg-amber-600 hover:bg-amber-500 text-black font-black'
                    : 'bg-[#da291c] hover:bg-red-700 text-white font-black'
                }`}
              >
                {isSubmitting ? (
                  'กำลังบันทึก...'
                ) : activeMode === 'wishlist' ? (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>{editingItem ? 'บันทึกการแก้ไข Wishlist' : 'เพิ่มลง Wishlist'}</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>{editingItem ? 'บันทึกการแก้ไขทรัพย์สิน' : 'บันทึกข้อมูลสิ่งของ'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
