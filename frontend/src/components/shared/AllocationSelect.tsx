import React, { memo } from 'react';
import { ALLOCATION_COLORS, readable } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';

/** An expense is NEED or WANT. SAVE means investing: savings-group rows carry it implicitly and show ซื้อ/ขาย instead of this picker. */
export type AllocationTypeKey = 'need' | 'want';

export interface AllocationSelectProps {
  value?: string | null;
  onChange: (val: AllocationTypeKey) => void;
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

const OPTIONS: { id: AllocationTypeKey; label: string; desc: string; color: string }[] = [
  { id: 'need', label: 'NEED', desc: 'จำเป็น · ปัจจัย 4 ดำรงชีพ (เป้า 50%)', color: ALLOCATION_COLORS.need },
  { id: 'want', label: 'WANT', desc: 'ตามใจ · ไลฟ์สไตล์ ความสุข (เป้า 30%)', color: ALLOCATION_COLORS.want },
];

const SIZE = { xs: 'h-[22px] text-[11px]', sm: 'h-[25px] text-[11px]', md: 'h-8 text-xs' };

interface SegOption<T extends string> { id: T; label: string; desc: string; color: string }

/** Two choices only, so a segmented toggle: one click, both options always visible. */
export function SegmentedToggle<T extends string>({ options, value, onChange, label, disabled = false, className = '', size = 'sm' }: {
  options: SegOption<T>[]; value: T; onChange: (v: T) => void; label: string;
  disabled?: boolean; className?: string; size?: keyof typeof SIZE;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const next = options.find(o => o.id !== value)!.id;
      onChange(next);
      (e.currentTarget.querySelector(`[data-id="${next}"]`) as HTMLElement | null)?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      className={`allocation-trigger relative w-full inline-flex bg-surface select-none [&>button+button]:border-l ${SIZE[size]} ${className}`}
    >
      {/* The picked option's tint glides between the halves (.m-slide). */}
      <span aria-hidden className="m-slide absolute inset-y-0 left-0 w-1/2" style={{
        translate: value === options[0].id ? '0 0' : '100% 0',
        backgroundColor: `rgba(${hexToRgb(options.find(o => o.id === value)?.color ?? options[0].color)}, 0.18)`,
      }} />
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            data-id={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            title={o.desc}
            onClick={() => !on && onChange(o.id)}
            className={`relative flex-1 min-w-0 px-1 font-mono font-black tracking-wider rounded-none border-line ${
              on ? '' : 'text-ink-muted hover:text-ink-body cursor-pointer'
            }`}
            style={on ? { color: readable(o.color) } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const AllocationSelect = memo(function AllocationSelect({ value = 'want', onChange, ...rest }: AllocationSelectProps) {
  return <SegmentedToggle options={OPTIONS} value={value === 'need' ? 'need' : 'want'} onChange={onChange} label="ประเภทการจัดสรรเงิน" {...rest} />;
});

export default AllocationSelect;
