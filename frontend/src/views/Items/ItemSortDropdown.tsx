import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { SortOption } from '@/utils/itemHelpers';

interface ItemSortDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
  accentColor: 'amber' | 'red';
  title?: string;
  align?: 'left' | 'right';
}

export default function ItemSortDropdown<T extends string>({
  value,
  onChange,
  options,
  accentColor,
  title = 'จัดเรียงรายการ',
  align = 'right'
}: ItemSortDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (val: T) => {
      onChange(val);
      setIsOpen(false);
    },
    [onChange]
  );

  // Close on click outside & Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentOption = options.find((opt) => opt.value === value) || options[0];
  const isAmber = accentColor === 'amber';

  return (
    <div ref={containerRef} className="relative inline-block text-left" title={title}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 bg-[#141414] hover:bg-[#1a1a1a] border px-2.5 py-1 text-xs font-medium cursor-pointer select-none rounded-none transition-colors ${
          isOpen
            ? isAmber
              ? 'border-amber-500/70 text-white bg-[#1a1a1a]'
              : 'border-red-500/70 text-white bg-[#1a1a1a]'
            : 'border-[#333] hover:border-[#444] text-neutral-300 hover:text-white'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <ArrowUpDown
          className={`w-3 h-3 shrink-0 ${isAmber ? 'text-amber-400' : 'text-[#da291c]'}`}
        />
        <span className="truncate max-w-[140px] sm:max-w-none">{currentOption?.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-neutral-500 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1 min-w-[210px] z-50 bg-[#161616] border shadow-2xl rounded-none py-1 overflow-hidden animate-none ${
            isAmber
              ? 'border-[#333] border-t-2 border-t-amber-500'
              : 'border-[#333] border-t-2 border-t-[#da291c]'
          }`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors border-l-2 ${
                  isSelected
                    ? isAmber
                      ? 'bg-amber-500/15 text-amber-300 font-semibold border-l-amber-400'
                      : 'bg-red-500/15 text-red-300 font-semibold border-l-[#da291c]'
                    : 'text-neutral-300 hover:bg-[#202020] hover:text-white border-l-transparent'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 shrink-0 ml-2 ${
                      isAmber ? 'text-amber-400' : 'text-[#da291c]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
