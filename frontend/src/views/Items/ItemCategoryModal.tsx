import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import { ItemCategory } from '../../types';
import { itemService } from '../../services/api';

interface ItemCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ItemCategory[];
  onRefreshCategories: () => void;
}

export default function ItemCategoryModal({
  isOpen,
  onClose,
  categories,
  onRefreshCategories
}: ItemCategoryModalProps) {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      await itemService.createCategory(newCatName.trim());
      setNewCatName('');
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้างหมวดหมู่ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: ItemCategory) => {
    if (cat.item_count && cat.item_count > 0) {
      setError(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้เนื่องจากมีสิ่งของอยู่ ${cat.item_count} ชิ้น`);
      return;
    }

    setError('');
    try {
      await itemService.deleteCategory(cat.id);
      onRefreshCategories();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบหมวดหมู่ได้');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-none flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] bg-[#181818]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#da291c]" />
            <span>จัดการหมวดหมู่สิ่งของ</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4 text-xs">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 text-red-300 border border-red-800/60 rounded-none flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="เพิ่มหมวดหมู่ใหม่ เช่น กล้อง & เลนส์, หนังสือ..."
              className="flex-grow px-3 py-2 bg-[#1b1b1b] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-[#da291c] text-white hover:bg-red-700 disabled:opacity-50 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Category List */}
          <div className="divide-y divide-[#222] border border-[#282828] bg-[#111]">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 flex items-center justify-between gap-2 hover:bg-[#161616]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{cat.name}</span>
                  {cat.item_count !== undefined && (
                    <span className="text-[10px] text-neutral-500 px-1.5 py-0.2 bg-[#1e1e1e] border border-[#2a2a2a]">
                      {cat.item_count} ชิ้น
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  disabled={Boolean(cat.item_count && cat.item_count > 0)}
                  className="p-1 text-neutral-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
                  title={cat.item_count && cat.item_count > 0 ? 'มีสิ่งของในหมวดนี้ ไม่สามารถลบได้' : 'ลบหมวดหมู่นี้'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2e2e2e] bg-[#181818] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white border border-[#333] rounded-none hover:bg-[#222]"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
