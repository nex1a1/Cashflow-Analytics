// src/views/Dashboard/components/MainChart/SparklineGraph.tsx
// Small multiples: one mini line chart per expense category, ranked by how much it grew
// (last 3 complete periods vs the average before them). Each card has its own y-scale —
// compare shapes across cards, compare sizes via the numbers.
import React, { memo, useMemo, useState } from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { buildCategoryTrends, CategoryTrend } from '@/utils/categoryTrendHelpers';
import { formatAmount, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { isCyclePeriod, localTodayIso, monthKeyOf, stripCycle } from '@/utils/payCycle';
import { Category } from '@/types';

const W = 100;
const H = 40;
// analytics.monthlyCatMap is already in Baht (transactions are converted on fetch)
const baht = (v: number) => formatAmount(Math.round(v));
const periodTick = (key: string, cycle: boolean) =>
  `${cycle ? 'รอบ ' : ''}${THAI_MONTHS_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;

function ChangeBadge({ trend, cycle }: { trend: CategoryTrend; cycle: boolean }) {
  const { pctChange, comparisonType, priorAmount, periodAvg, priorKey } = trend;
  let label = 'ใหม่';
  let cls = 'bg-[#303030]/40 text-slate-400 border-[#3e3e3e]/40';
  let title = '';

  if (pctChange !== null) {
    const arrow = pctChange > 0 ? '↑' : pctChange < 0 ? '↓' : '';
    label = `${arrow} ${Math.abs(pctChange).toFixed(0)}%`;
    if (pctChange >= 5) cls = 'bg-[#da291c]/10 text-[#da291c] border-[#da291c]/25';
    else if (pctChange <= -5) cls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    if (comparisonType === 'avg') {
      title = `เทียบกับค่าเฉลี่ยรวมทั้งช่วง (${baht(periodAvg)} ฿/${cycle ? 'รอบ' : 'เดือน'})`;
    } else if (priorKey) {
      title = `เทียบกับงวดก่อนหน้า (${periodTick(priorKey, cycle)}: ${baht(priorAmount ?? 0)} ฿)`;
    }
  } else {
    title = comparisonType === 'mom' ? 'งวดก่อนหน้าไม่มียอดใช้จ่าย' : 'หมวดใหม่';
  }

  return (
    <span
      title={title}
      className={`shrink-0 inline-flex items-center px-1.5 py-[2px] text-[10px] font-black leading-none border rounded-none tabular-nums cursor-help ${cls}`}
    >
      {label}
    </span>
  );
}

interface MiniLineProps {
  trend: CategoryTrend;
  color: string;
  cycle: boolean;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
}

function MiniLine({ trend, color, cycle, hoveredIdx, onHover }: MiniLineProps) {
  const { series, keys, hasPartial } = trend;
  const max = Math.max(...series, 1);
  const n = series.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const solidEnd = hasPartial ? n - 1 : n;
  const solid = series.slice(0, solidEnd).map((v, i) => `${x(i)},${y(v)}`).join(' ');

  // Closed polygon for the subtle fill under the polyline
  const fillPoints = solidEnd > 1
    ? `${x(0)},${H - 2} ${solid} ${x(solidEnd - 1)},${H - 2}`
    : '';

  // Last completed data point coordinates
  const lastX = x(solidEnd - 1);
  const lastY = y(series[solidEnd - 1]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || n <= 1) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(n - 1, Math.round(relX * (n - 1))));
    onHover(idx);
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <div className="relative w-full h-12">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-full block cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Soft area tint under sparkline illuminated on hover */}
        {solidEnd > 1 && (
          <polygon
            points={fillPoints}
            fill={color}
            className={`pointer-events-none transition-none ${
              hoveredIdx !== null ? 'opacity-25' : 'opacity-0 group-hover:opacity-15'
            }`}
          />
        )}
        <line x1={0} x2={W} y1={H - 2} y2={H - 2} stroke="#303030" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline
          points={solid}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="group-hover:stroke-[2.25px]"
        />
        {/* Terminal data point dot (when not actively scrubbing) */}
        {solidEnd > 0 && hoveredIdx === null && (
          <circle
            cx={lastX}
            cy={lastY}
            r={2.2}
            fill={color}
            stroke="#181818"
            strokeWidth={0.8}
            className="opacity-0 group-hover:opacity-100"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {hasPartial && n > 1 && (
          <line
            x1={x(n - 2)} y1={y(series[n - 2])} x2={x(n - 1)} y2={y(series[n - 1])}
            stroke={color} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} vectorEffect="non-scaling-stroke"
            className="group-hover:opacity-90"
          />
        )}
        {hasPartial && n > 1 && hoveredIdx === null && (
          <circle
            cx={x(n - 1)}
            cy={y(series[n - 1])}
            r={1.8}
            fill={color}
            className="opacity-0 group-hover:opacity-75"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Active Scrubbed Crosshair & Dot */}
        {hoveredIdx !== null && (
          <g className="pointer-events-none">
            <line
              x1={x(hoveredIdx)}
              y1={0}
              x2={x(hoveredIdx)}
              y2={H - 2}
              stroke="#ffffff"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.4}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(hoveredIdx)}
              cy={y(series[hoveredIdx])}
              r={2.8}
              fill={color}
              stroke="#ffffff"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>

      {/* Floating Pill Tooltip above active scrubbed point */}
      {hoveredIdx !== null && (
        <div
          className="absolute pointer-events-none z-30 transition-none whitespace-nowrap"
          style={{
            left: `${(x(hoveredIdx) / W) * 100}%`,
            top: `${(y(series[hoveredIdx]) / H) * 100}%`,
            transform: 'translate(-50%, -135%)',
          }}
        >
          <div className="rounded-none bg-[#121212] border border-[#3e3e3e] shadow-2xl py-0.5 px-1.5 text-[9px] font-mono text-neutral-200 flex items-center gap-1">
            <span className="font-bold text-white">{baht(series[hoveredIdx])} ฿</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryTrendCardProps {
  trend: CategoryTrend;
  cat?: Category;
  cycle: boolean;
}

const CategoryTrendCard = memo(({ trend, cat, cycle }: CategoryTrendCardProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const color = cat?.color || '#94a3b8';
  const { keys, series, hasPartial } = trend;
  const n = keys.length;

  return (
    <div
      className="relative bg-[#181818] hover:bg-[#202020] px-3 pt-2.5 pb-2 flex flex-col gap-1.5 min-w-0 group cursor-default select-none overflow-hidden transition-none"
    >
      {/* Razor-sharp top hairline accent in category color */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center gap-1.5 min-w-0">
        <CategoryGlyph icon={cat?.icon} color={color} size={13} className="shrink-0" />
        <span className="text-[12px] font-bold text-neutral-200 group-hover:text-white truncate flex-1 tracking-tight">
          {cat?.name || 'ไม่ระบุ'}
        </span>
        <ChangeBadge trend={trend} cycle={cycle} />
      </div>

      <div className="flex items-baseline justify-between text-[11px] tabular-nums min-h-[18px]">
        {hoveredIdx !== null ? (
          <div className="flex items-center justify-between w-full">
            <span className="font-bold text-white flex items-center gap-1.5 min-w-0 truncate">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-300 font-mono">{periodTick(keys[hoveredIdx], cycle)}:</span>
              <span className="text-white font-bold">{baht(series[hoveredIdx])} ฿</span>
              {hasPartial && hoveredIdx === n - 1 && (
                <span className="text-amber-400 text-[10px] font-sans font-medium shrink-0">(ยังไม่จบ)</span>
              )}
            </span>
            <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
              {hoveredIdx + 1}/{n}
            </span>
          </div>
        ) : (
          <>
            <span
              className="text-neutral-100 font-bold group-hover:text-white"
              title={`เฉลี่ยต่องวดตลอดช่วงที่เลือก (${baht(trend.periodAvg)} ฿)`}
            >
              {baht(trend.periodAvg)} ฿<span className="text-slate-500 font-normal">/{cycle ? 'รอบ' : 'เดือน'}</span>
            </span>
            <span
              className="text-slate-500 group-hover:text-slate-400 cursor-help"
              title={trend.latestKey ? `ยอดงวดล่าสุด (${periodTick(trend.latestKey, cycle)}): ${baht(trend.latestAmount)} ฿` : undefined}
            >
              ล่าสุด {baht(trend.latestAmount)}
            </span>
          </>
        )}
      </div>

      <MiniLine
        trend={trend}
        color={color}
        cycle={cycle}
        hoveredIdx={hoveredIdx}
        onHover={setHoveredIdx}
      />
    </div>
  );
});
CategoryTrendCard.displayName = 'CategoryTrendCard';

export const SparklineGraph = memo(() => {
  const { analytics, categories, filterPeriod } = useDashboardContext();
  const cycle = isCyclePeriod(filterPeriod);
  const isAll = stripCycle(filterPeriod) === 'ALL';

  const trends = useMemo(
    () => buildCategoryTrends(
      analytics?.sortedMonthsKeys || [],
      analytics?.monthlyCatMap || {},
      monthKeyOf(localTodayIso(), filterPeriod),
      isAll,
    ),
    [analytics?.sortedMonthsKeys, analytics?.monthlyCatMap, filterPeriod, isAll],
  );
  const catById = useMemo(() => {
    const m: Record<string, Category> = {};
    (categories || []).forEach((c) => { m[String(c.id)] = c; });
    return m;
  }, [categories]);

  if (trends.length === 0) {
    return <div className="h-full flex items-center justify-center text-[12px] text-slate-500">ไม่มีรายจ่ายในช่วงที่เลือก</div>;
  }
  if (trends[0].keys.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-slate-500">
        ต้องเลือกช่วงเวลาอย่างน้อย 2 {cycle ? 'รอบ' : 'เดือน'} เพื่อดู Sparkline
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
      <div
        className="grid gap-[1px] bg-[#303030]/60 border border-[#303030]/60"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
      >
        {trends.map((t) => (
          <CategoryTrendCard
            key={t.catId}
            trend={t}
            cat={catById[t.catId]}
            cycle={cycle}
          />
        ))}
      </div>
    </div>
  );
});
SparklineGraph.displayName = 'SparklineGraph';
