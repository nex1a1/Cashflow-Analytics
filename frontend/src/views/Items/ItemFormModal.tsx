import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Tag, ShieldCheck, Calendar, Info } from 'lucide-react';
import { ItemWithDetails, ItemCategory, ItemStatus, CreateItemPayload, UpdateItemPayload } from '../../types';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateItemPayload | UpdateItemPayload, id?: number) => Promise<void>;
  editingItem?: ItemWithDetails | null;
  categories: ItemCategory[];
  defaultStatus?: ItemStatus;
  onOpenCategoryManager?: () => void;
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  categories,
  defaultStatus = 'planned',
  onOpenCategoryManager
}: ItemFormModalProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [brandModel, setBrandModel] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<ItemStatus>(defaultStatus);
  const [price, setPrice] = useState<string>('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [brokenAt, setBrokenAt] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setName(editingItem.name || '');
      setCategoryId(editingItem.category_id);
      setBrandModel(editingItem.brand_model || '');
      setSource(editingItem.source || '');
      setStatus(editingItem.status);
      setPrice(editingItem.price != null ? String(editingItem.price) : '');
      setPurchasedAt(editingItem.purchased_at || '');
      setBrokenAt(editingItem.broken_at || '');
      setWarrantyUntil(editingItem.warranty_until || '');
      setPriority(editingItem.priority || 0);
      setDescription(editingItem.description || '');
    } else {
      setName('');
      setCategoryId(categories[0]?.id || 1);
      setBrandModel('');
      setSource('');
      setStatus(defaultStatus);
      setPrice('');
      setPurchasedAt(defaultStatus === 'purchased' ? new Date().toISOString().split('T')[0] : '');
      setBrokenAt('');
      setWarrantyUntil('');
      setPriority(0);
      setDescription('');
    }
    setError('');
  }, [isOpen, editingItem, defaultStatus, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณาระบุชื่อสิ่งของ');
      return;
    }
    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const numPrice = price.trim() !== '' ? Number(price) : null;
      if (numPrice !== null && (isNaN(numPrice) || numPrice < 0)) {
        setError('กรุณาระบุราคาที่ถูกต้อง');
        setIsSubmitting(false);
        return;
      }

      const payload: CreateItemPayload = {
        name: name.trim(),
        category_id: categoryId,
        brand_model: brandModel.trim() || null,
        source: source.trim() || null,
        status,
        price: numPrice,
        purchased_at: purchasedAt || null,
        broken_at: status === 'broken' ? (brokenAt || null) : null,
        warranty_until: warrantyUntil || null,
        priority: Number(priority) || 0,
        description: description.trim() || null
      };

      await onSave(payload, editingItem?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-none flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] bg-[#181818]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-[#da291c]" />
            {editingItem ? 'แก้ไขรายการสิ่งของ' : 'บันทึกสิ่งของใหม่'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 text-red-300 border border-red-800/60 rounded-none">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              ชื่อสิ่งของ <span className="text-[#da291c]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Mechanical Keyboard, เก้าอี้ทำงาน, iPhone 15"
              className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              autoFocus
            />
          </div>

          {/* Category & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                  หมวดหมู่ <span className="text-[#da291c]">*</span>
                </label>
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[10px] text-neutral-400 hover:text-[#da291c] flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> หมวดหมู่
                  </button>
                )}
              </div>
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                สถานะ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              >
                <option value="planned">วางแผนจะซื้อ (Wishlist)</option>
                <option value="purchased">ใช้งานอยู่ (Purchased)</option>
                <option value="stored">เก็บเข้ากรุ (Stored)</option>
                <option value="broken">พัง / ชำรุด (Broken)</option>
                <option value="sold">ขายแล้ว (Sold)</option>
                <option value="cancelled">ยกเลิก (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Brand/Model & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                ยี่ห้อ / รุ่น
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="เช่น Keychron Q1, Herman Miller"
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                ร้านค้า / แหล่งที่ซื้อ
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="เช่น Shopee, Advice, IKEA, Apple"
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              />
            </div>
          </div>

          {/* Price & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                ราคา (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-sm font-mono tabular-nums focus:outline-none focus:border-[#da291c]"
              />
              <p className="mt-1 text-[10px] text-neutral-500 flex items-center gap-1">
                <Info className="w-3 h-3 text-neutral-500 shrink-0" />
                ราคาจดเอง/กะไว้ (หากผูก Transaction จะใช้ยอดรวมจาก Transaction อัตโนมัติ)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Priority Wishlist (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 rounded-sm text-sm font-mono focus:outline-none focus:border-[#da291c]"
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                ยิ่งเลขมาก ยิ่งแสดงด้านบนสุดใน Wishlist
              </p>
            </div>
          </div>

          {/* Dates: Purchased At, Warranty Until, Broken At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#252525]">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                วันที่ซื้อ
              </label>
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                ประกันถึงวันที่
              </label>
              <input
                type="date"
                value={warrantyUntil}
                onChange={(e) => setWarrantyUntil(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              />
            </div>
          </div>

          {status === 'broken' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-red-400 mb-1.5">
                วันที่พัง / ยืนยันว่าชำรุด
              </label>
              <input
                type="date"
                value={brokenAt}
                onChange={(e) => setBrokenAt(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1b1b] border border-red-900/50 text-slate-100 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
              />
            </div>
          )}

          {/* Description & Free Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              บันทึกเพิ่มเติม / อาการ / หมายเหตุ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น มีเสียงจี่ สวิตช์เบิ้ล หรือ เหตุผลที่เก็บเข้ากรุ..."
              className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-sm focus:outline-none focus:border-[#da291c]"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#2e2e2e] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-[#333] rounded-none hover:bg-[#222] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black uppercase tracking-widest bg-[#da291c] text-white rounded-none hover:bg-red-700 transition-colors disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
