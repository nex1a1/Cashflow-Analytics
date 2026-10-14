import { memo, useState } from 'react';
import useJsonSetting from '@/hooks/useJsonSetting';
import FieldError from '@/components/shared/FieldError';
import { CYCLE_PREFIX, isCyclePeriod, isSingleUnitPeriod, shiftMonth, stripCycle } from '@/utils/payCycle';
import { useAppFilter } from '@/context/AppFilterContext';

export interface Reflection { good?: string; next?: string; focus?: string }
export type Reflections = Record<string, Reflection>;

/** settings.month_reflections = { [period]: { good, next, focus } } — key คือ filterPeriod ของเดือน/รอบเดียว ('2026-10' หรือ 'cycle:2026-10') */
export const parseReflections = (raw: unknown): Reflections =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Reflections) : {};

export const previousPeriod = (period: string): string =>
  (isCyclePeriod(period) ? CYCLE_PREFIX : '') + shiftMonth(stripCycle(period), -1);

const FIELDS = [
  { key: 'good', label: 'อะไรที่ทำได้ดี' },
  { key: 'next', label: 'อะไรที่ปรับได้' },
  { key: 'focus', label: 'เดือนหน้าโฟกัสอะไร' },
] as const;

/** ทบทวนท้ายเดือนแบบ Kakeibo — แสดงเฉพาะตอนดูเดือนเดียว/รอบเดียว พร้อมสิ่งที่ตั้งใจไว้เมื่อเดือนก่อน */
const MonthReflection = memo(function MonthReflection() {
  const { filterPeriod, getFilterLabel } = useAppFilter();
  const [all, update] = useJsonSetting('month_reflections', parseReflections);
  const [error, setError] = useState<string | null>(null);
  // ข้อความที่พิมพ์แต่ยังไม่ได้บันทึก (หรือบันทึกพลาด) ต่อ "ช่วงเวลา:ช่อง" — ค่าที่โหลดมาหรือ rollback จึงไม่ทับสิ่งที่ผู้ใช้พิมพ์
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!isSingleUnitPeriod(filterPeriod)) return null;

  const current = all[filterPeriod] ?? {};
  const prev = all[previousPeriod(filterPeriod)];
  const prevPlan = prev?.focus || prev?.next;
  const unit = isCyclePeriod(filterPeriod) ? 'รอบ' : 'เดือน';
  // ทิ้ง draft เมื่อบันทึกแล้ว — เฉพาะถ้ายังเป็นข้อความเดิม (ระหว่างรอ ผู้ใช้อาจกลับมาพิมพ์ต่อ)
  const dropDraft = (id: string, text: string) => setDrafts((d) => {
    if (d[id] !== text) return d;
    const { [id]: _, ...rest } = d;
    return rest;
  });

  const save = async (field: keyof Reflection, id: string) => {
    const text = drafts[id];
    if (text === undefined) return;
    const value = text.trim();
    if (value === (current[field] ?? '')) { dropDraft(id, text); return; }
    const ok = await update((prev) => ({ ...prev, [filterPeriod]: { ...prev[filterPeriod], [field]: value } }));
    setError(ok ? null : 'บันทึกไม่สำเร็จ ข้อความยังอยู่ในช่อง ลองอีกครั้ง');
    if (ok) dropDraft(id, text);
  };

  return (
    <section aria-label={`ทบทวน${unit}`} className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 border-b border-line">
        <span className="text-[11px] font-black text-ink-muted">ทบทวน · {getFilterLabel(filterPeriod)}</span>
        {prevPlan && <span className="text-[11px] text-ink-body truncate">{unit}ก่อนตั้งใจโฟกัส: {prevPlan}</span>}
      </div>
      <div className="grid grid-cols-3 gap-4 px-4 py-3">
        {FIELDS.map(({ key, label }) => {
          const id = `${filterPeriod}:${key}`;
          return (
          <label key={key} className="flex flex-col gap-1 text-[11px] font-bold text-ink-muted">
            {label.replace('เดือน', unit)}
            <textarea
              value={drafts[id] ?? current[key] ?? ''}
              onChange={(e) => { const text = e.currentTarget.value; setDrafts((d) => ({ ...d, [id]: text })); }}
              maxLength={500}
              rows={2}
              onBlur={() => save(key, id)}
              aria-invalid={!!error}
              aria-describedby={error ? 'reflection-error' : undefined}
              className="resize-none bg-surface-elevated px-2 py-1.5 text-[13px] font-normal text-ink-display"
            />
          </label>
          );
        })}
      </div>
      {error && <div className="px-4 pb-3"><FieldError id="reflection-error" message={error} /></div>}
    </section>
  );
});

export default MonthReflection;
