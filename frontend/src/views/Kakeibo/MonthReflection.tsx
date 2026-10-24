import { memo, useState } from 'react';
import useJsonSetting from '@/hooks/useJsonSetting';
import FieldError from '@/components/shared/FieldError';
import { CYCLE_PREFIX, isCyclePeriod, isSingleUnitPeriod, shiftMonth, stripCycle } from '@/utils/payCycle';
import { useAppFilter } from '@/context/AppFilterContext';

export interface Reflection { good?: string; next?: string; focus?: string }
export type Reflections = Record<string, Reflection>;

/** settings.month_reflections = { [period]: { good, next, focus } } — key คือ filterPeriod ของเดือน/รอบเดียว ('2026-10' หรือ 'cycle:2026-10') */
export const parseReflections = (raw: unknown): Reflections => {
  const out: Reflections = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [period, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    const r: Reflection = {};
    for (const f of ['good', 'next', 'focus'] as const) if (typeof e[f] === 'string') r[f] = e[f] as string;
    out[period] = r;
  }
  return out;
};

export const previousPeriod = (period: string): string =>
  (isCyclePeriod(period) ? CYCLE_PREFIX : '') + shiftMonth(stripCycle(period), -1);

const FIELDS = [
  { key: 'good', label: 'อะไรที่ทำได้ดี' },
  { key: 'next', label: 'อะไรที่ปรับได้' },
  { key: 'focus', label: 'เดือนหน้าโฟกัสอะไร' },
] as const;

/** ทบทวนท้ายเดือนแบบ Kakeibo — แสดงเฉพาะตอนดูเดือนเดียว/รอบเดียว พร้อมสิ่งที่ตั้งใจไว้เมื่อเดือนก่อน (คำตัดสินเทียบเป้าอยู่ที่หัวกระดาษ) */
const MonthReflection = memo(function MonthReflection() {
  const { filterPeriod, getFilterLabel } = useAppFilter();
  const [all, update] = useJsonSetting('month_reflections', parseReflections);
  // ช่องที่บันทึกไม่สำเร็จ (id = ช่วงเวลา:ช่อง) — แต่ละช่องมีสถานะของตัวเอง ช่องอื่นบันทึกสำเร็จไม่ล้างคำเตือน
  const [failed, setFailed] = useState<Record<string, true>>({});
  // ช่องที่เพิ่งบันทึกสำเร็จ — ขึ้น "บันทึกแล้ว" จนกว่าจะพิมพ์ต่อ (บันทึกตอนออกจากช่อง จึงต้องบอกว่าเก็บแล้ว)
  const [saved, setSaved] = useState<Record<string, true>>({});
  // ข้อความที่พิมพ์แต่ยังไม่ได้บันทึก (หรือบันทึกพลาด) ต่อ "ช่วงเวลา:ช่อง" — ค่าที่โหลดมาหรือ rollback จึงไม่ทับสิ่งที่ผู้ใช้พิมพ์
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!isSingleUnitPeriod(filterPeriod)) return null;

  const current = all[filterPeriod] ?? {};
  const prev = all[previousPeriod(filterPeriod)];
  const prevIntent = ([['โฟกัส', prev?.focus], ['ปรับ', prev?.next]] as const).filter(([, text]) => !!text);
  const hasError = Object.keys(failed).some((k) => k.startsWith(`${filterPeriod}:`));
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
    const ok = await update((all) => ({ ...all, [filterPeriod]: { ...all[filterPeriod], [field]: value } }));
    setFailed((f) => {
      if (!ok) return { ...f, [id]: true };
      const { [id]: _, ...rest } = f;
      return rest;
    });
    if (ok) {
      dropDraft(id, text);
      setSaved((m) => ({ ...m, [id]: true }));
    }
  };

  return (
    <section aria-label={`ทบทวน${unit}`} className="border border-line bg-surface">
      <h2 className="px-4 py-1.5 border-b border-line text-[11px] font-black text-ink-muted">ทบทวน · {getFilterLabel(filterPeriod)}</h2>
      {prevIntent.length > 0 && (
        // แถบสีเป็น span แยก: border-left สีอื่นถูก border lock (darkMode.css) ทับเป็นสี line
        <div data-prev-intent className="flex border-b border-line bg-surface-elevated">
          <span aria-hidden className="w-0.5 shrink-0 bg-accent" />
          <div className="flex flex-col gap-0.5 px-4 py-2 min-w-0">
            <span className="text-[11px] font-black text-accent-ink">{unit}ก่อนตั้งใจไว้ · {getFilterLabel(previousPeriod(filterPeriod))}</span>
            {prevIntent.map(([label, text]) => (
              <p key={label} className="text-[13px] leading-snug text-ink-display whitespace-pre-line wrap-break-word">
                <span className="mr-1.5 text-[11px] font-bold text-ink-muted">{label}</span>{text}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 px-4 py-3">
        {FIELDS.map(({ key, label }) => {
          const id = `${filterPeriod}:${key}`;
          return (
          <label key={key} className="flex flex-col gap-1 text-[11px] font-bold text-ink-muted">
            <span className="flex items-baseline justify-between gap-2">
              {label.replace('เดือน', unit)}
              {saved[id] && <span role="status" className="font-normal text-income">บันทึกแล้ว</span>}
            </span>
            <textarea
              value={drafts[id] ?? current[key] ?? ''}
              onChange={(e) => {
                const text = e.currentTarget.value;
                setDrafts((d) => ({ ...d, [id]: text }));
                setSaved((m) => { if (!m[id]) return m; const { [id]: _, ...rest } = m; return rest; });
              }}
              maxLength={500}
              rows={6}
              onBlur={() => save(key, id)}
              aria-invalid={!!failed[id]}
              aria-describedby={failed[id] ? 'reflection-error' : undefined}
              className="min-h-36 resize-y bg-surface-elevated px-3 py-2 text-sm leading-relaxed font-normal text-ink-display"
            />
          </label>
          );
        })}
      </div>
      {hasError && <div className="px-4 pb-3"><FieldError id="reflection-error" message="บันทึกไม่สำเร็จ ข้อความยังอยู่ในช่อง ลองอีกครั้ง" /></div>}
    </section>
  );
});

export default MonthReflection;
