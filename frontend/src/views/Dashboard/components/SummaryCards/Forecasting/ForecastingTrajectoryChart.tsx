import React, { memo, useEffect, useRef, useState } from 'react';
import { formatMoney } from '@/utils/formatters';

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
  const spentToDate = fixedTotal + variableUpToToday;
  const ceiling = Math.max(1, maxAllowedExpense);
  const totalDays = Math.max(1, lastDayOfMonth);
  const curDayClamped = Math.max(1, Math.min(currentDay, totalDays));

  // Measure real pixel width so the viewBox maps 1:1 to CSS pixels.
  // preserveAspectRatio="none" over a fixed 800-unit viewBox stretched
  // non-uniformly to fill wide cards, distorting strokes/text — see bug report.
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(800);
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
  const padL = 48;
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

  return (
    <div className="relative w-full bg-[#121212] border-b border-[#2d2d2d] select-none">
      {/* Trajectory Legend — colors are decoded here once; the numbers themselves live on the chart's own waypoint badges and the pods below, not repeated in this row. */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-[#141414] border-b border-[#242424] text-[10px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-200">
            TRAJECTORY RADAR
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-[2px] bg-rose-400 inline-block" />
          <span className="text-neutral-400">จ่ายจริงสะสม</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-[2px] border-t border-dashed ${isSurplus ? 'border-emerald-400' : 'border-[#da291c]'} inline-block`} />
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
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="forecastActualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
            </linearGradient>

            <linearGradient id="forecastSurplusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isSurplus ? "#10b981" : "#da291c"} stopOpacity={isSurplus ? "0.22" : "0.28"} />
              <stop offset="100%" stopColor={isSurplus ? "#10b981" : "#da291c"} stopOpacity="0.03" />
            </linearGradient>
          </defs>

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
            stroke="#525252"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* 4. Ceiling Right Badge */}
          <g transform={`translate(${xEOM + 6}, ${ceilLabelY - 7})`}>
            <rect x="0" y="0" width="124" height="15" fill="#181818" stroke="#525252" strokeWidth="0.8" rx="2" />
            <text x="6" y="11" fill="#a3a3a3" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              เพดาน ฿{formatMoney(ceiling)}
            </text>
          </g>

          {/* 5. Actual Spend Curve — real per-day cumulative points, straight segments, single color */}
          <path
            d={actualPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 6. Projected Trajectory Line (Dashed) */}
          <path
            d={projectedPath}
            fill="none"
            stroke={isSurplus ? "#10b981" : "#da291c"}
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
            stroke="#525252"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle cx={xToday} cy={yToday} r="6" fill="#f43f5e" fillOpacity="0.3" />
          <circle cx={xToday} cy={yToday} r="2.5" fill="#f43f5e" />

          {/* 8. Today Floating Badge Callout */}
          <g transform={`translate(${clampedPillX}, ${pillY})`}>
            <rect
              x={-pillW / 2}
              y="0"
              width={pillW}
              height={pillH}
              fill="#181818"
              stroke="#f43f5e"
              strokeWidth="1"
              rx="2"
            />
            <text
              x="0"
              y="11"
              fill="#f43f5e"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              วันนี้: ฿{formatMoney(spentToDate)}
            </text>
          </g>

          {/* 9. EOM Destination Node & Right Badge */}
          <circle cx={xEOM} cy={yEOM} r="3.5" fill={isSurplus ? "#10b981" : "#da291c"} />
          <g transform={`translate(${xEOM + 6}, ${eomLabelY - 7})`}>
            <rect
              x="0"
              y="0"
              width="124"
              height="15"
              fill="#181818"
              stroke={isSurplus ? "#10b981" : "#da291c"}
              strokeWidth="0.8"
              rx="2"
            />
            <text
              x="6"
              y="11"
              fill={isSurplus ? "#10b981" : "#da291c"}
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              จบเดือน ฿{formatMoney(projectedExpense)}
            </text>
          </g>

          {/* 10. Bottom Axis Timeline Ticks */}
          <line x1={padL} y1={padT + plotH} x2={xEOM} y2={padT + plotH} stroke="#333333" strokeWidth="1" />
          <text x={padL} y={padT + plotH + 12} fill="#737373" fontSize="8.5" fontFamily="monospace">Day 1</text>
          <text x={xToday} y={padT + plotH + 12} fill="#a3a3a3" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            Day {curDayClamped} (วันนี้)
          </text>
          <text x={xEOM} y={padT + plotH + 12} fill="#737373" fontSize="8.5" fontFamily="monospace" textAnchor="end">
            Day {totalDays}
          </text>
        </svg>
      </div>
    </div>
  );
});

ForecastingTrajectoryChart.displayName = 'ForecastingTrajectoryChart';
