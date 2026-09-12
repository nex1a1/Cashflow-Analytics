// frontend/src/components/shared/IconPicker.tsx
// Large-scale curated icon grid for category/group `icon`.
// Features: 580px desktop popover, 12-column high-legibility grid, 251 Lucide icons,
// category pills with Lucide icons (zero emojis), instant bilingual search, and clean footer.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, PackageOpen, Trash2 } from 'lucide-react';
import {
  CATEGORY_ICONS,
  ICON_CATEGORIES,
  type CategoryIconDef,
  type IconCategoryKey,
} from '@/constants/categoryIcons';
import CategoryGlyph from './CategoryGlyph';

export interface IconPickerProps {
  icon: string | null | undefined;
  color?: string | null;
  onChange: (icon: string) => void;
}

export default function IconPicker({ icon, color, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategoryKey>('all');
  const [hoveredIcon, setHoveredIcon] = useState<CategoryIconDef | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const initialScroll = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

  // When opening, autofocus search if open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    setSearchTerm('');
    setSelectedCategory('all');
    setHoveredIcon(null);
    return undefined;
  }, [open]);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const W = 580, H = 510;
      let left = rect.left;
      if (left + W > window.innerWidth - 16) left = window.innerWidth - W - 16;
      if (left < 16) left = 16;
      let top = rect.bottom + 4;
      if (top + H > window.innerHeight - 16) top = rect.top - H - 4;
      if (top < 16) top = 16;

      setPos({ top, left });
      initialScroll.current = {
        top: window.scrollY || document.documentElement.scrollTop,
        left: window.scrollX || document.documentElement.scrollLeft,
      };
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClose = (e: Event) => {
      const target = e.target as Node;
      if (e.type === 'mousedown' && (btnRef.current?.contains(target) || paletteRef.current?.contains(target))) return;
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'scroll') {
        const currentTop = window.scrollY || document.documentElement.scrollTop;
        const currentLeft = window.scrollX || document.documentElement.scrollLeft;
        if (Math.abs(currentTop - initialScroll.current.top) < 5 && Math.abs(currentLeft - initialScroll.current.left) < 5) return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleClose);
    window.addEventListener('scroll', handleClose, true);

    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open]);

  // Filtered icons
  const filteredIcons = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const allMatches = CATEGORY_ICONS.filter((item) =>
        item.label.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term) ||
        item.keywords.toLowerCase().includes(term)
      );
      if (selectedCategory === 'all') return allMatches;
      const inCat = allMatches.filter((item) => item.category === selectedCategory);
      return inCat.length > 0 ? inCat : allMatches;
    }
    return selectedCategory === 'all'
      ? CATEGORY_ICONS
      : CATEGORY_ICONS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, searchTerm]);

  // Find currently selected icon definition
  const currentSelectedDef = useMemo(() => {
    if (!icon) return null;
    return CATEGORY_ICONS.find((d) => d.key === icon) || null;
  }, [icon]);

  return (
    <div className="relative shrink-0 flex items-center select-none">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center border shrink-0 rounded-sm bg-[#121212] border-[#3e3e3e] hover:border-[#da291c]/50 transition-colors outline-none focus:border-white focus:ring-1 focus:ring-white/20"
        title="เลือกไอคอน"
        aria-label="เลือกไอคอน"
      >
        <CategoryGlyph icon={icon} color={color} size={18} />
      </button>

      {open && createPortal(
        <div
          ref={paletteRef}
          className="fixed z-[9999] p-3.5 shadow-[0_0_32px_rgba(0,0,0,0.9)] border bg-[#181818] border-[#3e3e3e] rounded-none w-[580px] flex flex-col gap-2.5"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* 1. Search Bar */}
          <div className="flex items-center gap-2.5 bg-[#121212] border border-[#3e3e3e] px-3 py-2 rounded-none focus-within:border-neutral-400">
            <Search size={16} className="text-neutral-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาไอคอน (เช่น กาแฟ, รถ, สบู่, ครอบครัว, อั่งเปา, 📦, 🛒, 🧧)..."
              className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                title="ล้างคำค้นหา"
              >
                <X size={15} />
              </button>
            )}
            <span className="text-[11px] font-mono text-neutral-400 shrink-0 pl-2 border-l border-neutral-800">
              {filteredIcons.length} ไอคอน
            </span>
          </div>

          {/* 2. Category Filter Pills (Zero Emoji, pure Lucide icons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs select-none shrink-0">
            {ICON_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const TabIcon = cat.Icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 border shrink-0 ${
                    isSelected
                      ? 'bg-neutral-100 text-black font-bold border-white'
                      : 'bg-[#121212] text-neutral-400 hover:text-white hover:bg-neutral-800 border-[#303030]'
                  }`}
                >
                  <TabIcon size={14} className={isSelected ? 'text-black' : 'text-neutral-400'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Hover / Selection Info Bar */}
          <div className="flex items-center justify-between px-2 py-1 bg-[#121212] border border-[#303030] text-xs min-h-[26px]">
            {hoveredIcon ? (
              <div className="flex items-center gap-2 truncate">
                <hoveredIcon.Icon size={16} className="text-white shrink-0" />
                <span className="text-white font-medium truncate">{hoveredIcon.label}</span>
                <span className="text-neutral-500 font-mono text-[10px] shrink-0">({hoveredIcon.key})</span>
              </div>
            ) : currentSelectedDef ? (
              <div className="flex items-center gap-2 truncate">
                <span className="text-neutral-400 text-[11px]">เลือกอยู่:</span>
                <currentSelectedDef.Icon size={16} style={{ color: color || '#ffffff' }} className="shrink-0" />
                <span className="text-white font-medium truncate">{currentSelectedDef.label}</span>
                <span className="text-neutral-500 font-mono text-[10px] shrink-0">({currentSelectedDef.key})</span>
              </div>
            ) : (
              <span className="text-neutral-500 text-[11px]">เลื่อนเมาส์ชี้บนไอคอนเพื่อดูชื่อ หรือคลิกเพื่อเลือก</span>
            )}
            <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-2">
              {filteredIcons.length} / {CATEGORY_ICONS.length}
            </span>
          </div>

          {/* 4. Large 12-Column Icon Grid */}
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-12 gap-[2px] bg-[#2a2a2a] p-[2px] border border-[#303030]/50 max-h-[300px] overflow-y-auto custom-scrollbar">
              {filteredIcons.map(({ key, label, Icon }) => {
                const isSelected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { onChange(key); setOpen(false); }}
                    onMouseEnter={() => setHoveredIcon({ key, label, category: selectedCategory, keywords: '', Icon })}
                    onMouseLeave={() => setHoveredIcon(null)}
                    title={label}
                    className={`aspect-square w-full flex items-center justify-center bg-[#181818] hover:bg-[#282828] cursor-pointer relative hover:z-10 hover:ring-1 hover:ring-white focus:outline-none ${
                      isSelected ? 'ring-1 ring-[#da291c] z-10 bg-[#262626]' : ''
                    }`}
                  >
                    <Icon size={22} style={{ color: isSelected ? (color || '#ffffff') : '#94a3b8' }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-1.5 bg-[#121212] border border-[#303030]/50">
              <PackageOpen size={28} className="text-neutral-600 mb-0.5" />
              <span className="text-xs text-neutral-400">ไม่พบไอคอนที่ค้นหา "{searchTerm}"</span>
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                className="text-xs text-[#da291c] hover:underline font-medium mt-1"
              >
                ดูไอคอนทั้งหมด
              </button>
            </div>
          )}

          {/* 5. Clean Footer (No Emojis!) */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#303030] mt-0.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 flex items-center justify-center border border-[#3e3e3e] bg-[#121212] shrink-0"
                title="ไอคอนปัจจุบัน"
              >
                <CategoryGlyph icon={icon} color={color} size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-neutral-200">
                  {currentSelectedDef ? currentSelectedDef.label : (icon ? icon : 'ยังไม่ได้เลือกไอคอน')}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {icon ? `key: ${icon}` : 'คลิกเลือกไอคอนจากตารางด้านบน'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {icon && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-[#da291c] hover:bg-[#202020] border border-transparent hover:border-[#3e3e3e] transition-colors flex items-center gap-1"
                  title="ล้างไอคอน ไม่ใช้งาน"
                >
                  <Trash2 size={14} />
                  <span>ล้างไอคอน</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-1 bg-neutral-200 hover:bg-white text-black text-xs font-bold transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
