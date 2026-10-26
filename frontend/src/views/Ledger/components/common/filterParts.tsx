// Pieces both Ledger filter panels (list view and daily table) are built from.
import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

/** One column of the expanded filter panel: icon + title, its fields, and an optional footnote. */
export const FilterColumn = ({ icon: Icon, title, note, className = '', children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`bg-canvas p-3.5 flex flex-col justify-between gap-2.5 ${className}`}>
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-ink-muted" />
      <span className="text-[11px] font-black uppercase tracking-wider text-ink-soft font-mono">{title}</span>
    </div>
    {children}
    {note && <div className="text-[11px] text-ink-muted font-mono">{note}</div>}
  </div>
);

/** A labelled control inside a FilterColumn. */
export const FilterField = ({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">{label}</span>
    {children}
  </div>
);

/** Bottom strip of the panel: how many filters are on, and a button that clears them all. */
export const ActiveFiltersBar = ({ label, count, onClear }: { label: string; count: number; onClear: () => void }) => (
  <div className="flex items-center justify-between border-t border-line/60 p-2.5 px-3.5 bg-surface/50 relative z-1">
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-accent"></span>
      </span>
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-accent-ink" />
        <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">{label}</span>
        <span className="px-2 py-0.5 rounded-pill text-[11px] font-black bg-surface border border-accent/30 text-ink-soft font-mono">
          {count} active
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1 rounded-pill border text-accent-ink bg-accent/5 hover:bg-accent/10 border-accent/30 hover:border-accent-ink font-mono cursor-pointer"
    >
      <RefreshCw className="w-3 h-3" />
      ล้างการคัดกรองทั้งหมด
    </button>
  </div>
);
