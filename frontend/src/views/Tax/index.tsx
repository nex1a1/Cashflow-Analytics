import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ReceiptText, ChevronRight, Copy, Settings2, AlertTriangle, CalendarRange, FileText, Stamp, History } from 'lucide-react';
import { transactionService } from '@/services/api';
import useJsonSetting from '@/hooks/useJsonSetting';
import { useToast } from '@/context/ToastContext';
import FieldError from '@/components/shared/FieldError';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { readable } from '@/constants/theme';
import { latestOnly } from '@/utils/latestOnly';
import { formatThaiDateShort } from '@/utils/formatters';
import {
  computeDeductions, estimateTax, parseTaxProfile, taxYearOf, DEDUCTION_TYPES, TAX_PROFILE_SETTING_KEY,
  type DeductionLine, type DeductionTypeId, type TaxRow, type TaxYearForm, type TaxEstimate, type TaxMoneyField, type TaxFiled, type TaxFiledMoneyField, type TaxProfile,
} from '@/utils/taxDeduction';
import { useAppData } from '@/context/AppDataContext';
import { useAppFilter } from '@/context/AppFilterContext';
import { Shimmer } from '@/views/Dashboard/components/SummaryCards/helpers';
import { isCyclePeriod, stripCycle, localTodayIso, CYCLE_PREFIX, cyclePresetRange } from '@/utils/payCycle';

const baht = (satang: number) => `฿${Math.round(satang / 100).toLocaleString('th-TH')}`;
const SECTION = 'border border-line bg-surface';
const SECTION_HEAD = 'flex items-center gap-3 px-4 py-2 border-b border-line';

/** ช่องจาก 50 ทวิ: [field, ป้าย, คำอธิบาย] */
const FORM_INPUTS: readonly [TaxMoneyField, string, string][] = [
  ['income', 'เงินได้ทั้งปี', 'ก่อนหักภาษีและประกันสังคม'],
  ['withheld', 'ภาษีหัก ณ ที่จ่าย', 'ยอดที่บริษัทหักส่งสรรพากรแล้ว'],
  ['sso', 'ประกันสังคม', 'เงินสมทบทั้งปี'],
  ['pvd', 'PVD / กบข.', 'เงินสะสมส่วนของคุณ'],
  ['other', 'ลดหย่อนอื่น', 'ที่ไม่ผ่าน Ledger เช่น คู่สมรส บุตร ดอกเบี้ยบ้าน'],
];

/** ช่องผลที่ยื่นจริง (จากแบบที่ยื่นแล้ว) */
const FILED_INPUTS: readonly [TaxFiledMoneyField, string, string][] = [
  ['netIncome', 'เงินได้สุทธิ', 'ข้อ 11 ของแบบ'],
  ['tax', 'ภาษีที่ต้องเสีย', 'ข้อ 12 ของแบบ'],
  ['paid', 'ชำระเพิ่ม', 'ตามใบเสร็จ'],
  ['refund', 'ได้คืน', 'ภาษีที่ชำระไว้เกิน'],
];

/**
 * แท็บภาษี — เปิดได้เฉพาะตอนเลือกดูทั้งปี. ตัวเลขจาก 50 ทวิ + ลดหย่อนจาก Ledger → ประมาณภาษีทั้งปีและยอดขอคืน/จ่ายเพิ่ม.
 * นับ 1 ม.ค. – 31 ธ.ค. เสมอ (ปีภาษี) แม้อยู่โหมดรอบเงินเดือน จึงโหลดแถวของปีเอง (ปีแบบรอบ = 25 ม.ค. – 24 ม.ค. ปีถัดไป)
 */
const TaxView = memo(function TaxView() {
  const { transactions, categories, cashflowGroups } = useAppData();
  const { filterPeriod, setFilterPeriod } = useAppFilter();
  const { showToast } = useToast();
  const year = taxYearOf(filterPeriod);
  const [profile, updateProfile] = useJsonSetting(TAX_PROFILE_SETTING_KEY, parseTaxProfile);
  const [rows, setRows] = useState<TaxRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<DeductionTypeId>>(new Set());
  const [mapError, setMapError] = useState<string | null>(null);
  const begin = useRef(latestOnly()).current;

  // `transactions` changes after every save/delete, so the page follows edits made elsewhere
  useEffect(() => {
    if (!year) return;
    const isCurrent = begin();
    transactionService.getAll(`${year}-01-01`, `${year}-12-31`)
      .then(r => { if (isCurrent()) setRows(r as TaxRow[]); })
      .catch(() => { if (isCurrent()) setRows([]); });
  }, [year, transactions, begin]);

  const form: TaxYearForm = useMemo(() => (year ? profile.years[year] ?? {} : {}), [year, profile.years]);
  const summary = useMemo(
    () => (year && rows ? computeDeductions(rows, profile.mapping, year, form) : null),
    [year, rows, profile.mapping, form],
  );
  const estimate = useMemo(() => (summary ? estimateTax(form, summary) : null), [form, summary]);

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  // หมวดที่ผูกได้: รายจ่าย + ลงทุน/ออม เรียงตามกลุ่มแล้วตามหมวด (รายรับลดหย่อนไม่ได้)
  const mappable = useMemo(() => {
    const groupOrder = new Map(cashflowGroups.map(g => [g.id, g]));
    return categories
      .filter(c => c.type !== 'income')
      .map(c => ({ cat: c, group: groupOrder.get(c.cashflowGroup ?? c.cashflow_group_id ?? '') }))
      .sort((a, b) => (a.group?.order_index ?? 999) - (b.group?.order_index ?? 999) || (a.cat.order_index ?? 999) - (b.cat.order_index ?? 999));
  }, [categories, cashflowGroups]);

  if (!year) {
    // อยู่แท็บนี้แล้วเปลี่ยนช่วงเป็นเดือน/ช่วงอื่น (หรือเปิดแอปใหม่ ช่วงกลับเป็นเดือนนี้)
    const y = /^\d{4}/.exec(stripCycle(filterPeriod))?.[0] ?? localTodayIso().slice(0, 4);
    const yearPeriod = isCyclePeriod(filterPeriod) ? CYCLE_PREFIX + cyclePresetRange(y, 1, 12) : y;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 border border-line bg-surface text-center">
        <CalendarRange className="w-10 h-10 text-ink-muted" aria-hidden />
        <p className="text-base font-bold text-ink-display">หน้าภาษีดูได้ทีละปี</p>
        <p className="text-sm text-ink-body">ปีภาษีคือ 1 ม.ค. – 31 ธ.ค. เลือกทั้งปีจากตัวเลือกช่วงเวลาด้านบน</p>
        <button type="button" onClick={() => setFilterPeriod(yearPeriod)} className="px-4 py-2 text-xs font-bold bg-accent text-on-accent hover:bg-accent/90">ดูทั้งปี {y}</button>
      </div>
    );
  }
  const hasMapping = Object.keys(profile.mapping).length > 0;
  const showEditor = editing || !hasMapping;

  const saveField = (field: TaxMoneyField, value: number | null) => updateProfile(p => {
    const next: TaxYearForm = { ...(p.years[year] ?? {}) };
    if (value == null) delete next[field]; else next[field] = value;
    return { ...p, years: { ...p.years, [year]: next } };
  });

  const saveFiled = <K extends keyof TaxFiled>(field: K, value: TaxFiled[K] | null) => updateProfile(p => {
    const cur = p.years[year] ?? {};
    const filed: TaxFiled = { ...(cur.filed ?? {}) };
    if (value == null) delete filed[field]; else filed[field] = value;
    const next: TaxYearForm = { ...cur, filed };
    if (Object.keys(filed).length === 0) delete next.filed;
    return { ...p, years: { ...p.years, [year]: next } };
  });

  const setMapping = async (categoryId: string, type: DeductionTypeId | '') => {
    setEditing(true); // the first mapping must not collapse the editor (it is shown while nothing is mapped)
    const ok = await updateProfile(p => {
      const mapping = { ...p.mapping };
      if (type) mapping[categoryId] = type; else delete mapping[categoryId];
      return { ...p, mapping };
    });
    setMapError(ok ? null : 'บันทึกการผูกหมวดไม่สำเร็จ ลองอีกครั้ง');
  };

  const copySummary = async () => {
    if (!summary) return;
    const text = [
      `ภาษี ปี ${year}`,
      ...(estimate ? [...estimate.steps.map(s => `${s.label}: ${baht(s.amount)}`), `เงินได้สุทธิ: ${baht(estimate.netIncome)}`, `ภาษีทั้งปี: ${baht(estimate.tax)}`, `หัก ณ ที่จ่ายแล้ว: ${baht(estimate.withheld)}`, balanceText(estimate)] : []),
      'ลดหย่อนจาก Ledger:',
      ...summary.lines.map(l => `  ${l.type.label}: จ่าย ${baht(l.paid)} · ลดหย่อนได้ ${baht(l.deductible)}`),
    ];
    try {
      await navigator.clipboard.writeText(text.join('\n'));
      showToast('คัดลอกสรุปภาษีแล้ว', 'success');
    } catch {
      showToast('คัดลอกไม่ได้ เบราว์เซอร์ไม่อนุญาตให้เขียนคลิปบอร์ด', 'error');
    }
  };

  const toggle = (id: DeductionTypeId) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ReceiptText className="w-5 h-5 text-accent-ink shrink-0" aria-hidden />
        <h2 className="text-base font-bold text-ink-display">ภาษี ปี {year}</h2>
        <span className="text-[11px] text-ink-muted">1 ม.ค. – 31 ธ.ค. · ยื่น ภ.ง.ด.90/91 ภายใน มี.ค. {Number(year) + 1}</span>
        <button type="button" onClick={copySummary} disabled={!summary} className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-line text-ink-body hover:text-ink-display hover:border-line-strong">
          <Copy className="w-3.5 h-3.5" aria-hidden /> คัดลอกสรุป
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 items-start">
        <section aria-label="ข้อมูลจาก 50 ทวิ" className={SECTION}>
          <div className={SECTION_HEAD}>
            <FileText className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
            <span className="text-[13px] font-bold text-ink-display">ข้อมูลจาก 50 ทวิ</span>
            <span className="text-[11px] text-ink-muted">หนังสือรับรองการหักภาษีจากนายจ้าง</span>
          </div>
          <div className="divide-y divide-line">
            {FORM_INPUTS.map(([field, label, hint]) => (
              <MoneyField key={`${year}:${field}`} id={`tax-${field}`} label={label} hint={hint} value={form[field]} onSave={v => saveField(field, v)} />
            ))}
          </div>
          <div className={`${SECTION_HEAD} border-t`}>
            <Stamp className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
            <span className="text-[13px] font-bold text-ink-display">ผลที่ยื่นจริง</span>
            <span className="text-[11px] text-ink-muted">จากแบบ ภ.ง.ด.90/91 ที่ยื่นแล้ว · เก็บเป็นประวัติ</span>
          </div>
          <div className="divide-y divide-line">
            <DateField key={`${year}:date:${form.filed?.date ?? ''}`} id="tax-filed-date" value={form.filed?.date} onSave={v => saveFiled('date', v)} />
            {FILED_INPUTS.map(([field, label, hint]) => (
              <MoneyField key={`${year}:filed:${field}`} id={`tax-filed-${field}`} label={label} hint={hint} value={form.filed?.[field]} onSave={v => saveFiled(field, v)} />
            ))}
          </div>
        </section>

        <section aria-label="ประมาณภาษี" className={SECTION}>
          <div className={SECTION_HEAD}>
            <span className="text-[13px] font-bold text-ink-display">ประมาณภาษีทั้งปี</span>
            <span className="text-[11px] text-ink-muted">เงินเดือน 40(1) · คำนวณแบบขั้นบันได</span>
          </div>
          {!summary ? (
            <div className="px-4 py-3 space-y-2"><Shimmer className="h-8" /><Shimmer className="h-5" /></div>
          ) : estimate ? (
            <EstimateBody estimate={estimate} filed={form.filed} />
          ) : (
            <p className="px-4 py-6 text-sm text-ink-body">กรอก "เงินได้ทั้งปี" จาก 50 ทวิ ด้านซ้ายเพื่อประมาณภาษีและยอดขอคืน</p>
          )}
        </section>
      </div>

      <section aria-label={`ลดหย่อนจาก Ledger ปี ${year}`} className={SECTION}>
        <div className={SECTION_HEAD}>
          <span className="text-[13px] font-bold text-ink-display">ลดหย่อนจาก Ledger</span>
          <span className="text-[11px] text-ink-muted">กองทุน / ประกัน / บริจาค ที่ลงไว้ในหมวดที่ผูก</span>
          {summary && hasMapping && (
            <span className="ml-auto text-[13px] font-bold text-ink-display tabular-nums">
              ลดหย่อนได้ {baht(summary.total)}
              {summary.overCap > 0 && <span className="ml-2 text-[11px] font-semibold text-warn">เกินเพดาน {baht(summary.overCap)}</span>}
            </span>
          )}
          {hasMapping && (
            <button type="button" onClick={() => setEditing(e => !e)} aria-expanded={editing} className={`${summary ? '' : 'ml-auto '}flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-line text-ink-body hover:text-ink-display hover:border-line-strong`}>
              <Settings2 className="w-3.5 h-3.5" aria-hidden /> {editing ? 'ปิดการผูกหมวด' : 'ผูกหมวด'}
            </button>
          )}
        </div>

        {hasMapping && (
          summary ? (
            <ul className="divide-y divide-line">
              {summary.lines.map(line => (
                <DeductionRow key={line.type.id} line={line} open={expanded.has(line.type.id)} onToggle={() => toggle(line.type.id)} catById={catById} mapping={profile.mapping} />
              ))}
              {summary.trimmed.map(t => (
                <li key={t.label} className="px-4 py-1.5 text-[11px] text-warn">เพดานร่วม {t.label}: ตัดออก {baht(t.amount)}</li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 space-y-2"><Shimmer className="h-5" /><Shimmer className="h-5" /></div>
          )
        )}

        {showEditor && (
          <div className={`px-4 py-3 ${hasMapping ? 'border-t border-line' : ''}`}>
            <p className="text-[13px] font-bold text-ink-display">ผูกหมวดกับประเภทลดหย่อน</p>
            <p className="text-[11px] text-ink-muted mb-2">
              {hasMapping ? 'เปลี่ยนแล้วบันทึกทันที' : 'ยังไม่ได้ผูกหมวด เลือกประเภทให้หมวดที่ใช้ลงเงินซื้อกองทุน / จ่ายเบี้ยประกัน / บริจาค'}
            </p>
            <FieldError id="tax-map-err" message={mapError} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-x-6 max-h-72 overflow-y-auto">
              {mappable.map(({ cat, group }) => (
                <div key={cat.id} className="flex items-center gap-2 py-1 border-b border-line min-w-0">
                  <CategoryGlyph icon={cat.icon} color={cat.color ? readable(cat.color) : undefined} size={14} className="shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-xs text-ink-display">
                    {cat.name} <span className="text-[11px] text-ink-muted">· {group?.name ?? '-'}</span>
                  </span>
                  <select
                    value={profile.mapping[cat.id] ?? ''}
                    onChange={e => setMapping(cat.id, e.target.value as DeductionTypeId | '')}
                    aria-label={`ประเภทลดหย่อนของหมวด ${cat.name}`}
                    aria-describedby="tax-map-err"
                    className="h-7 px-1.5 text-[11px] border bg-canvas border-line-strong text-ink-display"
                  >
                    <option value="">ไม่ลดหย่อน</option>
                    {DEDUCTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <TaxHistory years={profile.years} current={year} onPick={y => setFilterPeriod(isCyclePeriod(filterPeriod) ? CYCLE_PREFIX + cyclePresetRange(y, 1, 12) : y)} />

      <p className="flex items-start gap-1.5 text-[11px] text-ink-muted">
        <AlertTriangle className="w-3.5 h-3.5 text-warn shrink-0 mt-px" aria-hidden />
        ตัวเลขนี้เป็นการประมาณสำหรับเงินเดือน (40(1)) อย่างเดียว · อัตรา ค่าใช้จ่าย และเพดานลดหย่อนเป็นของปีภาษี 2025–2026 ควรตรวจกับกรมสรรพากรก่อนยื่น · ยอดจริงดูได้ตอนยื่นใน e-Filing
      </p>
    </div>
  );
});

const balanceText = (e: TaxEstimate) =>
  e.balance < 0 ? `ได้คืนประมาณ ${baht(-e.balance)}` : e.balance > 0 ? `ต้องจ่ายเพิ่มประมาณ ${baht(e.balance)}` : 'พอดี ไม่ต้องจ่ายเพิ่ม';

/** ผลยื่นจริงเป็นคำ: ได้คืน / จ่ายเพิ่ม / ไม่มีภาษีต้องชำระ */
const filedResult = (f: TaxFiled) =>
  f.refund ? `ได้คืน ${baht(f.refund)}` : f.paid ? `ชำระเพิ่ม ${baht(f.paid)}` : f.tax != null ? 'ไม่ต้องจ่ายเพิ่ม' : '-';

/** ประวัติทุกปีที่มีข้อมูล (ใหม่สุดก่อน) — ใช้ผลยื่นจริงถ้ามี; คลิกปีเพื่อเปิดปีนั้น */
function TaxHistory({ years, current, onPick }: { years: TaxProfile['years']; current: string; onPick: (year: string) => void }) {
  const list = Object.entries(years).filter(([, f]) => f.income || f.filed).sort(([a], [b]) => b.localeCompare(a));
  if (list.length === 0) return null;
  return (
    <section aria-label="ประวัติภาษี" className={SECTION}>
      <div className={SECTION_HEAD}>
        <History className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
        <span className="text-[13px] font-bold text-ink-display">ประวัติภาษี</span>
        <span className="text-[11px] text-ink-muted">ตัวเลขจาก 50 ทวิ และผลที่ยื่นจริงของแต่ละปี</span>
      </div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-[11px] text-ink-muted text-right">
            <th scope="col" className="px-4 py-1.5 text-left font-normal">ปีภาษี</th>
            <th scope="col" className="px-4 py-1.5 font-normal">เงินได้</th>
            <th scope="col" className="px-4 py-1.5 font-normal">เงินได้สุทธิ</th>
            <th scope="col" className="px-4 py-1.5 font-normal">ภาษี</th>
            <th scope="col" className="px-4 py-1.5 font-normal">หัก ณ ที่จ่าย</th>
            <th scope="col" className="px-4 py-1.5 font-normal">ผล</th>
            <th scope="col" className="px-4 py-1.5 font-normal">ยื่นเมื่อ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.map(([y, f]) => (
            <tr key={y} className={y === current ? 'bg-surface-elevated' : ''}>
              <th scope="row" className="px-4 py-1.5 text-left font-bold text-ink-display">
                {y === current ? `${y} (${Number(y) + 543})` : (
                  <button type="button" onClick={() => onPick(y)} className="font-bold text-ink-display hover:text-accent-ink underline-offset-2 hover:underline">{y} ({Number(y) + 543})</button>
                )}
              </th>
              <td className="px-4 py-1.5 text-right text-ink-body">{f.income != null ? baht(f.income) : '-'}</td>
              <td className="px-4 py-1.5 text-right text-ink-body">{f.filed?.netIncome != null ? baht(f.filed.netIncome) : '-'}</td>
              <td className="px-4 py-1.5 text-right text-ink-display font-bold">{f.filed?.tax != null ? baht(f.filed.tax) : '-'}</td>
              <td className="px-4 py-1.5 text-right text-ink-body">{f.withheld != null ? baht(f.withheld) : '-'}</td>
              <td className={`px-4 py-1.5 text-right ${f.filed?.refund ? 'text-income' : 'text-ink-body'}`}>{f.filed ? filedResult(f.filed) : <span className="text-ink-muted">ยังไม่ได้บันทึกผลยื่น</span>}</td>
              <td className="px-4 py-1.5 text-right text-ink-muted">{f.filed?.date ? formatThaiDateShort(f.filed.date) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function EstimateBody({ estimate: e, filed }: { estimate: TaxEstimate; filed?: TaxFiled }) {
  const tone = e.balance < 0 ? 'text-income' : e.balance > 0 ? 'text-warn' : 'text-ink-display';
  // ถ้ายื่นแล้ว เทียบเงินได้สุทธิ/ภาษีกับที่แอปประมาณ — ต่างกันแปลว่ามีรายการที่แอปไม่รู้ (เช่น ลดหย่อนที่ไม่ได้กรอก)
  const netDiff = filed?.netIncome != null ? filed.netIncome - e.netIncome : null;
  return (
    <div>
      {filed && (filed.tax != null || filed.netIncome != null) && (
        <p className="px-4 py-2 border-b border-line text-[11px] text-ink-body tabular-nums">
          <span className="font-bold text-ink-display">ยื่นจริง{filed.date ? ` ${formatThaiDateShort(filed.date)}` : ''}:</span>{' '}
          {filed.netIncome != null && <>เงินได้สุทธิ {baht(filed.netIncome)} · </>}
          {filed.tax != null && <>ภาษี {baht(filed.tax)} · </>}
          {filedResult(filed)}
          {netDiff != null && (
            <span className={netDiff === 0 ? 'text-income' : 'text-warn'}>
              {' '}· {netDiff === 0 ? 'ตรงกับที่ประมาณ' : `เงินได้สุทธิต่างจากที่ประมาณ ${baht(Math.abs(netDiff))}`}
            </span>
          )}
        </p>
      )}
      <div className="px-4 py-3 border-b border-line">
        <p className={`text-2xl font-bold tabular-nums ${tone}`}>{balanceText(e)}</p>
        <p className="text-[11px] text-ink-body tabular-nums mt-0.5">
          ภาษีทั้งปี {baht(e.tax)} − หัก ณ ที่จ่ายแล้ว {baht(e.withheld)}
          {e.marginalRate > 0 && <> · ขั้นภาษีสูงสุด {e.marginalRate * 100}% (ลดหย่อนเพิ่ม ฿1,000 ประหยัดภาษี ฿{Math.round(1000 * e.marginalRate)})</>}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 px-4 py-2 text-xs">
        <dl className="divide-y divide-line">
          {e.steps.map(s => (
            <div key={s.label} className="flex justify-between gap-3 py-1">
              <dt className="text-ink-body">{s.label}</dt>
              <dd className={`tabular-nums ${s.amount < 0 ? 'text-ink-body' : 'text-ink-display font-bold'}`}>{s.amount < 0 ? '−' : ''}{baht(Math.abs(s.amount))}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1">
            <dt className="font-bold text-ink-display">เงินได้สุทธิ</dt>
            <dd className="tabular-nums font-bold text-ink-display">{baht(e.netIncome)}</dd>
          </div>
        </dl>
        <dl className="divide-y divide-line">
          {e.brackets.map(b => (
            <div key={b.from} className="flex justify-between gap-3 py-1">
              <dt className="text-ink-body tabular-nums">
                {baht(b.from)} – {Number.isFinite(b.to) ? baht(b.to) : 'ขึ้นไป'} <span className="text-ink-muted">· {b.rate * 100}%</span>
              </dt>
              <dd className="tabular-nums text-ink-body">{baht(b.tax)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1">
            <dt className="font-bold text-ink-display">ภาษีทั้งปี</dt>
            <dd className="tabular-nums font-bold text-ink-display">{baht(e.tax)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** วันที่ยื่น — native date input, บันทึกเมื่อเปลี่ยน (ว่าง = ลบ) */
function DateField({ id, value, onSave }: { id: string; value: string | undefined; onSave: (date: string | null) => Promise<boolean> }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="flex flex-col min-w-0 flex-1 leading-tight">
          <span className="text-xs font-bold text-ink-display">วันที่ยื่น</span>
          <span className="text-[11px] text-ink-muted truncate">ตามใบเสร็จ / ใบยืนยันการยื่น</span>
        </label>
        <input
          id={id}
          type="date"
          defaultValue={value ?? ''}
          onChange={async e => { const v = e.currentTarget.value || null; if (v !== (value ?? null)) setError((await onSave(v)) ? null : 'บันทึกไม่สำเร็จ ลองอีกครั้ง'); }}
          aria-invalid={!!error}
          aria-describedby={`${id}-err`}
          className="w-36 h-7 px-2 text-xs tabular-nums border bg-canvas border-line-strong text-ink-display shrink-0 [color-scheme:dark]"
        />
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

/** ช่องเงินบาทที่บันทึกตอน blur / Enter — ว่าง = ลบค่า; ผิดรูปหรือบันทึกไม่สำเร็จแสดง error ข้างช่องและคงที่พิมพ์ไว้ */
function MoneyField({ id, label, hint, value, onSave }: {
  id: string; label: string; hint: string; value: number | undefined; onSave: (satang: number | null) => Promise<boolean>;
}) {
  const [error, setError] = useState<string | null>(null);
  const commit = async (text: string) => {
    const clean = text.replace(/[,\s฿]/g, '');
    const num = clean === '' ? null : Number(clean);
    if (num != null && !(Number.isFinite(num) && num >= 0)) { setError('ใส่เป็นตัวเลข เช่น 420000'); return; }
    const next = num == null ? null : Math.round(num * 100);
    if (next === (value ?? null)) { setError(null); return; }
    setError((await onSave(next)) ? null : 'บันทึกไม่สำเร็จ ลองอีกครั้ง');
  };
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="flex flex-col min-w-0 flex-1 leading-tight">
          <span className="text-xs font-bold text-ink-display">{label}</span>
          <span className="text-[11px] text-ink-muted truncate">{hint}</span>
        </label>
        <input
          key={value ?? ''}
          id={id}
          inputMode="decimal"
          defaultValue={value != null ? (value / 100).toLocaleString('th-TH') : ''}
          placeholder="ยังไม่ได้กรอก"
          onBlur={e => commit(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          aria-invalid={!!error}
          aria-describedby={`${id}-err`}
          className="w-36 h-7 px-2 text-xs text-right tabular-nums border bg-canvas border-line-strong text-ink-display shrink-0"
        />
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

function DeductionRow({ line, open, onToggle, catById, mapping }: {
  line: DeductionLine; open: boolean; onToggle: () => void;
  catById: Map<string, { name: string }>; mapping: Record<string, DeductionTypeId>;
}) {
  const pct = line.cap ? Math.min(100, (line.paid / line.cap) * 100) : 0;
  const cats = Object.entries(mapping).filter(([, t]) => t === line.type.id).map(([id]) => catById.get(id)?.name).filter(Boolean).join(', ');
  const capText = line.cap == null
    ? (line.type.note ?? 'ไม่มีเพดาน')
    : `เพดาน ${baht(line.cap)}${line.type.pct ? (line.pctUnknown ? ` · ${line.type.pct * 100}% ของเงินได้ยังไม่รู้` : ` (${line.type.pct * 100}% ของเงินได้)`) : ''}`;
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full grid grid-cols-[240px_1fr_260px] items-center gap-4 px-4 py-2 text-left hover:bg-surface-elevated">
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronRight className={`w-3.5 h-3.5 text-ink-muted shrink-0 ${open ? 'rotate-90' : ''}`} aria-hidden />
          <span className="text-[13px] font-bold text-ink-display shrink-0">{line.type.label}</span>
          <span className="text-[11px] text-ink-muted truncate">· {cats || 'ไม่มีหมวด'}</span>
        </span>
        <span className="flex flex-col gap-1 min-w-0">
          {line.cap != null && (
            <span aria-hidden className="relative block h-2 bg-surface-elevated">
              <span className="absolute inset-y-0 left-0 bg-ink-body" style={{ width: `${pct}%` }} />
            </span>
          )}
          <span className={`text-[11px] truncate ${line.pctUnknown ? 'text-warn' : 'text-ink-muted'}`}>{capText}</span>
        </span>
        <span className="flex flex-col items-end tabular-nums">
          <span className="text-[13px] font-bold text-ink-display">{baht(line.deductible)}</span>
          <span className="text-[11px] text-ink-muted">จ่าย {baht(line.paid)} · {line.rows.length} รายการ</span>
        </span>
      </button>
      {open && (
        <ul className="pb-2 max-h-64 overflow-y-auto">
          {line.rows.length === 0 && <li className="pl-10 pr-4 py-1 text-[11px] text-ink-muted">ยังไม่มีรายการในปีนี้</li>}
          {line.rows.map(r => (
            <li key={r.id} className="grid grid-cols-[90px_1fr_120px] gap-3 pl-10 pr-4 py-0.5 text-[11px] text-ink-body">
              <span className="tabular-nums">{formatThaiDateShort(r.date)}</span>
              <span className="truncate">{r.description || '-'} <span className="text-ink-muted">· {catById.get(r.category_id ?? '')?.name}</span></span>
              <span className="text-right tabular-nums">{baht(Math.round(Number(r.amount) * 100))}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default TaxView;
