// src/views/Dashboard/components/SummaryCards/GhostPacer/GhostPacerChart.tsx
import { memo, useState } from 'react';
import { Ghost } from 'lucide-react';
import { formatBaht, formatBahtShort } from '@/utils/formatters';
import { tc } from '@/constants/theme';
import { paceTone, PACE_TONE_STYLE } from '@/utils/ghostPacerHelpers';
import {
  useSvgSize, linePath, MonoText, separateLabels, dayAtPointer, tooltipAt, DayGrid, DayAxis, TooltipDay, EdgeBadge, DayFrame,
} from '@/components/shared/svgChart';

interface GhostPacerChartProps {
  currentDay: number;
  lastDayOfMonth: number;
  currentDailySeries: number[];
  prevDailySeries: number[];
  benchmarkDailySeries: number[];
  projectedExpense: number;
  ghostTotalExpense: number;
  paceColor: string;
  currentPeriod: string;
  prevPeriod: string;
}

const VIEW_H = 202;
const PAD_L = 54;
const PAD_R = 156; // room for the end-of-month badges (BADGE_W + gap)
const BADGE_W = 146;
const PAD_T = 20;
const PAD_B = 26;
const TIP_W = 210;
const TIP_H = 68;

/** Value of a cumulative series on `day` (1-based); before the series starts it is 0, after it ends it holds `after`. */
const at = (series: number[], day: number, after: number) => series.length >= day ? series[day - 1] : after;
const last = (series: number[]) => series.length > 0 ? series[series.length - 1] : 0;
const hasSpend = (series: number[]) => series.some(v => v > 0);

export const GhostPacerChart = memo(({
  currentDay, lastDayOfMonth,
  currentDailySeries, prevDailySeries, benchmarkDailySeries,
  projectedExpense, ghostTotalExpense,
  paceColor, currentPeriod, prevPeriod,
}: GhostPacerChartProps) => {
  const [containerRef, { w: viewW }] = useSvgSize(800);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const plotW = Math.max(10, viewW - PAD_L - PAD_R);
  const plotH = Math.max(10, VIEW_H - PAD_T - PAD_B);
  const baseY = PAD_T + plotH;

  const totalDays = Math.max(1, lastDayOfMonth);
  const today = Math.max(1, Math.min(currentDay, totalDays));
  const atToday = (s: number[]) => s.length > 0 ? s[Math.min(today, s.length) - 1] : 0;

  const spentToDate = atToday(currentDailySeries);
  const ghostSpentToDate = atToday(prevDailySeries);
  const ghostFinal = ghostTotalExpense || last(prevDailySeries);

  // Scale covers current spend, the projection, last month and the benchmark
  const maxBenchmark = benchmarkDailySeries.length > 0 ? Math.max(...benchmarkDailySeries) : 0;
  const maxY = Math.max(1, spentToDate, projectedExpense, ghostFinal, maxBenchmark) * 1.12;

  const getX = (day: number) => PAD_L + Math.max(0, Math.min(1, day / totalDays)) * plotW;
  const getY = (val: number) => baseY - Math.max(0, Math.min(1, val / maxY)) * plotH;
  const frame: DayFrame = { viewW, padL: PAD_L, padT: PAD_T, plotW, baseY, totalDays, getX };
  const seriesPath = (s: number[]) => linePath([[getX(0), getY(0)], ...s.map((v, i) => [getX(i + 1), getY(v)] as const)]);

  const currentPath = seriesPath(currentDailySeries);
  const xToday = getX(today);
  const yToday = getY(spentToDate);
  const xEOM = getX(totalDays);
  const yEOM = getY(projectedExpense);

  // End-of-month badges: push apart when they would overlap
  const [ghostEomY, curEomY] = separateLabels(getY(ghostFinal), yEOM, PAD_T + 2, VIEW_H - PAD_B + 2);

  // Hover: past days read the series, future days follow the projection line from today to month end
  let hover: null | {
    day: number; x: number; curY: number; curSpend: number; ghostSpend: number; benchSpend: number;
    isFuture: boolean; isToday: boolean; color: string; deltaLabel: string; tip: { x: number; y: number };
  } = null;
  if (hoveredDay !== null) {
    const day = hoveredDay;
    const isFuture = day > today;
    const curSpend = isFuture
      ? spentToDate + (projectedExpense - spentToDate) * ((day - today) / Math.max(1, totalDays - today))
      : at(currentDailySeries, day, day === today ? spentToDate : 0);
    const ghostSpend = at(prevDailySeries, day, last(prevDailySeries));
    const deltaGhost = curSpend - ghostSpend;
    // True minus on both numbers; no percentage when last month had nothing yet (it would read +0%).
    const sign = deltaGhost < 0 ? '−' : '+';
    const pct = ghostSpend > 0 ? ` (${sign}${Math.abs((deltaGhost / ghostSpend) * 100).toFixed(0)}%)` : '';
    const x = getX(day);
    const curY = getY(curSpend);
    hover = {
      day, x, curY, curSpend, ghostSpend, isFuture,
      benchSpend: at(benchmarkDailySeries, day, 0),
      isToday: day === today,
      color: PACE_TONE_STYLE[paceTone(deltaGhost, ghostSpend)].color,
      deltaLabel: deltaGhost === 0 ? '±฿0' : `${sign}${formatBahtShort(Math.abs(Math.round(deltaGhost)))}${pct}`,
      tip: tooltipAt(frame, x, curY, TIP_W, TIP_H),
    };
  }

  return (
    <div className="relative w-full bg-surface border-b border-line select-none">
      {/* Legend Rail */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: paceColor }} />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">จังหวะใช้จ่ายเทียบเดือนก่อน</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] inline-block" style={{ backgroundColor: paceColor }} />
          <span className="text-neutral-300 font-bold">{currentPeriod} (เดือนนี้)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] bg-neutral-400 inline-block" />
          <span className="text-neutral-400 inline-flex items-center gap-1"><Ghost size={11} className="shrink-0" /> Ghost: {prevPeriod} (เดือนก่อน)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] border-t border-dashed border-sky-400 inline-block" />
          <span className="text-neutral-400">เฉลี่ย 3 เดือน</span>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[202px] relative px-1">
        <svg
          viewBox={`0 0 ${viewW} ${VIEW_H}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={e => { const d = dayAtPointer(e, frame); if (d !== undefined) setHoveredDay(d); }}
          onMouseLeave={() => setHoveredDay(null)}
        >
          <defs>
            <linearGradient id="pacerCurrentAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={paceColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={paceColor} stopOpacity="0.01" />
            </linearGradient>
            <filter id="pacerTooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          <DayGrid f={frame} />

          {/* Horizontal gridlines + y labels (top line at 90% of the scale) */}
          {[0.25, 0.5, 0.75, 1.0].map(f => {
            const val = maxY * (f * 0.9);
            const y = getY(val);
            return (
              <g key={`hgrid-${f}`}>
                <line x1={PAD_L} y1={y} x2={xEOM} y2={y} stroke={tc('line')} strokeWidth="1" />
                <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke={tc('line-strong')} strokeWidth="1" />
                <MonoText x={PAD_L - 6} y={y + 3} fill={tc('ink-muted')} textAnchor="end">{formatBahtShort(Math.round(val))}</MonoText>
              </g>
            );
          })}

          <line x1={PAD_L} y1={baseY} x2={xEOM} y2={baseY} stroke={tc('line')} strokeWidth="1" />
          <MonoText x={PAD_L - 6} y={baseY + 3} fill={tc('ink-muted')} textAnchor="end">฿0</MonoText>

          <path d={`${currentPath} L ${xToday} ${baseY} L ${getX(0)} ${baseY} Z`} fill="url(#pacerCurrentAreaGrad)" />

          {hasSpend(benchmarkDailySeries) && (
            <path d={seriesPath(benchmarkDailySeries)} fill="none" stroke={tc('info')} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
          )}
          {hasSpend(prevDailySeries) && (
            <path d={seriesPath(prevDailySeries)} fill="none" stroke={tc('ink-body')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          )}

          {/* Where last month stood on this day */}
          {ghostSpentToDate > 0 && (
            <g>
              <circle cx={xToday} cy={getY(ghostSpentToDate)} r="4" fill="none" stroke={tc('ink-body')} strokeWidth="1.5" />
              <circle cx={xToday} cy={getY(ghostSpentToDate)} r="1.5" fill={tc('ink-body')} />
            </g>
          )}

          <path d={currentPath} fill="none" stroke={paceColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${xToday} ${yToday} L ${xEOM} ${yEOM}`} fill="none" stroke={paceColor} strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />

          {/* Today */}
          <line x1={xToday} y1={PAD_T} x2={xToday} y2={baseY} stroke={tc('ink-muted')} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx={xToday} cy={yToday} r="6" fill={paceColor} fillOpacity="0.3" />
          <circle cx={xToday} cy={yToday} r="2.5" fill={paceColor} />

          {ghostFinal > 0 && <EdgeBadge x={xEOM} y={ghostEomY} w={BADGE_W} stroke={tc('ink-body')}>เดือนก่อนจบ {formatBahtShort(Math.round(ghostFinal))}</EdgeBadge>}
          {projectedExpense > 0 && <EdgeBadge x={xEOM} y={curEomY} w={BADGE_W} stroke={paceColor}>คาดจบเดือนนี้ {formatBahtShort(Math.round(projectedExpense))}</EdgeBadge>}

          <DayAxis f={frame} today={today} />

          {hover && (
            <g className="pointer-events-none select-none">
              <line x1={hover.x} y1={PAD_T} x2={hover.x} y2={baseY} stroke={hover.color} strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
              <circle cx={hover.x} cy={hover.curY} r="4.5" fill={hover.color} />
              {hover.ghostSpend > 0 && <circle cx={hover.x} cy={getY(hover.ghostSpend)} r="4" fill={tc('ink-body')} />}

              <g transform={`translate(${hover.tip.x}, ${hover.tip.y})`}>
                <rect x="0" y="0" width={TIP_W} height={TIP_H} fill={tc('surface-hover')} stroke={hover.color} strokeWidth="1.2" rx="3" filter="url(#pacerTooltipShadow)" />
                <line x1="8" y1="23" x2={TIP_W - 8} y2="23" stroke={tc('line')} strokeWidth="0.8" />
                <TooltipDay y={16} day={hover.day} isToday={hover.isToday} isFuture={hover.isFuture} />
                <MonoText x={TIP_W - 8} y="16" fill={hover.color} fontWeight="bold" textAnchor="end">{hover.deltaLabel}</MonoText>
                <MonoText x="8" y="40" fill={hover.color}>
                  เดือนนี้: <tspan fill={tc('ink-display')} fontWeight="bold">{formatBaht(hover.curSpend)}</tspan>
                </MonoText>
                <MonoText x="8" y="58" fill={tc('ink-body')}>
                  เดือนก่อน: <tspan fill={tc('ink-soft')} fontWeight="bold">{formatBaht(hover.ghostSpend)}</tspan>
                </MonoText>
                {hover.benchSpend > 0 && (
                  <MonoText x={TIP_W - 8} y="58" fill={tc('info')} textAnchor="end">เฉลี่ย {formatBahtShort(Math.round(hover.benchSpend))}</MonoText>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

GhostPacerChart.displayName = 'GhostPacerChart';
