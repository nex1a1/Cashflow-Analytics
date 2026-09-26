import React, { memo, useEffect, useRef, useState } from 'react';
import { formatMoney, formatAmount } from '@/utils/formatters';

import { tc, FONT_MONO } from '@/constants/theme';
interface TrajectoryChartProps {
  currentDay: number;
  lastDayOfMonth: number;
  maxAllowedExpense: number;
  fixedTotal: number;
  variableUpToToday: number;
  projectedExpense: number;
  projectedSurplus: number;
  actualDailySeries: number[];
  paceColor?: string;
}

export const ForecastingTrajectoryChart = memo(({
  currentDay,
  lastDayOfMonth,
  maxAllowedExpense,
  fixedTotal,
  variableUpToToday,
  projectedExpense,
  projectedSurplus,
  actualDailySeries,
}: TrajectoryChartProps) => {
  const spentToDate = actualDailySeries && actualDailySeries.length > 0
    ? actualDailySeries[actualDailySeries.length - 1]
    : (fixedTotal + variableUpToToday);
  const ceiling = Math.max(1, maxAllowedExpense);
  const totalDays = Math.max(1, lastDayOfMonth);
  const curDayClamped = Math.max(1, Math.min(currentDay, totalDays));

  // Measure real pixel width so the viewBox maps 1:1 to CSS pixels.
  // preserveAspectRatio="none" over a fixed 800-unit viewBox stretched
  // non-uniformly to fill wide cards, distorting strokes/text — see bug report.
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(800);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setViewW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chart dimensions inside SVG viewBox
  const viewH = 202;
  const padL = 54;
  const padR = 136;
  const padT = 20;
  const padB = 26;
  const plotW = viewW - padL - padR;
  const plotH = viewH - padT - padB;

  const maxY = Math.max(ceiling, projectedExpense, spentToDate, 1) * 1.12;

  // 0-indexed day axis: day 0 is the true, honest start of the month (฿0 spent).
  const getX = (dayIndex: number) => padL + Math.max(0, Math.min(1, dayIndex / totalDays)) * plotW;
  const getY = (val: number) => padT + plotH - Math.max(0, Math.min(1, val / maxY)) * plotH;

  const xToday = getX(curDayClamped);
  const yToday = getY(spentToDate);

  const xEOM = getX(totalDays);
  const yEOM = getY(projectedExpense);

  const yCeil = getY(ceiling);

  // Real cumulative spend, plotted point-for-point from actual daily totals — no interpolated shape.
  const actualPoints: [number, number][] = [[getX(0), getY(0)]];
  actualDailySeries.forEach((cumulative, idx) => {
    actualPoints.push([getX(idx + 1), getY(cumulative)]);
  });

  const actualPath = actualPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const actualArea = `${actualPath} L ${xToday} ${padT + plotH} L ${getX(0)} ${padT + plotH} Z`;

  const projectedPath = `M ${xToday} ${yToday} L ${xEOM} ${yEOM}`;
  const isSurplus = projectedSurplus >= 0;
  const surplusPolygon = `M ${xToday} ${yToday} L ${xEOM} ${yEOM} L ${xEOM} ${yCeil} L ${xToday} ${yCeil} Z`;

  // Compute staggered Y positions for right labels to prevent vertical collision
  let ceilLabelY = yCeil;
  let eomLabelY = yEOM;
  if (Math.abs(ceilLabelY - eomLabelY) < 18) {
    if (eomLabelY >= ceilLabelY) {
      eomLabelY = Math.min(viewH - padB + 2, ceilLabelY + 16);
      ceilLabelY = Math.max(padT + 2, eomLabelY - 16);
    } else {
      eomLabelY = Math.max(padT + 2, ceilLabelY - 16);
      ceilLabelY = Math.min(viewH - padB + 2, eomLabelY + 16);
    }
  }

  // Today marker pill position logic (never overlap ceiling line, never clip borders)
  const isNearCeilingAbove = Math.abs((yToday - 18) - yCeil) < 14;
  const isNearTop = yToday < padT + 22;
  const placeBelow = isNearTop || isNearCeilingAbove;
  const pillW = 104;
  const pillH = 16;
  const rawPillY = placeBelow ? yToday + 8 : yToday - 22;
  const pillY = Math.max(padT + 2, Math.min(rawPillY, padT + plotH - pillH - 2));
  const clampedPillX = Math.max(padL + pillW / 2, Math.min(xEOM - pillW / 2, xToday));

  // Mid-axis day ticks (5, 10, 15…) — skipped near the edges and near the today marker to avoid label collision
  const tickStep = totalDays > 20 ? 5 : totalDays > 10 ? 2 : 1;
  const dayTicks: number[] = [];
  for (let d = tickStep; d < totalDays; d += tickStep) dayTicks.push(d);

  // Data-driven vertical grid — one faint hairline per day
  const vGridDays: number[] = [];
  for (let d = 1; d < totalDays; d++) vGridDays.push(d);

  // Data-driven horizontal grid — quarter marks of the budget ceiling
  const hGridFractions = [0.25, 0.5, 0.75];

  // Interactive Hover Calculations
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * viewW;
    if (svgX < padL - 6 || svgX > xEOM + 6) {
      if (hoveredDay !== null) setHoveredDay(null);
      return;
    }
    const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
    const day = Math.max(1, Math.min(totalDays, Math.round(ratio * totalDays)));
    if (day !== hoveredDay) {
      setHoveredDay(day);
    }
  };

  const handleMouseLeave = () => {
    if (hoveredDay !== null) setHoveredDay(null);
  };

  let hoverData: {
    day: number;
    x: number;
    y: number;
    cumulative: number;
    dailyAmount: number;
    isFuture: boolean;
    isToday: boolean;
    pctOfCeiling: number;
  } | null = null;

  if (hoveredDay !== null) {
    const day = hoveredDay;
    const isToday = day === curDayClamped;
    const isFuture = day > curDayClamped;
    let cumulative = 0;
    let dailyAmount = 0;

    if (!isFuture) {
      cumulative = actualDailySeries && actualDailySeries.length >= day
        ? actualDailySeries[day - 1]
        : (day === curDayClamped ? spentToDate : 0);
      const prevCumulative = day > 1 && actualDailySeries && actualDailySeries.length >= day - 1
        ? actualDailySeries[day - 2]
        : 0;
      dailyAmount = Math.max(0, cumulative - prevCumulative);
    } else {
      const remainingSpan = Math.max(1, totalDays - curDayClamped);
      const futureProgress = (day - curDayClamped) / remainingSpan;
      cumulative = spentToDate + (projectedExpense - spentToDate) * futureProgress;
      dailyAmount = (projectedExpense - spentToDate) / remainingSpan;
    }

    const x = getX(day);
    const y = getY(cumulative);
    const pctOfCeiling = ceiling > 0 ? (cumulative / ceiling) * 100 : 0;

    hoverData = {
      day,
      x,
      y,
      cumulative,
      dailyAmount,
      isFuture,
      isToday,
      pctOfCeiling,
    };
  }

  let tooltipX = 0;
  let tooltipY = 0;
  const tipW = 192;
  const tipH = 52;

  if (hoverData) {
    if (hoverData.x + tipW + 14 > viewW) {
      tooltipX = hoverData.x - tipW - 12;
    } else {
      tooltipX = hoverData.x + 12;
    }
    tooltipX = Math.max(padL + 2, Math.min(viewW - tipW - 8, tooltipX));
    tooltipY = Math.max(padT + 2, Math.min(hoverData.y - tipH / 2, padT + plotH - tipH - 2));
  }

  return (
    <div className="relative w-full bg-surface border-b border-line select-none">
      {/* Trajectory Legend — colors are decoded here once; the numbers themselves live on the chart's own waypoint badges and the pods below, not repeated in this row. */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">
            เส้นทางยอดใช้จ่าย
          </span>
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

      {/* SVG Trajectory Chart */}
      <div ref={containerRef} className="w-full h-[202px] relative px-1">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="forecastActualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tc('expense')} stopOpacity="0.18" />
              <stop offset="100%" stopColor={tc('expense')} stopOpacity="0.01" />
            </linearGradient>

            <linearGradient id="forecastSurplusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isSurplus ? tc('income') : tc('expense')} stopOpacity={isSurplus ? "0.22" : "0.28"} />
              <stop offset="100%" stopColor={isSurplus ? tc('income') : tc('expense')} stopOpacity="0.03" />
            </linearGradient>

            <filter id="tooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* 0a. Vertical Grid — faint line per date interval (day 5, 10, 15…) plus Today */}
          {vGridDays.map((d) => (
            <line
              key={`vgrid-${d}`}
              x1={getX(d)}
              y1={padT}
              x2={getX(d)}
              y2={padT + plotH}
              stroke={tc('line')}
              strokeWidth="1"
            />
          ))}

          {/* 0b. Horizontal Grid — quarter marks of the budget ceiling (25% / 50% / 75%) */}
          {hGridFractions.map((f) => {
            const y = getY(ceiling * f);
            const isSafeRight = Math.abs(y - ceilLabelY) >= 14 && Math.abs(y - eomLabelY) >= 14;
            return (
              <g key={`hgrid-${f}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={xEOM}
                  y2={y}
                  stroke={tc('line')}
                  strokeWidth="1"
                />
                {/* Left Y-axis tick and amount */}
                <line
                  x1={padL - 3}
                  y1={y}
                  x2={padL}
                  y2={y}
                  stroke={tc('line-strong')}
                  strokeWidth="1"
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  fill={tc('ink-muted')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  textAnchor="end"
                >
                  ฿{formatAmount(Math.round(ceiling * f))}
                </text>
                {/* Right side guideline */}
                {isSafeRight && (
                  <g>
                    <line
                      x1={xEOM}
                      y1={y}
                      x2={xEOM + 4}
                      y2={y}
                      stroke={tc('line-strong')}
                      strokeWidth="1"
                    />
                    <text
                      x={xEOM + 7}
                      y={y + 3}
                      fill={tc('ink-muted')}
                      fontSize="11"
                      fontFamily={FONT_MONO}
                    >
                      {f * 100}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Left Y-axis tick and label for Ceiling line */}
          <line
            x1={padL - 3}
            y1={yCeil}
            x2={padL}
            y2={yCeil}
            stroke={tc('ink-muted')}
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={yCeil + 3}
            fill={tc('ink-body')}
            fontSize="11"
            fontFamily={FONT_MONO}
            fontWeight="bold"
            textAnchor="end"
          >
            ฿{formatAmount(Math.round(ceiling))}
          </text>

          {/* Left & Right Y-axis tick and label for 0 (Baseline) */}
          <line
            x1={padL - 3}
            y1={padT + plotH}
            x2={padL}
            y2={padT + plotH}
            stroke={tc('line-strong')}
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={padT + plotH + 3}
            fill={tc('ink-muted')}
            fontSize="11"
            fontFamily={FONT_MONO}
            textAnchor="end"
          >
            ฿0
          </text>
          {Math.abs((padT + plotH) - ceilLabelY) >= 14 && Math.abs((padT + plotH) - eomLabelY) >= 14 && (
            <text
              x={xEOM + 7}
              y={padT + plotH + 3}
              fill={tc('line-strong')}
              fontSize="11"
              fontFamily={FONT_MONO}
            >
              0%
            </text>
          )}

          {/* 1. Surplus / Deficit Buffer Area */}
          <path d={surplusPolygon} fill="url(#forecastSurplusGrad)" />

          {/* 2. Actual Spend Area Fill */}
          <path d={actualArea} fill="url(#forecastActualAreaGrad)" />

          {/* 3. Ceiling Baseline (Dashed) */}
          <line
            x1={padL}
            y1={yCeil}
            x2={xEOM}
            y2={yCeil}
            stroke={tc('ink-muted')}
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* 4. Ceiling Right Badge */}
          <g transform={`translate(${xEOM + 6}, ${ceilLabelY - 7})`}>
            <rect x="0" y="0" width="124" height="15" fill={tc('canvas')} stroke={tc('ink-muted')} strokeWidth="0.8" rx="2" />
            <text x="6" y="11" fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO} fontWeight="bold">
              เพดาน ฿{formatMoney(ceiling)}
            </text>
          </g>

          {/* 5. Actual Spend Curve — real per-day cumulative points, straight segments, single color */}
          <path
            d={actualPath}
            fill="none"
            stroke={tc('expense')}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 6. Projected Trajectory Line (Dashed) */}
          <path
            d={projectedPath}
            fill="none"
            stroke={isSurplus ? tc('income') : tc('expense')}
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* 7. Today Marker (Vertical hairline + glowing node) */}
          <line
            x1={xToday}
            y1={padT}
            x2={xToday}
            y2={padT + plotH}
            stroke={tc('ink-muted')}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle cx={xToday} cy={yToday} r="6" fill={tc('expense')} fillOpacity="0.3" />
          <circle cx={xToday} cy={yToday} r="2.5" fill={tc('expense')} />

          {/* 8. Today Floating Badge Callout */}
          <g transform={`translate(${clampedPillX}, ${pillY})`}>
            <rect
              x={-pillW / 2}
              y="0"
              width={pillW}
              height={pillH}
              fill={tc('canvas')}
              stroke={tc('expense')}
              strokeWidth="1"
              rx="2"
            />
            <text
              x="0"
              y="11"
              fill={tc('expense')}
              fontSize="11"
              fontFamily={FONT_MONO}
              fontWeight="bold"
              textAnchor="middle"
            >
              วันนี้: ฿{formatMoney(spentToDate)}
            </text>
          </g>

          {/* 9. EOM Destination Node & Right Badge */}
          <circle cx={xEOM} cy={yEOM} r="3.5" fill={isSurplus ? tc('income') : tc('expense')} />
          <g transform={`translate(${xEOM + 6}, ${eomLabelY - 7})`}>
            <rect
              x="0"
              y="0"
              width="124"
              height="15"
              fill={tc('canvas')}
              stroke={isSurplus ? tc('income') : tc('expense')}
              strokeWidth="0.8"
              rx="2"
            />
            <text
              x="6"
              y="11"
              fill={isSurplus ? tc('income') : tc('expense')}
              fontSize="11"
              fontFamily={FONT_MONO}
              fontWeight="bold"
            >
              จบเดือน ฿{formatMoney(projectedExpense)}
            </text>
          </g>

          {/* 10. Bottom Axis Timeline Ticks */}
          <line x1={padL} y1={padT + plotH} x2={xEOM} y2={padT + plotH} stroke={tc('line')} strokeWidth="1" />
          <text x={padL} y={padT + plotH + 12} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO}>Day 1</text>
          <text x={xToday} y={padT + plotH + 12} fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO} textAnchor="middle" fontWeight="bold">
            Day {curDayClamped} (วันนี้)
          </text>
          <text x={xEOM} y={padT + plotH + 12} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
            Day {totalDays}
          </text>

          {/* 10b. Mid-axis Day Number Ticks (5, 10, 15…) */}
          {dayTicks.map((d) => {
            const x = getX(d);
            if (x < padL + 16 || x > xEOM - 16) return null;
            if (Math.abs(x - xToday) < 22) return null;
            return (
              <g key={d}>
                <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 3} stroke={tc('ink-muted')} strokeWidth="1" />
                <text x={x} y={padT + plotH + 12} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO} textAnchor="middle">
                  {d}
                </text>
              </g>
            );
          })}

          {/* 11. Interactive Hover Crosshair & Tooltip HUD */}
          {hoverData && (
            <g className="pointer-events-none select-none">
              {/* Vertical Crosshair Line */}
              <line
                x1={hoverData.x}
                y1={padT}
                x2={hoverData.x}
                y2={padT + plotH}
                stroke={hoverData.isFuture ? (isSurplus ? tc('income') : tc('danger')) : tc('expense')}
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Node on Curve */}
              <circle
                cx={hoverData.x}
                cy={hoverData.y}
                r="5.5"
                fill={hoverData.isFuture ? (isSurplus ? tc('income') : tc('danger')) : tc('expense')}
                fillOpacity="0.35"
              />
              <circle
                cx={hoverData.x}
                cy={hoverData.y}
                r="2.5"
                fill={hoverData.isFuture ? (isSurplus ? tc('income') : tc('danger')) : tc('expense')}
              />

              {/* Tooltip HUD Card */}
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect
                  x="0"
                  y="0"
                  width={tipW}
                  height={tipH}
                  fill={tc('surface-hover')}
                  stroke={hoverData.isFuture ? (isSurplus ? tc('income') : tc('danger')) : tc('expense')}
                  strokeWidth="1.2"
                  rx="3"
                  filter="url(#tooltipShadow)"
                />
                {/* Hairline Divider */}
                <line
                  x1="8"
                  y1="26"
                  x2={tipW - 8}
                  y2="26"
                  stroke={tc('line')}
                  strokeWidth="0.8"
                />
                {/* Row 1: Day & Daily Spend */}
                <text
                  x="8"
                  y="17"
                  fill="#ffffff"
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  fontWeight="bold"
                >
                  Day {hoverData.day}
                  <tspan fill={hoverData.isToday ? tc('accent') : hoverData.isFuture ? tc('ink-body') : tc('ink-muted')} fontSize="11" fontWeight="normal">
                    {hoverData.isToday ? ' (วันนี้)' : hoverData.isFuture ? ' (คาดการณ์)' : ''}
                  </tspan>
                </text>
                <text
                  x={tipW - 8}
                  y="17"
                  fill={hoverData.isFuture ? tc('ink-body') : hoverData.dailyAmount > 0 ? tc('expense') : tc('ink-muted')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {hoverData.isFuture
                    ? `วันละ ฿${formatAmount(Math.round(hoverData.dailyAmount))}`
                    : hoverData.dailyAmount > 0
                      ? `+฿${formatAmount(Math.round(hoverData.dailyAmount))}`
                      : '฿0'}
                </text>

                {/* Row 2: Cumulative Spend & % of ceiling */}
                <text
                  x="8"
                  y="42"
                  fill={tc('ink-body')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                >
                  สะสม: <tspan fill="#ffffff" fontWeight="bold">฿{formatMoney(hoverData.cumulative)}</tspan>
                </text>
                <text
                  x={tipW - 8}
                  y="42"
                  fill={tc('ink-body')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  textAnchor="end"
                >
                  <tspan fill={hoverData.pctOfCeiling > 100 ? tc('danger') : tc('ink-body')} fontWeight="bold">
                    {hoverData.pctOfCeiling.toFixed(0)}%
                  </tspan>{' '}
                  เพดาน
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

ForecastingTrajectoryChart.displayName = 'ForecastingTrajectoryChart';
