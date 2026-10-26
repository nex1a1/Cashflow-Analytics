import { memo, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { readable, tc } from '@/constants/theme';
import { formatBaht } from '@/utils/formatters';
import { recurringKey } from '@/utils/recurring';
import type { Category, TransactionDisplay } from '@/types';

/** settings.kakeibo_fixed — เลือกเองว่าอะไรเป็น Fix Cost นอกจากกลุ่มที่พัก: ทั้งหมวด หรือเฉพาะรายการ (recurringKey) */
export interface FixedChoice { categories: string[]; items: string[] }
export const FIXED_SETTING_KEY = 'kakeibo_fixed';
export const parseFixedChoice = (raw: unknown): FixedChoice => {
  const o = raw && typeof raw === 'object' ? (raw as Partial<FixedChoice>) : {};
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return { categories: strings(o.categories), items: strings(o.items) };
};

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

/** รายการให้ติ๊ก: รายจ่าย NEED ของช่วงนี้ (WANT ไม่ใช่ Fix Cost) แยกตามหมวด → ชื่อรายการ (ไม่รวมหมวดในกลุ่มที่พัก ซึ่งเป็น Fix Cost อยู่แล้ว) */
const FixedCostPicker = memo(function FixedCostPicker({ rows, range, autoCategoryIds, catById, choice, onChange }: {
  rows: TransactionDisplay[];
  range: { start: string; end: string };
  autoCategoryIds: ReadonlySet<string>;
  catById: Map<string, Category>;
  choice: FixedChoice;
  /** รับฟังก์ชันจากค่าล่าสุด ไม่ใช่ค่าตอน render — ติ๊กติดกันจะไม่ทับกัน */
  onChange: (update: (current: FixedChoice) => FixedChoice) => void;
}) {
  const groups = useMemo(() => {
    const byCat = new Map<string, { id: string; name: string; total: number; items: Map<string, { key: string; label: string; total: number }> }>();
    for (const t of rows) {
      if (t.group_type !== 'expense' || t.allocation_type !== 'need' || !t.category_id || t.date < range.start || t.date > range.end || autoCategoryIds.has(t.category_id)) continue;
      const cat = byCat.get(t.category_id) ?? { id: t.category_id, name: t.category, total: 0, items: new Map() };
      const satang = Math.round(t.amount * 100);
      const key = recurringKey(t.category_id, t.description);
      const item = cat.items.get(key) ?? { key, label: (t.description ?? '').trim() || '(ไม่มีชื่อรายการ)', total: 0 };
      item.total += satang;
      cat.total += satang;
      cat.items.set(key, item);
      byCat.set(t.category_id, cat);
    }
    // ที่เลือกไว้แต่ช่วงนี้ไม่มีแถว (เช่น บิลเดือนหน้ายังไม่ลง) ต้องยังเห็นและเอาออกได้
    const ensure = (id: string) => {
      let cat = byCat.get(id);
      if (!cat) { cat = { id, name: catById.get(id)?.name ?? '(หมวดที่ไม่พบ)', total: 0, items: new Map() }; byCat.set(id, cat); }
      return cat;
    };
    for (const id of choice.categories) if (!autoCategoryIds.has(id)) ensure(id);
    for (const key of choice.items) {
      const id = key.slice(0, key.indexOf('|'));
      if (!id || autoCategoryIds.has(id)) continue;
      const cat = ensure(id);
      if (!cat.items.has(key)) cat.items.set(key, { key, label: key.slice(id.length + 1) || '(ไม่มีชื่อรายการ)', total: 0 });
    }
    return [...byCat.values()].sort((a, b) => b.total - a.total);
  }, [rows, range.start, range.end, autoCategoryIds, catById, choice]);
  // หุบทุกหมวดเป็นค่าเริ่มต้น กดชื่อหมวดเพื่อดูรายการ
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  return (
    <div className="flex flex-col max-h-[420px] overflow-y-auto overflow-x-hidden">
      <p className="px-4 py-2 text-[11px] text-ink-muted">เลือกได้เฉพาะรายการ NEED · ติ๊กทั้งหมวด หรือกดชื่อหมวดเพื่อเลือกเฉพาะรายการ</p>
      <ul className="flex flex-col gap-1 p-2 border-t border-line">
        {groups.map((g) => {
          const cat = catById.get(g.id);
          const whole = choice.categories.includes(g.id);
          const picked = [...g.items.keys()].filter((k) => choice.items.includes(k)).length;
          const isOpen = open.has(g.id) && !whole;
          const color = cat?.color ?? tc('ink-body');
          const tint = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
          // แต่ละหมวดมีแถบสีซ้าย + หัวพื้นสีจาง ๆ ของหมวด ให้แยกหมวดออกจากกันได้ด้วยตา
          return (
            <li key={g.id} className="border-l-[3px] tint-border" style={{ ['--tint-border-color' as string]: color }}>
              <div className="flex items-center gap-2 px-4 py-1.5 min-w-0" style={{ backgroundColor: tint(whole || picked ? 14 : 7) }}>
                <input
                  type="checkbox"
                  aria-label={`${g.name} ทั้งหมวด`}
                  checked={whole}
                  onChange={() => onChange((c) => ({ ...c, categories: toggle(c.categories, g.id) }))}
                />
                <button
                  onClick={() => setOpen((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; })}
                  disabled={whole}
                  aria-expanded={isOpen}
                  className="flex flex-1 items-center gap-2 min-w-0 text-left text-[13px] text-ink-display disabled:cursor-default"
                >
                  <ChevronRight className={`w-3 h-3 shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-90' : ''} ${whole ? 'invisible' : ''}`} />
                  <CategoryGlyph icon={cat?.icon} color={readable(cat?.color ?? tc('ink-body'))} size={12} className="shrink-0" />
                  <span className="min-w-0 truncate font-bold" style={{ color: readable(color) }}>{g.name}</span>
                  <span className={`ml-auto shrink-0 text-[11px] ${whole || picked ? 'font-bold text-ink-display' : 'text-ink-muted'}`}>
                    {whole ? 'ทั้งหมวด' : picked ? `เลือก ${picked}/${g.items.size}` : `${g.items.size} รายการ`}
                  </span>
                </button>
              </div>
              {isOpen && (
                <ul className="m-reveal py-1 pl-[44px] pr-4 bg-canvas">
                  {[...g.items.values()].sort((a, b) => b.total - a.total).map((it) => {
                    const on = choice.items.includes(it.key);
                    return (
                    <li key={it.key}>
                      <label
                        className={`flex items-center gap-2 min-w-0 px-2 py-0.5 text-[11px] cursor-pointer hover:bg-surface-hover ${on ? 'font-bold text-ink-display' : 'text-ink-body'}`}
                        style={on ? { backgroundColor: tint(12) } : undefined}
                      >
                        <input type="checkbox" checked={on} onChange={() => onChange((c) => ({ ...c, items: toggle(c.items, it.key) }))} />
                        <span className="min-w-0 truncate" title={it.label}>{it.label}</span>
                        <span className="ml-auto shrink-0 font-mono tabular-nums">{it.total ? formatBaht(it.total / 100) : 'ไม่มีในช่วงนี้'}</span>
                      </label>
                    </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export default FixedCostPicker;
