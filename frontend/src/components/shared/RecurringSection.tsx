import React, { useId, useLayoutEffect, useState } from 'react';
import { Repeat, Check, Circle, X, Plus, ChevronDown } from 'lucide-react';
import CategoryGlyph from './CategoryGlyph';
import useRecurring from '@/hooks/useRecurring';
import { useMenu } from '@/hooks/useMenu';
import { useAppFilter } from '@/context/AppFilterContext';
import { isCyclePeriod, cycleLabel } from '@/utils/payCycle';
import { unitKeyOf, RecurringItem, RecurringRow } from '@/utils/recurring';
import { formatMoney, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { Category } from '@/types';

export interface RecurringSectionProps {
  /** วันที่ในฟอร์ม — ส่วนนี้แสดงเดือน/รอบของวันนี้ */
  targetDate: string;
  /** แถวที่รู้อยู่แล้วในหน้านี้ (context + ตะกร้า) */
  localRows: RecurringRow[];
  catMap: Record<string, Category>;
  /** คลิกแถว = ใส่ลงฟอร์ม (เหมือนรายการแนะนำ) */
  onApply: (item: RecurringItem) => void;
  /** BatchAdd เท่านั้น: ใส่ทุกรายการที่ยังขาดลงตะกร้า */
  onFillMissing?: (items: RecurringItem[]) => void;
}

const dayLabel = (iso: string) => `${Number(iso.slice(8, 10))} ${THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
const AMOUNT_TONE: Record<string, string> = { income: 'text-income', savings: 'text-savings', expense: 'text-expense' };

/** แถวปุ่มใต้หัวข้อแผงรายการแนะนำ กดแล้วรายการลอยทับ — ไม่มีรายการประจำก็ไม่แสดงอะไร (ยกเว้นมีรายการที่ซ่อนไว้) */
function RecurringSection({ targetDate, localRows, catMap, onApply, onFillMissing }: RecurringSectionProps) {
  const { filterPeriod } = useAppFilter();
  const cycle = isCyclePeriod(filterPeriod);
  const { items, hiddenCount, hide, unhideAll } = useRecurring(targetDate, cycle, localRows);
  const menu = useMenu(); // Esc / outside click closes; Esc does not close the modal
  const panelId = useId();
  const [panelHeight, setPanelHeight] = useState<number | undefined>();

  // Open = cover the rest of the suggestion column (the panel's host) down to its bottom padding
  useLayoutEffect(() => {
    if (!menu.open) return;
    const measure = () => {
      const root = menu.rootRef.current;
      const host = root?.parentElement;
      if (!root || !host) return;
      const bottom = host.getBoundingClientRect().bottom - parseFloat(getComputedStyle(host).paddingBottom);
      setPanelHeight(Math.max(160, bottom - root.getBoundingClientRect().bottom - 4)); // 4 = mt-1
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [menu.open, menu.rootRef]);

  if (items.length === 0 && hiddenCount === 0) return null;

  const unit = /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? unitKeyOf(targetDate, cycle) : '';
  const unitName = !unit ? '' : cycle ? cycleLabel(unit) : `${THAI_MONTHS_SHORT[Number(unit.slice(5, 7)) - 1]} ${unit.slice(0, 4)}`;
  const missing = items.filter(i => !i.recordedOn);

  // Folded into one full-width row under the panel header; the list floats over the suggestions instead of pushing them down
  return (
    <div ref={menu.rootRef} className="relative shrink-0 mb-2">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => menu.setOpen(o => !o)}
        aria-expanded={menu.open}
        aria-controls={panelId}
        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold border ${menu.open ? 'border-accent-ink text-ink-display bg-surface-elevated' : 'border-line text-ink-body hover:text-ink-display hover:border-line-strong'}`}
      >
        <Repeat className="w-3.5 h-3.5 text-accent-ink" aria-hidden />
        รายการประจำ
        {missing.length > 0
          ? <span className="text-accent-ink tabular-nums">ขาด {missing.length}</span>
          : items.length > 0 && <span className="text-ink-muted tabular-nums">ครบ {items.length}</span>}
        <ChevronDown className={`ml-auto w-3.5 h-3.5 ${menu.open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {menu.open && (
        <section id={panelId} aria-label={`รายการประจำ ${unitName}`} style={{ height: panelHeight }} className="absolute left-0 right-0 top-full mt-1 z-30 flex flex-col border border-line-strong bg-canvas shadow-md shadow-black/40">
          <div className="shrink-0 px-2.5 py-1.5 flex items-center gap-2 border-b border-line">
            <span className="text-xs font-bold text-ink-display">รายการประจำ</span>
            <span className="text-[11px] text-ink-muted truncate">{unitName}</span>
            {items.length > 0 && (
              <span className="ml-auto text-[11px] font-bold text-ink-body tabular-nums shrink-0">
                ลงแล้ว {items.length - missing.length}/{items.length}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-line">
              {items.map(item => {
                const cat = catMap[item.categoryId];
                const name = item.description || cat?.name || 'อื่นๆ';
                return (
                  <li key={item.key} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => onApply(item)}
                      className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-elevated"
                      title={`ใส่ "${name}" ลงฟอร์ม`}
                    >
                      {item.recordedOn
                        ? <Check className="w-3.5 h-3.5 text-income shrink-0" aria-label="ลงแล้ว" />
                        : <Circle className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-label="ยังไม่ได้ลง" />}
                      <CategoryGlyph icon={cat?.icon} color={cat?.color || undefined} size={14} />
                      <span className="flex flex-col min-w-0 flex-1 leading-tight">
                        <span className={`text-xs font-bold truncate ${item.recordedOn ? 'text-ink-muted' : 'text-ink-display'}`}>{name}</span>
                        <span className="text-[11px] text-ink-muted truncate">
                          {item.recordedOn ? `ลงแล้ว ${dayLabel(item.recordedOn)}` : dayLabel(item.suggestedDate)}
                          {!item.recordedOn && item.variable && ' · ยอดไม่คงที่'}
                        </span>
                      </span>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${item.recordedOn ? 'text-ink-muted' : AMOUNT_TONE[cat?.type ?? 'expense']}`}>
                        {item.variable && !item.recordedOn ? '~' : ''}{formatMoney(item.amount)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => hide(item.key)}
                      className="px-2 text-ink-muted hover:text-ink-display hover:bg-surface-elevated"
                      aria-label={`ซ่อน "${name}" จากรายการประจำ`}
                      title="ไม่ใช่รายการประจำ — ซ่อน"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {(onFillMissing && missing.length > 0) || hiddenCount > 0 ? (
            <div className="shrink-0 mt-auto px-2.5 py-1.5 flex items-center gap-2 border-t border-line">
              {onFillMissing && missing.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFillMissing(missing)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-accent text-on-accent hover:bg-accent/90 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden /> เติม {missing.length} รายการที่ยังขาด
                </button>
              )}
              {hiddenCount > 0 && (
                <button type="button" onClick={unhideAll} className="ml-auto text-[11px] text-ink-muted hover:text-ink-display underline-offset-2 hover:underline">
                  ซ่อนไว้ {hiddenCount} · แสดงทั้งหมด
                </button>
              )}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default React.memo(RecurringSection);
