// src/views/Dashboard/components/SummaryCards/GhostPacer/GhostPacerChart.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { Ghost } from 'lucide-react';
import { formatMoney, formatAmount } from '@/utils/formatters';

import { tc, FONT_MONO } from '@/constants/theme';
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

export const GhostPacerChart = memo(({
  currentDay,
  lastDayOfMonth,
  currentDailySeries,
  prevDailySeries,
  benchmarkDailySeries,
  projectedExpense,
  ghostTotalExpense,
  paceColor,
  currentPeriod,
  prevPeriod,
}: GhostPacerChartProps) => {
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

  const viewH = 202;
  const padL = 54;
  const padR = 136;
  const padT = 20;
  const padB = 26;
  const plotW = Math.max(10, viewW - padL - padR);
  const plotH = Math.max(10, viewH - padT - padB);

  const totalDays = Math.max(1, lastDayOfMonth);
  const curDayClamped = Math.max(1, Math.min(currentDay, totalDays));

  const spentToDate = currentDailySeries && currentDailySeries.length > 0
    ? currentDailySeries[Math.min(curDayClamped, currentDailySeries.length) - 1]
    : 0;

  const ghostSpentToDate = prevDailySeries && prevDailySeries.length > 0
    ? prevDailySeries[Math.min(curDayClamped, prevDailySeries.length) - 1]
    : 0;

  const ghostFinal = ghostTotalExpense || (prevDailySeries && prevDailySeries.length > 0
    ? prevDailySeries[prevDailySeries.length - 1]
    : 0);

  // Maximum scale across current spend, projected, ghost, and benchmark
  const maxBenchmark = benchmarkDailySeries && benchmarkDailySeries.length > 0
    ? Math.max(...benchmarkDailySeries)
    : 0;
  const maxY = Math.max(1, spentToDate, projectedExpense, ghostFinal, maxBenchmark) * 1.12;

  const getX = (dayIndex: number) => padL + Math.max(0, Math.min(1, dayIndex / totalDays)) * plotW;
  const getY = (val: number) => padT + plotH - Math.max(0, Math.min(1, val / maxY)) * plotH;

  // 1. Ghost Path (Previous Month — full month)
  const ghostPoints: [number, number][] = [[getX(0), getY(0)]];
  prevDailySeries.forEach((val, idx) => {
    ghostPoints.push([getX(idx + 1), getY(val)]);
  });
  const ghostPath = ghostPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  // 2. Current Month Path (up to current day)
  const currentPoints: [number, number][] = [[getX(0), getY(0)]];
  currentDailySeries.forEach((val, idx) => {
    currentPoints.push([getX(idx + 1), getY(val)]);
  });
  const currentPath = currentPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const xToday = getX(curDayClamped);
  const yToday = getY(spentToDate);
  const currentArea = `${currentPath} L ${xToday} ${padT + plotH} L ${getX(0)} ${padT + plotH} Z`;

  // 3. Projected Extension to EOM
  const xEOM = getX(totalDays);
  const yEOM = getY(projectedExpense);
  const projectedPath = `M ${xToday} ${yToday} L ${xEOM} ${yEOM}`;

  // 4. 3-Month Benchmark Path
  const benchmarkPoints: [number, number][] = [[getX(0), getY(0)]];
  benchmarkDailySeries.forEach((val, idx) => {
    benchmarkPoints.push([getX(idx + 1), getY(val)]);
  });
  const benchmarkPath = benchmarkPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  // Ghost Waypoint coordinates on currentDay
  const xGhostNode = getX(curDayClamped);
  const yGhostNode = getY(ghostSpentToDate);

  // Right-side badge coordinates (prevent vertical label collision)
  let ghostEomY = getY(ghostFinal);
  let curEomY = yEOM;
  if (Math.abs(ghostEomY - curEomY) < 18) {
    if (curEomY >= ghostEomY) {
      curEomY = Math.min(viewH - padB + 2, ghostEomY + 16);
      ghostEomY = Math.max(padT + 2, curEomY - 16);
    } else {
      curEomY = Math.max(padT + 2, ghostEomY - 16);
      ghostEomY = Math.min(viewH - padB + 2, curEomY + 16);
    }
  }

  // Gridlines
  const dayTicks: number[] = [];
  const tickStep = totalDays > 20 ? 5 : totalDays > 10 ? 2 : 1;
  for (let d = tickStep; d < totalDays; d += tickStep) dayTicks.push(d);

  const vGridDays: number[] = [];
  for (let d = 1; d < totalDays; d++) vGridDays.push(d);

  const hSteps = [0.25, 0.5, 0.75, 1.0];

  // Mouse hover
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

  // Hover Data calculations
  let hoverData: {
    day: number;
    x: number;
    curY: number;
    curSpend: number;
    ghostSpend: number;
    benchSpend: number;
    deltaGhost: number;
    deltaGhostPct: number;
    isFuture: boolean;
    isToday: boolean;
  } | null = null;

  if (hoveredDay !== null) {
    const day = hoveredDay;
    const isToday = day === curDayClamped;
    const isFuture = day > curDayClamped;

    let curSpend = 0;
    if (!isFuture) {
      curSpend = currentDailySeries && currentDailySeries.length >= day
        ? currentDailySeries[day - 1]
        : (day === curDayClamped ? spentToDate : 0);
    } else {
      const remainingSpan = Math.max(1, totalDays - curDayClamped);
      const futureProgress = (day - curDayClamped) / remainingSpan;
      curSpend = spentToDate + (projectedExpense - spentToDate) * futureProgress;
    }

    const ghostSpend = prevDailySeries && prevDailySeries.length >= day
      ? prevDailySeries[day - 1]
      : (prevDailySeries && prevDailySeries.length > 0 ? prevDailySeries[prevDailySeries.length - 1] : 0);

    const benchSpend = benchmarkDailySeries && benchmarkDailySeries.length >= day
      ? benchmarkDailySeries[day - 1]
      : 0;

    const deltaGhost = curSpend - ghostSpend;
    const deltaGhostPct = ghostSpend > 0 ? (deltaGhost / ghostSpend) * 100 : 0;

    hoverData = {
      day,
      x: getX(day),
      curY: getY(curSpend),
      curSpend,
      ghostSpend,
      benchSpend,
      deltaGhost,
      deltaGhostPct,
      isFuture,
      isToday,
    };
  }

  const tipW = 210;
  const tipH = 68;
  let tooltipX = 0;
  let tooltipY = 0;
  if (hoverData) {
    if (hoverData.x + tipW + 14 > viewW) {
      tooltipX = hoverData.x - tipW - 12;
    } else {
      tooltipX = hoverData.x + 12;
    }
    tooltipX = Math.max(padL + 2, Math.min(viewW - tipW - 8, tooltipX));
    tooltipY = Math.max(padT + 2, Math.min(hoverData.curY - tipH / 2, padT + plotH - tipH - 2));
  }

  return (
    <div className="relative w-full bg-surface border-b border-line select-none">
      {/* Legend Rail */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: paceColor }} />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">
            จังหวะใช้จ่ายเทียบเดือนก่อน
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] bg-expense inline-block" />
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

      {/* SVG Chart */}
      <div ref={containerRef} className="w-full h-[202px] relative px-1">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="pacerCurrentAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tc('expense')} stopOpacity="0.22" />
              <stop offset="100%" stopColor={tc('expense')} stopOpacity="0.01" />
            </linearGradient>

            <filter id="pacerTooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Vertical Gridlines */}
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

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {hSteps.map((f) => {
            const val = maxY * (f * 0.9);
            const y = getY(val);
            return (
              <g key={`hgrid-${f}`}>
                <line x1={padL} y1={y} x2={xEOM} y2={y} stroke={tc('line')} strokeWidth="1" />
                <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke={tc('line-strong')} strokeWidth="1" />
                <text
                  x={padL - 6}
                  y={y + 3}
                  fill={tc('ink-muted')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  textAnchor="end"
                >
                  ฿{formatAmount(Math.round(val))}
                </text>
              </g>
            );
          })}

          {/* Baseline ฿0 */}
          <line x1={padL} y1={padT + plotH} x2={xEOM} y2={padT + plotH} stroke={tc('line')} strokeWidth="1" />
          <text x={padL - 6} y={padT + plotH + 3} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
            ฿0
          </text>

          {/* 1. Area fill for Current Month */}
          <path d={currentArea} fill="url(#pacerCurrentAreaGrad)" />

          {/* 2. 3-Month Benchmark Line (Dashed Cyan/Sky) */}
          {benchmarkDailySeries.length > 0 && benchmarkDailySeries.some(v => v > 0) && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.65"
            />
          )}

          {/* 3. Ghost Line (Solid Gray of Last Month) */}
          {prevDailySeries.length > 0 && prevDailySeries.some(v => v > 0) && (
            <path
              d={ghostPath}
              fill="none"
              stroke={tc('ink-body')}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          )}

          {/* Ghost Waypoint Node on currentDay */}
          {ghostSpentToDate > 0 && (
            <g>
              <circle cx={xGhostNode} cy={yGhostNode} r="4" fill="none" stroke={tc('ink-body')} strokeWidth="1.5" />
              <circle cx={xGhostNode} cy={yGhostNode} r="1.5" fill={tc('ink-body')} />
            </g>
          )}

          {/* 4. Current Month Pace Curve */}
          <path
            d={currentPath}
            fill="none"
            stroke={tc('expense')}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 5. Projected Pace Line to EOM (Dashed) */}
          <path
            d={projectedPath}
            fill="none"
            stroke={paceColor}
            strokeWidth="1.8"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* 6. Today Marker (Vertical hairline + glowing node) */}
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

          {/* 7. Right Badges: EOM Finish Line Comparisons */}
          {/* Ghost EOM Badge */}
          {ghostFinal > 0 && (
            <g transform={`translate(${xEOM + 6}, ${ghostEomY - 7})`}>
              <rect x="0" y="0" width="124" height="15" fill={tc('canvas')} stroke={tc('ink-body')} strokeWidth="0.8" rx="2" />
              <text x="6" y="11" fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO} fontWeight="bold">
                GHOST จบก่อน ฿{formatAmount(Math.round(ghostFinal))}
              </text>
            </g>
          )}

          {/* Current Projected EOM Badge */}
          {projectedExpense > 0 && (
            <g transform={`translate(${xEOM + 6}, ${curEomY - 7})`}>
              <rect x="0" y="0" width="124" height="15" fill={tc('canvas')} stroke={paceColor} strokeWidth="0.8" rx="2" />
              <text x="6" y="11" fill={paceColor} fontSize="11" fontFamily={FONT_MONO} fontWeight="bold">
                จบเดือนนี้ ฿{formatAmount(Math.round(projectedExpense))}
              </text>
            </g>
          )}

          {/* 8. Bottom Axis Timeline Ticks */}
          <line x1={padL} y1={padT + plotH} x2={xEOM} y2={padT + plotH} stroke={tc('line')} strokeWidth="1" />
          <text x={padL} y={padT + plotH + 12} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO}>Day 1</text>
          <text x={xToday} y={padT + plotH + 12} fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO} textAnchor="middle" fontWeight="bold">
            Day {curDayClamped} (วันนี้)
          </text>
          <text x={xEOM} y={padT + plotH + 12} fill={tc('ink-muted')} fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
            Day {totalDays}
          </text>

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

          {/* 9. Interactive Hover Crosshair & Dual Telemetry HUD */}
          {hoverData && (
            <g className="pointer-events-none select-none">
              <line
                x1={hoverData.x}
                y1={padT}
                x2={hoverData.x}
                y2={padT + plotH}
                stroke={tc('expense')}
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              <circle cx={hoverData.x} cy={hoverData.curY} r="4.5" fill={tc('expense')} />
              {hoverData.ghostSpend > 0 && (
                <circle cx={hoverData.x} cy={getY(hoverData.ghostSpend)} r="4" fill={tc('ink-body')} />
              )}

              {/* Tooltip Card */}
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect
                  x="0"
                  y="0"
                  width={tipW}
                  height={tipH}
                  fill={tc('surface-hover')}
                  stroke={hoverData.deltaGhost < 0 ? tc('income') : tc('danger')}
                  strokeWidth="1.2"
                  rx="3"
                  filter="url(#pacerTooltipShadow)"
                />
                <line x1="8" y1="23" x2={tipW - 8} y2="23" stroke={tc('line')} strokeWidth="0.8" />

                {/* Row 1: Header Day */}
                <text x="8" y="16" fill="#ffffff" fontSize="11" fontFamily={FONT_MONO} fontWeight="bold">
                  Day {hoverData.day}
                  <tspan fill={hoverData.isToday ? tc('accent') : hoverData.isFuture ? tc('ink-body') : tc('ink-muted')} fontSize="11" fontWeight="normal">
                    {hoverData.isToday ? ' (วันนี้)' : hoverData.isFuture ? ' (คาดการณ์)' : ''}
                  </tspan>
                </text>
                <text
                  x={tipW - 8}
                  y="16"
                  fill={hoverData.deltaGhost < 0 ? tc('income') : tc('danger')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {hoverData.deltaGhost === 0 ? '±฿0' : hoverData.deltaGhost < 0
                    ? `-฿${formatAmount(Math.abs(Math.round(hoverData.deltaGhost)))} (${hoverData.deltaGhostPct.toFixed(0)}%)`
                    : `+฿${formatAmount(Math.round(hoverData.deltaGhost))} (+${hoverData.deltaGhostPct.toFixed(0)}%)`}
                </text>

                {/* Row 2: Current Month Spend */}
                <text x="8" y="40" fill={tc('expense')} fontSize="11" fontFamily={FONT_MONO}>
                  เดือนนี้: <tspan fill="#ffffff" fontWeight="bold">฿{formatMoney(hoverData.curSpend)}</tspan>
                </text>

                {/* Row 3: Ghost Month Spend */}
                <text x="8" y="58" fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO}>
                  เดือนก่อน: <tspan fill={tc('ink-soft')} fontWeight="bold">฿{formatMoney(hoverData.ghostSpend)}</tspan>
                </text>
                {hoverData.benchSpend > 0 && (
                  <text x={tipW - 8} y="58" fill="#38bdf8" fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
                    เฉลี่ย ฿{formatAmount(Math.round(hoverData.benchSpend))}
                  </text>
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
