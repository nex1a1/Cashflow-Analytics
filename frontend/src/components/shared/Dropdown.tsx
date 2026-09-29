import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional dot colour (e.g. a group's colour). */
  color?: string | null;
}

export interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Extra classes for the trigger (width, theme). */
  className?: string;
  title?: string;
  'aria-label'?: string;
}

const ROW_H = 24;
const MAX_H = 216;

/**
 * Compact custom select. The native <select> popup is OS-drawn and can't be
 * styled; this renders a portal listbox (escapes `overflow-hidden` cards) with
 * 24px rows, keyboard nav and outside-click / scroll close.
 */
const Dropdown = memo(function Dropdown({
  value, options, onChange, placeholder = '—', disabled, className = '', title, 'aria-label': ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIdx = options.findIndex(o => o.value === value);
  const selected = options[selectedIdx];

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  const openList = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const h = Math.min(options.length * ROW_H + 8, MAX_H);
    const up = window.innerHeight - r.bottom < h + 8 && r.top > window.innerHeight - r.bottom;
    setPos({
      left: r.left,
      width: Math.max(r.width, 120),
      ...(up ? { bottom: window.innerHeight - r.top + 2 } : { top: r.bottom + 2 }),
    });
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [disabled, options.length, selectedIdx]);

  const pick = useCallback((i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    close();
    triggerRef.current?.focus();
  }, [options, onChange, close]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    const onScroll = (e: Event) => { if (!listRef.current?.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 border rounded-sm text-[11px] font-bold py-1.5 px-2 text-left select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${open ? 'border-accent-ink' : ''} ${className}`}
      >
        {selected?.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
        <span className={`flex-1 truncate ${selected ? '' : 'text-ink-muted'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 text-ink-muted ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onMouseDown={e => e.stopPropagation()}
          style={{ ...pos, maxHeight: MAX_H }}
          className="fixed z-[99999] overflow-y-auto py-1 bg-surface border border-line-strong rounded-sm shadow-[0_12px_28px_rgb(0_0_0/0.6)]"
        >
          {options.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(i)}
              style={{ height: ROW_H }}
              className={`flex items-center gap-1.5 px-2 text-[11px] font-semibold cursor-pointer ${
                i === active ? 'bg-surface-hover text-ink-display' : 'text-ink-body'
              } ${o.value === value ? 'text-ink-display' : ''}`}
            >
              {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check className="w-3 h-3 shrink-0 text-accent-ink" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
});

export default Dropdown;
