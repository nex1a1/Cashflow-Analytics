import { memo, useState } from 'react';
import { formatBaht, formatBahtShort } from '@/utils/formatters';
import { tc } from '@/constants/theme';
import {
  useSvgSize, linePath, MonoText, separateLabels, dayAtPointer, tooltipAt, DayGrid, DayAxis, TooltipDay, EdgeBadge, DayFrame,
} from '@/components/shared/svgChart';

interface TrajectoryChartProps {
  currentDay: number;
  lastDayOfMonth: number;
  maxAllowedExpense: number;
  fixedTotal: number;
  variableUpToToday: number;
  projectedExpense: number;
  projectedSurplus: number;
  actualDailySeries: number[];
}

const VIEW_H = 202;
const PAD_L = 54;
const PAD_R = 136;
const PAD_T = 20;
const PAD_B = 26;
const PILL_W = 104;
const PILL_H = 16;
const TIP_W = 192;
const TIP_H = 52;

export const ForecastingTrajectoryChart = memo(({
  currentDay, lastDayOfMonth, maxAllowedExpense, fixedTotal, variableUpToToday,
  projectedExpense, projectedSurplus, actualDailySeries,
}: TrajectoryChartProps) => {
  const spentToDate = actualDailySeries.length > 0
    ? actualDailySeries[actualDailySeries.length - 1]
    : (fixedTotal + variableUpToToday);
  const ceiling = Math.max(1, maxAllowedExpense);
  const totalDays = Math.max(1, lastDayOfMonth);
  const today = Math.max(1, Math.min(currentDay, totalDays));

  // viewBox follows the real pixel width: a fixed 800-unit viewBox stretched with preserveAspectRatio="none" distorted strokes/text on wide cards.
  const [containerRef, { w: viewW }] = useSvgSize(800);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const plotW = viewW - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;
  const maxY = Math.max(ceiling, projectedExpense, spentToDate, 1) * 1.12;

  // Day 0 is the start of the month (฿0 spent).
  const getX = (day: number) => PAD_L + Math.max(0, Math.min(1, day / totalDays)) * plotW;
  const getY = (val: number) => baseY - Math.max(0, Math.min(1, val / maxY)) * plotH;
  const frame: DayFrame = { viewW, padL: PAD_L, padT: PAD_T, plotW, baseY, totalDays, getX };

  const xToday = getX(today);
  const yToday = getY(spentToDate);
  const xEOM = getX(totalDays);
  const yEOM = getY(projectedExpense);
  const yCeil = getY(ceiling);

  // Real cumulative spend, point-for-point from the daily totals — no interpolated shape.
  const actualPath = linePath([[getX(0), getY(0)], ...actualDailySeries.map((v, i) => [getX(i + 1), getY(v)] as const)]);
  const isSurplus = projectedSurplus >= 0;
  const trendColor = isSurplus ? tc('income') : tc('expense');

  const [ceilLabelY, eomLabelY] = separateLabels(yCeil, yEOM, PAD_T + 2, VIEW_H - PAD_B + 2);
  /** A right-edge % label at `y` only where it can't run into the two badges. */
  const clearOfBadges = (y: number) => Math.abs(y - ceilLabelY) >= 14 && Math.abs(y - eomLabelY) >= 14;

  // Today pill: above the point unless that hits the top edge or the ceiling line; never outside the plot
  const placeBelow = yToday < PAD_T + 22 || Math.abs((yToday - 18) - yCeil) < 14;
  const pillY = Math.max(PAD_T + 2, Math.min(placeBelow ? yToday + 8 : yToday - 22, baseY - PILL_H - 2));
  const pillX = Math.max(PAD_L + PILL_W / 2, Math.min(xEOM - PILL_W / 2, xToday));

  // Hover: past days read the series, future days follow the projection line from today to month end
  let hover: null | {
    day: number; x: number; y: number; cumulative: number; dailyAmount: number;
    isFuture: boolean; isToday: boolean; pctOfCeiling: number; color: string; tip: { x: number; y: number };
  } = null;
  if (hoveredDay !== null) {
    const day = hoveredDay;
    const isFuture = day > today;
    let cumulative: number;
    let dailyAmount: number;
    if (!isFuture) {
      cumulative = actualDailySeries.length >= day ? actualDailySeries[day - 1] : (day === today ? spentToDate : 0);
      const prevCumulative = day > 1 && actualDailySeries.length >= day - 1 ? actualDailySeries[day - 2] : 0;
      dailyAmount = Math.max(0, cumulative - prevCumulative);
    } else {
      const remainingSpan = Math.max(1, totalDays - today);
      cumulative = spentToDate + (projectedExpense - spentToDate) * ((day - today) / remainingSpan);
      dailyAmount = (projectedExpense - spentToDate) / remainingSpan;
    }
    const x = getX(day);
    const y = getY(cumulative);
    hover = {
      day, x, y, cumulative, dailyAmount, isFuture,
      isToday: day === today,
      pctOfCeiling: (cumulative / ceiling) * 100,
      color: isFuture ? (isSurplus ? tc('income') : tc('danger')) : tc('expense'),
      tip: tooltipAt(frame, x, y, TIP_W, TIP_H),
    };
  }

  return (
    <div className="relative w-full bg-surface border-b border-line select-none">
      {/* Legend: colours are decoded here once; the numbers live on the chart's own badges and the pods below. */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">เส้นทางยอดใช้จ่าย</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] bg-expense inline-block" />
          <span className="text-neutral-400">จ่ายจริงสะสม</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-[2px] border-t border-dashed ${isSurplus ? 'border-emerald-400' : 'border-danger'} inline-block`} />
          <span className="text-neutral-400">แนวโน้มถึงสิ้นเดือน</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] border-t border-dashed border-neutral-400 inline-block" />
          <span className="text-neutral-400">เพดานงบ</span>
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
            <linearGradient id="forecastActualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tc('expense')} stopOpacity="0.18" />
              <stop offset="100%" stopColor={tc('expense')} stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="forecastSurplusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity={isSurplus ? "0.22" : "0.28"} />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0.03" />
            </linearGradient>
            <filter id="tooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          <DayGrid f={frame} />

          {/* Quarter marks of the budget ceiling: amount on the left, % on the right */}
          {[0.25, 0.5, 0.75].map(f => {
            const y = getY(ceiling * f);
            return (
              <g key={`hgrid-${f}`}>
                <line x1={PAD_L} y1={y} x2={xEOM} y2={y} stroke={tc('line')} strokeWidth="1" />
                <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke={tc('line-strong')} strokeWidth="1" />
                <MonoText x={PAD_L - 6} y={y + 3} fill={tc('ink-muted')} textAnchor="end">{formatBahtShort(Math.round(ceiling * f))}</MonoText>
                {clearOfBadges(y) && (
                  <g>
                    <line x1={xEOM} y1={y} x2={xEOM + 4} y2={y} stroke={tc('line-strong')} strokeWidth="1" />
                    <MonoText x={xEOM + 7} y={y + 3} fill={tc('ink-muted')}>{f * 100}%</MonoText>
                  </g>
                )}
              </g>
            );
          })}

          <line x1={PAD_L - 3} y1={yCeil} x2={PAD_L} y2={yCeil} stroke={tc('ink-muted')} strokeWidth="1" />
          <MonoText x={PAD_L - 6} y={yCeil + 3} fill={tc('ink-body')} fontWeight="bold" textAnchor="end">{formatBahtShort(Math.round(ceiling))}</MonoText>

          <line x1={PAD_L - 3} y1={baseY} x2={PAD_L} y2={baseY} stroke={tc('line-strong')} strokeWidth="1" />
          <MonoText x={PAD_L - 6} y={baseY + 3} fill={tc('ink-muted')} textAnchor="end">฿0</MonoText>
          {clearOfBadges(baseY) && <MonoText x={xEOM + 7} y={baseY + 3} fill={tc('line-strong')}>0%</MonoText>}

          {/* Surplus / deficit wedge between the trend and the ceiling, then the actual-spend area */}
          <path d={`M ${xToday} ${yToday} L ${xEOM} ${yEOM} L ${xEOM} ${yCeil} L ${xToday} ${yCeil} Z`} fill="url(#forecastSurplusGrad)" />
          <path d={`${actualPath} L ${xToday} ${baseY} L ${getX(0)} ${baseY} Z`} fill="url(#forecastActualAreaGrad)" />

          <line x1={PAD_L} y1={yCeil} x2={xEOM} y2={yCeil} stroke={tc('ink-muted')} strokeWidth="1.2" strokeDasharray="4 3" />
          <EdgeBadge x={xEOM} y={ceilLabelY} w={124} stroke={tc('ink-muted')} fill={tc('ink-body')}>เพดาน {formatBaht(ceiling)}</EdgeBadge>

          <path d={actualPath} fill="none" stroke={tc('expense')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${xToday} ${yToday} L ${xEOM} ${yEOM}`} fill="none" stroke={trendColor} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />

          {/* Today */}
          <line x1={xToday} y1={PAD_T} x2={xToday} y2={baseY} stroke={tc('ink-muted')} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx={xToday} cy={yToday} r="6" fill={tc('expense')} fillOpacity="0.3" />
          <circle cx={xToday} cy={yToday} r="2.5" fill={tc('expense')} />
          <g transform={`translate(${pillX}, ${pillY})`}>
            <rect x={-PILL_W / 2} y="0" width={PILL_W} height={PILL_H} fill={tc('canvas')} stroke={tc('expense')} strokeWidth="1" rx="2" />
            <MonoText x="0" y="11" fill={tc('expense')} fontWeight="bold" textAnchor="middle">วันนี้: {formatBaht(spentToDate)}</MonoText>
          </g>

          <circle cx={xEOM} cy={yEOM} r="3.5" fill={trendColor} />
          <EdgeBadge x={xEOM} y={eomLabelY} w={124} stroke={trendColor}>จบเดือน {formatBaht(projectedExpense)}</EdgeBadge>

          <DayAxis f={frame} today={today} />

          {hover && (
            <g className="pointer-events-none select-none">
              <line x1={hover.x} y1={PAD_T} x2={hover.x} y2={baseY} stroke={hover.color} strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
              <circle cx={hover.x} cy={hover.y} r="5.5" fill={hover.color} fillOpacity="0.35" />
              <circle cx={hover.x} cy={hover.y} r="2.5" fill={hover.color} />

              <g transform={`translate(${hover.tip.x}, ${hover.tip.y})`}>
                <rect x="0" y="0" width={TIP_W} height={TIP_H} fill={tc('surface-hover')} stroke={hover.color} strokeWidth="1.2" rx="3" filter="url(#tooltipShadow)" />
                <line x1="8" y1="26" x2={TIP_W - 8} y2="26" stroke={tc('line')} strokeWidth="0.8" />
                <TooltipDay y={17} day={hover.day} isToday={hover.isToday} isFuture={hover.isFuture} />
                <MonoText
                  x={TIP_W - 8} y="17" fontWeight="bold" textAnchor="end"
                  fill={hover.isFuture ? tc('ink-body') : hover.dailyAmount > 0 ? tc('expense') : tc('ink-muted')}
                >
                  {hover.isFuture
                    ? `วันละ ${formatBahtShort(Math.round(hover.dailyAmount))}`
                    : hover.dailyAmount > 0 ? `+${formatBahtShort(Math.round(hover.dailyAmount))}` : '฿0'}
                </MonoText>
                <MonoText x="8" y="42" fill={tc('ink-body')}>
                  สะสม: <tspan fill={tc('ink-display')} fontWeight="bold">{formatBaht(hover.cumulative)}</tspan>
                </MonoText>
                <MonoText x={TIP_W - 8} y="42" fill={tc('ink-body')} textAnchor="end">
                  <tspan fill={hover.pctOfCeiling > 100 ? tc('danger') : tc('ink-body')} fontWeight="bold">
                    {hover.pctOfCeiling.toFixed(0)}%
                  </tspan>{' '}
                  เพดาน
                </MonoText>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

ForecastingTrajectoryChart.displayName = 'ForecastingTrajectoryChart';
