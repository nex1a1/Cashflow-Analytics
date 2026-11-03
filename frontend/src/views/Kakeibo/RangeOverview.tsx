import { Fragment, memo, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, BarChart3, BookOpen, ChevronRight, Layers, PieChart } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readable, tc } from '@/constants/theme';
import { BUDGET_RULES } from '@/constants/budgetRules';
import { formatBaht } from '@/utils/formatters';
import { isCyclePeriod } from '@/utils/payCycle';
import { groupIdOf, rangeBreakdown, rangeTrend, unitRange, type KakeiboRow, type RangePoint } from '@/utils/kakeibo';
import useToday from '@/hooks/useToday';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import type { CashflowGroup, Category } from '@/types';
import Panel, { stripes, toggleCls } from './Panel';
import { IncomeSplitBar, leftTone, pctLeft, pctText, SPLIT } from './split';

const baht = (satang: number) => formatBaht(satang / 100);
/** สีหมวดที่ผู้ใช้เลือก ใช้เป็นสีตัวอักษรบนพื้น surface-elevated ของคอลัมน์ที่กางออก */
const catInk = (c?: Category) => readable(c?.color ?? tc('ink-body'));

type Mode = 'split' | 'groups';
type Order = 'newest' | 'oldest';
const NUM = 'px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap';
const HEAD = 'px-3 py-1.5 text-right font-bold whitespace-nowrap align-bottom';

interface GroupCol { id: string; name: string; icon?: string | null; color: string | null; total: number; cats: string[] }

interface Props {
  rows: KakeiboRow[];
  period: string;
  categories: Category[];
  groups: CashflowGroup[];
  getFilterLabel: (period?: string) => string;
  /** เปิดเดือน/รอบนั้นแบบ Kakeibo */
  onOpenUnit: (period: string) => void;
  /** ปุ่มกลับไปเดือน/รอบปัจจุบัน */
  current: string;
  /** ใต้ตาราง (ปฏิทินการใช้จ่าย) */
  children?: ReactNode;
}

/** ภาพรวมหลายเดือน/รอบ: แถวละเดือน ดูแบบ NEED/WANT หรือแยกกลุ่มรายจ่าย (กดกลุ่มเพื่อกางหมวด) กดแถวเพื่อเปิดเดือนนั้น */
const RangeOverview = memo(function RangeOverview({ rows, period, categories, groups, getFilterLabel, onOpenUnit, current, children }: Props) {
  const [mode, setMode] = useState<Mode>('split');
  // ล่าสุดบน (ค่าเริ่มต้น) หรือล่าสุดล่าง — จำไว้ข้ามการเปิดแอป
  const [order, setOrder] = useState<Order>(() => (localStorage.getItem(STORAGE_KEYS.RANGE_ORDER) === 'oldest' ? 'oldest' : 'newest'));
  const flipOrder = () => setOrder((prev) => {
    const next = prev === 'newest' ? 'oldest' : 'newest';
    localStorage.setItem(STORAGE_KEYS.RANGE_ORDER, next);
    return next;
  });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const points = useMemo(() => rangeTrend(rows, period), [rows, period]);
  const today = useToday();
  // เดือน/รอบที่ยังไม่เริ่ม: มีแต่รายการลงล่วงหน้า จึงแยกให้เห็นและไม่นับในรวม/เฉลี่ย (ถ้าทั้งช่วงยังไม่ถึง ก็นับทั้งหมด)
  const future = useMemo(() => new Set(points.filter((p) => (unitRange(p.period)?.start ?? '') > today).map((p) => p.period)), [points, today]);
  const counted = useMemo(() => {
    const done = points.filter((p) => !future.has(p.period));
    return done.length ? done : points;
  }, [points, future]);
  const countedKeys = useMemo(() => new Set(counted.map((p) => p.period)), [counted]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const breakdown = useMemo(() => rangeBreakdown(rows, period, (id) => groupIdOf(catById.get(id))), [rows, period, catById]);
  const total = useMemo(() => counted.reduce(
    (t, p) => ({ ...t, income: t.income + p.income, need: t.need + p.need, want: t.want + p.want, left: t.left + p.left, invested: t.invested + p.invested }),
    { period, income: 0, need: 0, want: 0, left: 0, invested: 0 },
  ), [counted, period]);

  // คอลัมน์กลุ่ม: เฉพาะกลุ่มที่มีรายจ่ายในช่วงนี้ เรียงตามลำดับในตั้งค่า; หมวดในกลุ่มเรียงยอดมากไปน้อย
  // colMax = เดือนที่สูงสุดของแต่ละคอลัมน์ (กลุ่ม `g:id`, หมวด `c:id`) — ความยาวแถบใต้ตัวเลขเทียบกับค่านี้
  const { groupCols, catSum, colMax } = useMemo(() => {
    const groupSum: Record<string, number> = {};
    const catSum: Record<string, number> = {};
    const colMax: Record<string, number> = {};
    const present = new Set<string>(); // กลุ่ม/หมวดที่มียอดในแถวไหนก็ได้ (รวมแถวที่ยังไม่ถึง) ได้คอลัมน์
    const presentCats = new Set<string>();
    for (const [key, b] of breakdown) {
      Object.keys(b.groups).forEach((g) => present.add(g));
      Object.keys(b.categories).forEach((c) => presentCats.add(c));
      if (!countedKeys.has(key)) continue; // รวม/เฉลี่ย/ความยาวแถบ ไม่นับแถวที่ยังไม่ถึง
      for (const [g, v] of Object.entries(b.groups)) { groupSum[g] = (groupSum[g] ?? 0) + v; colMax[`g:${g}`] = Math.max(colMax[`g:${g}`] ?? 0, v); }
      for (const [c, v] of Object.entries(b.categories)) { catSum[c] = (catSum[c] ?? 0) + v; colMax[`c:${c}`] = Math.max(colMax[`c:${c}`] ?? 0, v); }
    }
    const cols: Omit<GroupCol, 'total' | 'cats'>[] = [...groups].sort((a, b) => a.order_index - b.order_index)
      .filter((g) => present.has(g.id)).map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color ?? null }));
    if (present.has('')) cols.push({ id: '', name: 'ไม่ระบุกลุ่ม', color: null });
    const catsOf = (id: string) => [...presentCats].filter((c) => groupIdOf(catById.get(c)) === id).sort((a, b) => (catSum[b] ?? 0) - (catSum[a] ?? 0));
    return { groupCols: cols.map((g): GroupCol => ({ ...g, total: groupSum[g.id] ?? 0, cats: catsOf(g.id) })), catSum, colMax };
  }, [breakdown, groups, catById, countedKeys]);

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 border border-line bg-surface text-center">
        <BookOpen className="w-10 h-10 text-ink-muted" />
        <p className="text-base font-bold text-ink-display">ยังไม่มีรายการใน{getFilterLabel(period)}</p>
        <button onClick={() => onOpenUnit(current)} className="px-4 py-2 text-xs font-bold bg-accent text-on-accent">ดู{getFilterLabel(current)}</button>
      </div>
    );
  }

  const n = counted.length;
  const skipped = points.length - counted.length;
  const unit = isCyclePeriod(period) ? 'รอบ' : 'เดือน';
  const expense = total.need + total.want;
  const toggleGroup = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  /** หัวคอลัมน์ระหว่าง "รายรับ" กับ "รวมรายจ่าย" ของแต่ละโหมด */
  const middleHead = mode === 'split'
    ? <><th className={`${HEAD} text-left`}>สัดส่วนรายรับ</th><th className={HEAD}>NEED</th><th className={HEAD}>WANT</th></>
    : groupCols.map((g) => {
      const color = readable(g.color ?? tc('ink-body'));
      const open = expanded.has(g.id);
      return (
        <Fragment key={g.id || '-'}>
          <th className={`${HEAD} ${open ? 'bg-surface-elevated' : ''}`}>
            <button
              onClick={() => toggleGroup(g.id)}
              aria-expanded={open}
              title={open ? 'ยุบหมวด' : 'กางดูรายหมวด'}
              className="inline-flex items-center gap-1"
              style={{ color }}
            >
              <CategoryGlyph icon={g.icon} color={color} size={12} className="shrink-0" />
              {g.name}
              <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
            </button>
          </th>
          {open && g.cats.map((c) => (
            <th key={c} data-cat-col className={`${HEAD} bg-surface-elevated font-normal`} style={{ color: catInk(catById.get(c)) }}>{catById.get(c)?.name ?? 'ไม่ระบุหมวด'}</th>
          ))}
        </Fragment>
      );
    });

  /** ตัวเลขสีของกลุ่ม/หมวด + แถบใต้ตัวเลข (เฉพาะแถวรายเดือน) ยาวตามสัดส่วนของเดือนที่สูงสุดในคอลัมน์ */
  const valueCell = (kind: 'group' | 'cat', v: number, raw: string | null | undefined, max: number, withBar: boolean, extra: string) => (
    <td data-group-cell={kind === 'group' || undefined} data-cat-cell={kind === 'cat' || undefined} className={`${NUM} ${extra} ${v ? '' : 'text-ink-muted'}`} style={v ? { color: readable(raw ?? tc('ink-body')) } : undefined}>
      {v ? baht(v) : '—'}
      {withBar && v > 0 && max > 0 && (
        <span
          aria-hidden
          data-col-bar
          className="block h-0.5 mt-0.5 ml-auto"
          style={{ width: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: `color-mix(in srgb, ${raw ?? tc('ink-body')} 70%, transparent)` }}
        />
      )}
    </td>
  );

  /** เซลล์ช่วงกลางของแถว: value(group, category?) = satang ของกลุ่ม (หรือหมวดเมื่อส่ง category);
   *  unit = แถวรายเดือน (มีหลอดสัดส่วน / แถบใต้ตัวเลข) — แถวรวม/เฉลี่ยไม่ส่ง */
  const middleCells = (value: (g: GroupCol, cat?: string) => number, split: { need: number; want: number }, unit?: { point: RangePoint; planned: boolean }) =>
    mode === 'split'
      ? <><td className="px-3 py-1.5 w-48">{unit && <IncomeSplitBar point={unit.point} planned={unit.planned} />}</td><td className={`${NUM} text-ink-body`}>{baht(split.need)}</td><td className={`${NUM} text-ink-body`}>{baht(split.want)}</td></>
      : groupCols.map((g) => {
        const open = expanded.has(g.id);
        const withBar = !!unit;
        return (
          <Fragment key={g.id || '-'}>
            {valueCell('group', value(g), g.color, colMax[`g:${g.id}`], withBar, open ? 'bg-surface-elevated' : '')}
            {open && g.cats.map((c) => (
              <Fragment key={c}>
                {valueCell('cat', value(g, c), catById.get(c)?.color, colMax[`c:${c}`], withBar, 'bg-surface-elevated')}
              </Fragment>
            ))}
          </Fragment>
        );
      });

  /** แถวท้าย: รวม (div = 1) หรือเฉลี่ยต่อเดือน/รอบ (div = n) */
  const footRow = (label: string, div: number) => {
    const per = (v: number) => Math.round(v / div);
    return (
      <tr className="border-t border-line bg-surface-elevated font-black text-ink-display">
        <th scope="row" className="sticky left-0 z-10 px-3 py-2 text-left bg-surface-elevated">{label}</th>
        <td className={`${NUM} text-income`}>{baht(per(total.income))}</td>
        {middleCells((g, c) => per(c ? catSum[c] ?? 0 : g.total), { need: per(total.need), want: per(total.want) })}
        <td className={NUM}>{baht(per(expense))}</td>
        <td className={`${NUM} ${leftTone(total)}`}>{baht(per(total.left))}</td>
        <td className={`${NUM} ${leftTone(total)}`}>{pctText(pctLeft(total))}</td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <section aria-label="สรุปช่วงเวลา" className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-px bg-line border border-line">
        <div className="flex flex-col gap-1 px-4 py-3 bg-surface">
          <h2 className="text-base font-black text-ink-display">{getFilterLabel(period)}</h2>
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span className={`text-2xl font-black font-mono tabular-nums ${leftTone(total)}`}>{pctLeft(total) === null ? '—' : `เหลือ ${pctText(pctLeft(total))}`}</span>
            <span className="text-[13px] text-ink-body">เป้า {BUDGET_RULES.surplus.min}%</span>
          </p>
          <span className="text-[11px] text-ink-body">{n} {unit}{skipped > 0 && ` (ไม่นับ ${skipped} ${unit}ที่ยังไม่ถึง)`} · กดแถวเพื่อดูทีละ{unit}</span>
        </div>
        {[
          { k: 'รายรับรวม', v: total.income, tone: 'text-income', sub: `เฉลี่ย ${baht(Math.round(total.income / n))}` },
          { k: 'รายจ่ายรวม (NEED + WANT)', v: expense, tone: 'text-ink-display', sub: `เฉลี่ย ${baht(Math.round(expense / n))}` },
          { k: 'เงินเหลือ', v: total.left, tone: leftTone(total), sub: total.invested ? `ในนี้ลงทุน/ออม ${baht(total.invested)}` : 'ลงทุนอยู่ในเงินเหลือ' },
        ].map(({ k, v, tone, sub }) => (
          <div key={k} className="flex flex-col gap-0.5 px-4 py-3 bg-surface">
            <span className="text-[11px] font-bold text-ink-muted">{k}</span>
            <span className={`text-xl font-black font-mono tabular-nums ${tone}`}>{baht(v)}</span>
            <span className="text-[11px] text-ink-body">{sub}</span>
          </div>
        ))}
      </section>

      <Panel
        title={`ราย${unit}`}
        icon={BarChart3}
        action={<>
          <button onClick={() => setMode('split')} aria-pressed={mode === 'split'} className={toggleCls(mode === 'split')}><PieChart className="w-3 h-3" />NEED/WANT</button>
          <button onClick={() => setMode('groups')} aria-pressed={mode === 'groups'} className={toggleCls(mode === 'groups')}><Layers className="w-3 h-3" />แยกกลุ่ม</button>
        </>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-[11px] text-ink-muted">
              <tr>
                <th className={`${HEAD} sticky left-0 z-10 text-left bg-surface`} aria-sort={order === 'newest' ? 'descending' : 'ascending'}>
                  <button
                    onClick={flipOrder}
                    data-order-toggle
                    title={order === 'newest' ? `ล่าสุดอยู่บน · กดเพื่อให้${unit}ล่าสุดอยู่ล่าง` : `ล่าสุดอยู่ล่าง · กดเพื่อให้${unit}ล่าสุดอยู่บน`}
                    className="inline-flex items-center gap-1 hover:text-ink-display"
                  >
                    ช่วง
                    {order === 'newest' ? <ArrowDown className="w-3 h-3" aria-hidden /> : <ArrowUp className="w-3 h-3" aria-hidden />}
                    <span className="font-normal">{order === 'newest' ? 'ล่าสุดบน' : 'ล่าสุดล่าง'}</span>
                  </button>
                </th>
                <th className={HEAD}>รายรับ</th>
                {middleHead}
                <th className={HEAD}>รวมรายจ่าย</th>
                <th className={HEAD}>เงินเหลือ</th>
                <th className={HEAD}>%เหลือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(order === 'newest' ? [...points].reverse() : points).map((p) => {
                const b = breakdown.get(p.period);
                const isFuture = future.has(p.period);
                const range = unitRange(p.period);
                const isNow = !!range && range.start <= today && today <= range.end;
                const rowBg = isFuture ? { backgroundImage: stripes(tc('ink-muted'), 18) } : undefined;
                return (
                  <tr
                    key={p.period}
                    data-range-row
                    data-future={isFuture || undefined}
                    aria-current={isNow ? 'date' : undefined}
                    className={`group hover:bg-surface-elevated ${isFuture ? '[&>td]:opacity-50' : ''} ${isNow ? 'bg-surface-elevated' : ''}`}
                    style={rowBg}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 p-0 text-left font-normal group-hover:bg-surface-elevated ${isNow ? 'bg-surface-elevated' : 'bg-surface'}`}
                      style={rowBg}
                    >
                      <button onClick={() => onOpenUnit(p.period)} title={`เปิด${getFilterLabel(p.period)}`} className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 whitespace-nowrap ${isFuture ? 'text-ink-muted' : 'text-ink-display'}`}>
                        <span className="flex items-center gap-2">
                          {getFilterLabel(p.period)}
                          {isNow && <span className="px-1.5 py-px rounded-pill border border-line text-[11px] font-bold text-ink-display">ตอนนี้</span>}
                          {isFuture && <span data-future-badge className="px-1.5 py-px rounded-pill border border-line text-[11px] text-ink-body">ล่วงหน้า</span>}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-muted" aria-hidden />
                      </button>
                    </th>
                    <td className={`${NUM} text-income`}>{baht(p.income)}</td>
                    {middleCells((g, c) => (c ? b?.categories[c] : b?.groups[g.id]) ?? 0, p, { point: p, planned: isFuture })}
                    <td className={`${NUM} text-ink-display`}>{baht(p.need + p.want)}</td>
                    <td className={`${NUM} ${leftTone(p)}`}>{baht(p.left)}</td>
                    <td className={`${NUM} ${leftTone(p)}`}>{pctText(pctLeft(p))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {footRow('รวม', 1)}
              {n > 1 && footRow(`เฉลี่ย/${unit}`, n)}
            </tfoot>
          </table>
        </div>
        {mode === 'split' ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t border-line text-[11px] text-ink-muted">
            {SPLIT.map((x) => (
              <li key={x.label} className="flex items-center gap-1.5"><span aria-hidden className="w-2 h-2 rounded-full" style={{ backgroundColor: x.color }} />{x.label}</li>
            ))}
            <li>ขีด = เป้าเงินเหลือ {BUDGET_RULES.surplus.min}%</li>
            {skipped > 0 && <li>ลายขีดเฉียง = {unit}ที่ยังไม่ถึง (มีแต่รายการลงล่วงหน้า ไม่นับในรวม/เฉลี่ย)</li>}
          </ul>
        ) : (
          <p className="px-4 py-2 border-t border-line text-[11px] text-ink-muted">กดชื่อกลุ่มเพื่อกางดูรายหมวด · ไม่รวมลงทุน/ออม (อยู่ในเงินเหลือ){skipped > 0 && ` · ลายขีดเฉียง = ${unit}ที่ยังไม่ถึง (ไม่นับในรวม/เฉลี่ย)`}</p>
        )}
      </Panel>
      {children}
    </div>
  );
});

export default RangeOverview;
