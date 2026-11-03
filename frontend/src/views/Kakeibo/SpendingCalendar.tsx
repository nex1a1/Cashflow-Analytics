import { memo, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { CalendarDays, Shapes } from 'lucide-react';
import type { Category, DayType } from '@/types';
import { readable, tc } from '@/constants/theme';
import { formatBaht, formatBahtShort, formatThaiDayMonth as dayLabel, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { isSingleUnitPeriod } from '@/utils/payCycle';
import { parseDateStrToObj } from '@/utils/dateHelpers';
import { timelineInputs, weeksOf, type DayItem, type TimelineRow } from '@/utils/spendingCalendar';
import { DAY_OF_WEEK_LABELS as WEEKDAYS } from '@/views/Calendar/utils/calendarPeriodHelpers';
import { CALENDAR_HEAT_COLORS, CALENDAR_HEAT_CHIP, CALENDAR_HEAT_STEPS, getCalendarHeatLevel } from '@/views/Calendar/utils/calendarHeat';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import useToday from '@/hooks/useToday';
import Panel, { toggleCls } from './Panel';

const weekendCls = (i: number) => (i === 0 || i === 6 ? 'text-weekend' : '');
const HEAT_LABEL = ['ไม่มีรายจ่าย', 'ปกติ', 'กลาง', 'สูง', 'พีค'];

/** ช่องเล็กไม่มีตัวเลข (หลายเดือน) ต้องเห็นระดับจากสีพื้นเอง จึงเข้มกว่าพื้นจางของปฏิทินเดือน — ขั้นมาจาก getCalendarHeatLevel เหมือนกัน */
const HEAT_FILL = [tc('surface-elevated'), tc('ink-muted', 0.45), tc('warn', 0.75), tc('expense', 0.6), tc('expense')];

/** การ์ด hover: กว้างคงที่ วางเหนือช่อง (ชิดขอบจอไม่ล้น) หรือใต้ช่องเมื่อด้านบนไม่พอ */
const CARD_W = 248;
const CARD_ITEMS = 4;

interface HoverAt { date: string; x: number; top: number; bottom: number }

interface Props {
  rows: TimelineRow[];
  period: string;
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
  categories?: Category[];
}

interface CardProps {
  at: HoverAt;
  today: string;
  amount: number;
  items: DayItem[];
  dayType?: DayType;
  typeColor: string;
  avgPerDay: number;
  catById: Map<string, Category>;
}

/** การ์ดของวันที่ชี้: สีประเภทวัน (แถบบน + จุด) และสีระดับการจ่าย (ป้ายยอด) ในใบเดียว แล้วตามด้วยหมวดที่จ่ายวันนั้น */
function HoverCard({ at, today, amount, items, dayType, typeColor, avgPerDay, catById }: CardProps) {
  const level = getCalendarHeatLevel(amount);
  const below = at.top < 240;
  const left = Math.min(Math.max(8, at.x - CARD_W / 2), window.innerWidth - CARD_W - 8);
  const dow = parseDateStrToObj(at.date).getDay();
  const status = at.date === today ? 'วันนี้' : at.date > today ? 'ล่วงหน้า' : null;
  const diff = amount - avgPerDay;
  return (
    <div
      role="tooltip"
      data-hover-card
      className="fixed z-50 pointer-events-none border border-line bg-surface-elevated shadow-2xl text-[11px]"
      style={{ left, top: below ? at.bottom + 8 : at.top - 8, width: CARD_W, transform: below ? undefined : 'translateY(-100%)' }}
    >
      <div aria-hidden className="h-1" style={{ backgroundColor: typeColor }} />
      <div className="flex items-baseline justify-between gap-2 px-3 pt-2">
        <span className="text-[13px] font-black text-ink-display">{WEEKDAYS[dow]} {dayLabel(at.date)} {at.date.slice(0, 4)}</span>
        {status && <span className="px-1.5 py-px rounded-pill border border-line text-ink-body">{status}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2">
        <span className="flex items-center gap-1.5 text-ink-body">
          <span aria-hidden className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColor }} />{dayType?.label ?? 'ไม่ระบุประเภทวัน'}
        </span>
        <span className="flex items-center gap-1.5 text-ink-muted">
          <span aria-hidden className="w-2 h-2" style={{ backgroundColor: HEAT_FILL[level] }} />{HEAT_LABEL[level]}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 px-3 py-2 border-t border-line">
        <span className="text-ink-muted">{status === 'ล่วงหน้า' ? 'รายจ่ายที่ลงไว้' : 'รายจ่าย'}</span>
        <span data-hover-amount className={`px-1 font-mono tabular-nums text-[13px] font-bold ${amount ? CALENDAR_HEAT_CHIP[level] : 'text-ink-muted'}`}>{formatBaht(amount)}</span>
      </div>
      {amount > 0 && avgPerDay > 0 && (
        <p className="px-3 -mt-1 pb-2 text-right text-ink-muted">
          {Math.abs(diff) < 1 ? 'เท่าค่าเฉลี่ย' : `${diff > 0 ? 'สูงกว่า' : 'ต่ำกว่า'}เฉลี่ย ${formatBahtShort(Math.round(Math.abs(diff)))}`} ({formatBahtShort(Math.round(avgPerDay))}/วัน)
        </p>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col gap-1 px-3 py-2 border-t border-line">
          {items.slice(0, CARD_ITEMS).map((it) => {
            const cat = catById.get(it.categoryId);
            const color = readable(cat?.color ?? tc('ink-body'));
            return (
              <li key={it.categoryId} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  <CategoryGlyph icon={cat?.icon} color={color} size={11} className="shrink-0" />
                  <span className="truncate" style={{ color }}>{cat?.name ?? (it.name || 'ไม่ระบุหมวด')}</span>
                  {it.count > 1 && <span className="shrink-0 text-ink-muted">×{it.count}</span>}
                </span>
                <span className="font-mono tabular-nums text-ink-display">{formatBaht(it.amount)}</span>
              </li>
            );
          })}
          {items.length > CARD_ITEMS && <li className="text-ink-muted">อีก {items.length - CARD_ITEMS} หมวด</li>}
        </ul>
      )}
    </div>
  );
}

/** ปฏิทินการใช้จ่าย: เดือน/รอบเดียว = ตารางสัปดาห์ (ยอด + ประเภทวันในช่องเดียว), หลายเดือน = แถบสัปดาห์แบบ GitHub; ชี้ที่ช่องเพื่อดูการ์ดของวันนั้น */
const SpendingCalendar = memo(function SpendingCalendar({ rows, period, dayTypes, dayTypeConfig, categories = [] }: Props) {
  const today = useToday();
  const [byType, setByType] = useState(false);
  const [hover, setHover] = useState<HoverAt | null>(null);
  const { datesInPeriod, dailyExpenses, dailyItems, dayTypeOf, dayTypeCounts } = useMemo(
    () => timelineInputs(rows, period, dayTypes, dayTypeConfig), [rows, period, dayTypes, dayTypeConfig]);
  const weeks = useMemo(() => weeksOf(datesInPeriod), [datesInPeriod]);
  const typeById = useMemo(() => new Map(dayTypeConfig.map((t) => [t.id, t])), [dayTypeConfig]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const avgPerDay = useMemo(
    () => (datesInPeriod.length ? Object.values(dailyExpenses).reduce((n, v) => n + v, 0) / datesInPeriod.length : 0),
    [dailyExpenses, datesInPeriod]);

  // การ์ดวางด้วยพิกัดจอ: เลื่อนหน้าแล้วตำแหน่งเก่าผิด จึงปิดทันที
  const cardOpen = hover !== null;
  useEffect(() => {
    if (!cardOpen) return;
    const close = () => setHover(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [cardOpen]);

  if (datesInPeriod.length === 0) return null;

  const typeColor = (id?: string) => typeById.get(id ?? '')?.color || tc('line');
  const describe = (d: string) => {
    const amt = dailyExpenses[d] ?? 0;
    const type = typeById.get(dayTypeOf[d] ?? '')?.label;
    return [dayLabel(d), type, amt ? formatBaht(amt) : 'ไม่มีรายจ่าย', d > today && amt ? 'ลงล่วงหน้า' : ''].filter(Boolean).join(' · ');
  };
  // ช่องทุกช่องมี data-day: ฟังที่กรอบเดียวแทนการผูก handler ทีละช่อง
  const onOver = (e: MouseEvent<HTMLElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!cell) { setHover(null); return; }
    const date = cell.dataset.day!;
    if (hover?.date === date) return;
    const r = cell.getBoundingClientRect();
    setHover({ date, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };
  const hoverProps = { onMouseOver: onOver, onMouseLeave: () => setHover(null) };
  const card = hover && (
    <HoverCard
      at={hover}
      today={today}
      amount={dailyExpenses[hover.date] ?? 0}
      items={dailyItems[hover.date] ?? []}
      dayType={typeById.get(dayTypeOf[hover.date] ?? '')}
      typeColor={typeColor(dayTypeOf[hover.date])}
      avgPerDay={avgPerDay}
      catById={catById}
    />
  );
  const ring = (d: string) => `hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-ink-display ${d === today ? 'outline outline-1 -outline-offset-1 outline-accent-ink' : ''}`;

  const typeLegend = dayTypeConfig.filter((t) => dayTypeCounts[t.id]).map((t) => (
    <li key={t.id} className="flex items-center gap-1.5">
      <span aria-hidden className="w-2 h-2 shrink-0" style={{ backgroundColor: typeColor(t.id) }} />
      <span className="text-ink-body">{t.label}</span>
      <span className="font-mono tabular-nums">{dayTypeCounts[t.id]} วัน</span>
    </li>
  ));
  /** chips = ป้ายแบบปฏิทินเดือน (CALENDAR_HEAT_CHIP); ไม่งั้นสีพื้นแบบแถบหลายเดือน (HEAT_FILL) */
  const heatLegend = (chips: boolean) => [1, 2, 3, 4].map((level) => {
    return (
      <li key={level} className="flex items-center gap-1.5">
        <span aria-hidden className={`w-2 h-2 shrink-0 ${chips ? CALENDAR_HEAT_CHIP[level] : ''}`} style={chips ? undefined : { backgroundColor: HEAT_FILL[level] }} />
        <span className="font-mono tabular-nums">{level === 1 ? `< ${formatBahtShort(CALENDAR_HEAT_STEPS[0])}` : `${formatBahtShort(CALENDAR_HEAT_STEPS[level - 2])}+`}</span>
      </li>
    );
  });

  if (isSingleUnitPeriod(period)) {
    return (
      <Panel title="ปฏิทินการใช้จ่าย" icon={CalendarDays}>
        <div role="grid" aria-label="รายจ่ายรายวัน" className="px-4 py-2">
          <div role="row" className="grid grid-cols-7 pb-1 text-[11px] font-bold text-ink-muted">
            {WEEKDAYS.map((w, i) => <span key={w} role="columnheader" className={`px-1 ${weekendCls(i)}`}>{w}</span>)}
          </div>
          <div className="flex flex-col gap-px bg-line border border-line" {...hoverProps}>
            {weeks.map((week) => (
              <div key={week.find(Boolean)} role="row" className="grid grid-cols-7 gap-px">
                {week.map((d, i) => {
                  if (!d) return <span key={i} role="gridcell" className="h-11 bg-canvas" />;
                  const amt = dailyExpenses[d] ?? 0;
                  const level = getCalendarHeatLevel(amt);
                  const isToday = d === today;
                  return (
                    <span
                      key={d}
                      role="gridcell"
                      data-day={d}
                      aria-label={describe(d)}
                      aria-current={isToday ? 'date' : undefined}
                      className={`relative h-11 flex flex-col justify-between px-1 pt-0.5 pb-1 bg-surface cursor-default ${ring(d)}`}
                      style={level >= 2 ? { backgroundImage: `linear-gradient(${CALENDAR_HEAT_COLORS[level]}, ${CALENDAR_HEAT_COLORS[level]})` } : undefined}
                    >
                      <span className={`text-[11px] ${isToday ? 'font-bold text-ink-display' : 'text-ink-muted'}`}>{Number(d.slice(8))}</span>
                      {amt > 0 && (
                        <span className={`self-end max-w-full overflow-x-clip px-0.5 font-mono tabular-nums text-[11px] leading-tight ${CALENDAR_HEAT_CHIP[level]} ${d > today ? 'opacity-60' : ''}`}>
                          {formatBahtShort(Math.round(amt))}
                        </span>
                      )}
                      <span aria-hidden data-day-type className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: typeColor(dayTypeOf[d]) }} />
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t border-line text-[11px] text-ink-muted">{typeLegend}</ul>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-[11px] text-ink-muted">
          {heatLegend(true)}
          <li>เส้นล่าง = ประเภทวัน · จาง = ลงล่วงหน้า</li>
        </ul>
        {card}
      </Panel>
    );
  }

  // หลายเดือน: คอลัมน์ละสัปดาห์ ป้ายเดือนที่สัปดาห์แรกของเดือน
  const monthLabels = weeks.map((week, i) => {
    const month = week.find(Boolean)!.slice(0, 7);
    const prev = i > 0 ? weeks[i - 1].find(Boolean)!.slice(0, 7) : '';
    return month !== prev ? THAI_MONTHS_SHORT[Number(month.slice(5)) - 1] : '';
  });
  return (
    <Panel
      title="ปฏิทินการใช้จ่าย"
      icon={CalendarDays}
      action={<button onClick={() => setByType((v) => !v)} aria-pressed={byType} className={toggleCls(byType)}><Shapes className="w-3 h-3" />ประเภทวัน</button>}
    >
      <div className="flex gap-px px-4 py-3 overflow-x-auto" {...hoverProps}>
        <div className="flex flex-col gap-px pt-4 pr-1 shrink-0 text-[11px] leading-3 text-ink-muted">
          {WEEKDAYS.map((w, i) => <span key={w} className={`h-3 ${weekendCls(i)}`}>{i % 2 ? w : ''}</span>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={week.find(Boolean)} className="flex flex-col gap-px shrink-0">
            <span className="h-4 w-3 whitespace-nowrap text-[11px] leading-3 text-ink-muted">{monthLabels[wi]}</span>
            {week.map((d, i) => {
              if (!d) return <span key={i} className="w-3 h-3" />;
              return (
                <span
                  key={d}
                  data-day={d}
                  role="img"
                  aria-label={describe(d)}
                  className={`w-3 h-3 ${ring(d)} ${d > today ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: byType ? typeColor(dayTypeOf[d]) : HEAT_FILL[getCalendarHeatLevel(dailyExpenses[d] ?? 0)] }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t border-line text-[11px] text-ink-muted">
        {byType ? typeLegend : heatLegend(false)}
        <li>จาง = ลงล่วงหน้า · ชี้ที่ช่องเพื่อดูรายละเอียด</li>
      </ul>
      {card}
    </Panel>
  );
});

export default SpendingCalendar;
