// src/views/Dashboard/components/SummaryCards/GhostPacer/SummaryGhostPacer.tsx
import React, { memo } from 'react';
import {
  Gauge, TrendingDown, TrendingUp, Flag, History,
  Compass, ArrowDownRight, ArrowUpRight, Minus, Ghost
} from 'lucide-react';
import { formatMoney, formatAmount } from '@/utils/formatters';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { Shimmer } from '../helpers';
import { GhostPacerChart } from './GhostPacerChart';
import type { SummaryAnalytics } from '../types';

interface SummaryGhostPacerProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryGhostPacer = memo(({ analytics, showSkeleton }: SummaryGhostPacerProps) => {
  const { ghostPacerDetails } = analytics;

  if (!ghostPacerDetails || !ghostPacerDetails.hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-canvas h-full border-t border-line">
        <History className="w-10 h-10 text-neutral-600 mb-3" />
        <p className="text-sm font-black uppercase tracking-wider text-neutral-300">
          การเทียบกับเดือนก่อนใช้ได้ในมุมมองรายเดือน
        </p>
        <p className="text-xs text-neutral-500 mt-1 max-w-md">
          กรุณาเลือกดูเป็น &quot;รายเดือน&quot; (เช่น เดือนปัจจุบัน หรือเดือนใดเดือนหนึ่ง) เพื่อเทียบกับยอดใช้จ่ายของเดือนก่อนหน้า
        </p>
      </div>
    );
  }

  const {
    currentPeriod,
    prevPeriod,
    currentDay,
    lastDayOfMonth,
    currentDailySeries,
    prevDailySeries,
    benchmarkDailySeries,
    currentSpendToDate,
    ghostSpendToDate,
    benchmarkSpendToDate,
    deltaVsGhost,
    deltaVsGhostPct,
    deltaVsBenchmark,
    deltaVsBenchmarkPct,
    projectedExpense,
    ghostTotalExpense,
    deltaEom,
    paceStatus,
  } = ghostPacerDetails;

  const isLeading = deltaVsGhost <= 0;
  const isBenchLeading = deltaVsBenchmark <= 0;
  const isEomLeading = deltaEom <= 0;

  const monthProgressPct = Math.min(100, Math.round((currentDay / Math.max(1, lastDayOfMonth)) * 100));

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* 1. Status Bar */}
      <div className="px-3.5 py-1.5 bg-surface border-b border-line flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400">จังหวะ:</span>
            <span
              className={`text-[11px] font-mono font-black uppercase px-1.5 py-0.5 border ${paceStatus.bg} ${paceStatus.border}`}
              style={{ color: paceStatus.color }}
            >
              {paceStatus.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-neutral-400">เทียบเดือนก่อน:</span>
            <span className={`font-bold ${isLeading ? 'text-emerald-400' : 'text-danger'}`}>
              {isLeading ? '▼ ช้ากว่า' : '▲ เร็วกว่า'} ฿{formatAmount(Math.abs(Math.round(deltaVsGhost)))} ({Math.abs(deltaVsGhostPct).toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-neutral-400">
            วันในงวด: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span>
            <span className="text-neutral-500"> ({monthProgressPct}%)</span>
          </span>
          <div className="w-16 h-1.5 bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
            <div
              className="h-full transition-none"
              style={{ width: `${monthProgressPct}%`, backgroundColor: paceStatus.color }}
            />
          </div>
        </div>
      </div>

      {/* 2. Ghost Pacer Radar Sparkline */}
      <GhostPacerChart
        currentDay={currentDay}
        lastDayOfMonth={lastDayOfMonth}
        currentDailySeries={currentDailySeries}
        prevDailySeries={prevDailySeries}
        benchmarkDailySeries={benchmarkDailySeries}
        projectedExpense={projectedExpense}
        ghostTotalExpense={ghostTotalExpense}
        paceColor={paceStatus.color}
        currentPeriod={currentPeriod}
        prevPeriod={prevPeriod}
      />

      {/* 3. 3-Column Telemetry Cockpit Pods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-surface-elevated flex-1">

        {/* POD 1: Head-to-Head with Ghost */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l border-l-expense">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <History size={13} className="text-expense shrink-0" />
              เทียบเดือนก่อน (วันที่ {currentDay})
            </span>
            <span className={`text-[11px] font-mono font-black uppercase px-1.5 py-0.5 border ${
              isLeading ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500' : 'bg-danger/10 text-danger border-danger'
            }`}>
              {isLeading ? 'ใช้น้อยกว่า' : 'ใช้มากกว่า'}
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                  isLeading ? 'text-emerald-400' : 'text-danger'
                }`}>
                  {isLeading ? '-' : '+'}฿<AnimatedNumber value={Math.abs(Math.round(deltaVsGhost))} />
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  {deltaVsGhostPct >= 0 ? '+' : ''}{deltaVsGhostPct.toFixed(1)}%
                </div>
              </div>
            )}

            {/* Comparison bars */}
            <div className="space-y-1.5 pt-1">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span className="text-expense font-bold">{currentPeriod} (เดือนนี้):</span>
                  <span className="text-white font-bold tabular-nums">฿{formatMoney(currentSpendToDate)}</span>
                </div>
                <div className="h-1 w-full bg-neutral-900 overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${Math.min(100, Math.max(5, (currentSpendToDate / Math.max(1, currentSpendToDate, ghostSpendToDate)) * 100))}%` }}
                    className="h-full bg-expense"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span className="text-neutral-400 inline-flex items-center gap-1"><Ghost size={10} className="shrink-0" /> {prevPeriod} (เดือนก่อน):</span>
                  <span className="text-neutral-300 font-bold tabular-nums">฿{formatMoney(ghostSpendToDate)}</span>
                </div>
                <div className="h-1 w-full bg-neutral-900 overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${Math.min(100, Math.max(5, (ghostSpendToDate / Math.max(1, currentSpendToDate, ghostSpendToDate)) * 100))}%` }}
                    className="h-full bg-neutral-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>จังหวะการใช้จ่าย:</span>
            <span className={isLeading ? 'text-emerald-400 font-bold' : 'text-danger font-bold'}>
              {isLeading ? 'ควบคุมงบได้นิ่งกว่า' : 'ใช้จ่ายเร็วกว่ารอบก่อน'}
            </span>
          </div>
        </div>

        {/* POD 2: 3-Month Benchmark */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l border-l-sky-500">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <Compass size={13} className="text-sky-400 shrink-0" />
              เกณฑ์เฉลี่ย 3 เดือน
            </span>
            <span className="text-[11px] font-mono text-sky-400 uppercase tracking-wider font-bold">
              เดือนก่อน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                  isBenchLeading ? 'text-sky-400' : 'text-amber-400'
                }`}>
                  {isBenchLeading ? '-' : '+'}฿<AnimatedNumber value={Math.abs(Math.round(deltaVsBenchmark))} />
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  {deltaVsBenchmarkPct >= 0 ? '+' : ''}{deltaVsBenchmarkPct.toFixed(1)}%
                </div>
              </div>
            )}

            <div className="mt-1 pt-1 border-t border-neutral-800/80 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">จ่ายสะสมเฉลี่ย 3 เดือน:</span>
                <span className="text-sky-400 font-bold tabular-nums">฿{formatMoney(benchmarkSpendToDate)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">จ่ายจริงเดือนนี้:</span>
                <span className="text-white font-bold tabular-nums">฿{formatMoney(currentSpendToDate)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>ความเร็วเทียบค่าเฉลี่ย:</span>
            <span className={isBenchLeading ? 'text-sky-400 font-bold' : 'text-amber-400 font-bold'}>
              {isBenchLeading ? 'ต่ำกว่าเกณฑ์เฉลี่ย' : 'สูงกว่าเกณฑ์เฉลี่ย'}
            </span>
          </div>
        </div>

        {/* POD 3: Finish Line Forecast */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l border-l-emerald-500">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <Flag size={13} className="text-emerald-400 shrink-0" />
              คาดการณ์ยอดสิ้นเดือน
            </span>
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider font-bold">
              เป้าสิ้นเดือน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl xl:text-3xl font-black text-white tabular-nums tracking-tight leading-none">
                  ฿<AnimatedNumber value={Math.round(projectedExpense)} />
                </div>
                <div className={`text-xs font-mono font-bold tabular-nums flex items-center gap-0.5 ${
                  isEomLeading ? 'text-emerald-400' : 'text-danger'
                }`}>
                  {isEomLeading ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  ฿{formatAmount(Math.abs(Math.round(deltaEom)))}
                </div>
              </div>
            )}

            <div className="mt-1 pt-1 border-t border-neutral-800/80 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400 inline-flex items-center gap-1"><Ghost size={10} className="shrink-0" /> ยอดจบจริงเดือนก่อน:</span>
                <span className="text-neutral-300 font-bold tabular-nums">฿{formatMoney(ghostTotalExpense)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">ประมาณการเดือนนี้:</span>
                <span className="text-white font-bold tabular-nums">฿{formatMoney(projectedExpense)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>แนวโน้มสิ้นเดือน:</span>
            <span className={isEomLeading ? 'text-emerald-400 font-bold' : 'text-danger font-bold'}>
              {isEomLeading ? 'ประหยัดกว่าเดือนก่อน' : 'ยอดจบสูงกว่าเดือนก่อน'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryGhostPacer.displayName = 'SummaryGhostPacer';
