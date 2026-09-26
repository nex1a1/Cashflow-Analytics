import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X, CalendarDays, ListChecks } from 'lucide-react';
import { getFilterLabel, THAI_MONTHS_SHORT } from '../../utils/formatters';
import { GroupedOptions } from '../../types';
import { CYCLE_PREFIX, isCyclePeriod, stripCycle, convertPeriodMode, toCycleKey, shiftMonth, localTodayIso, cycleRangeLabel, cycleSpanLabel, CYCLE_PRESETS, cyclePresetRange, matchCyclePreset, monthsBetween, monthsToPeriod } from '../../utils/payCycle';

export interface PeriodPickerProps {
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  groupedOptions: GroupedOptions;
  /** show the ปฏิทิน / รอบเงินเดือน switch (off for Export, which is always calendar) */
  allowCycle?: boolean;
  /** which edge the 620px dropdown anchors to (left when the trigger sits near the left edge, e.g. Export sidebar) */
  align?: 'left' | 'right';
}

export default function PeriodPicker({ filterPeriod: rawPeriod, setFilterPeriod: setRawPeriod, groupedOptions: calendarOptions, allowCycle = false, align = 'right' }: PeriodPickerProps) {
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
  // Multi-expand: Set of expanded year keys (multi-select allows several open at once)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Two modes only: click-to-pick one period, or multi-select (Shift+click fills a span).
  // Contiguous multi picks save as a range (A_B), scattered ones as a list (A,B,C).
  const [multi, setMulti] = useState<boolean>(false);
  const [picked, setPicked] = useState<string[]>([]);
  const lastPicked = useRef<string | null>(null);

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
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  // On open: a range / list period reopens in multi-select with its months ticked
  useEffect(() => {
    if (!open) return;
    let months: string[] = [];
    if (filterPeriod?.includes('_') && !isCyclePreset) {
      const [s, e] = filterPeriod.split('_');
      months = monthsBetween(s, e);
    } else if (filterPeriod?.includes(',')) {
      months = filterPeriod.split(',');
    }
    setMulti(months.length > 0);
    setPicked(months);
    lastPicked.current = null;

    const years = new Set(months.map(m => m.slice(0, 4)));
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
      const next = new Set(multi ? prev : []);
      if (prev.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  const handleMonthClick = (m: string, e: React.MouseEvent) => {
    if (!multi) { select(m); return; }
    if (e.shiftKey && lastPicked.current) {
      const span = monthsBetween(lastPicked.current, m);
      setPicked(prev => [...new Set([...prev, ...span])]);
    } else {
      setPicked(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
    }
    lastPicked.current = m;
  };

  const exitMulti = () => { setMulti(false); setPicked([]); lastPicked.current = null; };
  const confirmMulti = () => { if (picked.length) select(monthsToPeriod(picked)); };

  const hasCurrentMonth = !!groupedOptions?.yearsMap?.[currentYear]?.months?.has(currentMonth);
  const hasLastMonth = !!groupedOptions?.yearsMap?.[lastMonth.split('-')[0]]?.months?.has(lastMonth);
  const hasCurrentYear = !!groupedOptions?.yearsMap?.[currentYear];

  // ── Styling ────────────────────────────────────────────────────────────────
  const subAggregateBase = 'text-[11px] px-2 py-0.5 font-medium border transition-colors';
  const subAggregateIdle = 'border-line/60 bg-surface/60 text-ink-muted hover:text-ink-display hover:bg-surface-elevated hover:border-line-strong';
  const subAggregateActive = 'border-accent bg-accent text-on-accent font-bold';

  const monthBase = 'text-xs py-1.5 px-2 font-semibold border text-center transition-colors';
  const monthIdle = 'border-line bg-surface text-ink-display hover:bg-surface-elevated hover:border-line-strong';
  const monthActive = 'border-accent bg-accent text-on-accent font-bold shadow-sm';

  const quick = (active: boolean) =>
    `flex-1 text-center text-[11px] font-medium px-1.5 py-1 border transition-colors ${
      active
        ? 'bg-accent/15 border-accent text-ink-display font-bold'
        : 'border-line/70 bg-surface/80 text-ink-body hover:text-ink-display hover:bg-surface-elevated hover:border-line-strong'
    }`;

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger: ‹ period › ── */}
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
          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-accent" />
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

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงเวลา"
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-1 w-[380px] bg-canvas border border-line-strong shadow-[0_8px_24px_rgba(0,0,0,0.45)] z-50 overflow-hidden`}
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
                    cycle === isCycle ? 'border-b-accent text-ink-display bg-surface' : 'border-b-transparent text-ink-muted hover:text-ink-display'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Quick picks ── */}
          {!multi && (
            <div className="flex items-stretch gap-1.5 p-2 border-b border-line bg-surface/50">
              {hasCurrentMonth && (
                <button onClick={() => select(currentMonth)} className={quick(filterPeriod === currentMonth)}>
                  {unitWord}นี้{isCycle && <span className="block font-normal text-ink-muted tabular-nums">{cycleRangeLabel(currentMonth)}</span>}
                </button>
              )}
              {hasLastMonth && (
                <button onClick={() => select(lastMonth)} className={quick(filterPeriod === lastMonth)}>
                  {unitWord}ก่อน{isCycle && <span className="block font-normal text-ink-muted tabular-nums">{cycleRangeLabel(lastMonth)}</span>}
                </button>
              )}
              {hasCurrentYear && (
                <button onClick={() => select(yearValue)} className={quick(filterPeriod === yearValue)}>
                  ทั้งปี {currentYear}
                </button>
              )}
              <button onClick={() => select('ALL')} className={quick(filterPeriod === 'ALL')}>
                ทั้งหมด
              </button>
            </div>
          )}

          {multi && (
            <div className="px-2.5 py-2 border-b border-line bg-surface text-[11px] text-ink-body">
              คลิกเพื่อเลือกทีละ{unitWord} · <span className="font-bold text-ink-soft">Shift+คลิก</span> เพื่อเลือกเป็นช่วง
            </div>
          )}

          {/* ── Year accordion ── */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-2 space-y-1">
            {groupedOptions?.sortedYears?.length === 0 ? (
              <div className="text-center py-4 text-xs text-ink-body">ยังไม่มีข้อมูล</div>
            ) : (
              groupedOptions?.sortedYears?.map(year => {
                const data = groupedOptions.yearsMap[year];
                const isExpanded = expandedYears.has(year);
                const hasSelection = multi
                  ? picked.some(m => m.startsWith(`${year}-`))
                  : filterPeriod?.startsWith(year) && filterPeriod !== 'ALL';
                const months: string[] = Array.from(data.months).sort((a: string, b: string) => b.localeCompare(a));
                const monthsArr = Array.from(data.months) as string[];

                // Cycle presets for this year
                const cyclePresets = isCycle
                  ? CYCLE_PRESETS.map((p) => {
                      const value = cyclePresetRange(year, p.from, p.to);
                      const [s, e] = value.split('_');
                      return { ...p, value, has: monthsArr.some((m) => m >= s && m <= e), title: cycleSpanLabel(s, e) };
                    })
                  : [];
                const [cycleYearPreset, ...cycleRestPresets] = cyclePresets;

                const wholeYearValue = isCycle ? (cycleYearPreset?.value || cyclePresetRange(year, 1, 12)) : year;
                const canSelectWholeYear = !isCycle || !!cycleYearPreset?.has;
                const isWholeYearSelected = filterPeriod === wholeYearValue;

                return (
                  <div key={year} className="space-y-1">
                    {/* Header: Toggle expand on left, Select Whole Year + Month count on right */}
                    <div className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold bg-canvas border border-line hover:border-line-strong transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        aria-expanded={isExpanded}
                        className="flex-1 flex items-center gap-1.5 text-left text-ink-display hover:text-accent py-0.5"
                      >
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90 text-accent' : 'text-ink-body'}`} />
                        <span className="tabular-nums">{year}</span>
                        {hasSelection && <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent" />}
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {!multi && canSelectWholeYear && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              select(wholeYearValue);
                            }}
                            title={isCycle && cycleYearPreset ? cycleYearPreset.title : `เลือกทั้งปี ${year}`}
                            className={`text-[11px] px-2 py-0.5 border font-semibold transition-colors ${
                              isWholeYearSelected
                                ? 'bg-accent text-on-accent border-accent'
                                : 'bg-surface text-ink-muted border-line hover:text-ink-display hover:border-line-strong hover:bg-surface-elevated'
                            }`}
                          >
                            ทั้งปี
                          </button>
                        )}
                        <span className="text-[11px] text-ink-muted font-normal tabular-nums">{data.months.size} {unitWord}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ml-1.5 pl-1.5 border-l space-y-1.5 mt-1 mb-1 border-line-strong">
                        {/* Half / Quarter aggregates — subtle secondary segments */}
                        {!multi && !isCycle && (() => {
                          const halves = ['H1', 'H2'].filter(k => data.halves.has(`${year}-${k}`));
                          const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].filter(k => data.quarters.has(`${year}-${k}`));
                          if (halves.length === 0 && quarters.length === 0) return null;

                          return (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface/40 border border-line/50 text-[11px]">
                              {halves.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-ink-muted font-medium pr-0.5">ครึ่งปี</span>
                                  {halves.map(k => {
                                    const key = `${year}-${k}`;
                                    const isSelected = filterPeriod === key;
                                    return (
                                      <button
                                        key={k}
                                        type="button"
                                        onClick={() => select(key)}
                                        className={`${subAggregateBase} ${isSelected ? subAggregateActive : subAggregateIdle}`}
                                      >
                                        {k}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {halves.length > 0 && quarters.length > 0 && (
                                <span className="w-[1px] h-3.5 bg-line-strong mx-0.5 shrink-0" />
                              )}

                              {quarters.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-ink-muted font-medium pr-0.5">ไตรมาส</span>
                                  {quarters.map(k => {
                                    const key = `${year}-${k}`;
                                    const isSelected = filterPeriod === key;
                                    return (
                                      <button
                                        key={k}
                                        type="button"
                                        onClick={() => select(key)}
                                        className={`${subAggregateBase} ${isSelected ? subAggregateActive : subAggregateIdle}`}
                                      >
                                        {k}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Year / half / quarter in cycle mode */}
                        {!multi && isCycle && (() => {
                          const halves = cycleRestPresets.filter(p => p.id.startsWith('H') && p.has);
                          const quarters = cycleRestPresets.filter(p => p.id.startsWith('Q') && p.has);
                          if (halves.length === 0 && quarters.length === 0) return null;

                          return (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface/40 border border-line/50 text-[11px]">
                              {halves.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-ink-muted font-medium pr-0.5">ครึ่งปี</span>
                                  {halves.map(p => {
                                    const isSelected = filterPeriod === p.value;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => select(p.value)}
                                        title={p.title}
                                        className={`${subAggregateBase} ${isSelected ? subAggregateActive : subAggregateIdle}`}
                                      >
                                        {p.id}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {halves.length > 0 && quarters.length > 0 && (
                                <span className="w-[1px] h-3.5 bg-line-strong mx-0.5 shrink-0" />
                              )}

                              {quarters.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-ink-muted font-medium pr-0.5">ไตรมาส</span>
                                  {quarters.map(p => {
                                    const isSelected = filterPeriod === p.value;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => select(p.value)}
                                        title={p.title}
                                        className={`${subAggregateBase} ${isSelected ? subAggregateActive : subAggregateIdle}`}
                                      >
                                        {p.id}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Months — Primary selection target */}
                        <div className={`grid ${isCycle ? 'grid-cols-1' : 'grid-cols-3'} gap-1 px-0.5`}>
                          {months.map((m: string) => {
                            const [, mo] = m.split('-');
                            const selected = multi ? picked.includes(m) : filterPeriod === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={(e) => handleMonthClick(m, e)}
                                aria-pressed={multi ? selected : undefined}
                                className={`${monthBase} ${selected ? monthActive : monthIdle} ${isCycle ? 'flex items-center gap-2 px-2 text-left' : ''}`}
                              >
                                {isCycle ? (
                                  <>
                                    <span className="w-14 text-left font-bold">รอบ {THAI_MONTHS_SHORT[Number.parseInt(mo, 10) - 1]}</span>
                                    <span className="flex-1 text-left tabular-nums text-[11px]">{cycleSpanLabel(m)}</span>
                                    {m === currentMonth && <span className="text-[11px] font-bold px-1.5 py-0.5 border border-current rounded-full">ปัจจุบัน</span>}
                                    {m > currentMonth && <span className="text-[11px] px-1 text-ink-muted">ยังไม่เริ่ม</span>}
                                  </>
                                ) : THAI_MONTHS_SHORT[Number.parseInt(mo, 10) - 1]}
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

          {/* ── Footer ── */}
          <div className="p-2 border-t border-line bg-surface flex items-center gap-1.5">
            {!multi ? (
              <button
                onClick={() => setMulti(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-ink-body hover:text-ink-display"
              >
                <ListChecks className="w-3.5 h-3.5" />
                เลือกหลาย{unitWord} / เป็นช่วง
              </button>
            ) : (
              <>
                <button
                  onClick={exitMulti}
                  aria-label="ยกเลิกการเลือกหลายรายการ"
                  title="ยกเลิก"
                  className="p-1.5 border border-line text-ink-body hover:text-ink-display hover:border-line-strong"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="flex-1 min-w-0 text-[11px] text-ink-body truncate">
                  {picked.length === 0
                    ? `ยังไม่ได้เลือก${unitWord}`
                    : getFilterLabel((isCycle ? CYCLE_PREFIX : '') + monthsToPeriod(picked))}
                </span>
                <button
                  onClick={confirmMulti}
                  disabled={picked.length === 0}
                  className="px-3 py-1 text-[11px] font-bold bg-accent text-on-accent hover:bg-accent-active disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {picked.length > 0 ? `ใช้ ${picked.length} ${unitWord}` : 'ใช้'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
