// The document preview the Export modal and the Import guide share: top bar with search, scroll frame,
// and the two table shapes (long = one row per item, wide = one row per day, one column per category).
import React from 'react';
import { Search, X } from 'lucide-react';
import CategoryGlyph from '../shared/CategoryGlyph';
import { formatMoney } from '@/utils/formatters';
import { readable } from '@/constants/theme';

/** "ตัวอย่างเอกสาร / PREVIEW" + a count pill + the preview search box (either can be left out). */
export function PreviewTopBar({ count, search, setSearch }: {
  count?: React.ReactNode;
  search?: string;
  setSearch?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-neutral-300">
          ตัวอย่างเอกสาร <span className="text-neutral-500 font-mono font-normal">/ PREVIEW</span>
        </span>
        {count != null && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-pill bg-surface-hover border border-line text-neutral-400">{count}</span>
        )}
      </div>

      {setSearch && (
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="ค้นหาในตัวอย่าง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-line-strong pl-8 pr-7 py-0.5 text-xs leading-6 text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-accent-ink rounded-none transition-colors"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Bordered, scrollable box the preview content sits in. */
export const PreviewFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 border border-line bg-surface flex flex-col overflow-hidden relative">
    <div className="flex-1 overflow-auto custom-scrollbar relative">{children}</div>
  </div>
);

const TH = 'py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[11px]';
const THEAD = 'sticky top-0 bg-surface-hover text-neutral-300 z-10 select-none border-b border-line';
const ROW = 'hover:bg-canvas transition-colors group';

export interface Swatch { label: string; color: string }

const DayTypeBadge = ({ label, color }: Swatch) => (
  <td className="py-2 px-3 whitespace-nowrap">
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-pill border inline-block select-none font-mono"
      style={{ color: readable(color), borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {label}
    </span>
  </td>
);

/** Badge look, amount colour and sign for a row's flow type. */
export const flowStyle = (type: string) =>
  type === 'income' ? { badge: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40', amount: 'text-emerald-400', sign: '+' }
  : type === 'savings' ? { badge: 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40', amount: 'text-cyan-400', sign: '±' }
  : { badge: 'text-expense bg-expense/5 border-expense/20', amount: 'text-expense', sign: '−' };

export interface LongRow {
  key: string;
  date: string;
  dayType: Swatch;
  type: string;
  typeLabel: string;
  /** sign shown before the amount (a sell already carries its own minus) */
  sign: string;
  group?: string;
  category: { name: string; color: string; textColor: string; icon?: string | null };
  description?: string;
  amount: number;
}

/** One row per item. `cols` picks the optional columns; `labels` are the header texts in column order. */
export function LongTable({ rows, cols, labels }: {
  rows: LongRow[];
  cols: { dayType: boolean; type: boolean; group: boolean };
  labels: { date: string; dayType: string; type: string; group?: string; category: string; description: string; amount: string };
}) {
  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs leading-normal border-collapse min-w-[700px]">
        <thead className={THEAD}>
          <tr>
            <th className={`${TH} text-neutral-400`}>{labels.date}</th>
            {cols.dayType && <th className={`${TH} text-neutral-400`}>{labels.dayType}</th>}
            {cols.type && <th className={`${TH} text-neutral-400`}>{labels.type}</th>}
            {cols.group && <th className={`${TH} text-neutral-400`}>{labels.group}</th>}
            <th className={`${TH} text-neutral-400`}>{labels.category}</th>
            <th className={`${TH} text-neutral-400`}>{labels.description}</th>
            <th className={`${TH} text-neutral-400 text-right`}>{labels.amount}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(r => {
            const style = flowStyle(r.type);
            const { category: c } = r;
            return (
              <tr key={r.key} className={ROW}>
                <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap">{r.date}</td>
                {cols.dayType && <DayTypeBadge {...r.dayType} />}
                {cols.type && (
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-pill border ${style.badge}`}>{r.typeLabel}</span>
                  </td>
                )}
                {cols.group && <td className="py-2 px-3 text-neutral-400 text-xs whitespace-nowrap">{r.group || '—'}</td>}
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-pill border inline-flex items-center gap-1.5"
                    style={{ color: c.textColor, borderColor: `${c.color}35`, backgroundColor: `${c.color}12` }}
                  >
                    {c.icon && <CategoryGlyph icon={c.icon} color={c.color} size={11} />}
                    <span>{c.name}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-neutral-200 text-xs max-w-[240px] truncate" title={r.description}>{r.description || '—'}</td>
                <td className={`py-2 px-3 text-right font-mono font-bold text-xs tabular-nums ${style.amount}`}>
                  {r.sign}
                  {formatMoney(r.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface WideRow {
  key: string;
  date: string;
  dayType: Swatch;
  /** one amount per column, in column order */
  values: (number | null | undefined)[];
  total: number;
  note?: string;
}

/** One row per day, one column per category; date sticks left, total sticks right. A notes column shows when `labels.notes` is set. */
export function WideTable({ columns, rows, labels }: {
  columns: { key: string; name: string; color: string }[];
  rows: WideRow[];
  labels: { date: string; dayType: string; total: string; notes?: string };
}) {
  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs leading-normal border-collapse min-w-[800px]">
        <thead className={THEAD}>
          <tr>
            <th className={`${TH} text-neutral-400 sticky left-0 bg-surface-hover z-20`}>{labels.date}</th>
            <th className={`${TH} text-neutral-400`}>{labels.dayType}</th>
            {columns.map(col => (
              <th key={col.key} className={`${TH} text-right whitespace-nowrap`} style={{ color: readable(col.color) }}>{col.name}</th>
            ))}
            <th className={`${TH} text-right text-accent-ink sticky right-0 bg-surface-hover z-20`}>{labels.total}</th>
            {labels.notes && <th className={`${TH} text-neutral-400 whitespace-nowrap`}>{labels.notes}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(r => (
            <tr key={r.key} className={ROW}>
              <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap sticky left-0 bg-surface group-hover:bg-canvas z-10 border-r border-line">{r.date}</td>
              <DayTypeBadge {...r.dayType} />
              {r.values.map((v, i) => (
                <td
                  key={columns[i].key}
                  className={`py-2 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap ${v ? 'text-neutral-200 font-medium' : 'text-neutral-600'}`}
                >
                  {v ? formatMoney(v) : '—'}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-mono font-bold text-xs tabular-nums text-white sticky right-0 bg-surface group-hover:bg-canvas z-10 border-l border-line">
                {formatMoney(r.total)}
              </td>
              {labels.notes && (
                <td className="py-2 px-3 text-neutral-300 text-xs whitespace-nowrap">{r.note || <span className="text-neutral-600 font-mono">—</span>}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
