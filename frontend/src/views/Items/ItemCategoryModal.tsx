import React, { useState, useMemo } from 'react';
import {
  X, Plus, Trash2, Tag, AlertCircle, Edit3, Check, Sparkles, Search, Layers,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { ItemCategory } from '../../types';
import { itemService } from '../../services/api';

interface ItemCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ItemCategory[];
  onRefreshCategories: () => void;
  onCategoryCreated?: (cat: ItemCategory) => void;
}

// Curated Tactical Recommendation Presets
const POPULAR_CATEGORY_PRESETS = [
  'คอมพิวเตอร์ & ฮาร์ดแวร์',
  'สมาร์ทโฟน & แท็บเล็ต',
  'เครื่องเสียง & หูฟัง',
  'กล้อง & เลนส์',
  'เฟอร์นิเจอร์ & โต๊ะทำงาน',
  'เครื่องแต่งกาย & นาฬิกา',
  'เกม & คอนโซล',
  'งานอดิเรก & ของสะสม',
  'เครื่องใช้ไฟฟ้า & Smart Home',
  'หนังสือ & พัฒนาตนเอง',
  'ยานพาหนะ & อุปกรณ์เดินทาง'
];

export default function ItemCategoryModal({
  isOpen,
  onClose,
  categories,
  onRefreshCategories,
  onCategoryCreated
}: ItemCategoryModalProps) {
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Editing state for inline rename
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const existingNameSet = useMemo(() => {
    return new Set(categories.map(c => c.name.trim().toLowerCase()));
  }, [categories]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order_index ?? a.id) - (b.order_index ?? b.id));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sortedCategories;
    const q = searchQuery.toLowerCase();
    return sortedCategories.filter(c => c.name.toLowerCase().includes(q));
  }, [sortedCategories, searchQuery]);

  const handleMoveCategory = async (cat: ItemCategory, direction: 'up' | 'down') => {
    const idx = sortedCategories.findIndex(c => c.id === cat.id);
    if (idx === -1) return;

    let targetIdx = -1;
    if (direction === 'up' && idx > 0) targetIdx = idx - 1;
    if (direction === 'down' && idx < sortedCategories.length - 1) targetIdx = idx + 1;
    if (targetIdx === -1) return;

    const newOrdered = [...sortedCategories];
    const temp = newOrdered[idx];
    newOrdered[idx] = newOrdered[targetIdx];
    newOrdered[targetIdx] = temp;

    const orderedIds = newOrdered.map(c => c.id);
    try {
      await itemService.reorderCategories(orderedIds);
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถจัดลำดับหมวดหมู่ได้');
    }
  };

  if (!isOpen) return null;

  const handleCreate = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;

    if (existingNameSet.has(trimmed.toLowerCase())) {
      setError(`หมวดหมู่ "${trimmed}" มีอยู่ในระบบแล้ว`);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await itemService.createCategory(trimmed);
      setNewCatName('');
      onRefreshCategories();
      if (onCategoryCreated) {
        onCategoryCreated(created);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้างหมวดหมู่ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreate(newCatName);
  };

  const handleStartEdit = (cat: ItemCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError('ชื่อหมวดหมู่ต้องไม่เว้นว่าง');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await itemService.updateCategory(id, trimmed);
      setEditingId(null);
      setEditingName('');
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถแก้ไขชื่อหมวดหมู่ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: ItemCategory) => {
    if (cat.item_count && cat.item_count > 0) {
      setError(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้เนื่องจากมีสิ่งของผูกอยู่ ${cat.item_count} รายการ`);
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.name}"?`)) return;

    setError('');
    try {
      await itemService.deleteCategory(cat.id);
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบหมวดหมู่ได้');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-none flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-none bg-[#da291c]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  จัดการหมวดหมู่สิ่งของ
                </h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-widest bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {categories.length} หมวดหมู่
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                จัดกลุ่มรายการทรัพย์สินและแผนการซื้อ Wishlist เพื่อความเป็นระเบียบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4 text-xs">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 text-red-300 border border-red-800/60 rounded-none flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Creation Input Box */}
          <div className="p-3.5 bg-[#181818] border border-[#282828] space-y-2.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#da291c]" />
              เพิ่มหมวดหมู่ใหม่
            </label>

            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="เช่น กล้อง & เลนส์, หนังสือ & คอร์สเรียน..."
                className="flex-grow px-3 py-2 bg-[#121212] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCatName.trim()}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[#da291c] hover:bg-red-700 text-white rounded-none disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม</span>
              </button>
            </form>

            {/* Tactical Recommendation Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>หมวดหมู่แนะนำ (คลิกเพื่อเพิ่มทันที):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CATEGORY_PRESETS.map((preset) => {
                  const isExisting = existingNameSet.has(preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isExisting || isSubmitting}
                      onClick={() => handleCreate(preset)}
                      className={`px-2 py-1 text-[11px] rounded-none border transition-all flex items-center gap-1 ${
                        isExisting
                          ? 'bg-[#121212] text-neutral-600 border-[#222] cursor-default'
                          : 'bg-[#1b1b1b] text-neutral-300 hover:text-white border-[#333] hover:border-[#da291c] hover:bg-[#222]'
                      }`}
                      title={isExisting ? 'มีหมวดหมู่นี้อยู่แล้ว' : `เพิ่มหมวดหมู่ "${preset}"`}
                    >
                      {isExisting ? (
                        <Check className="w-3 h-3 text-neutral-600" />
                      ) : (
                        <Plus className="w-3 h-3 text-[#da291c]" />
                      )}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                รายการหมวดหมู่ทั้งหมด ({categories.length})
              </span>

              {categories.length > 5 && (
                <div className="relative w-48">
                  <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาหมวดหมู่..."
                    className="w-full pl-7 pr-2 py-1 bg-[#161616] border border-[#2a2a2a] text-slate-200 text-[11px] rounded-sm focus:outline-none focus:border-[#da291c]"
                  />
                </div>
              )}
            </div>

            <div className="border border-[#262626] bg-[#111] divide-y divide-[#202020] max-h-64 overflow-y-auto custom-scrollbar">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, catIndex) => {
                  const isEditing = editingId === cat.id;
                  const hasItems = (cat.item_count || 0) > 0;

                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-[#161616] transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-grow mr-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-grow px-2 py-1 bg-[#1e1e1e] border border-[#da291c] text-white text-xs rounded-sm focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cat.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={isSubmitting || !editingName.trim()}
                            className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-none transition-colors"
                            title="บันทึก"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1 text-neutral-400 hover:text-white bg-[#222] border border-[#333] rounded-none transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0 flex-grow">
                          {/* Reorder Arrows & Order Index */}
                          <div className="flex items-center gap-0.5 shrink-0 bg-[#161616] border border-[#262626] px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(cat, 'up')}
                              disabled={Boolean(searchQuery.trim()) || catIndex === 0}
                              className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                              title="เลื่อนขึ้น"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-neutral-400 w-4 text-center">
                              {catIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(cat, 'down')}
                              disabled={Boolean(searchQuery.trim()) || catIndex === filteredCategories.length - 1}
                              className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                              title="เลื่อนลง"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <Tag className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                          <span className="font-bold text-slate-200 truncate">{cat.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border shrink-0 ${
                              hasItems
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                : 'bg-neutral-800/60 text-neutral-500 border-neutral-700/50'
                            }`}
                          >
                            {cat.item_count || 0} ชิ้น
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 text-neutral-500 hover:text-amber-400 hover:bg-[#202020] rounded-none transition-colors"
                            title="แก้ไขชื่อหมวดหมู่"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={hasItems}
                            className="p-1 text-neutral-500 hover:text-red-400 hover:bg-[#202020] disabled:opacity-20 disabled:hover:text-neutral-500 disabled:hover:bg-transparent rounded-none transition-colors"
                            title={hasItems ? 'มีสิ่งของอยู่ในหมวดนี้ (ไม่สามารถลบได้)' : 'ลบหมวดหมู่นี้'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  {searchQuery ? 'ไม่พบหมวดหมู่ที่ตรงกับการค้นหา' : 'ยังไม่มีหมวดหมู่ในระบบ'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#2e2e2e] bg-[#181818] flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {categories.length} หมวดหมู่พร้อมใช้งาน
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white border border-[#333] rounded-none hover:bg-[#222] transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
