// Layout pieces the Export modal and the Import guide share: title bar, sidebar option blocks and footer summary.
import React from 'react';
import { X } from 'lucide-react';

type IconType = React.ComponentType<{ className?: string }>;
export type Delimiter = ',' | ';';
export type HeaderLang = 'th' | 'en';

export function ModalTitleBar({ icon: Icon, title, en, subtitle, onClose, closeTitle, closeDisabled }: {
  icon: IconType;
  title: string;
  /** English caption after the title, hidden on narrow screens */
  en: string;
  subtitle: string;
  onClose: () => void;
  closeTitle: string;
  closeDisabled?: boolean;
}) {
  return (
    <div className="px-6 py-4 border-b border-line bg-surface flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 border border-accent/30 bg-accent/10 rounded-none shrink-0">
          <Icon className="w-5 h-5 text-accent-ink" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none">{title}</h3>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:inline">/ {en}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-surface-elevated border border-transparent hover:border-line-strong transition-colors disabled:opacity-30 rounded-none cursor-pointer disabled:cursor-default"
        title={closeTitle}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/** Numbered sidebar heading: "01. ขอบเขตช่วงเวลา / PERIOD". */
export const SidebarHeading = ({ n, th, en }: { n: string; th: string; en: string }) => (
  <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
    {`${n}. ${th} `}<span className="text-neutral-500 font-mono font-normal">/ {en}</span>
  </h4>
);

/** A selectable file-format card in the sidebar. */
export function FormatCard({ active, onClick, icon: Icon, title, subtitle, description, badge }: {
  active: boolean;
  onClick: () => void;
  icon: IconType;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-none border text-left transition-colors relative cursor-pointer ${
        active ? 'border-accent-ink bg-accent/10 text-white' : 'border-line bg-surface hover:border-accent/40 text-neutral-400 hover:text-neutral-200'
      }`}
    >
      <div className={`p-1.5 rounded-none border mt-0.5 shrink-0 ${active ? 'border-accent-ink bg-accent/20 text-accent-ink' : 'border-line-strong bg-canvas text-neutral-500'}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h5 className="text-xs font-black uppercase tracking-wide truncate">{title}</h5>
          {badge && (
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-none bg-accent/20 text-accent-ink border border-accent/30 uppercase font-bold shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-neutral-500 mt-0.5">{subtitle}</p>
        <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{description}</p>
      </div>

      {active && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent" />}
    </button>
  );
}

/** Small caption over an option control. */
export const OptionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">{children}</span>
);

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3' } as const;

/** Row of mutually exclusive buttons (the selected one filled red). */
export function SegChoice<T extends string>({ options, value, onChange, cols = 2 }: {
  options: readonly (readonly [T, React.ReactNode])[];
  value: T;
  onChange: (v: T) => void;
  cols?: keyof typeof COLS;
}) {
  return (
    <div className={`grid ${COLS[cols]} gap-1 bg-canvas p-1 border border-line-strong`}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
            value === v ? 'bg-accent text-on-accent' : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Delimiter + header language: the CSV options both modals offer. */
export const CsvDocOptions = ({ delimiter, setDelimiter, headerLang, setHeaderLang }: {
  delimiter: Delimiter;
  setDelimiter: (d: Delimiter) => void;
  headerLang: HeaderLang;
  setHeaderLang: (l: HeaderLang) => void;
}) => (
  <>
    <div className="space-y-1.5">
      <OptionLabel>เครื่องหมายคั่น</OptionLabel>
      <SegChoice options={[[',', 'Comma ( , )'], [';', 'Semicolon ( ; )']]} value={delimiter} onChange={setDelimiter} />
    </div>
    <div className="space-y-1.5">
      <OptionLabel>ภาษาของหัวตาราง</OptionLabel>
      <SegChoice options={[['th', 'ภาษาไทย'], ['en', 'English (EN)']]} value={headerLang} onChange={setHeaderLang} />
    </div>
  </>
);

export const FOOTER_BAR = 'px-6 py-3.5 border-t border-line bg-surface flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0';
export const CANCEL_BTN = 'px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-surface-hover border border-transparent transition-colors rounded-none cursor-pointer disabled:cursor-default disabled:opacity-30';
export const PRIMARY_BTN = 'px-5 py-2 text-xs font-black uppercase tracking-wider bg-accent hover:bg-accent-active text-on-accent transition-colors flex items-center gap-2 rounded-none cursor-pointer disabled:cursor-default disabled:opacity-30 disabled:hover:bg-accent';

/** "label: value" in the footer summary; `pill` boxes the value, otherwise it is plain and hidden on narrow screens. */
export const SummaryChip = ({ label, pill, title, className = '', children }: {
  label: string;
  pill?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`flex items-center gap-1.5 ${pill ? '' : 'hidden md:flex'}`}>
    <span className="text-neutral-500 font-bold uppercase text-[11px]">{label}:</span>
    <span
      className={pill ? `text-neutral-200 font-bold px-1.5 py-0.5 rounded-pill bg-surface-hover border border-line ${className}` : 'text-neutral-300 font-bold'}
      title={title}
    >
      {children}
    </span>
  </div>
);
