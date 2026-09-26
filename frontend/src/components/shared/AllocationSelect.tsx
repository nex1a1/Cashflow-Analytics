import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Home, ShoppingBag, Landmark } from 'lucide-react';
import { ALLOCATION_COLORS, readable, tc } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';

export type AllocationTypeKey = 'need' | 'want' | 'savings';

export interface AllocationSelectProps {
  value?: string | null;
  onChange: (val: AllocationTypeKey) => void;
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

interface AllocationConfig {
  id: AllocationTypeKey;
  label: string;
  nameThai: string;
  quota: string;
  desc: string;
  color: string;
  icon: typeof Home;
}

const ALLOCATION_CONFIGS: AllocationConfig[] = [
  {
    id: 'need',
    label: 'NEED',
    nameThai: 'จำเป็น',
    quota: 'เป้า 50%',
    desc: 'ค่าใช้จ่ายคงที่ · ปัจจัย 4 ดำรงชีพ',
    color: ALLOCATION_COLORS.need,
    icon: Home,
  },
  {
    id: 'want',
    label: 'WANT',
    nameThai: 'ทั่วไป',
    quota: 'เป้า 30%',
    desc: 'ค่าใช้จ่ายผันแปร · ไลฟ์สไตล์ ความสุข',
    color: ALLOCATION_COLORS.want,
    icon: ShoppingBag,
  },
  {
    id: 'savings',
    label: 'SAVE',
    nameThai: 'เงินออม',
    quota: 'เป้า 20%',
    desc: 'เงินออมสำรองฉุกเฉิน · ลงทุนสุทธิ',
    color: ALLOCATION_COLORS.savings,
    icon: Landmark,
  },
];

const CONFIG_MAP = ALLOCATION_CONFIGS.reduce<Record<string, AllocationConfig>>((acc, cfg) => {
  acc[cfg.id] = cfg;
  return acc;
}, {});

export const AllocationSelect = memo(function AllocationSelect({
  value = 'want',
  onChange,
  disabled = false,
  className = '',
  size = 'sm',
}: AllocationSelectProps) {
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
    width: 260,
    openUpwards: false,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Current selected item
  const currentKey: AllocationTypeKey = (value === 'need' || value === 'savings') ? value : 'want';
  const currentCfg = CONFIG_MAP[currentKey] || CONFIG_MAP.want;
  const currentColor = currentCfg.color;
  const currentRgb = useMemo(() => hexToRgb(currentColor), [currentColor]);

  // Position calculation
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const estimatedHeight = 220;

    // Center popover relative to trigger, but constrain to viewport
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number | undefined;
    let bottom: number | undefined;

    if (openUpwards) {
      bottom = window.innerHeight - rect.top + 4;
    } else {
      top = rect.bottom + 4;
    }

    setCoords({ top, bottom, left, width: popoverWidth, openUpwards });
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
    const idx = ALLOCATION_CONFIGS.findIndex((c) => c.id === currentKey);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [disabled, updatePosition, currentKey]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [open, handleClose, handleOpen]);

  const handleSelect = useCallback((id: AllocationTypeKey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(id);
    handleClose();
    triggerRef.current?.focus();
  }, [onChange, handleClose]);

  // Listeners for outside click, resize & scroll
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

    const handleResize = () => updatePosition();
    const handleScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      handleClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, handleClose, updatePosition]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        handleOpen();
      }
      return;
    }

    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((prev) => {
        const next = (prev + 1) % ALLOCATION_CONFIGS.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((prev) => {
        const next = (prev - 1 + ALLOCATION_CONFIGS.length) % ALLOCATION_CONFIGS.length;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (activeIndex >= 0 && activeIndex < ALLOCATION_CONFIGS.length) {
        handleSelect(ALLOCATION_CONFIGS[activeIndex].id);
      }
    }
  }, [open, activeIndex, handleOpen, handleClose, handleSelect]);

  const TriggerIcon = currentCfg.icon;

  const sizeClasses = size === 'xs'
    ? 'h-[22px] px-1.5 text-[10px] gap-1'
    : size === 'md'
    ? 'h-8 px-2.5 text-xs gap-1.5'
    : 'h-[25px] px-2 text-[11px] gap-1.5';

  return (
    <>
      {/* ─── TRIGGER BUTTON ─── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`allocation-trigger group relative w-full inline-flex items-center justify-between font-mono font-black tracking-wider rounded-none border outline-none select-none cursor-pointer transition-all duration-75 hover:brightness-125 active:scale-[0.98] ${
          open ? 'ring-1 ring-accent border-accent z-20 brightness-110' : ''
        } ${sizeClasses} ${className}`}
        style={{
          backgroundColor: `rgba(${currentRgb}, 0.12)`,
          borderColor: open ? undefined : `rgba(${currentRgb}, 0.40)`,
          color: readable(currentColor),
        }}
        title={`คลิกเพื่อเปลี่ยนการจัดสรร (ปัจจุบัน: ${currentCfg.label} - ${currentCfg.nameThai})`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Left Side: Micro Icon + Label */}
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <TriggerIcon className="w-3 h-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="truncate">{currentCfg.label}</span>
        </span>

        {/* Right Side: Chevron */}
        <ChevronDown
          className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-150 group-hover:opacity-100 ${
            open ? 'rotate-180 text-white opacity-100' : ''
          }`}
        />
      </button>

      {/* ─── TACTICAL FLOATING POPOVER (PORTAL) ─── */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            aria-label="เลือกประเภทการจัดสรรเงิน"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[99999] bg-surface border border-line-strong shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.06)] rounded-none flex flex-col overflow-hidden text-slate-200 select-none animate-in fade-in zoom-in-95 duration-75"
            style={{
              ...(coords.openUpwards
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
          >
            {/* Top Laser Hairline Accent */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent shrink-0 opacity-90" />

            {/* Header / HUD Context */}
            <div className="px-2.5 py-1.5 border-b border-line bg-canvas flex items-center justify-between shrink-0 gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5 min-w-0 truncate">
                <span className="w-1.5 h-1.5 rounded-none bg-accent shrink-0" />
                การจัดสรรเงิน (ALLOCATION)
              </span>
              <span className="text-[10px] font-mono text-ink-muted whitespace-nowrap shrink-0">
                50 / 30 / 20
              </span>
            </div>

            {/* Option Cards */}
            <div className="p-1 flex flex-col gap-1 bg-surface">
              {ALLOCATION_CONFIGS.map((cfg, idx) => {
                const isSelected = cfg.id === currentKey;
                const isFocused = idx === activeIndex;
                const cfgRgb = hexToRgb(cfg.color);
                const OptionIcon = cfg.icon;

                return (
                  <button
                    key={cfg.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => handleSelect(cfg.id, e)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between w-full px-2.5 py-2 text-left rounded-none border transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-canvas text-white'
                        : isFocused
                        ? 'bg-surface-hover text-white'
                        : 'bg-transparent text-slate-300 hover:bg-surface-hover'
                    }`}
                    style={{
                      borderColor: isSelected
                        ? `rgba(${cfgRgb}, 0.55)`
                        : isFocused
                        ? `rgba(${cfgRgb}, 0.25)`
                        : 'transparent',
                      backgroundColor: isSelected
                        ? `rgba(${cfgRgb}, 0.14)`
                        : isFocused
                        ? `rgba(${cfgRgb}, 0.08)`
                        : undefined,
                    }}
                  >
                    {/* Left: Mini glyph + Title + Subtitle */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-6 h-6 rounded-none flex items-center justify-center shrink-0 border mt-0.5"
                        style={{
                          backgroundColor: `rgba(${cfgRgb}, 0.18)`,
                          borderColor: `rgba(${cfgRgb}, 0.45)`,
                          color: readable(cfg.color),
                        }}
                      >
                        <OptionIcon className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono font-black text-xs tracking-wider"
                            style={{ color: readable(cfg.color) }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-300">
                            ({cfg.nameThai})
                          </span>
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-mono font-black rounded-none border leading-none ml-auto whitespace-nowrap shrink-0"
                            style={{
                              backgroundColor: `rgba(${cfgRgb}, 0.15)`,
                              borderColor: `rgba(${cfgRgb}, 0.35)`,
                              color: readable(cfg.color),
                            }}
                          >
                            {cfg.quota}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-body mt-0.5 truncate">
                          {cfg.desc}
                        </span>
                      </div>
                    </div>

                    {/* Right: Selected Checkmark */}
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 shrink-0 ml-2"
                        style={{ color: readable(cfg.color) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Keyboard Hints */}
            <div className="px-2 py-1 bg-canvas border-t border-line flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0 select-none">
              <span>↑↓ นำทาง</span>
              <span>Enter เลือก</span>
              <span>Esc ปิด</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

export default AllocationSelect;
