// src/views/Dashboard/components/SummaryCards/GhostPacer/SummaryGhostPacer.tsx
import { memo, useState } from 'react';
import {
  Gauge, Flag, History,
  Compass, ArrowDownRight, ArrowUpRight, Ghost
} from 'lucide-react';
import { formatBaht, formatBahtShort } from '@/utils/formatters';
import { Shimmer } from '../helpers';
import { GhostPacerChart } from './GhostPacerChart';
import { paceTone, PACE_TONE_STYLE } from '@/utils/ghostPacerHelpers';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import type { SummaryAnalytics, GhostPacerDetails } from '../types';

interface SummaryGhostPacerProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

const readIncludeRent = () => {
  try { return localStorage.getItem(STORAGE_KEYS.GHOST_INCLUDE_RENT) === '1'; } catch { return false; }
};

/** A change against a comparison: the real minus comes from formatBaht, the plus is added here. */
const signedBaht = (delta: number) => `${delta > 0 ? '+' : ''}${formatBaht(delta)}`;

/** More spending reads red, less green. */
const GapAmount = ({ delta }: { delta: number }) => (
  <span className={`shrink-0 font-bold tabular-nums ${delta > 0 ? 'text-danger' : 'text-income'}`}>
    {signedBaht(delta)}
  </span>
);

/** Does leaving rent out change anything? (Rent only ahead of today still moves this month's forecast.) */
const rentMatters = (a: GhostPacerDetails, b: GhostPacerDetails) =>
  a.ghostTotalExpense !== b.ghostTotalExpense || a.currentSpendToDate !== b.currentSpendToDate || a.projectedExpense !== b.projectedExpense;

export const SummaryGhostPacer = memo(({ analytics, showSkeleton }: SummaryGhostPacerProps) => {
  const { ghostPacerDetails: withRent, ghostPacerDetailsNoRent: noRent } = analytics;
  const [includeRent, setIncludeRent] = useState(readIncludeRent);
  const flipIncludeRent = () => {
    const next = !includeRent;
    setIncludeRent(next);
    try { localStorage.setItem(STORAGE_KEYS.GHOST_INCLUDE_RENT, next ? '1' : '0'); } catch { /* private mode: just not remembered */ }
  };

  const canSwitch = Boolean(withRent && noRent && rentMatters(withRent, noRent));
  const ghostPacerDetails = canSwitch && !includeRent ? noRent : withRent;

  if (!ghostPacerDetails || !ghostPacerDetails.hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-canvas h-full border-t border-line">
        <History className="w-10 h-10 text-neutral-600 mb-3" />
        <p className="text-sm font-black uppercase text-neutral-300">
          การเทียบกับเดือนก่อนใช้ได้ในมุมมองรายเดือน
        </p>
        <p className="text-xs text-neutral-500 mt-1 max-w-md">
          กรุณาเลือกดูเป็น &quot;รายเดือน&quot; (เช่น เดือนปัจจุบัน หรือเดือนใดเดือนหนึ่ง) เพื่อเทียบกับยอดใช้จ่ายของเดือนก่อนหน้า
        </p>
      </div>
    );
  }

  const {
    isCurrentMonth,
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
    gapDrivers,
    gapOthers,
    beatGhostDaily,
    dailyPace,
    paceStatus,
  } = ghostPacerDetails;

  // Green = spending less, yellow = within ±5%, red = spending more (see paceTone)
  const ghostTone = paceTone(deltaVsGhost, ghostSpendToDate);
  const benchTone = paceTone(deltaVsBenchmark, benchmarkSpendToDate);
  const eomTone = paceTone(deltaEom, ghostTotalExpense);
  const ghost = PACE_TONE_STYLE[ghostTone];
  const bench = PACE_TONE_STYLE[benchTone];
  const eom = PACE_TONE_STYLE[eomTone];
  const isLeading = deltaVsGhost <= 0;
  const isEomLeading = deltaEom <= 0;

  const monthProgressPct = Math.min(100, Math.round((currentDay / Math.max(1, lastDayOfMonth)) * 100));
  const thisMonthLabel = isCurrentMonth ? 'เดือนนี้' : 'เดือนที่ดู';
  const showCauses = gapDrivers.length > 0 && !showSkeleton;

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* 1. Status Bar */}
      <div className="px-3.5 py-1.5 bg-surface border-b border-line flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase text-neutral-400">จังหวะ:</span>
            <span
              className={`text-[11px] font-mono font-black uppercase px-1.5 py-0.5 rounded-pill border ${paceStatus.bg} ${paceStatus.border}`}
              style={{ color: paceStatus.color }}
            >
              {paceStatus.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-neutral-400">เทียบเดือนก่อน:</span>
            <span className={`font-bold ${ghost.text}`}>
              {isLeading ? '▼ ช้ากว่า' : '▲ เร็วกว่า'} {formatBahtShort(Math.abs(Math.round(deltaVsGhost)))} ({Math.abs(deltaVsGhostPct).toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          {canSwitch && (
            <button
              type="button"
              aria-pressed={includeRent}
              onClick={flipIncludeRent}
              title="ค่าเช่าเป็นก้อนใหญ่ จ่ายต่างวันกันทีเดียวตัวเลขจะเหวี่ยงเท่าทั้งก้อน"
              className={`px-1.5 py-0.5 rounded-pill border font-bold focus:outline-hidden focus-visible:ring-1 focus-visible:ring-white ${
                includeRent ? 'bg-accent text-on-accent' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              รวมค่าเช่า
            </button>
          )}
          <span className="text-neutral-400">
            ผ่านไปแล้ว: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span>
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
        isCurrentMonth={isCurrentMonth}
      />

      {/* 3. 3-Column Telemetry Cockpit Pods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-elevated flex-1">

        {/* POD 1: Head-to-Head with Ghost */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <History size={13} className={`${ghost.text} shrink-0`} />
              เทียบเดือนก่อน (วันที่ {currentDay})
            </span>
            <span className={`shrink-0 whitespace-nowrap text-[11px] font-mono font-black uppercase px-1.5 py-0.5 rounded-pill border ${ghost.bg} ${ghost.text} ${ghost.border}`}>
              {{ LEAD: 'ใช้น้อยกว่า', TIED: 'ใกล้เคียง', TRAIL: 'ใช้มากกว่า' }[ghostTone]}
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${ghost.text}`}>
                  {signedBaht(deltaVsGhost)}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  {deltaVsGhostPct >= 0 ? '+' : ''}{deltaVsGhostPct.toFixed(1)}%
                </div>
              </div>
            )}

            {/* Comparison rows; their bars give way to the causes below, which keeps the card at the height of the other tabs */}
            <div className="space-y-1.5 pt-1">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span className={`${ghost.text} font-bold`}>{currentPeriod} ({thisMonthLabel}):</span>
                  <span className="text-white font-bold tabular-nums">{formatBaht(currentSpendToDate)}</span>
                </div>
                {!showCauses && (
                  <div className="h-1 w-full bg-neutral-900 overflow-hidden border border-neutral-800">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, (currentSpendToDate / Math.max(1, currentSpendToDate, ghostSpendToDate)) * 100))}%` }}
                      className={`h-full ${ghost.bar}`}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span className="text-neutral-400 inline-flex items-center gap-1"><Ghost size={10} className="shrink-0" /> {prevPeriod} (เดือนก่อน):</span>
                  <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(ghostSpendToDate)}</span>
                </div>
                {!showCauses && (
                  <div className="h-1 w-full bg-neutral-900 overflow-hidden border border-neutral-800">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, (ghostSpendToDate / Math.max(1, currentSpendToDate, ghostSpendToDate)) * 100))}%` }}
                      className="h-full bg-neutral-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {showCauses ? (
            <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col text-[11px] font-mono text-neutral-400">
              <span>ต่างจากเดือนก่อนเพราะ:</span>
              {gapDrivers.map(d => (
                <div
                  key={d.id}
                  className="flex justify-between items-center gap-2"
                  title={`${d.name}: ${thisMonthLabel} ${formatBaht(d.current)} · เดือนก่อน ${formatBaht(d.previous)}`}
                >
                  <span className="min-w-0 flex items-center gap-1.5">
                    <CategoryGlyph icon={d.icon} color={d.color} size={12} />
                    <span className="min-w-0 overflow-x-clip whitespace-nowrap text-ellipsis text-neutral-300">{d.name}</span>
                  </span>
                  <GapAmount delta={d.delta} />
                </div>
              ))}
              {Math.abs(gapOthers) >= 0.005 && (
                <div className="flex justify-between items-center gap-2">
                  <span>หมวดอื่นรวม:</span>
                  <GapAmount delta={gapOthers} />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>จังหวะการใช้จ่าย:</span>
              <span className={`${ghost.text} font-bold text-right`}>
                {{ LEAD: 'ควบคุมงบได้นิ่งกว่า', TIED: 'ใกล้เคียงเดือนก่อน', TRAIL: 'ใช้เร็วกว่าเดือนก่อน' }[ghostTone]}
              </span>
            </div>
          )}
        </div>

        {/* POD 2: 3-Month Benchmark */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <Compass size={13} className="text-sky-400 shrink-0" />
              เกณฑ์เฉลี่ย 3 เดือน
            </span>
            <span className="text-[11px] font-mono text-sky-400 uppercase font-bold">
              3 เดือนก่อน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${bench.text}`}>
                  {signedBaht(deltaVsBenchmark)}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  {deltaVsBenchmarkPct >= 0 ? '+' : ''}{deltaVsBenchmarkPct.toFixed(1)}%
                </div>
              </div>
            )}

            <div className="mt-1 pt-1 border-t border-neutral-800/80 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">จ่ายสะสมเฉลี่ย 3 เดือน:</span>
                <span className="text-sky-400 font-bold tabular-nums">{formatBaht(benchmarkSpendToDate)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">จ่ายจริง{thisMonthLabel}:</span>
                <span className="text-white font-bold tabular-nums">{formatBaht(currentSpendToDate)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>ความเร็วเทียบค่าเฉลี่ย:</span>
            <span className={`${bench.text} font-bold text-right`}>
              {{ LEAD: 'ต่ำกว่าเกณฑ์เฉลี่ย', TIED: 'ใกล้เคียงเกณฑ์เฉลี่ย', TRAIL: 'สูงกว่าเกณฑ์เฉลี่ย' }[benchTone]}
            </span>
          </div>
        </div>

        {/* POD 3: Finish Line Forecast */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">
          <div className="flex items-center justify-between gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <Flag size={13} className="text-emerald-400 shrink-0" />
              {isCurrentMonth ? 'คาดการณ์ยอดสิ้นเดือน' : 'ยอดจบเดือน'}
            </span>
            {isCurrentMonth && (
              <span className="text-[11px] font-mono text-neutral-400 uppercase font-bold">
                เป้าสิ้นเดือน
              </span>
            )}
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl xl:text-3xl font-black text-white tabular-nums tracking-tight leading-none">
                  {formatBaht(projectedExpense)}
                </div>
                <div className={`text-xs font-mono font-bold tabular-nums flex items-center gap-0.5 ${eom.text}`}>
                  {isEomLeading ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  {formatBahtShort(Math.abs(Math.round(deltaEom)))}
                </div>
              </div>
            )}

            <div className="mt-1 pt-1 border-t border-neutral-800/80 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400 inline-flex items-center gap-1"><Ghost size={10} className="shrink-0" /> ยอดจบจริงเดือนก่อน:</span>
                <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(ghostTotalExpense)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">{isCurrentMonth ? 'ประมาณการเดือนนี้:' : 'ยอดจบจริงเดือนที่ดู:'}</span>
                <span className="text-white font-bold tabular-nums">{formatBaht(projectedExpense)}</span>
              </div>
              {beatGhostDaily !== null && (
                <div className="flex justify-between items-center py-0.5" title={`ตอนนี้ใช้เฉลี่ย ${formatBaht(dailyPace)}/วัน`}>
                  <span className="text-neutral-400">เพื่อจบต่ำกว่าเดือนก่อน:</span>
                  {beatGhostDaily > 0 ? (
                    <span className={`font-bold tabular-nums ${PACE_TONE_STYLE[paceTone(dailyPace - beatGhostDaily, beatGhostDaily)].text}`}>
                      {formatBaht(beatGhostDaily)}/วัน
                    </span>
                  ) : (
                    <span className="font-bold text-danger">เกินยอดเดือนก่อนแล้ว</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>{isCurrentMonth ? 'แนวโน้มสิ้นเดือน:' : 'เทียบเดือนก่อน:'}</span>
            <span className={`${eom.text} font-bold text-right`}>
              {{ LEAD: 'ประหยัดกว่าเดือนก่อน', TIED: 'ใกล้เคียงเดือนก่อน', TRAIL: 'ยอดจบสูงกว่าเดือนก่อน' }[eomTone]}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryGhostPacer.displayName = 'SummaryGhostPacer';
