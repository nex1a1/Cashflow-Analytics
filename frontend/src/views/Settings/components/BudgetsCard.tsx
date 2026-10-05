import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Target, Pencil, Check, Plus } from 'lucide-react';
import SectionCard from './SectionCard';
import FieldError from '@/components/shared/FieldError';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { readable } from '@/constants/theme';
import useBudgets from '@/hooks/useBudgets';
import { parseBudgetInput } from '@/utils/budgetEnvelope';
import type { CashflowGroup } from '@/types';

const TARGET_ICON = <Target className="w-4 h-4" />;
const baht = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;

const BTN = 'text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 rounded-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default';

/** งบหลวมต่อเดือน/รอบ ของกลุ่มรายจ่าย — แสดงเป็นแถบในหน้าภาพรวมเมื่อเลือกดูเดือนเดียวหรือรอบเดียว */
const BudgetsCard = memo(function BudgetsCard({ cashflowGroups }: { cashflowGroups: CashflowGroup[] }) {
  const { budgets, setBudget } = useBudgets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const uid = useId();

  const groups = useMemo(
    () => cashflowGroups.filter((g) => g.type === 'expense').sort((a, b) => a.order_index - b.order_index),
    [cashflowGroups],
  );

  const open = (g: CashflowGroup) => {
    setEditingId(g.id);
    setDraft(budgets[g.id] ? String(budgets[g.id] / 100) : '');
    setError(null);
  };

  // ปิดช่องกรอกแล้วคืนโฟกัสให้ปุ่มแก้ไขของแถวนั้น — ต้องรอ render เสร็จ ปุ่มถึงจะกลับมาอยู่ใน DOM
  const refocusId = useRef<string | null>(null);
  useEffect(() => {
    if (editingId === null && refocusId.current) {
      document.getElementById(`${uid}-edit-${refocusId.current}`)?.focus();
      refocusId.current = null;
    }
  }, [editingId, uid]);

  const close = (id: string) => {
    refocusId.current = id;
    setEditingId(null);
    setError(null);
  };

  const save = async (g: CashflowGroup) => {
    const value = parseBudgetInput(draft);
    if (value === false) {
      setError('กรอกเป็นตัวเลขมากกว่า 0 หรือเว้นว่างถ้าไม่อยากตั้งงบ');
      return;
    }
    const satang = value == null ? null : Math.round(value * 100);
    if ((budgets[g.id] ?? null) === satang) return close(g.id); // ไม่ได้เปลี่ยน ไม่ต้องยิง API
    setSaving(true);
    const ok = await setBudget(g.id, value);
    setSaving(false);
    if (ok) close(g.id);
    else setError('บันทึกไม่สำเร็จ ลองอีกครั้ง'); // ค้างอยู่ในช่องกรอก ข้อความที่พิมพ์ไม่หาย
  };

  return (
    <SectionCard accentColor="orange" icon={TARGET_ICON} title="งบประมาณ" badge={groups.filter((g) => budgets[g.id]).length}>
      <p className="px-3.5 pt-3 text-[11px] leading-relaxed text-ink-body">
        ตั้งเฉพาะกลุ่มที่ใช้รายวัน เช่น ค่ากิน · ใช้ยอดเดียวทั้งเดือนปฏิทินและรอบ 25–24 · แสดงในหน้าภาพรวมเมื่อดูเดือน/รอบเดียว
      </p>
      <div className="p-3 space-y-2 bg-canvas/30">
        {groups.filter((g) => budgets[g.id] || editingId === g.id).map((g) => {
          const isEditing = editingId === g.id;
          const current = budgets[g.id];
          const errId = `${uid}-err-${g.id}`;
          return (
            <div key={g.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-3 p-1.5 border rounded-sm bg-surface border-line">
                <span className="flex items-center gap-2 flex-1 min-w-0 pl-1 text-[13px] font-semibold text-ink-display">
                  <CategoryGlyph icon={g.icon} color={readable(g.color)} size={14} className="shrink-0" />
                  <span className="truncate">{g.name}</span>
                </span>

                {isEditing ? (
                  <>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-body">
                      <span aria-hidden="true">฿</span>
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        value={draft}
                        disabled={saving}
                        onChange={(e) => { setDraft(e.target.value); setError(null); }}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); save(g); }
                          else if (e.key === 'Escape') { e.preventDefault(); close(g.id); }
                        }}
                        placeholder="เว้นว่าง = ไม่ตั้งงบ"
                        aria-label={`งบของ ${g.name} (บาท)`}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errId : undefined}
                        className={`w-[150px] px-2 py-1.5 border outline-none font-semibold text-[13px] rounded-sm tabular-nums text-right bg-canvas border-line text-ink-display focus:border-accent-ink placeholder-ink-muted ${error ? 'tint-danger' : ''}`}
                      />
                    </label>
                    <button type="button" onClick={() => save(g)} disabled={saving} className={`${BTN} bg-accent text-on-accent hover:opacity-90`}>
                      <Check className="w-4 h-4" aria-hidden="true" /> บันทึก
                    </button>
                    <button type="button" onClick={() => close(g.id)} disabled={saving} className={`${BTN} border border-line bg-canvas text-ink-body hover:bg-surface-hover hover:text-ink-display`}>
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`text-[13px] tabular-nums ${current ? 'font-bold text-ink-display' : 'text-ink-muted'}`}>
                      {current ? baht(current) : 'ยังไม่ตั้ง'}
                    </span>
                    <button
                      type="button"
                      id={`${uid}-edit-${g.id}`}
                      onClick={() => open(g)}
                      aria-label={`${current ? 'แก้ไข' : 'ตั้ง'}งบของ ${g.name}`}
                      className={`${BTN} w-[78px] justify-center border border-line bg-canvas text-ink-body hover:bg-surface-hover hover:text-ink-display`}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {current ? 'แก้ไข' : 'ตั้งงบ'}
                    </button>
                  </>
                )}
              </div>
              {isEditing && <FieldError id={errId} message={error} />}
            </div>
          );
        })}
        {/* กลุ่มที่ยังไม่ตั้งงบ: ย่อเป็นชิปเล็กๆ กดแล้วกลายเป็นแถวพร้อมช่องกรอกด้านบน */}
        {groups.some((g) => !budgets[g.id] && editingId !== g.id) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-ink-muted" aria-label="ยังไม่ตั้งงบ" />
            {groups.filter((g) => !budgets[g.id] && editingId !== g.id).map((g) => (
              <button
                key={g.id}
                type="button"
                id={`${uid}-edit-${g.id}`}
                onClick={() => open(g)}
                aria-label={`ตั้งงบของ ${g.name}`}
                title={`ตั้งงบ ${g.name}`}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold border rounded-sm cursor-pointer border-line bg-surface text-ink-body hover:bg-surface-hover hover:text-ink-display"
              >
                <CategoryGlyph icon={g.icon} color={readable(g.color)} size={12} className="shrink-0" />
                {g.name}
              </button>
            ))}
          </div>
        )}
        {groups.length === 0 &&<p className="text-center py-4 text-xs text-ink-muted">ยังไม่มีกลุ่มรายจ่าย</p>}
      </div>
    </SectionCard>
  );
});

export default BudgetsCard;
