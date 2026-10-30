import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarArrowUp, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { formatThaiDateShort, getThaiDayInfo, THAI_MONTHS, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { DAY_LABELS, MIN_YEAR, MAX_YEAR } from '@/utils/datePickerHelpers';
import { parseDateMove, applyDateMove, DateMove } from '@/utils/moveDate';
import useToday from '@/hooks/useToday';

interface MoveDateEditorProps {
  /** the clicked row's date: the starting value and the date a preview is shown for */
  fromDate: string;
  /** rows that move together (1 = just this row) */
  count: number;
  onSubmit: (move: DateMove) => void;
  onCancel: () => void;
}

const SIGNED = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
const pad = (n: number) => String(n).padStart(2, '0');
const ym = (iso: string) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 });
const WIDTH = 272;

function describe(move: DateMove, fromDate: string, count: number): string {
  if (count === 1 || move.kind === 'set') {
    const to = applyDateMove(move, fromDate);
    const day = getThaiDayInfo(to)?.label ?? '';
    return `→ ${day ? `${day} ` : ''}${formatThaiDateShort(to)}`;
  }
  if (move.kind === 'day') return `→ วันที่ ${move.day} ของเดือนเดิมแต่ละรายการ`;
  return move.months ? `เลื่อน ${SIGNED(move.months)} เดือน` : `เลื่อน ${SIGNED(move.days)} วัน`;
}

/**
 * Popover under the Ledger date cell: type a date (2026-11-03 · 3/11/2569), a day of the row's month (25)
 * or a shift (+1 · −3d · +1m), or click a day in the calendar (moves at once). The month title opens a
 * 12-month grid with year arrows, so a move many months away is two clicks. ↑/↓ = ±1 day, Shift = ±1 month.
 * Enter moves, Esc / focus leaving the popover cancels — nothing is saved on blur.
 * It is portalled to <body> (the sticky date cell is a stacking context the page header would cover)
 * inside a `.dark-mode` wrapper so the theme's scoped rules still apply, and placed `fixed` next to its cell.
 */
export default function MoveDateEditor({ fromDate, count, onSubmit, onCancel }: MoveDateEditorProps) {
  const [text, setText] = useState(fromDate);
  const [view, setView] = useState(() => ym(fromDate));
  const [monthGrid, setMonthGrid] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const today = useToday();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const move = parseDateMove(text);
  const unchanged = move?.kind === 'set' && move.date === fromDate && count === 1;
  const target = move ? applyDateMove(move, fromDate) : null;

  // place next to the cell; flip above when there is no room below
  useLayoutEffect(() => {
    const place = () => {
      const box = boxRef.current;
      const cell = anchorRef.current?.closest('td') ?? anchorRef.current?.parentElement;
      if (!box || !cell) return;
      const r = cell.getBoundingClientRect();
      const h = box.offsetHeight;
      const below = r.bottom + 4;
      const top = below + h > window.innerHeight - 8 && r.top - h - 4 > 8 ? r.top - h - 4 : Math.min(below, window.innerHeight - h - 8);
      setPos({ left: Math.min(r.left + 8, window.innerWidth - WIDTH - 8), top: Math.max(8, top) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [monthGrid]);

  // typed / stepped dates bring the calendar along
  const changeText = (next: string) => {
    setText(next);
    const m = parseDateMove(next);
    if (m) { setView(ym(applyDateMove(m, fromDate))); setMonthGrid(false); }
  };

  const step = (delta: { days?: number; months?: number }) => {
    const base = target ?? fromDate;
    changeText(applyDateMove({ kind: 'shift', days: delta.days ?? 0, months: delta.months ?? 0 }, base));
  };

  const stepView = (months: number) => {
    const t = view.y * 12 + view.m + months;
    const y = Math.floor(t / 12);
    if (y < MIN_YEAR || y > MAX_YEAR) return;
    setView({ y, m: t - y * 12 });
  };

  const pickDay = (iso: string) => {
    if (iso === fromDate && count === 1) { onCancel(); return; }
    onSubmit({ kind: 'set', date: iso });
  };

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const shown = hoverDate ? { kind: 'set' as const, date: hoverDate } : move;
  const from = ym(fromDate);
  const navBtn = 'p-1 rounded-none text-ink-body hover:text-ink-display hover:bg-surface-hover disabled:opacity-20';

  return (<>
    <span ref={anchorRef} hidden />
    {createPortal(<div className="dark-mode"><div
      ref={boxRef}
      role="dialog"
      aria-label={count > 1 ? `ย้ายวันที่ ${count} รายการ` : 'ย้ายวันที่'}
      style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: WIDTH }}
      className="z-90 bg-surface-elevated border border-line shadow-lg p-2 flex flex-col gap-1.5 text-left whitespace-normal"
      // keep focus in the input while clicking the calendar (focus leaving the popover cancels)
      onMouseDown={e => { e.stopPropagation(); if (!(e.target as HTMLElement).closest('input')) e.preventDefault(); }}
      onClick={e => e.stopPropagation()}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onCancel(); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
      }}
    >
      <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-ink-body">
        <span className="flex items-center gap-1.5">
          <CalendarArrowUp className="w-3.5 h-3.5 text-accent-ink" />
          {count > 1 ? `ย้าย ${count} รายการ` : 'ย้ายไปวันที่'}
        </span>
        <span className="font-bold text-ink-muted tabular-nums">เดิม {formatThaiDateShort(fromDate)}</span>
      </div>
      <input
        autoFocus
        value={text}
        onFocus={e => e.currentTarget.select()}
        onChange={e => changeText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (move && !unchanged) onSubmit(move);
            else if (unchanged) onCancel();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const n = e.key === 'ArrowUp' ? 1 : -1;
            step(e.shiftKey ? { months: n } : { days: n });
          }
        }}
        aria-invalid={!move}
        aria-describedby="move-date-hint"
        className="w-full bg-canvas border border-line text-xs font-mono tabular-nums text-ink-display px-2 py-1"
      />
      <div id="move-date-hint" className="text-[11px] leading-snug min-h-[16px]">
        {shown ? (
          <span className="font-bold text-ink-display tabular-nums">{describe(shown, fromDate, hoverDate ? 1 : count)}</span>
        ) : (
          <span className="text-ink-muted">พิมพ์วันที่ · 25 · +1 · −3d · +1m</span>
        )}
      </div>

      {/* Calendar: ‹ month › — the title opens the 12-month grid for long jumps */}
      <div className="border-t border-line pt-1.5">
        <div className="flex items-center justify-between mb-1">
          <button type="button" tabIndex={-1} className={navBtn} onClick={() => stepView(monthGrid ? -12 : -1)}
            disabled={monthGrid ? view.y <= MIN_YEAR : view.y <= MIN_YEAR && view.m === 0}
            aria-label={monthGrid ? 'ปีก่อนหน้า' : 'เดือนก่อนหน้า'}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" tabIndex={-1} onClick={() => setMonthGrid(g => !g)} aria-expanded={monthGrid}
            title={monthGrid ? 'กลับไปเลือกวัน' : 'เลือกเดือน / ปี'}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-ink-display hover:bg-surface-hover hover:text-accent-ink rounded-none">
            {monthGrid ? view.y : `${THAI_MONTHS[view.m]} ${view.y}`}
            <ChevronDown className={`w-3 h-3 transition-transform ${monthGrid ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" tabIndex={-1} className={navBtn} onClick={() => stepView(monthGrid ? 12 : 1)}
            disabled={monthGrid ? view.y >= MAX_YEAR : view.y >= MAX_YEAR && view.m === 11}
            aria-label={monthGrid ? 'ปีถัดไป' : 'เดือนถัดไป'}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {monthGrid ? (
          <div className="grid grid-cols-4 gap-px bg-line border border-line m-reveal">
            {THAI_MONTHS_SHORT.map((label, i) => {
              const isTarget = target !== null && ym(target).y === view.y && ym(target).m === i;
              const isFrom = from.y === view.y && from.m === i;
              return (
                <button key={label} type="button" tabIndex={-1}
                  onClick={() => { setView({ y: view.y, m: i }); setMonthGrid(false); }}
                  className={`relative h-8 text-xs font-bold rounded-none ${isTarget ? 'bg-accent text-on-accent' : 'bg-surface text-ink-body hover:bg-surface-hover hover:text-ink-display'}`}>
                  {label}
                  {isFrom && !isTarget && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ink-muted" title="เดือนเดิม" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div onMouseLeave={() => setHoverDate(null)}>
            <div className="grid grid-cols-7">
              {DAY_LABELS.map((l, i) => (
                <div key={l} className={`text-center text-[11px] font-bold py-0.5 ${i === 0 || i === 6 ? 'text-weekend' : 'text-ink-muted'}`}>{l}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-px">
              {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const iso = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
                const dow = (firstDow + i) % 7;
                const isTarget = iso === target;
                const isFrom = iso === fromDate;
                const cls = isTarget
                  ? 'bg-accent text-on-accent font-black'
                  : isFrom
                    ? 'ring-1 ring-inset ring-line-strong text-ink-display'
                    : iso === today
                      ? 'ring-1 ring-inset ring-accent-ink text-ink-display'
                      : dow === 0 || dow === 6 ? 'text-weekend font-bold' : 'text-ink-body';
                return (
                  <button key={iso} type="button" tabIndex={-1} data-day={iso}
                    onMouseEnter={() => setHoverDate(iso)}
                    onClick={() => pickDay(iso)}
                    title={isFrom ? 'วันเดิม' : `ย้ายไป ${formatThaiDateShort(iso)}`}
                    className={`h-7 text-xs tabular-nums rounded-none ${cls} ${isTarget ? '' : 'hover:bg-accent/25 hover:text-ink-display'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-ink-muted border-t border-line pt-1">
        คลิกวัน / Enter = ย้าย · Esc ยกเลิก · ↑↓ ทีละวัน
      </div>
    </div></div>, document.body)}
  </>);
}
