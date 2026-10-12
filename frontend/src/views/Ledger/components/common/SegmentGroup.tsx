/** Active colour per scheme: the sliding background and the active label. */
const SCHEMES = {
  blue: { bg: 'bg-surface-elevated', text: 'text-ink-display' },
  emerald: { bg: 'bg-income/10', text: 'text-income' },
  rose: { bg: 'bg-expense/5', text: 'text-expense' },
  amber: { bg: 'bg-warn/10', text: 'text-warn' },
  indigo: { bg: 'bg-savings/10', text: 'text-savings' },
} as const;

export type SegmentColorScheme = keyof typeof SCHEMES;
export interface SegmentOption<T extends string> { value: T; label: string; colorScheme?: SegmentColorScheme }

/** One-of-N filter: equal-width options, the active background glides to the picked one (`.m-slide`). */
export default function SegmentGroup<T extends string>({ options, value, onChange }: {
  options: SegmentOption<T>[]; value: T; onChange: (value: T) => void;
}) {
  const index = Math.max(0, options.findIndex(o => o.value === value));
  return (
    <div className="relative grid rounded-none p-0.5 border bg-surface border-line [&>button+button]:border-l"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span aria-hidden className={`m-slide absolute inset-y-0.5 left-0.5 ${SCHEMES[options[index].colorScheme ?? 'blue'].bg}`}
        style={{ width: `calc((100% - 4px) / ${options.length})`, translate: `${index * 100}% 0` }} />
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={`relative px-2.5 py-1 text-[11px] font-black uppercase tracking-wider whitespace-nowrap rounded-none border-line transition-colors font-mono cursor-pointer ${
              on ? SCHEMES[o.colorScheme ?? 'blue'].text : 'text-ink-body hover:text-ink-display'
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
