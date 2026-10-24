import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { BookOpen, Wallet, Home, ShoppingBag, Landmark, Mail, PieChart, CalendarDays, ListTree, Receipt } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useAppFilter } from '@/context/AppFilterContext';
import useBudgets from '@/hooks/useBudgets';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { ALLOCATION_COLORS, readable, tc, type ThemeToken } from '@/constants/theme';
import { formatBaht, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { CYCLE_PREFIX, isCyclePeriod, localTodayIso, toCycleKey } from '@/utils/payCycle';
import { planLines, roundShares, summarizeKakeibo, type FixedRule, type PlanLine } from '@/utils/kakeibo';
import { computeEnvelopes, type BudgetLevel, type EnvelopeRow } from '@/utils/budgetEnvelope';
import useJsonSetting from '@/hooks/useJsonSetting';
import { useMenu } from '@/hooks/useMenu';
import FieldError from '@/components/shared/FieldError';
import FixedCostPicker, { FIXED_SETTING_KEY, parseFixedChoice, type FixedChoice } from './FixedCostPicker';
import { resolveCashflowGroups } from '@/utils/analyticsAggregation';
import type { Category } from '@/types';
import MonthReflection from './MonthReflection';
import KakeiboHeader from './KakeiboHeader';

const baht = (satang: number) => formatBaht(satang / 100);
const day = (iso: string) => `${Number(iso.slice(8))} ${THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
const groupIdOf = (c?: Category) => c?.cashflowGroup ?? c?.cashflow_group_id ?? '';
const DAY_MS = 86_400_000;
const daysIn = (w: { start: string; end: string }) => (Date.parse(w.end) - Date.parse(w.start)) / DAY_MS + 1;

// งบซองใช้สีเดียวกับแผงงบในหน้าภาพรวม: ในงบ = สีกลุ่ม, เกิน = ส้ม, เกิน 20% = แดง (เกินสิบกว่าบาทไม่ควรดูเป็นสัญญาณอันตราย)
const LEVEL_TOKEN: Record<BudgetLevel, ThemeToken | null> = { ok: null, warn: 'warn', over: 'danger' };
const LEVEL_TEXT: Record<BudgetLevel, string> = { ok: 'text-ink-body', warn: 'text-warn', over: 'text-danger' };
const overPct = (ratio: number) => Math.max(1, Math.round((ratio - 1) * 100));
/** รายการที่ลงล่วงหน้า (แผน) = ลายขีดเฉียง แยกจากส่วนจางของ WANT */
const planStripes = (color: string) => `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 45%, transparent) 0 2px, transparent 2px 5px)`;

function Panel({ title, icon: Icon, children, footer, action, overlay }: { title: string; icon: typeof Wallet; children: ReactNode; footer?: ReactNode; action?: ReactNode; /** ลอยทับใต้หัวแผงพอดี (ไม่ดันเนื้อหา) */ overlay?: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col border border-line bg-surface">
      <h2 className="flex items-center gap-2 px-4 py-2 border-b border-line text-[11px] font-black text-ink-muted">
        <Icon className="w-3.5 h-3.5 text-accent-ink" aria-hidden />{title}
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {overlay && <div className="relative h-0">{overlay}</div>}
      <div className="flex-1">{children}</div>
      {footer && <div className="flex justify-between gap-3 px-4 py-2 border-t border-line bg-surface-elevated text-[13px] font-black text-ink-display">{footer}</div>}
    </section>
  );
}

const COLS = 'grid grid-cols-[1fr_auto] gap-3 items-center px-4';

/** ตารางหมวด: ชื่อ · ยอดของช่วงนี้ (ชื่อแผงบอกอยู่แล้วว่าคืออะไร จึงไม่มีแถวหัวตาราง) */
function PlanTable({ lines, catById, showPlan }: { lines: PlanLine[]; catById: Map<string, Category>; /** แสดง "แผน ฿X" ในแถวที่มีส่วนลงล่วงหน้า */ showPlan: boolean }) {
  if (lines.length === 0) return <p className="px-4 py-3 text-[11px] text-ink-muted">ยังไม่มีรายการ</p>;
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => {
        const cat = catById.get(l.key.slice(l.key.indexOf(':') + 1).split('|')[0]);
        return (
          <li key={l.key} className={`${COLS} py-1.5 text-[13px]`}>
            <span className="flex items-center gap-2 min-w-0 text-ink-display">
              <CategoryGlyph icon={cat?.icon} color={readable(cat?.color ?? tc('ink-body'))} size={13} className="shrink-0" />
              <span className={l.detail ? 'shrink-0 text-ink-body' : 'truncate'}>{l.name || 'ไม่ระบุหมวด'}</span>
              {l.detail && (
                <span
                  title="เฉพาะรายการนี้ในหมวด"
                  className="truncate px-1.5 py-px rounded-pill border tint-border text-[11px] font-bold"
                  style={{
                    color: readable(cat?.color ?? tc('ink-body')),
                    backgroundColor: `color-mix(in srgb, ${cat?.color ?? tc('ink-body')} 8%, transparent)`,
                    ['--tint-border-color' as string]: `color-mix(in srgb, ${cat?.color ?? tc('ink-body')} 25%, transparent)`,
                  }}
                >{l.detail}</span>
              )}
            </span>
            <span className="flex items-baseline justify-end gap-2 text-right">
              {showPlan && !!l.planned && <span title="ลงล่วงหน้า ยังไม่ถึงวันที่" className="text-[11px] text-ink-muted">แผน {baht(l.planned)}</span>}
              <span className="font-mono tabular-nums text-ink-display">{baht(l.actual)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const sum = (lines: PlanLine[]) => lines.reduce((n, l) => n + l.actual, 0);

/** ท้ายแผง: ส่วนของยอดรวมที่เป็นรายการลงล่วงหน้า (ยอดรวมเองยังนับทั้งหมด) */
function PlanNote({ lines, show }: { lines: PlanLine[]; show: boolean }) {
  const planned = lines.reduce((n, l) => n + (l.planned ?? 0), 0);
  return show && planned !== 0 ? <span title="ลงล่วงหน้า ยังไม่ถึงวันที่" className="ml-2 text-[11px] font-normal text-ink-muted">ในนี้แผน {baht(planned)}</span> : null;
}

/** โครงหน้าตอนเปิดแอปครั้งแรก (ธุรกรรมยังไม่มา) — ไม่งั้นเห็นตาราง ฿0 แล้วตัวเลขกระโดดเข้ามา */
function KakeiboSkeleton() {
  const block = 'bg-surface-elevated animate-pulse';
  const panel = (rows: number) => (
    <div className="flex flex-col border border-line bg-surface">
      <div className="px-4 py-2 border-b border-line"><div className={`h-3 w-24 ${block}`} /></div>
      <div className="flex flex-col gap-2 px-4 py-3">
        {Array.from({ length: rows }, (_, i) => <div key={i} className={`h-4 w-full ${block}`} />)}
      </div>
    </div>
  );
  return (
    <div role="status" aria-busy="true" aria-label="กำลังโหลด Kakeibo" className="flex flex-col gap-4 pb-10">
      <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-px bg-line border border-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3 bg-surface">
            <div className={`h-3 w-24 ${block}`} /><div className={`h-6 w-32 ${block}`} /><div className={`h-3 w-20 ${block}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-4">{panel(2)}{panel(5)}{panel(5)}{panel(2)}</div>
        <div className="flex flex-col gap-4">{panel(4)}{panel(8)}</div>
        <div className="flex flex-col gap-4">{panel(4)}{panel(5)}{panel(4)}</div>
      </div>
    </div>
  );
}

/** Kakeibo (家計簿) — budget planner ของเดือน/รอบเดียว สร้างจากหมวดและรายการที่มีอยู่ (ไม่มีอะไรให้กรอกนอกจากการทบทวน) */
const KakeiboView = memo(function KakeiboView({ isLoading = false }: { isLoading?: boolean }) {
  const { transactions, categories, cashflowGroups } = useAppData();
  const { filterPeriod, setFilterPeriod, getFilterLabel } = useAppFilter();
  const { budgets, ready: budgetsReady } = useBudgets();
  // ค่าใช้จ่ายคงที่ = กลุ่มที่พัก (ตัวเดียวกับที่ Dashboard ใช้หาการ์ด "ที่พัก")
  const fixedGroups = useMemo(() => {
    const { rentGroupId } = resolveCashflowGroups(cashflowGroups);
    return cashflowGroups.filter((g) => g.id === rentGroupId);
  }, [cashflowGroups]);
  const autoCategoryIds = useMemo(() => {
    const ids = new Set(fixedGroups.map((g) => g.id));
    return new Set(categories.filter((c) => ids.has(groupIdOf(c))).map((c) => c.id));
  }, [fixedGroups, categories]);
  // + ที่ผู้ใช้เลือกเอง (ทั้งหมวด หรือเฉพาะรายการ เช่น ค่าไฟบ้านที่แพร่ ในหมวดครอบครัว)
  const [fixedChoice, updateFixedChoice, fixedReady] = useJsonSetting(FIXED_SETTING_KEY, parseFixedChoice);
  const fixedRule = useMemo<FixedRule>(() => ({
    categoryIds: new Set([...autoCategoryIds, ...fixedChoice.categories]),
    itemKeys: new Set(fixedChoice.items),
  }), [autoCategoryIds, fixedChoice]);
  const fixedMenu = useMenu();
  const [fixedError, setFixedError] = useState<string | null>(null);
  const saveFixed = useCallback(async (update: (current: FixedChoice) => FixedChoice) => {
    setFixedError((await updateFixedChoice(update)) ? null : 'บันทึกไม่สำเร็จ ลองอีกครั้ง');
  }, [updateFixedChoice]);
  const today = localTodayIso();
  // s = ทั้งเดือน/รอบรวมรายการที่ลงล่วงหน้า (แผน), actual = เฉพาะที่เกิดขึ้นแล้วถึงวันนี้
  const s = useMemo(() => summarizeKakeibo(transactions, filterPeriod, fixedRule), [transactions, filterPeriod, fixedRule]);
  const actual = useMemo(() => summarizeKakeibo(transactions.filter((t) => t.date <= today), filterPeriod, fixedRule), [transactions, filterPeriod, fixedRule, today]);
  const plan = useMemo(() => planLines(transactions, filterPeriod, fixedRule, today), [transactions, filterPeriod, fixedRule, today]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [breakdown, setBreakdown] = useState(false);

  // งบซอง = งบกลุ่มที่ตั้งไว้ใน ตั้งค่าระบบ → งบประมาณ; สีมาจากยอดใช้จริงเท่านั้น รายการล่วงหน้าเป็นแผน (computeEnvelopes ตัวเดียวกับหน้าภาพรวม)
  const envelopes = useMemo(() => {
    if (!s) return [];
    const rows: EnvelopeRow[] = [];
    for (const t of transactions) {
      if (t.group_type !== 'expense' || !t.category_id) continue;
      rows.push({ date: t.date, satang: Math.round(t.amount * 100), groupId: groupIdOf(catById.get(t.category_id)), need: t.allocation_type === 'need' });
    }
    const byGroup = new Map(computeEnvelopes(rows, budgets, filterPeriod, today).map((e) => [e.groupId, e]));
    return [...cashflowGroups].sort((a, b) => a.order_index - b.order_index)
      .flatMap((g) => { const env = byGroup.get(g.id); return env && budgets[g.id] > 0 ? [{ group: g, env }] : []; });
  }, [s, transactions, catById, cashflowGroups, budgets, filterPeriod, today]);

  // ตอนบูต: รอธุรกรรม + Fix Cost + งบซองให้ครบก่อนวาด ไม่งั้นแถวที่เลือกเป็น Fix Cost เด้งย้ายตาราง และแผงงบผุดทีหลัง
  // เปลี่ยนช่วงเวลาให้ค้างตัวเลขเดิมไว้ ไม่สลับเป็นโครงแล้วกลับ (เหมือน Dashboard)
  if ((isLoading && transactions.length === 0) || !fixedReady || !budgetsReady) return <KakeiboSkeleton />;

  if (!s || !actual || !plan) {
    const current = isCyclePeriod(filterPeriod) ? CYCLE_PREFIX + toCycleKey(today) : today.slice(0, 7);
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 border border-line bg-surface text-center">
        <BookOpen className="w-10 h-10 text-ink-muted" aria-hidden />
        <p className="text-base font-bold text-ink-display">Kakeibo ดูได้ทีละเดือนหรือทีละรอบ</p>
        <button onClick={() => setFilterPeriod(current)} className="px-4 py-2 text-xs font-bold bg-accent text-on-accent">
          ดู{getFilterLabel(current)}
        </button>
      </div>
    );
  }

  const unit = isCyclePeriod(filterPeriod) ? 'รอบ' : 'เดือน';
  const showPlan = today >= s.start; // ช่วงที่ยังไม่เริ่มเป็นแผนทั้งช่วง ไม่ต้องติดป้ายทุกแถว
  const plannedExpense = s.expense - actual.expense;
  const leftTone = s.left < 0 ? 'text-danger' : s.left < s.goal ? 'text-ink-display' : 'text-income';
  const totalDays = s.weeks.reduce((n, w) => n + daysIn(w), 0);
  // งบใช้จ่ายต่อสัปดาห์ = (รายรับ − ค่าใช้จ่ายคงที่ − เป้าเงินเหลือ) เฉลี่ยตามจำนวนวันของสัปดาห์นั้น (สัปดาห์สุดท้ายมักสั้นกว่า)
  const allowanceOf = (w: { start: string; end: string }) => ((s.income - s.fixed - s.goal) * daysIn(w)) / totalDays;

  // ส่วนที่สาม = เงินเหลือ (ลงทุนอยู่ในนี้) ไม่ใช่ ลงทุน/ออม — เงินออมส่วนใหญ่อยู่นอกแอป ตัวเลขลงทุนในแอปจึงเป็น 0% แทบทุกรอบ
  const split = [
    { label: 'NEED', value: s.need, color: ALLOCATION_COLORS.need },
    { label: 'WANT', value: s.want, color: ALLOCATION_COLORS.want },
    { label: 'เงินเหลือ', value: Math.max(0, s.left), color: ALLOCATION_COLORS.savings },
  ];
  const splitTotal = split.reduce((n, x) => n + x.value, 0);
  const splitShares = roundShares(split.map((x) => x.value)); // ปัดให้รวมได้ 100% พอดี

  return (
    <div className="flex flex-col gap-4 pb-10">
      <KakeiboHeader periodLabel={getFilterLabel(filterPeriod)} summary={s} actual={actual} incomeSources={plan.income.length} />

      <div className="grid grid-cols-3 gap-4 items-start">
        {/* คอลัมน์ 1: เงินเข้า → ค่าใช้จ่ายคงที่ → จำเป็น → ลงทุน */}
        <div className="flex flex-col gap-4">
          <Panel title="รายรับ" icon={Wallet} footer={<><span>รวมรายรับ<PlanNote lines={plan.income} show={showPlan} /></span><span className="font-mono tabular-nums text-income">{baht(s.income)}</span></>}>
            <PlanTable lines={plan.income} catById={catById} showPlan={showPlan} />
          </Panel>
          {/* ตัวเลือก Fix Cost ลอยทับตาราง (ไม่ดันเนื้อหาลง); กดนอกกล่อง / Esc / เสร็จ = ปิด */}
          <div ref={fixedMenu.rootRef} className="relative">
            <Panel
              title="ค่าใช้จ่ายคงที่ (Fix Cost)"
              icon={Home}
              action={
                <button
                  ref={fixedMenu.triggerRef}
                  onClick={() => fixedMenu.setOpen((v) => !v)}
                  aria-expanded={fixedMenu.open}
                  aria-haspopup="dialog"
                  className={`px-2 py-0.5 rounded-pill border border-line text-[11px] font-bold ${fixedMenu.open ? 'bg-surface-elevated text-ink-display' : 'text-ink-body hover:text-ink-display'}`}
                >
                  {fixedMenu.open ? 'เสร็จ' : 'เลือกรายการ'}
                </button>
              }
              footer={<><span>รวม Fix Cost<PlanNote lines={plan.fixed} show={showPlan} /></span><span className="font-mono tabular-nums">{baht(sum(plan.fixed))}</span></>}
              overlay={fixedMenu.open && (
                <div role="dialog" aria-label="เลือกรายการ Fix Cost" className="absolute inset-x-0 top-0 z-40 border border-line bg-surface shadow-2xl">
                  <FixedCostPicker rows={transactions} range={s} autoCategoryIds={autoCategoryIds} catById={catById} choice={fixedChoice} onChange={saveFixed} />
                </div>
              )}
            >
              {fixedError && <div className="px-4 pt-2"><FieldError id="fixed-error" message={fixedError} /></div>}
              <PlanTable lines={plan.fixed} catById={catById} showPlan={showPlan} />
              <p className="px-4 py-2 border-t border-line text-[11px] text-ink-muted">
                {fixedGroups.length ? `กลุ่ม ${fixedGroups.map((g) => g.name).join(' · ')} อัตโนมัติ` : 'ไม่พบกลุ่มที่พัก'} · ที่เหลือกด "เลือกรายการ"
              </p>
            </Panel>
          </div>
          <Panel title="ค่าใช้จ่ายจำเป็น (NEED)" icon={Receipt} footer={<><span>รวม NEED (ไม่รวม Fix Cost)<PlanNote lines={plan.need} show={showPlan} /></span><span className="font-mono tabular-nums">{baht(sum(plan.need))}</span></>}>
            <PlanTable lines={plan.need} catById={catById} showPlan={showPlan} />
          </Panel>
          <Panel title="ลงทุน/ออม (ซื้อ − ขาย)" icon={Landmark} footer={<><span>รวมลงทุนสุทธิ<PlanNote lines={plan.invest} show={showPlan} /></span><span className="font-mono tabular-nums text-savings">{baht(s.invested)}</span></>}>
            <PlanTable lines={plan.invest} catById={catById} showPlan={showPlan} />
          </Panel>
        </div>

        {/* คอลัมน์ 2: งบซอง (ติดตามบ่อย) · ตามใจ */}
        <div className="flex flex-col gap-4">
          <Panel title="งบซอง" icon={Mail}>
            {envelopes.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-ink-muted">ยังไม่ได้ตั้งงบ — ตั้งได้ที่ ตั้งค่าระบบ → งบประมาณ</p>
            ) : (
              <ul className="divide-y divide-line">
                {envelopes.map(({ group, env }) => {
                  const { budget, spent, spentNeed: need, planned, level } = env;
                  // สีของหลอดบอกสถานะงบจากยอดใช้จริง (สีกลุ่ม / ส้ม / แดง); ส่วนทึบ = NEED, ส่วนจาง = WANT, ลายขีด = แผน.
                  // ถ้าใช้ + แผนเกินงบ ทั้งหลอดคือยอดรวม
                  const token = LEVEL_TOKEN[level];
                  const color = token ? tc(token) : group.color ?? tc('ink-body');
                  const faded = `color-mix(in srgb, ${color} 40%, transparent)`;
                  const scale = Math.max(budget, spent + planned);
                  const parts = [{ label: 'NEED', value: need, bg: color }, { label: 'WANT', value: spent - need, bg: faded }];
                  return (
                    <li key={group.id} className="flex flex-col gap-1 px-4 py-2">
                      <span className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex items-center gap-2 min-w-0 font-bold text-ink-display">
                          <CategoryGlyph icon={group.icon} color={readable(group.color ?? tc('ink-body'))} size={13} className="shrink-0" />
                          <span className="truncate">{group.name}</span>
                        </span>
                        <span className="font-mono tabular-nums text-ink-display">{baht(spent)}<span className="text-[11px] text-ink-muted"> / {baht(budget)}</span></span>
                      </span>
                      <span aria-hidden="true" className="flex h-2.5 bg-surface-elevated">
                        {parts.map((p) => <span key={p.label} style={{ width: `${(Math.max(0, p.value) / scale) * 100}%`, backgroundColor: p.bg }} />)}
                        {planned > 0 && <span style={{ width: `${(planned / scale) * 100}%`, backgroundImage: planStripes(color) }} />}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-[11px]">
                        <span className={LEVEL_TEXT[level]}>{spent > budget ? `เกิน ${baht(spent - budget)} (${overPct(spent / budget)}%)` : `เหลือ ${baht(budget - spent)}`}</span>
                        {planned > 0 && <span className="text-ink-muted">แผนอีก {baht(planned)}</span>}
                        {planned > 0 && <span className={budget - spent - planned < 0 ? 'font-bold text-ink-display' : 'text-ink-muted'}>หลังแผน {budget - spent - planned < 0 ? 'เกิน' : 'เหลือ'} {baht(Math.abs(budget - spent - planned))}</span>}
                        <span className="ml-auto flex items-center gap-3 font-mono tabular-nums text-ink-body">
                          {parts.map((p) => (
                            <span key={p.label} className="flex items-center gap-1">
                              <span aria-hidden className="w-2 h-2" style={{ backgroundColor: p.bg }} />
                              <span className="font-sans font-bold">{p.label}</span> {baht(p.value)}
                            </span>
                          ))}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {envelopes.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-t border-line text-[11px] text-ink-muted">
                <span>ทึบ = NEED · จาง = WANT · ลายขีด = ลงล่วงหน้า</span>
                <span>สีกลุ่ม = ในงบ</span>
                {([['เกินงบ', 'warn'], ['เกิน > 20%', 'danger']] as const).map(([label, token]) => (
                  <span key={label} className="flex items-center gap-1"><span aria-hidden className="w-2 h-2" style={{ backgroundColor: tc(token) }} />{label}</span>
                ))}
                <span>สีดูจากยอดจริง</span>
              </p>
            )}
          </Panel>
          <Panel title="ค่าใช้จ่ายตามใจ (WANT)" icon={ShoppingBag} footer={<><span>รวม WANT<PlanNote lines={plan.want} show={showPlan} /></span><span className="font-mono tabular-nums">{baht(sum(plan.want))}</span></>}>
            <PlanTable lines={plan.want} catById={catById} showPlan={showPlan} />
          </Panel>
        </div>

        {/* คอลัมน์ 3: สัดส่วน · จังหวะรายสัปดาห์ · สมการสรุป */}
        <div className="flex flex-col gap-4">
          <Panel title="สรุปการใช้เงิน" icon={PieChart} footer={<><span>รวม</span><span className="font-mono tabular-nums">{baht(splitTotal)}</span></>}>
            <div className="grid grid-cols-[120px_1fr] gap-4 items-center px-4 py-3">
              <div className="relative h-[120px]">
                {splitTotal > 0 && (
                  <Doughnut
                    data={{ labels: split.map((x) => x.label), datasets: [{ data: split.map((x) => x.value / 100), backgroundColor: split.map((x) => x.color), borderColor: tc('surface'), borderWidth: 2 }] }}
                    options={{ cutout: '62%', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatBaht(c.parsed)}` } } } }}
                  />
                )}
              </div>
              <ul className="flex flex-col gap-2 text-[13px]">
                {split.map((x, i) => (
                  <li key={x.label} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: x.color }} aria-hidden />
                    <span className="text-ink-display">{x.label}</span>
                    <span className="font-mono tabular-nums text-ink-body">{splitShares[i]}%</span>
                    <span />
                    <span className="col-span-2 -mt-1.5 text-[11px] font-mono tabular-nums text-ink-muted">{baht(x.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
          <Panel
            title="รายจ่ายรายสัปดาห์"
            icon={CalendarDays}
            action={
              <button
                onClick={() => setBreakdown((v) => !v)}
                aria-pressed={breakdown}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-pill border border-line text-[11px] font-bold ${breakdown ? 'bg-surface-elevated text-ink-display' : 'text-ink-body hover:text-ink-display'}`}
              >
                <ListTree className="w-3 h-3" aria-hidden />แยกหมวด
              </button>
            }
          >
            <p className="px-4 pt-2 text-[11px] text-ink-muted">
              ไม่รวม Fix Cost {baht(s.fixed)} · งบ = รายรับ − Fix Cost − เป้าเงินเหลือ เฉลี่ยตามวัน
            </p>
            <ul className="divide-y divide-line">
              {s.weeks.map((w, i) => {
                // รายสัปดาห์มีไว้ทบทวนว่าเงินไปไหน ไม่ตัดสินผ่าน/ตก: เงินออกกระจุกหลังเงินเดือนเข้า บิลบัตรลงก้อนเดียว
                // และของที่จ่ายจากกองนอกแอปทำให้สัปดาห์ "เกิน" ได้ทั้งที่ทั้งรอบยังอยู่ในเป้า — คำเตือนอยู่ที่หัวกระดาษระดับรอบ
                const allowance = Math.max(0, allowanceOf(w));
                const done = actual.weeks[i]?.spent ?? 0;
                const scale = Math.max(allowance, w.spent) || 1;
                const isNow = today >= w.start && today <= w.end;
                const isFuture = today < w.start;
                const ink = tc('ink-body');
                return (
                  <li key={w.start} data-week aria-current={isNow ? 'date' : undefined} className={`flex flex-col gap-1 px-4 py-2 ${isNow ? 'bg-surface-elevated' : ''}`}>
                    <span className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-bold text-ink-display">
                        สัปดาห์ {i + 1}{isNow && <span className="ml-1.5 px-1.5 py-px rounded-pill border border-line text-[11px] font-bold text-ink-display">ตอนนี้</span>} <span className="text-[11px] font-normal text-ink-muted">{day(w.start)} – {day(w.end)}{isFuture ? ' · ล่วงหน้า' : ''}</span>
                      </span>
                      <span className="font-mono tabular-nums">
                        <span className="text-ink-display">{baht(w.spent)}</span>
                        <span className="text-[11px] text-ink-muted"> / {baht(allowance)}</span>
                      </span>
                    </span>
                    {!isFuture && allowance > 0 && w.spent > allowance && (
                      <span className="-mt-0.5 text-[11px] text-ink-body">สูงกว่างบสัปดาห์ {baht(w.spent - allowance)}{w.spent > done ? ' (รวมที่ลงล่วงหน้า)' : ''}</span>
                    )}
                    <span aria-hidden="true" className={`relative flex ${breakdown ? 'h-2.5' : 'h-1.5'} ${isNow ? 'bg-canvas' : 'bg-surface-elevated'}`}>
                      {breakdown ? (
                        // แยกหมวด: หลอดต่อกันตามสีหมวด (สัปดาห์ล่วงหน้าจางทั้งหลอด)
                        w.items.map((it) => (
                          <span
                            key={it.categoryId}
                            title={`${it.name}: ${baht(it.spent)}`}
                            className={`border-r border-surface last:border-r-0 ${isFuture ? 'opacity-40' : ''}`}
                            style={{ width: `${(it.spent / scale) * 100}%`, backgroundColor: catById.get(it.categoryId)?.color ?? tc('ink-body') }}
                          />
                        ))
                      ) : (
                        <>
                          <span style={{ width: `${(done / scale) * 100}%`, backgroundColor: ink }} />
                          <span style={{ width: `${(Math.max(0, w.spent - done) / scale) * 100}%`, backgroundImage: planStripes(ink) }} />
                        </>
                      )}
                      {/* ใช้เกินงบของสัปดาห์: ทั้งหลอดคือยอดที่ใช้ ขีดขาวคือเส้นงบ */}
                      {w.spent > allowance && allowance > 0 && <span data-allowance-tick className="absolute -inset-y-0.5 w-0.5 bg-ink-display" style={{ left: `${(allowance / scale) * 100}%` }} />}
                    </span>
                    {breakdown && (
                      <ul className="m-reveal flex flex-col gap-0.5 pt-1 pl-3 border-l border-line">
                        {w.items.length === 0 && <li className="text-[11px] text-ink-muted">ไม่มีรายจ่าย</li>}
                        {w.items.map((it) => {
                          const cat = catById.get(it.categoryId);
                          return (
                            <li key={it.categoryId} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="flex items-center gap-1.5 min-w-0 text-ink-body">
                                <span aria-hidden className="w-2 h-2 shrink-0" style={{ backgroundColor: cat?.color ?? tc('ink-body') }} />
                                <CategoryGlyph icon={cat?.icon} color={readable(cat?.color ?? tc('ink-body'))} size={11} className="shrink-0" />
                                <span className="truncate">{it.name || 'ไม่ระบุหมวด'}</span>
                              </span>
                              <span className="font-mono tabular-nums text-ink-display">{baht(it.spent)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="px-4 py-2 border-t border-line text-[11px] text-ink-muted">พื้นสว่าง = สัปดาห์ปัจจุบัน · {breakdown ? 'สีจาง = สัปดาห์ล่วงหน้า' : 'ลายขีด = ลงล่วงหน้า'} · ขีดขาว = เส้นงบของสัปดาห์</p>
          </Panel>
          {/* อ่านเป็นสมการ: รายรับ − รายจ่าย = เงินเหลือ (เป้าเงินเหลืออยู่ที่การ์ดหัวกระดาษแล้ว ไม่ซ้ำที่นี่) */}
          <Panel
            title={`ภาพรวม${unit}`}
            icon={BookOpen}
            footer={<>
              <span>= เงินเหลือ{s.invested !== 0 && <span className="ml-2 text-[11px] font-normal text-ink-muted">ในนี้ลงทุน/ออม {baht(s.invested)}</span>}</span>
              <span className={`font-mono tabular-nums ${leftTone}`}>{baht(s.left)}</span>
            </>}
          >
            <dl className="divide-y divide-line text-[13px]">
              {[
                { k: 'รายรับรวม', v: s.income },
                { k: '− รายจ่ายรวม (NEED + WANT)', v: s.expense },
                { k: 'ในนี้ Fix Cost', v: s.fixed, sub: true },
                ...(plannedExpense > 0 ? [{ k: 'ในนี้ลงล่วงหน้า (แผน)', v: plannedExpense, sub: true }] : []),
              ].map(({ k, v, sub }) => (
                <div key={k} className={`flex justify-between gap-3 py-1.5 ${sub ? 'pl-8 pr-4' : 'px-4'}`}>
                  <dt className={sub ? 'text-ink-muted' : 'text-ink-body'}>{k}</dt>
                  <dd className={`font-mono tabular-nums ${sub ? 'text-ink-body' : 'text-ink-display'}`}>{baht(v)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <MonthReflection />
    </div>
  );
});

export default KakeiboView;
