// src/views/Dashboard/components/ExpenseProportion/AllocationEvolutionChart.tsx
import React, { memo, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { THAI_MONTHS_SHORT, formatBaht } from '@/utils/formatters';
import type { AllocationEvolutionMonth } from '@/utils/allocationEvolutionHelpers';
import { tc, ALLOCATION_COLORS } from '@/constants/theme';
import { useSvgSize, linePath, MonoText } from '@/components/shared/svgChart';
import { BUDGET_RULES } from '../SummaryCards/helpers';

interface AllocationEvolutionChartProps {
  months: AllocationEvolutionMonth[];
  /** month / pay-cycle key containing today — later buckets are future-dated entries */
  currentKey: string;
}

// Matches the Needs/Wants/Savings palette (ALLOCATION_COLORS) across the app
const NEED_COLOR = ALLOCATION_COLORS.need;
const WANT_COLOR = ALLOCATION_COLORS.want;
const SAVINGS_COLOR = ALLOCATION_COLORS.savings;

const PAD_L = 38;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 26;
const TIP_W = 196;
const TIP_H = 100;

const monthName = (ym: string) => {
  const [y, m] = ym.split('-');
  return [THAI_MONTHS_SHORT[Number.parseInt(m, 10) - 1] || m, y] as const;
};
const monthTick = (ym: string) => { const [m, y] = monthName(ym); return `${m} '${y.slice(2)}`; };
const monthFull = (ym: string) => monthName(ym).join(' ');

const LEGEND: [string, string][] = [
  [NEED_COLOR, 'NEED เป้า 50%'],
  [WANT_COLOR, 'WANT เพดาน 30%'],
  [SAVINGS_COLOR, `SAVE เป้า ${BUDGET_RULES.surplus.min}%`],
];

export const AllocationEvolutionChart = memo(({ months, currentKey }: AllocationEvolutionChartProps) => {
  // Height is measured too (not fixed) so the chart fills whatever the shared grid-stacking cell gives it,
  // matching the Category/Allocation modes' height instead of capping its own.
  const [containerRef, { w: viewW, h: viewH }] = useSvgSize(800, 210);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const plotW = Math.max(10, viewW - PAD_L - PAD_R);
  const plotH = Math.max(10, viewH - PAD_T - PAD_B);
  const baseY = PAD_T + plotH;
  const xEnd = PAD_L + plotW;

  const lastIdx = Math.max(1, months.length - 1);
  const getX = (idx: number) => PAD_L + (idx / lastIdx) * plotW;
  const getY = (pct: number) => baseY - (Math.max(0, Math.min(100, pct)) / 100) * plotH;
  const pts = (vals: number[]) => vals.map((v, i) => [getX(i), getY(v)] as const);

  const needBoundary = months.map(m => m.needPct);
  const wantBoundary = months.map(m => m.needPct + m.wantPct);
  // Band between two boundaries: along the top, back along the bottom
  const band = (lower: number[], upper: number[]) =>
    `${linePath(pts(upper))} ${pts(lower).reverse().map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * viewW;
    setHoveredIdx(Math.round(Math.max(0, Math.min(1, (svgX - PAD_L) / plotW)) * lastIdx));
  };

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null;
  const hoverX = hoveredIdx !== null ? getX(hoveredIdx) : 0;
  const tipX = Math.max(PAD_L + 2, Math.min(viewW - TIP_W - 4, hoverX + TIP_W + 12 > viewW ? hoverX - TIP_W - 12 : hoverX + 12));

  const tickStride = months.length > 24 ? 3 : months.length > 12 ? 2 : 1;

  // Discipline callout: the latest month up to today that has data
  const withData = months.filter(m => m.ym <= currentKey && m.total > 0);
  const latest = withData.length > 0 ? withData[withData.length - 1] : months[months.length - 1];
  const breaches = !latest || latest.total === 0 ? [] : [
    latest.needPct > 50 && 'รายจ่ายจำเป็นเกินเป้า',
    latest.wantPct > 30 && 'รายจ่ายตามใจเกินเพดาน',
    latest.savingsPct < 20 && 'เงินเหลือต่ำกว่าเป้า',
  ].filter(Boolean);

  return (
    <div className="flex flex-col w-full h-full bg-canvas">
      <div className="flex items-center gap-4 px-3 py-2 bg-surface border-b border-line text-[11px] font-mono select-none flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-200">แนวโน้ม 50/30/20</span>
        </div>
        {LEGEND.map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 inline-block shrink-0" style={{ backgroundColor: color }} />
            <span className="text-neutral-300 font-bold">{label}</span>
          </div>
        ))}
      </div>

      <div ref={containerRef} className="w-full flex-1 min-h-[220px] relative px-1">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <filter id="evolutionTooltipShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {[0, 50, 80, 100].map(pct => {
            const target = pct === 50 || pct === 80;
            return (
              <g key={`hgrid-${pct}`}>
                <line
                  x1={PAD_L} y1={getY(pct)} x2={xEnd} y2={getY(pct)}
                  stroke={target ? tc('ink-body') : tc('line')} strokeWidth={1}
                  strokeDasharray={target ? '4 3' : undefined} opacity={target ? 0.7 : 1}
                />
                <MonoText x={PAD_L - 8} y={getY(pct) + 3.5} fill={tc('ink-body')} textAnchor="end">{pct}%</MonoText>
                {pct === 80 && <MonoText x={xEnd} y={getY(pct) - 5} fill={tc('ink-soft')} textAnchor="end">80% = จำเป็น+ตามใจ</MonoText>}
              </g>
            );
          })}

          {/* Stacked 100% bands; a month with no data collapses to a notch instead of a fabricated 100% savings fill */}
          <path d={band(months.map(() => 0), needBoundary)} fill={NEED_COLOR} fillOpacity="0.85" />
          <path d={band(needBoundary, wantBoundary)} fill={WANT_COLOR} fillOpacity="0.8" />
          <path d={band(wantBoundary, months.map(m => (m.total > 0 ? 100 : 0)))} fill={SAVINGS_COLOR} fillOpacity="0.55" />

          {[needBoundary, wantBoundary].map((b, i) => (
            <path key={i} d={linePath(pts(b))} fill="none" stroke={tc('canvas')} strokeWidth="1" opacity="0.6" />
          ))}

          {/* 50% / 80% guides again on top of the bands */}
          {[50, 80].map(pct => (
            <line
              key={`hguideline-${pct}`} x1={PAD_L} y1={getY(pct)} x2={xEnd} y2={getY(pct)}
              stroke={tc('ink-display')} strokeOpacity={pct === 80 ? 0.35 : 0.28} strokeWidth={1} strokeDasharray="4 3"
            />
          ))}

          {months.map((m, i) => {
            const isHovered = hoveredIdx === i;
            const isLabeled = months.length <= 12 || (i % (months.length > 24 ? 3 : 2) === 0) || i === 0 || i === lastIdx;
            return (
              <line
                key={`vgrid-${m.ym}`} x1={getX(i)} y1={PAD_T} x2={getX(i)} y2={baseY}
                stroke={tc('ink-display')} strokeOpacity={isHovered ? 0.8 : isLabeled ? 0.24 : 0.12}
                strokeWidth={isHovered ? 1.5 : 1} strokeDasharray={isHovered ? '3 2' : '3 3'}
              />
            );
          })}

          <line x1={PAD_L} y1={baseY} x2={xEnd} y2={baseY} stroke={tc('line-strong')} strokeWidth={1} />

          {/* Month ticks: first, last, hovered, and every stride (skipping one that would crowd the last) */}
          {months.map((m, i) => {
            const isLast = i === months.length - 1;
            const isHovered = hoveredIdx === i;
            const tooCloseToLast = (months.length - 1 - i) < tickStride && !isLast;
            if (!(i === 0 || isLast || isHovered || (i % tickStride === 0 && !tooCloseToLast))) return null;
            return (
              <MonoText
                key={m.ym} x={getX(i)} y={viewH - PAD_B + 15} textAnchor="middle"
                fill={isHovered ? tc('ink-display') : tc('ink-body')} fontWeight={isHovered ? 'bold' : 'normal'}
              >
                {monthTick(m.ym)}
              </MonoText>
            );
          })}

          {hovered && hoveredIdx !== null && (
            <g className="pointer-events-none select-none">
              <line x1={hoverX} y1={PAD_T} x2={hoverX} y2={baseY} stroke={tc('ink-display')} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.75" />

              {/* Dots pin the tooltip's numbers to their band boundary */}
              {hovered.total > 0 && (
                <>
                  {[[needBoundary[hoveredIdx], NEED_COLOR], [wantBoundary[hoveredIdx], WANT_COLOR], [100, SAVINGS_COLOR]].map(([pct, color]) => (
                    <circle key={color} cx={hoverX} cy={getY(pct as number)} r="4" fill={color as string} stroke={tc('canvas')} strokeWidth="1.5" />
                  ))}
                </>
              )}

              <g transform={`translate(${tipX}, ${PAD_T + 4})`}>
                <rect x="0" y="0" width={TIP_W} height={TIP_H} fill={tc('surface-hover')} stroke={tc('line-strong')} strokeWidth="1.2" rx="3" filter="url(#evolutionTooltipShadow)" />
                <MonoText x="10" y="17" fill={tc('ink-display')} fontSize="11.5" fontWeight="bold">{monthFull(hovered.ym)}</MonoText>
                {hovered.total === 0 ? (
                  <MonoText x="10" y="36" fill={tc('ink-body')}>ไม่มีข้อมูล</MonoText>
                ) : ([
                  [NEED_COLOR, 'จำเป็น', hovered.needAmt, hovered.needPct, hovered.needPct > 50],
                  [WANT_COLOR, 'ตามใจ', hovered.wantAmt, hovered.wantPct, hovered.wantPct > 30],
                  [SAVINGS_COLOR, 'เหลือ', hovered.savingsAmt, hovered.savingsPct, hovered.savingsPct < 20],
                ] as const).map(([color, label, amt, pct, off], i) => (
                  <MonoText key={label} x="10" y={38 + i * 20}>
                    <tspan fill={color} fontWeight="bold">■</tspan>
                    <tspan fill={tc('ink-display')} dx="4">{label} {formatBaht(amt)}</tspan>
                    <tspan fill={off ? tc('danger') : tc('ink-soft')} fontWeight="bold" dx="4">({pct.toFixed(0)}%)</tspan>
                  </MonoText>
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>

      {breaches.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-line text-[11px] font-mono text-danger bg-danger/5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold">{monthFull(latest.ym)}: {breaches.join(' • ')}</span>
        </div>
      )}
    </div>
  );
});

AllocationEvolutionChart.displayName = 'AllocationEvolutionChart';
