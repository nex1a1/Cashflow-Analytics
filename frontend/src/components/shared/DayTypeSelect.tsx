import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { DayType } from '@/types';
import { hexToRgb, getThaiDayInfo, THAI_MONTHS_SHORT } from '@/utils/formatters';

export interface DayTypeSelectProps {
  value?: string;
  onChange: (dayTypeId: string) => void;
  dayTypeConfig: DayType[];
  dateStr?: string;
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
  /** Extra vertical gap below the trigger when opening downward, for callers with content directly beneath the trigger (default 4). */
  topOffset?: number;
}

export default function DayTypeSelect({
  value,
  onChange,
  dayTypeConfig = [],
  dateStr,
  disabled = false,
  className = '',
  size = 'xs',
  topOffset = 4
}: DayTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    openUpwards: boolean;
  }>({
    left: 0,
    width: 200,
    openUpwards: false
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Find currently active day type configuration
  const currentType = useMemo(() => {
    return dayTypeConfig.find(dt => dt.id === value) || dayTypeConfig[0];
  }, [dayTypeConfig, value]);

  const currentColor = currentType?.color || '#64748b';
  const currentRgb = useMemo(() => hexToRgb(currentColor), [currentColor]);

  // Date metadata for the header if dateStr is provided
  const dateMeta = useMemo(() => {
    if (!dateStr) return null;
    const thaiDay = getThaiDayInfo(dateStr);
    const [, mmStr, ddStr] = dateStr.split('-');
    const mNum = Number.parseInt(mmStr, 10);
    const dNum = Number.parseInt(ddStr, 10);
    const monthName = THAI_MONTHS_SHORT[mNum - 1] || '';
    return {
      thaiDay,
      displayDate: `${dNum} ${monthName}`
    };
  }, [dateStr]);

  // Calculate & update popover position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 205;
    const estimatedHeight = Math.min(360, (dayTypeConfig.length * 36) + 70);

    let left = rect.right - popoverWidth;
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number | undefined;
    let bottom: number | undefined;

    if (openUpwards) {
      bottom = window.innerHeight - rect.top + 4;
    } else {
      top = rect.bottom + topOffset;
    }

    setCoords({ top, bottom, left, width: popoverWidth, openUpwards });
  }, [dayTypeConfig.length, topOffset]);

  // Toggle open
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (open) {
      setOpen(false);
    } else {
      updatePosition();
      setOpen(true);
      const idx = dayTypeConfig.findIndex(dt => dt.id === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [disabled, open, updatePosition, dayTypeConfig, value]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(id);
    handleClose();
    triggerRef.current?.focus();
  }, [onChange, handleClose]);

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

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        updatePosition();
        setOpen(true);
        const idx = dayTypeConfig.findIndex(dt => dt.id === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (dayTypeConfig.length === 0) return;
      setActiveIndex(prev => {
        const next = (prev + 1) % dayTypeConfig.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (dayTypeConfig.length === 0) return;
      setActiveIndex(prev => {
        const next = (prev - 1 + dayTypeConfig.length) % dayTypeConfig.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (activeIndex >= 0 && activeIndex < dayTypeConfig.length) {
        handleSelect(dayTypeConfig[activeIndex].id);
      }
    }
  }, [open, dayTypeConfig, activeIndex, updatePosition, value, handleClose, handleSelect]);

  const pillDimensions = size === 'sm' 
    ? 'h-7 px-4 min-w-[72px] text-xs' 
    : 'h-[23px] px-3.5 min-w-[64px] text-[11px]';

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`day-type-badge ${pillDimensions} font-black rounded-full cursor-pointer outline-none border inline-flex items-center justify-center text-center leading-none select-none transition-all hover:brightness-125 hover:border-opacity-60 active:scale-95 ${className}`}
        style={{
          backgroundColor: `rgba(${currentRgb}, 0.12)`,
          borderColor: `rgba(${currentRgb}, 0.35)`,
          color: currentColor,
        }}
        title={`คลิกเพื่อเปลี่ยนประเภทวัน (ปัจจุบัน: ${currentType?.label || ''})`}
      >
        <span className="truncate">{currentType?.label || 'เลือกประเภท'}</span>
      </button>

      {/* FLOATING POPOVER PORTAL */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[9999] bg-[#141414] border border-[#303030] shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.06)] rounded-none flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
            style={{
              ...(coords.openUpwards
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: '380px',
            }}
          >
            {/* LASER HAIRLINE ACCENT */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#da291c] to-transparent shrink-0 opacity-85" />

            {/* HEADER: DATE CONTEXT */}
            <div className="px-2.5 py-1.5 border-b border-[#2d2d2d] bg-[#101010] flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                ประเภทวัน
              </span>
              {dateMeta && (
                <div className="flex items-center gap-1.5">
                  {dateMeta.thaiDay && (
                    <span
                      className="px-1 py-0.2 text-[9px] font-black rounded-none border leading-none"
                      style={{
                        backgroundColor: dateMeta.thaiDay.bg,
                        borderColor: dateMeta.thaiDay.border,
                        color: dateMeta.thaiDay.color
                      }}
                    >
                      {dateMeta.thaiDay.label}
                    </span>
                  )}
                  <span className="text-[10px] font-mono font-bold text-slate-300">
                    {dateMeta.displayDate}
                  </span>
                </div>
              )}
            </div>

            {/* LIST OF DAY TYPES */}
            <div className="p-1 overflow-y-auto tactical-scrollbar max-h-[300px] flex flex-col gap-0.5">
              {dayTypeConfig.map((dt, idx) => {
                const isSelected = dt.id === value;
                const isFocused = idx === activeIndex;
                const dtColor = dt.color || '#64748b';
                const dtRgb = hexToRgb(dtColor);

                return (
                  <button
                    key={dt.id}
                    ref={el => { itemRefs.current[idx] = el; }}
                    type="button"
                    onClick={(e) => handleSelect(dt.id, e)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between w-full px-2 py-1.5 text-left rounded-none border transition-colors cursor-pointer group ${
                      isFocused
                        ? 'bg-[#222222] text-white'
                        : isSelected
                        ? 'bg-[#1a1a1a] text-white'
                        : 'bg-transparent text-slate-300 hover:bg-[#1e1e1e] hover:text-white'
                    }`}
                    style={{
                      borderColor: isSelected
                        ? `rgba(${dtRgb}, 0.5)`
                        : isFocused
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'transparent',
                      backgroundColor: isSelected
                        ? `rgba(${dtRgb}, 0.14)`
                        : isFocused
                        ? `rgba(${dtRgb}, 0.08)`
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Colored Indicator Bar */}
                      <span
                        className="w-1.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: dtColor }}
                      />
                      {/* Day Type Label */}
                      <span
                        className="text-xs font-bold truncate tracking-tight transition-colors"
                        style={{
                          color: isSelected ? dtColor : undefined
                        }}
                      >
                        {dt.label}
                      </span>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 shrink-0 ml-1.5"
                        style={{ color: dtColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* FOOTER HINT */}
            <div className="px-2 py-1 bg-[#0d0d0d] border-t border-[#262626] flex items-center justify-between text-[9px] text-slate-500 font-mono shrink-0 select-none">
              <span>↑↓ นำทาง</span>
              <span>Esc ปิด</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
