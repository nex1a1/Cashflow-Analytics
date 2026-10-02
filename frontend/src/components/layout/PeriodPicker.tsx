import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X, CalendarDays, ListChecks, LayoutGrid, CalendarRange, CalendarCheck, Check, Zap } from 'lucide-react';
import { getFilterLabel, getThaiMonth, THAI_MONTHS_SHORT } from '../../utils/formatters';
import { GroupedOptions } from '../../types';
import { CYCLE_PREFIX, isCyclePeriod, stripCycle, convertPeriodMode, toCycleKey, shiftMonth, localTodayIso, cycleRangeLabel, cycleSpanLabel, CYCLE_PRESETS, cyclePresetRange, matchCyclePreset } from '../../utils/payCycle';

export interface PeriodPickerProps {
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  groupedOptions: GroupedOptions;
  /** show the ปฏิทิน / รอบเงินเดือน switch (off for Export, which is always calendar) */
  allowCycle?: boolean;
  /** for a trigger inside a clipping panel (overflow auto/hidden, e.g. Export sidebar): the 380px dropdown goes `fixed` at its in-flow spot (under the trigger's left edge) so the panel can't cut it off */
  floating?: boolean;
}

type CalMode = 'standard' | 'range' | 'multi';

const CAL_MODES: { id: CalMode; icon: React.ElementType; label: string; title: string }[] = [
  { id: 'standard', icon: LayoutGrid,    label: 'เดี่ยว',    title: 'เลือก 1 เดือน, ไตรมาส, หรือปี' },
  { id: 'range',    icon: CalendarRange, label: 'ช่วงเวลา',  title: 'เลือกช่วงเดือนต่อเนื่อง' },
  { id: 'multi',    icon: ListChecks,    label: 'หลายเดือน', title: 'เลือกหลายเดือนแบบอิสระ ไม่ต้องต่อเนื่อง' },
];

export default function PeriodPicker({ filterPeriod: rawPeriod, setFilterPeriod: setRawPeriod, groupedOptions: calendarOptions, allowCycle = false, floating = false }: PeriodPickerProps) {
  // โหมดรอบ: ข้างในทำงานกับ period แบบไม่มี "cycle:" เหมือนเดิมทั้งหมด แล้วเติม prefix ตอนส่งออก
  const isCycle = isCyclePeriod(rawPeriod);
  const filterPeriod = stripCycle(rawPeriod);
  const setFilterPeriod = useCallback(
    (val: string) => setRawPeriod(isCycle ? CYCLE_PREFIX + val : val),
    [isCycle, setRawPeriod],
  );

  // รอบที่มีข้อมูล: เดือน M ที่มีรายการ → รอบ M (25 ขึ้นไป) และรอบ M−1 (1–24)
  const groupedOptions: GroupedOptions = useMemo(() => {
    if (!isCycle) return calendarOptions;
    const keys = new Set<string>();
    Object.values(calendarOptions?.yearsMap || {}).forEach(({ months }) =>
      months.forEach((m: string) => { keys.add(m); keys.add(shiftMonth(m, -1)); }),
    );
    const yearsMap: GroupedOptions['yearsMap'] = {};
    keys.forEach((k) => {
      const y = k.slice(0, 4);
      if (!yearsMap[y]) yearsMap[y] = { months: new Set(), quarters: new Set(), halves: new Set() };
      yearsMap[y].months.add(k);
    });
    return { yearsMap, sortedYears: Object.keys(yearsMap).sort((a, b) => b.localeCompare(a)) };
  }, [isCycle, calendarOptions]);

  const [open, setOpen] = useState<boolean>(false);
  // Multi-expand: Set of expanded year keys (range / multi allow several open at once)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Both modes share one picker: เดี่ยว / ช่วงเวลา (start → end) / หลายเดือน|หลายรอบ
  const [picked, setPicked] = useState<string[]>([]);
  const [calMode, setCalMode] = useState<CalMode>('standard');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement | null>(null);

  const { currentMonth, lastMonth, currentYear } = useMemo(() => {
    const today = localTodayIso();
    const cm = isCycle ? toCycleKey(today) : today.slice(0, 7);
    return { currentMonth: cm, lastMonth: shiftMonth(cm, -1), currentYear: cm.slice(0, 4) };
  }, [isCycle]);
  const unitWord = isCycle ? 'รอบ' : 'เดือน';
  // ปี/H/Q ในโหมดรอบเป็น range ธรรมดา แต่ถือเป็นตัวเลือก "เดี่ยว"
  const isCyclePreset = isCycle && !!matchCyclePreset(filterPeriod);
  const yearValue = isCycle ? cyclePresetRange(currentYear, 1, 12) : currentYear;

  // Click outside / Esc to close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // fixed dropdown doesn't follow its scrolling parent → close on any scroll outside the picker
    const onScroll = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    if (floating) window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true); };
  }, [open, floating]);

  // On open: a range reopens in ช่วงเวลา, a list in หลายเดือน (cycle year/H/Q presets stay in เดี่ยว)
  useEffect(() => {
    if (!open) return;
    const list = filterPeriod?.includes(',') ? filterPeriod.split(',') : [];
    const [rs, re] = filterPeriod?.includes('_') && !isCyclePreset ? filterPeriod.split('_') : [null, null];
    setPicked(list);
    setCalMode(rs ? 'range' : list.length ? 'multi' : 'standard');
    setRangeStart(rs);
    setRangeEnd(re);

    const years = new Set([...list, rs, re].filter(Boolean).map(m => m!.slice(0, 4)));
    if (years.size === 0) {
      const year = filterPeriod?.slice(0, 4);
      const fallback = year && groupedOptions?.yearsMap?.[year] ? year : groupedOptions?.sortedYears?.[0];
      if (fallback) years.add(fallback);
    }
    setExpandedYears(years);
  }, [open, filterPeriod, groupedOptions, isCyclePreset]);

  const select = (val: string) => {
    setFilterPeriod(val);
    setOpen(false);
  };

  // Stepper: only meaningful when filterPeriod is a plain YYYY-MM.
  const isSingleMonth = /^\d{4}-\d{2}$/.test(filterPeriod);
  const stepMonth = useCallback((delta: number) => {
    if (/^\d{4}-\d{2}$/.test(filterPeriod)) setFilterPeriod(shiftMonth(filterPeriod, delta));
  }, [filterPeriod, setFilterPeriod]);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(calMode !== 'standard' ? prev : []);
      if (prev.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  const changeCalMode = (m: CalMode) => {
    if (m === calMode) return;
    setCalMode(m);
    setRangeStart(null);
    setRangeEnd(null);
    setPicked([]);
  };
  const handleCalMonthClick = (m: string) => {
    if (calMode === 'standard') { select(m); return; }
    if (calMode === 'range') {
      if (!rangeStart || rangeEnd) { setRangeStart(m); setRangeEnd(null); }
      else { const [s, e] = [rangeStart, m].sort(); setRangeStart(s); setRangeEnd(e); }
      return;
    }
    setPicked(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  };
  const confirmRange = () => { if (rangeStart && rangeEnd) select(rangeStart === rangeEnd ? rangeStart : `${rangeStart}_${rangeEnd}`); };
  const confirmList = () => {
    if (picked.length) select(picked.length === 1 ? picked[0] : [...picked].sort().join(','));
  };

  const hasCurrentMonth = !!groupedOptions?.yearsMap?.[currentYear]?.months?.has(currentMonth);
  const hasLastMonth = !!groupedOptions?.yearsMap?.[lastMonth.split('-')[0]]?.months?.has(lastMonth);
  const hasCurrentYear = !!groupedOptions?.yearsMap?.[currentYear];

  // label of any period in the current mode ("ต.ค. 2026" / "รอบ ต.ค. 2026 (25 ก.ย. – 24 ต.ค.)")
  const label = (p: string) => getFilterLabel((isCycle ? CYCLE_PREFIX : '') + p);
  const unitText = (s: string) => s.replace(/เดือน/g, unitWord);

  // Year / H / Q of one year: calendar keys (2026, 2026-Q1) or cycle ranges named by salary month
  const presetFor = (year: string, id: string, data: GroupedOptions['yearsMap'][string]) => {
    if (!isCycle) {
      const value = id === 'Y' ? year : `${year}-${id}`;
      return { value, has: id === 'Y' || data.halves.has(value) || data.quarters.has(value), title: undefined };
    }
    const p = CYCLE_PRESETS.find(x => x.id === id)!;
    const value = cyclePresetRange(year, p.from, p.to);
    const [s, e] = value.split('_');
    return { value, has: Array.from(data.months).some((m: string) => m >= s && m <= e), title: cycleSpanLabel(s, e) };
  };

  // ── Styling ────────────────────────────────────────────────────────────────
  const quick = (active: boolean) =>
    `flex-1 text-center text-[11px] font-medium px-1.5 py-1 border transition-colors ${
      active
        ? 'bg-accent/15 border-accent-ink text-ink-display font-bold'
        : 'border-line/70 bg-surface/80 text-ink-body hover:text-ink-display hover:bg-surface-elevated hover:border-line-strong'
    }`;

  // ── Body (both modes): mode tabs · ด่วน · ALL · year accordion · confirm footers ──
  const itemBase = 'w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 border';
  const itemIdle = 'border-line bg-surface text-ink-soft hover:text-ink-display hover:bg-surface-elevated hover:border-line-strong';
  const itemActive = 'border-accent-ink bg-accent/15 text-ink-display font-bold';
  const pillBase = 'text-[11px] py-1 px-1.5 font-medium border text-center';
  const pillIdle = 'border-line bg-surface text-ink-muted hover:text-ink-display hover:bg-surface-elevated hover:border-line-strong';
  const pillActive = 'border-accent-ink bg-accent text-on-accent font-bold';
  const pillRangeEdge = 'border-income bg-income text-on-accent font-bold';
  const pillRangeBetween = 'border-income/50 bg-income/20 text-income font-semibold';
  const pillMultiActive = 'border-warn bg-warn text-canvas font-bold';

  const calYearHasSelection = (year: string) => {
    if (calMode === 'multi') return picked.some(m => m.startsWith(`${year}-`));
    if (calMode === 'range') {
      if (!rangeStart) return false;
      return year >= rangeStart.slice(0, 4) && year <= (rangeEnd ?? rangeStart).slice(0, 4);
    }
    return filterPeriod?.startsWith(year) && filterPeriod !== 'ALL';
  };

  const body = (
    <>
      <div className="flex border-b border-line p-1.5 bg-surface gap-1.5">
        {CAL_MODES.map(({ id, icon: Icon, label, title }) => (
          <button
            key={id}
            onClick={() => changeCalMode(id)}
            title={unitText(title)}
            aria-pressed={calMode === id}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border text-[11px] font-semibold ${
              calMode === id
                ? 'bg-accent text-on-accent font-bold border-accent-ink'
                : 'text-ink-muted hover:text-ink-display bg-canvas hover:bg-surface-elevated border-line hover:border-line-strong'
            }`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {unitText(label)}
          </button>
        ))}
      </div>

      {calMode === 'standard' && (hasCurrentMonth || hasLastMonth || hasCurrentYear) && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-line bg-surface/50">
          <span className="flex items-center gap-1 text-[11px] text-ink-muted font-bold pr-1 shrink-0">
            <Zap className="w-3 h-3" />
            ด่วน
          </span>
          {hasCurrentMonth && <button onClick={() => select(currentMonth)} title={isCycle ? cycleSpanLabel(currentMonth) : undefined} className={quick(filterPeriod === currentMonth)}>{unitWord}นี้</button>}
          {hasLastMonth && <button onClick={() => select(lastMonth)} title={isCycle ? cycleSpanLabel(lastMonth) : undefined} className={quick(filterPeriod === lastMonth)}>{unitWord}ก่อน</button>}
          {hasCurrentYear && <button onClick={() => select(yearValue)} title={isCycle ? cycleSpanLabel(yearValue.slice(0, 7), yearValue.slice(-7)) : undefined} className={quick(filterPeriod === yearValue)}>ทั้งปี {currentYear}</button>}
        </div>
      )}

      {calMode === 'range' && (
        <div className="px-2.5 py-1.5 border-b border-income/20 bg-income/5 flex items-center gap-2 text-[11px] text-income">
          {[!rangeStart, !!rangeStart && !rangeEnd].map((on, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-income/70">→</span>}
              <span className={`inline-flex items-center justify-center w-4 h-4 font-bold border shrink-0 ${on ? 'bg-income border-income text-on-accent' : 'border-income/40'}`}>{i + 1}</span>
            </React.Fragment>
          ))}
          <span className="flex-1 truncate flex items-center gap-1">
            {!rangeStart ? `เลือก${unitWord}เริ่มต้น` : !rangeEnd ? `เลือก${unitWord}สิ้นสุด` : <><Check className="w-3 h-3" /> พร้อมยืนยัน</>}
          </span>
        </div>
      )}

      {calMode === 'multi' && picked.length === 0 && (
        <div className="px-2.5 py-1.5 border-b border-warn/20 bg-warn/5 text-[11px] text-warn">
          คลิก{unitWord}ใดก็ได้เพื่อเพิ่มเข้าการเลือก
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
        {calMode === 'standard' && (
          <div className="p-2 border-b border-line">
            <button onClick={() => select('ALL')} className={`${itemBase} ${filterPeriod === 'ALL' ? itemActive : itemIdle}`}>
              {filterPeriod === 'ALL' ? <Check className="w-3.5 h-3.5 shrink-0 text-accent-ink" /> : <span className="w-3.5 h-3.5 shrink-0" />}
              <span className="font-bold">ดูข้อมูลทั้งหมด</span>
            </button>
          </div>
        )}

        <div className="p-2 space-y-1">
          {groupedOptions?.sortedYears?.length === 0 ? (
            <div className="text-center py-4 text-xs text-ink-body">ยังไม่มีข้อมูล</div>
          ) : (
            groupedOptions?.sortedYears?.map(year => {
              const data = groupedOptions.yearsMap[year];
              const isExpanded = expandedYears.has(year);
              const months: string[] = Array.from(data.months).sort((a: string, b: string) => b.localeCompare(a));
              const dot = calMode === 'range' ? 'bg-income' : calMode === 'multi' ? 'bg-warn' : 'bg-accent';
              return (
                <div key={year} className="space-y-1">
                  <button
                    onClick={() => toggleYear(year)}
                    aria-expanded={isExpanded}
                    className="w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between font-bold text-ink-display bg-canvas border border-line hover:border-line-strong hover:bg-surface-elevated"
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? 'rotate-90 text-accent-ink' : 'text-ink-body'}`} />
                      <span className="tabular-nums">{year}</span>
                      {calYearHasSelection(year) && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
                    </span>
                    <span className="text-[11px] text-ink-muted font-normal tabular-nums">{data.months.size} {unitWord}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-1.5 pl-1.5 border-l space-y-1 mt-1 mb-1 border-line-strong">
                      {calMode === 'standard' && (() => {
                        const whole = presetFor(year, 'Y', data);
                        const presetRow = (ids: string[], cols: string) => {
                          const row = ids.map(id => ({ id, ...presetFor(year, id, data) }));
                          return row.some(p => p.has) && (
                            <div className={`grid ${cols} gap-1 px-0.5`}>
                              {row.map(p => p.has ? (
                                <button key={p.id} onClick={() => select(p.value)} title={p.title} className={`${pillBase} ${filterPeriod === p.value ? pillActive : pillIdle}`}>{p.id}</button>
                              ) : <span key={p.id} />)}
                            </div>
                          );
                        };
                        return (
                          <>
                            {whole.has && (
                              <button onClick={() => select(whole.value)} title={whole.title} className={`${itemBase} ${filterPeriod === whole.value ? itemActive : itemIdle}`}>
                                {filterPeriod === whole.value ? <Check className="w-3.5 h-3.5 shrink-0 text-accent-ink" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                                <span>ทั้งปี {year}</span>
                                {whole.title && <span className="ml-auto text-[11px] font-normal text-ink-muted tabular-nums">{whole.title}</span>}
                              </button>
                            )}
                            {presetRow(['H1', 'H2'], 'grid-cols-2')}
                            {presetRow(['Q1', 'Q2', 'Q3', 'Q4'], 'grid-cols-4')}
                          </>
                        );
                      })()}

                      <div className="grid grid-cols-3 gap-1 px-0.5 pt-0.5">
                        {months.map((m: string) => {
                          let cls = pillIdle;
                          if (calMode === 'range') {
                            if (m === rangeStart || m === rangeEnd) cls = pillRangeEdge;
                            else if (rangeStart && rangeEnd && m > rangeStart && m < rangeEnd) cls = pillRangeBetween;
                          } else if (calMode === 'multi') {
                            if (picked.includes(m)) cls = pillMultiActive;
                          } else if (filterPeriod === m) cls = pillActive;
                          return (
                            <button key={m} onClick={() => handleCalMonthClick(m)} title={isCycle ? cycleSpanLabel(m) : undefined} aria-pressed={calMode === 'multi' ? picked.includes(m) : undefined} className={`${pillBase} ${cls}`}>
                              {THAI_MONTHS_SHORT[Number.parseInt(m.split('-')[1], 10) - 1]}
                              {isCycle && <span className={`block font-normal tabular-nums whitespace-nowrap ${cls === pillIdle ? 'text-ink-muted' : ''}`}>{cycleRangeLabel(m)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {calMode === 'range' && (
        <div className="p-1.5 border-t border-line bg-surface flex flex-col gap-1.5">
          <div className="py-1 px-2 border border-income/30 bg-income/10 text-income flex items-center justify-between min-h-[28px]">
            <p className="text-[11px] font-bold flex-1">
              {rangeStart && rangeEnd
                ? (isCycle ? cycleSpanLabel(rangeStart, rangeEnd) : `${getThaiMonth(rangeStart)} — ${getThaiMonth(rangeEnd)}`)
                : rangeStart
                ? `จาก: ${label(rangeStart)} → เลือก${unitWord}สิ้นสุด`
                : unitText('คลิกเดือนเริ่มต้น จากนั้นเลือกเดือนสิ้นสุด')}
            </p>
            {rangeStart && (
              <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} aria-label="ล้างช่วงเวลา" className="text-ink-muted hover:text-danger shrink-0 ml-1">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={confirmRange}
            disabled={!rangeStart || !rangeEnd}
            className="w-full py-1 text-[11px] font-bold bg-income text-on-accent hover:bg-income/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {rangeStart && rangeEnd ? 'ยืนยันช่วงเวลานี้' : 'รอเลือกช่วงเวลา...'}
          </button>
        </div>
      )}

      {calMode === 'multi' && (
        <div className="p-1.5 border-t border-line bg-surface flex flex-col gap-1.5">
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5 custom-scrollbar">
              {[...picked].sort().map(m => (
                <span key={m} className="flex items-center gap-1 px-1 py-0.5 rounded-pill border border-warn/50 bg-warn/15 text-warn text-[11px]">
                  {THAI_MONTHS_SHORT[Number.parseInt(m.split('-')[1], 10) - 1]} {m.slice(2, 4)}
                  <button onClick={() => setPicked(prev => prev.filter(x => x !== m))} aria-label={`เอา ${label(m)} ออก`} className="hover:text-danger ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => setPicked([])}
              disabled={picked.length === 0}
              className="px-2 py-0.5 rounded-pill text-[11px] font-medium bg-canvas border border-line text-ink-soft hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ล้าง
            </button>
            <button
              onClick={confirmList}
              disabled={picked.length === 0}
              className="flex-1 py-0.5 text-[11px] font-bold bg-warn text-canvas hover:bg-warn/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {picked.length > 0 ? `ยืนยันการเลือก (${picked.length})` : `เลือก${unitWord}ที่ต้องการ`}
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger: [today] ‹ period › ── */}
      <div className="flex items-center gap-1.5">
      <button
        onClick={() => setFilterPeriod(currentMonth)}
        disabled={filterPeriod === currentMonth}
        aria-label={`ไป${unitWord}ปัจจุบัน`}
        title={`ไป${unitWord}ปัจจุบัน`}
        className="p-1.5 border border-line-strong bg-surface text-ink-soft hover:border-accent-ink hover:text-ink-display disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-line-strong disabled:hover:text-ink-soft shrink-0"
      >
        <CalendarCheck className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center border border-line-strong bg-surface shrink-0">
        <button
          onClick={() => stepMonth(-1)}
          disabled={!isSingleMonth}
          aria-label={`${unitWord}ก่อนหน้า`}
          title={`${unitWord}ก่อนหน้า`}
          className="p-1.5 text-ink-soft hover:bg-surface-hover hover:text-ink-display disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="w-[1px] h-5 bg-surface-elevated shrink-0" />
        <button
          onClick={() => setOpen(o => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex items-center gap-2 px-3 py-1.5 text-ink-display text-xs font-bold min-w-[170px]"
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-accent-ink" />
          <span className="flex-1 text-left truncate">{getFilterLabel(rawPeriod)}</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
        <span className="w-[1px] h-5 bg-surface-elevated shrink-0" />
        <button
          onClick={() => stepMonth(1)}
          disabled={!isSingleMonth}
          aria-label={`${unitWord}ถัดไป`}
          title={`${unitWord}ถัดไป`}
          className="p-1.5 text-ink-soft hover:bg-surface-hover hover:text-ink-display disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงเวลา"
          className={`${floating ? 'fixed' : 'absolute right-0 top-full'} mt-1 w-[380px] bg-canvas border border-line-strong shadow-[0_8px_24px_rgb(0_0_0/calc(0.45*var(--shadow-k)))] z-50 overflow-hidden`}
        >
          {/* ── Calendar / Pay-cycle switch ── */}
          {allowCycle && (
            <div className="flex border-b border-line">
              {([
                [false, 'เดือนปฏิทิน', 'วันที่ 1 ถึงสิ้นเดือน'],
                [true, 'รอบเงินเดือน 25–24', '1 รอบ = วันที่ 25 (เงินเดือนเข้า) ถึงวันที่ 24 ของเดือนถัดไป · ชื่อรอบตามเดือนที่เงินเดือนเข้า'],
              ] as const).map(([cycle, label, hint]) => (
                <button
                  key={label}
                  title={hint}
                  aria-pressed={cycle === isCycle}
                  onClick={() => { if (cycle !== isCycle) setRawPeriod(convertPeriodMode(rawPeriod, cycle)); }}
                  className={`flex-1 py-2 text-[11px] font-bold border-b-2 -mb-px ${
                    cycle === isCycle ? 'border-b-accent-ink text-ink-display bg-surface' : 'border-b-transparent text-ink-muted hover:text-ink-display'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {body}
        </div>
      )}
    </div>
  );
}
