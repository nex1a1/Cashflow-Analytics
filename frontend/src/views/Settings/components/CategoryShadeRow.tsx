import { memo, useMemo, useRef, type CSSProperties } from 'react';
import { Palette } from 'lucide-react';
import { Category, CashflowGroup } from '../../../types';
import { SHADE_STRENGTH_STEP } from '@/utils/categoryColors';

interface Props {
  /** current strength 0–100 (the live draft while dragging) */
  value: number;
  onPreview: (n: number) => void;
  onSave: (n: number) => unknown;
  /** categories as the app shows them (already in their group shades) */
  categories: Category[];
  cashflowGroups: CashflowGroup[];
}

const COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
const SCALE_TICKS = [0, 25, 50, 75, 100];

/**
 * How far a group's category colours spread. Dragging recolours the whole app live (and the swatches here);
 * the value is saved when the slider is let go, or after a keyboard step.
 */
const CategoryShadeRow = memo(function CategoryShadeRow({ value, onPreview, onSave, categories, cashflowGroups }: Props) {
  // the last value the slider moved to, not yet saved: pointer-up, a key step and blur can all follow one drag, save once
  const pending = useRef<number | null>(null);
  const commit = () => {
    if (pending.current === null) return;
    const n = pending.current;
    pending.current = null;
    onSave(n);
  };

  // one swatch strip per group that has more than one category, in group order
  const strips = useMemo(() => {
    const byGroup = new Map<string, Category[]>();
    for (const c of categories) {
      const gid = c.cashflowGroup || c.cashflow_group_id;
      if (!gid) continue;
      byGroup.set(gid, [...(byGroup.get(gid) ?? []), c]);
    }
    return [...cashflowGroups]
      .sort((a, b) => a.order_index - b.order_index)
      .map(g => ({ g, cats: (byGroup.get(g.id) ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) }))
      .filter(s => s.cats.length > 1);
  }, [categories, cashflowGroups]);

  const label = value === 0 ? 'ใช้สีกลุ่มเดียวกันทุกหมวด' : `${value}%`;

  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 bg-surface border border-line" data-shade-row>
      <div className="flex items-center gap-3">
        <Palette className="w-4 h-4 shrink-0 text-accent-ink" />
        <div className="min-w-0 flex-1">
          <label htmlFor="category-shade" className="text-xs font-bold text-ink-display">ความต่างของสีหมวดในกลุ่ม</label>
          <div className="text-[11px] text-ink-body">น้อย = หมวดในกลุ่มสีใกล้กัน · มาก = แยกเฉดชัด</div>
        </div>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink-soft" aria-hidden>{label}</span>
      </div>
      <div>
        <input
          id="category-shade"
          type="range"
          min={0}
          max={100}
          step={SHADE_STRENGTH_STEP}
          value={value}
          aria-valuetext={label}
          onChange={e => { pending.current = Number(e.target.value); onPreview(pending.current); }}
          onPointerUp={commit}
          onKeyUp={e => { if (COMMIT_KEYS.has(e.key)) commit(); }}
          onBlur={commit}
          className="range-slider"
          style={{ '--range-fill': value / 100 } as CSSProperties}
        />
        <div className="range-scale text-[11px] font-mono tabular-nums text-ink-muted" aria-hidden>
          {SCALE_TICKS.map(t => (
            <span key={t} className="range-tick" style={{ '--tick': t / 100 } as CSSProperties}><span>{t}</span></span>
          ))}
        </div>
      </div>
      {strips.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1" aria-hidden>
          {strips.map(({ g, cats }) => (
            <div key={g.id} className="flex items-center gap-2 min-w-0" data-shade-strip>
              <span className="w-24 shrink-0 text-[11px] text-ink-muted overflow-x-clip whitespace-nowrap text-ellipsis">{g.name}</span>
              <div className="flex flex-1 h-2.5 gap-px">
                {cats.map(c => <span key={c.id} className="flex-1" title={c.name} style={{ backgroundColor: c.color || undefined }} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default CategoryShadeRow;
