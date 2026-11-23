// Pills for the Ledger list filter row: they show a filter's value when it is set and have their own × to clear it.
import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { tc } from '@/constants/theme';

type IconType = React.ComponentType<{ className?: string }>;

const PILL = 'flex items-center h-7 border tint-border transition-colors';
export const pillStyle = (active: boolean) =>
  ({ ['--tint-border-color' as string]: active ? tc('accent-ink', 0.55) : tc('line') }) as React.CSSProperties;

interface ChipTriggerProps {
  icon: IconType;
  /** The filter's name, shown while it is off and as the clear button's label. */
  label: string;
  /** What is picked, shown instead of the name while the filter is on. */
  valueLabel?: React.ReactNode;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
  triggerRef?: React.Ref<HTMLButtonElement>;
  /** Shown while the filter is off, instead of its name (when a caption already names it). */
  placeholder?: React.ReactNode;
  /** Fill the width it is given, chevron on the right — like a select box. */
  block?: boolean;
}

/** The pill itself. The × is a sibling of the open button, not inside it (a button in a button is invalid). */
export function ChipTrigger({ icon: Icon, label, valueLabel, active, open, onToggle, onClear, triggerRef, placeholder, block = false }: ChipTriggerProps) {
  return (
    <div className={`${PILL} ${block ? 'w-full min-w-0' : ''} ${active ? 'bg-accent/10' : 'bg-surface hover:bg-surface-hover'}`} style={pillStyle(active)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={label}
        className={`h-full flex items-center gap-1.5 pl-2.5 text-[11px] font-black whitespace-nowrap cursor-pointer ${block ? 'flex-1 min-w-0' : 'max-w-[16rem]'} ${active ? 'pr-1 text-accent-ink' : 'pr-2 text-ink-body hover:text-ink-display'}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate overflow-x-clip">{active ? valueLabel : (placeholder ?? label)}</span>
        {!active && <ChevronDown className={`${block ? 'ml-auto' : ''} w-3 h-3 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`ล้างตัวกรอง${label}`}
          title={`ล้างตัวกรอง${label}`}
          className="h-full pr-2 pl-0.5 text-accent-ink/70 hover:text-accent-ink cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/** A pill that only shows a value and clears it, for filters set elsewhere (the group, from the breakdown rows). */
export function ValueChip({ icon: Icon, label, valueLabel, onClear }: { icon: IconType; label: string; valueLabel: React.ReactNode; onClear: () => void }) {
  return (
    <div className={`${PILL} bg-accent/10`} style={pillStyle(true)}>
      <span className="h-full flex items-center gap-1.5 pl-2.5 pr-1 text-[11px] font-black whitespace-nowrap text-accent-ink max-w-[16rem]">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate overflow-x-clip">{label}: {valueLabel}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`ล้างตัวกรอง${label}`}
        title={`ล้างตัวกรอง${label}`}
        className="h-full pr-2 pl-0.5 text-accent-ink/70 hover:text-accent-ink cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
