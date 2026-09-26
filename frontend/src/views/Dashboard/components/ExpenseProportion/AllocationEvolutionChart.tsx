// src/views/Dashboard/components/ExpenseProportion/AllocationEvolutionChart.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { formatMoney, THAI_MONTHS_SHORT } from '@/utils/formatters';
import type { AllocationEvolutionMonth } from '@/utils/allocationEvolutionHelpers';


import { tc, FONT_MONO, ALLOCATION_COLORS } from '@/constants/theme';
interface AllocationEvolutionChartProps {
  months: AllocationEvolutionMonth[];
  /** month / pay-cycle key containing today — later buckets are future-dated entries */
  currentKey: string;
}

// Matches the Needs/Wants/Savings palette (ALLOCATION_COLORS) across the app
const NEED_COLOR = ALLOCATION_COLORS.need;
const WANT_COLOR = ALLOCATION_COLORS.want;
const SAVINGS_COLOR = ALLOCATION_COLORS.savings;

function monthTick(ym: string): string {
  const [y, m] = ym.split('-');
  const mIdx = Number.parseInt(m, 10) - 1;
  return `${THAI_MONTHS_SHORT[mIdx] || m} '${y.slice(2)}`;
}

function monthFull(ym: string): string {
  const [y, m] = ym.split('-');
  const mIdx = Number.parseInt(m, 10) - 1;
  return `${THAI_MONTHS_SHORT[mIdx] || m} ${y}`;
}

export const AllocationEvolutionChart = memo(({ months, currentKey }: AllocationEvolutionChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(800);
  // Tracks the actual available height too (not a fixed constant) so the
  // chart fills whatever the shared grid-stacking cell gives it — matching
  // the Category/Allocation modes' height instead of capping its own.
  const [viewH, setViewH] = useState(210);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 0) setViewW(w);
      if (h > 0) setViewH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = Math.max(10, viewW - padL - padR);
  const plotH = Math.max(10, viewH - padT - padB);

  const lastIdx = Math.max(1, months.length - 1);
  const getX = (idx: number) => padL + (idx / lastIdx) * plotW;
  const getY = (pct: number) => padT + plotH - (Math.max(0, Math.min(100, pct)) / 100) * plotH;

  const needBoundary = months.map(m => m.needPct);
  const wantBoundary = months.map(m => m.needPct + m.wantPct);

  const buildBandPath = (lower: number[] | null, upper: number[]) => {
    const upperPts = upper.map((v, i) => [getX(i), getY(v)] as [number, number]);
    const lowerPts = lower
      ? lower.map((v, i) => [getX(i), getY(v)] as [number, number])
      : upper.map((_, i) => [getX(i), getY(0)] as [number, number]);
    const forward = upperPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    const backward = [...lowerPts].reverse().map(([x, y]) => `L ${x} ${y}`).join(' ');
    return `${forward} ${backward} Z`;
  };

  const needPath = buildBandPath(null, needBoundary);
  const wantPath = buildBandPath(needBoundary, wantBoundary);
  // A month with no data at all collapses to a zero-height notch instead of
  // a fabricated 100% savings fill (savings upper bound only reaches 100
  // where there's real data for that month).
  const savingsPath = buildBandPath(wantBoundary, months.map(m => (m.total > 0 ? 100 : 0)));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * viewW;
    const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
    const idx = Math.round(ratio * lastIdx);
    if (idx !== hoveredIdx) setHoveredIdx(idx);
  };

  const handleMouseLeave = () => setHoveredIdx(null);

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null;

  const tipW = 196;
  const tipH = 100;
  let tooltipX = 0;
  let tooltipY = padT + 4;
  if (hovered) {
    const x = getX(hoveredIdx as number);
    tooltipX = x + tipW + 12 > viewW ? x - tipW - 12 : x + 12;
    tooltipX = Math.max(padL + 2, Math.min(viewW - tipW - 4, tooltipX));
  }

  return (
    <div className="flex flex-col w-full h-full bg-canvas">
      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">
            50/30/20 EVOLUTION
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block shrink-0" style={{ backgroundColor: NEED_COLOR }} />
          <span className="text-neutral-300 font-bold">จำเป็น (Needs) เป้า 50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block shrink-0" style={{ backgroundColor: WANT_COLOR }} />
          <span className="text-neutral-300 font-bold">ต้องการ (Wants) เพดาน 30%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block shrink-0" style={{ backgroundColor: SAVINGS_COLOR }} />
          <span className="text-neutral-300 font-bold">เงินออม (Savings) เป้า 20%</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="w-full flex-1 min-h-[220px] relative px-1">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id="evolutionTooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Y-axis 0/50/80/100 gridlines */}
          {[0, 50, 80, 100].map((pct) => (
            <g key={`hgrid-${pct}`}>
              <line
                x1={padL}
                y1={getY(pct)}
                x2={padL + plotW}
                y2={getY(pct)}
                stroke={pct === 50 || pct === 80 ? tc('ink-body') : tc('line')}
                strokeWidth={pct === 50 || pct === 80 ? 1 : 1}
                strokeDasharray={pct === 50 || pct === 80 ? '4 3' : undefined}
                opacity={pct === 50 || pct === 80 ? 0.7 : 1}
              />
              <text x={padL - 8} y={getY(pct) + 3.5} fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
                {pct}%
              </text>
              {pct === 80 && (
                <text x={padL + plotW} y={getY(pct) - 5} fill={tc('ink-soft')} fontSize="11" fontFamily={FONT_MONO} textAnchor="end">
                  80% = จำเป็น+ต้องการ
                </text>
              )}
            </g>
          ))}

          {/* Stacked 100% bands */}
          <path d={needPath} fill={NEED_COLOR} fillOpacity="0.85" />
          <path d={wantPath} fill={WANT_COLOR} fillOpacity="0.8" />
          <path d={savingsPath} fill={SAVINGS_COLOR} fillOpacity="0.55" />

          {/* Band boundary hairlines */}
          <path
            d={needBoundary.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ')}
            fill="none"
            stroke={tc('canvas')}
            strokeWidth="1"
            opacity="0.6"
          />
          <path
            d={wantBoundary.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ')}
            fill="none"
            stroke={tc('canvas')}
            strokeWidth="1"
            opacity="0.6"
          />

          {/* Horizontal guidelines (50% and 80%) rendered on top of bands for crisp visibility */}
          {[50, 80].map((pct) => (
            <line
              key={`hguideline-${pct}`}
              x1={padL}
              y1={getY(pct)}
              x2={padL + plotW}
              y2={getY(pct)}
              stroke="#ffffff"
              strokeOpacity={pct === 80 ? 0.35 : 0.28}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          ))}

          {/* Vertical month gridlines rendered on top of bands for clear alignment */}
          {months.map((m, i) => {
            const isHovered = hoveredIdx === i;
            const isLabeled = months.length <= 12 || (i % (months.length > 24 ? 3 : 2) === 0) || i === 0 || i === lastIdx;
            return (
              <line
                key={`vgrid-${m.ym}`}
                x1={getX(i)}
                y1={padT}
                x2={getX(i)}
                y2={padT + plotH}
                stroke="#ffffff"
                strokeOpacity={isHovered ? 0.8 : isLabeled ? 0.24 : 0.12}
                strokeWidth={isHovered ? 1.5 : 1}
                strokeDasharray={isHovered ? '3 2' : '3 3'}
              />
            );
          })}

          {/* Plot bottom border line */}
          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
            y2={padT + plotH}
            stroke={tc('line-strong')}
            strokeWidth={1}
          />

          {/* Month ticks */}
          {(() => {
            const tickStride = months.length > 24 ? 3 : months.length > 12 ? 2 : 1;
            return months.map((m, i) => {
              const isFirst = i === 0;
              const isLast = i === months.length - 1;
              const isHovered = hoveredIdx === i;
              const isStride = i % tickStride === 0;
              // Avoid rendering a stride tick if it's too close to the pinned last tick
              const tooCloseToLast = (months.length - 1 - i) < tickStride && !isLast;
              const isVisible = isFirst || isLast || isHovered || (isStride && !tooCloseToLast);

              if (!isVisible) return null;

              return (
                <text
                  key={m.ym}
                  x={getX(i)}
                  y={viewH - padB + 15}
                  fill={isHovered ? '#ffffff' : tc('ink-body')}
                  fontSize="11"
                  fontFamily={FONT_MONO}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {monthTick(m.ym)}
                </text>
              );
            });
          })()}

          {/* Hover crosshair + per-band markers + tooltip */}
          {hovered && (
            <g className="pointer-events-none select-none">
              <line
                x1={getX(hoveredIdx as number)}
                y1={padT}
                x2={getX(hoveredIdx as number)}
                y2={padT + plotH}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                opacity="0.75"
              />

              {/* Marker dots pinning the tooltip's numbers to their exact band boundary */}
              {hovered.total > 0 && (
                <>
                  <circle cx={getX(hoveredIdx as number)} cy={getY(needBoundary[hoveredIdx as number])} r="4" fill={NEED_COLOR} stroke={tc('canvas')} strokeWidth="1.5" />
                  <circle cx={getX(hoveredIdx as number)} cy={getY(wantBoundary[hoveredIdx as number])} r="4" fill={WANT_COLOR} stroke={tc('canvas')} strokeWidth="1.5" />
                  <circle cx={getX(hoveredIdx as number)} cy={getY(100)} r="4" fill={SAVINGS_COLOR} stroke={tc('canvas')} strokeWidth="1.5" />
                </>
              )}

              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect
                  x="0" y="0" width={tipW} height={tipH}
                  fill={tc('surface-hover')} stroke={tc('line-strong')} strokeWidth="1.2" rx="3"
                  filter="url(#evolutionTooltipShadow)"
                />
                <text x="10" y="17" fill="#ffffff" fontSize="11.5" fontFamily={FONT_MONO} fontWeight="bold">
                  {monthFull(hovered.ym)}
                </text>
                {hovered.total === 0 ? (
                  <text x="10" y="36" fill={tc('ink-body')} fontSize="11" fontFamily={FONT_MONO}>
                    ไม่มีข้อมูล
                  </text>
                ) : (
                  <>
                    <text x="10" y="38" fontSize="11" fontFamily={FONT_MONO}>
                      <tspan fill={NEED_COLOR} fontWeight="bold">■</tspan>
                      <tspan fill={tc('ink-display')} dx="4">จำเป็น ฿{formatMoney(hovered.needAmt)}</tspan>
                      <tspan fill={hovered.needPct > 50 ? tc('danger') : tc('ink-soft')} fontWeight="bold" dx="4">({hovered.needPct.toFixed(0)}%)</tspan>
                    </text>
                    <text x="10" y="58" fontSize="11" fontFamily={FONT_MONO}>
                      <tspan fill={WANT_COLOR} fontWeight="bold">■</tspan>
                      <tspan fill={tc('ink-display')} dx="4">ต้องการ ฿{formatMoney(hovered.wantAmt)}</tspan>
                      <tspan fill={hovered.wantPct > 30 ? tc('danger') : tc('ink-soft')} fontWeight="bold" dx="4">({hovered.wantPct.toFixed(0)}%)</tspan>
                    </text>
                    <text x="10" y="78" fontSize="11" fontFamily={FONT_MONO}>
                      <tspan fill={SAVINGS_COLOR} fontWeight="bold">■</tspan>
                      <tspan fill={tc('ink-display')} dx="4">ออม ฿{formatMoney(hovered.savingsAmt)}</tspan>
                      <tspan fill={hovered.savingsPct < 20 ? tc('danger') : tc('ink-soft')} fontWeight="bold" dx="4">({hovered.savingsPct.toFixed(0)}%)</tspan>
                    </text>
                  </>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Discipline callout for the most recent month */}
      {months.length > 0 && (() => {
        const activePastOrCurrent = months.filter(m => m.ym <= currentKey && m.total > 0);
        const latest = activePastOrCurrent.length > 0 
          ? activePastOrCurrent[activePastOrCurrent.length - 1] 
          : months[months.length - 1];
        if (!latest || latest.total === 0) return null;
        const breaches: string[] = [];
        if (latest.needPct > 50) breaches.push('รายจ่ายจำเป็นเกินเป้า');
        if (latest.wantPct > 30) breaches.push('รายจ่ายฟุ่มเฟือยเกินเพดาน');
        if (latest.savingsPct < 20) breaches.push('เงินออมต่ำกว่าเป้า');
        if (breaches.length === 0) return null;
        return (
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-line text-[11px] font-mono text-danger bg-danger/5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">{monthFull(latest.ym)}: {breaches.join(' • ')}</span>
          </div>
        );
      })()}
    </div>
  );
});

AllocationEvolutionChart.displayName = 'AllocationEvolutionChart';
