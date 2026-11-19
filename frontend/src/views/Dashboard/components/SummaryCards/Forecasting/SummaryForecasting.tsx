import { memo } from 'react';
import {
  TrendingDown, Gauge, ShieldCheck, Home, Wallet, Navigation,
  Zap, Award, AlertTriangle, CheckCircle2, Target, ShoppingBag, MoveVertical
} from 'lucide-react';
import { formatBaht, formatMoney } from '@/utils/formatters';
import { Shimmer } from '../helpers';
import { ForecastingTrajectoryChart } from './ForecastingTrajectoryChart';
import type { SummaryAnalytics, ForecastingDetails } from '../types';

import { tc } from '@/constants/theme';
import { BUDGET_RULES } from '@/constants/budgetRules';
interface SummaryForecastingProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryForecasting = memo(({ analytics, showSkeleton }: SummaryForecastingProps) => {
  const { showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails } = analytics;

  if (!showForecasting) return null;

  const details = forecastingDetails || {} as ForecastingDetails;
  const currentDay              = details.currentDay              || 1;
  const lastDayOfMonth          = details.lastDayOfMonth          || 30;
  const remainingDays           = details.remainingDays           || 0;
  const monthProgressPct        = details.monthProgressPct        || 0;
  const fixedTotal              = details.fixedTotal              || 0;
  const variableUpToToday       = details.variableUpToToday       || 0;
  const projectedVariableRemaining = details.projectedVariableRemaining || 0;
  const actualDailyVariableAvg  = details.actualDailyVariableAvg  || 0;
  const projectedSurplusPct     = details.projectedSurplusPct     || 0;
  const maxAllowedExpense        = details.maxAllowedExpense       || 0;
  const requiredReduction        = details.requiredReduction       || 0;
  const requiredDailyReduction   = details.requiredDailyReduction  || 0;
  const actualDailySeries        = details.actualDailySeries        || [];
  const pendingFixed             = details.pendingFixed             || 0;
  const pendingFixedItems        = details.pendingFixedItems        || [];
  const estimatedIncome          = details.estimatedIncome          || 0;
  const oneOffExcluded           = details.oneOffExcluded           || 0;
  const plannedAhead             = details.plannedAhead             || 0;
  const targetExpense            = details.targetExpense            || 0;
  const targetShortfall          = details.targetShortfall          || 0;
  const safeToSpendForTarget     = details.safeToSpendForTarget     || 0;
  const projectedRange           = details.projectedRange           ?? null;
  const paceStatus  = details.paceStatus  || { label: 'คุมงบได้ดี', color: tc('income'), bg: 'bg-emerald-950/30' };
  const eomStatus   = details.eomStatus   || { label: 'โซนปลอดภัยสูง', color: tc('income'), bg: 'bg-emerald-950/40', border: 'border-emerald-500' };

  const headroom            = safeToSpend - actualDailyVariableAvg;
  const actualSafePaceRatio = safeToSpend > 0 ? (actualDailyVariableAvg / safeToSpend) * 100 : 100;
  const safePaceBarWidth    = Math.min(100, Math.max(0, actualSafePaceRatio));
  const hasOneOff           = oneOffExcluded >= 1;

  // Same verdict as the status bar: under the leftover target is not "safe", it just is not a deficit yet.
  const leftoverTarget = BUDGET_RULES.surplus.min;
  const isDeficit      = projectedSurplus < 0;
  const isUnderTarget  = !isDeficit && projectedSurplusPct < leftoverTarget;
  const surplusText    = isDeficit ? 'text-danger' : isUnderTarget ? 'text-warn' : 'text-emerald-400';
  const targetLeftover = (maxAllowedExpense * leftoverTarget) / 100;
  const paceRemaining  = Math.max(0, projectedVariableRemaining - plannedAhead);

  // Stacked proportions
  const totalProj  = Math.max(1, projectedExpense);
  const fixedPct   = Math.min(100, Math.max(0, (fixedTotal / totalProj) * 100));
  const varSpentPct = Math.min(100, Math.max(0, (variableUpToToday / totalProj) * 100));
  const varRemPct  = Math.min(100, Math.max(0, (projectedVariableRemaining / totalProj) * 100));

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* 1. Status Bar — the one place pace/EOM status and day-count live; the ceiling value itself lives on the chart and next to Pod 1's headline, not repeated here. */}
      <div className="px-3.5 py-1.5 bg-surface border-b border-line flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase text-neutral-400">จังหวะใช้จ่าย:</span>
          <span
            className="text-[11px] font-mono font-black uppercase px-1.5 py-0.5 rounded-pill border"
            style={{ backgroundColor: `${paceStatus.color}15`, color: paceStatus.color, borderColor: `${paceStatus.color}40` }}
          >
            {paceStatus.label}
          </span>
        </div>

        <div
          className={`px-1.5 py-0.5 rounded-pill border text-[11px] font-mono font-black uppercase flex items-center gap-1 ${eomStatus.bg} ${eomStatus.border}`}
          style={{ color: eomStatus.color }}
        >
          <ShieldCheck className="w-3 h-3 shrink-0" />
          <span>{eomStatus.label}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-neutral-400">
            ผ่านไปแล้ว: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span>
            <span className="text-neutral-500"> ({monthProgressPct.toFixed(0)}%)</span>
          </span>
          <div className="w-20 h-1.5 bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
            <div
              className="h-full transition-none"
              style={{ width: `${Math.min(100, monthProgressPct)}%`, backgroundColor: paceStatus.color }}
            />
          </div>
          <span className="text-neutral-400">
            เหลือ <span className="text-neutral-200 font-bold">{remainingDays} วัน</span>
          </span>
        </div>
      </div>

      {/* 2. Trajectory Radar Sparkline Graph with Waypoint HUD */}
      <ForecastingTrajectoryChart
        currentDay={currentDay}
        lastDayOfMonth={lastDayOfMonth}
        maxAllowedExpense={maxAllowedExpense}
        fixedTotal={fixedTotal}
        variableUpToToday={variableUpToToday}
        projectedExpense={projectedExpense}
        projectedSurplus={projectedSurplus}
        actualDailySeries={actualDailySeries}
        targetExpense={targetExpense}
        projectedRange={projectedRange}
      />

      {/* 3. 3-Column Cockpit Telemetry Pods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-elevated flex-1">

        {/* POD 1: Monthly Outflow Forecast */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">

          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <TrendingDown size={13} className="text-expense shrink-0" />
              คาดว่าจะใช้ทั้งเดือน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl xl:text-3xl font-black text-expense tabular-nums tracking-tight leading-none">
                  {formatMoney(projectedExpense)}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums whitespace-nowrap">
                  รายรับ {formatBaht(maxAllowedExpense)}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 flex overflow-hidden border border-neutral-800">
                <div style={{ width: `${fixedPct}%` }} className="bg-sky-400" title="บิลประจำ" />
                <div style={{ width: `${varSpentPct}%` }} className="bg-expense" title="ใช้ไปแล้ว" />
                <div style={{ width: `${varRemPct}%` }} className="bg-neutral-600" title="คาดว่าใช้อีก" />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span className="text-sky-400">บิลประจำ {fixedPct.toFixed(0)}%</span>
                <span className="text-expense">ใช้ไปแล้ว {varSpentPct.toFixed(0)}%</span>
                <span className="text-neutral-400">คาดว่าใช้อีก {varRemPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Home size={12} className="text-sky-400 shrink-0" />
                บิลประจำ (ค่าหอ + ค่าสมาชิก):
              </span>
              <span className="text-sky-400 font-bold tabular-nums">{formatBaht(fixedTotal)}</span>
            </div>
            {pendingFixed > 0 && (
              <div
                className="flex justify-between items-center py-0.5 pl-[18px]"
                title={pendingFixedItems.map(i => `${i.name} ${formatBaht(i.amount)}`).join(', ')}
              >
                <span className="text-neutral-400">ในนี้ยังไม่ได้ลง (คาดจากเดือนก่อน):</span>
                <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(pendingFixed)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Wallet size={12} className="text-expense shrink-0" />
                ใช้ไปแล้ว ไม่รวมบิล ({currentDay} วัน):
              </span>
              <span className="text-white font-bold tabular-nums">{formatBaht(variableUpToToday)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Navigation size={12} className="text-neutral-400 shrink-0" />
                คาดว่าใช้อีก ({remainingDays} วัน):
              </span>
              <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(projectedVariableRemaining)}</span>
            </div>
            {plannedAhead > 0 && remainingDays > 0 && (
              <>
                <div className="flex justify-between items-center py-0.5 pl-[18px]">
                  <span className="text-neutral-400">ค่ากินอยู่ {formatBaht(actualDailyVariableAvg)} × {remainingDays} วัน:</span>
                  <span className="text-neutral-300 tabular-nums">{formatBaht(paceRemaining)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pl-[18px]">
                  <span className="text-neutral-400">รายการที่ลงแผนไว้:</span>
                  <span className="text-neutral-300 tabular-nums">{formatBaht(plannedAhead)}</span>
                </div>
              </>
            )}
            {projectedRange && (
              <div
                className="flex justify-between items-center py-0.5"
                title="ถ้าวันที่เหลือใช้เท่าเดือนที่น้อยที่สุดหรือมากที่สุดใน 3 เดือนก่อน หรือเท่าตอนนี้"
              >
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <MoveVertical size={12} className="text-neutral-400 shrink-0" />
                  ถ้าใช้แบบ 3 เดือนก่อน:
                </span>
                <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(projectedRange.low)} – {formatBaht(projectedRange.high)}</span>
              </div>
            )}
          </div>
        </div>

        {/* POD 2: Safe Daily Living Ceiling */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">
          {headroom < 0 && <span aria-hidden="true" data-edge className="absolute left-0 inset-y-0 w-0.5 bg-danger" />}
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <Zap size={13} className={headroom >= 0 ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
              ใช้ได้วันละไม่เกิน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                  headroom >= 0 ? 'text-emerald-400' : 'text-danger'
                }`}>
                  {formatMoney(safeToSpend)}
                  <span className="text-xs text-neutral-400 ml-1 font-normal">/วัน</span>
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums whitespace-nowrap">
                  ตอนนี้ใช้ {formatBaht(actualDailyVariableAvg)}/วัน
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden relative border border-neutral-800">
                <div
                  className={`h-full ${headroom >= 0 ? 'bg-emerald-400' : 'bg-danger'}`}
                  style={{ width: `${safePaceBarWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>ใช้อยู่ {actualSafePaceRatio.toFixed(0)}% ของที่ใช้ได้</span>
                <span>เหลืออีก {remainingDays} วัน</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck size={12} className={headroom >= 0 ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
                {headroom >= 0 ? 'ยังเหลือที่ว่าง:' : 'ต้องลดวันละ:'}
              </span>
              {headroom >= 0 ? (
                <span className="text-emerald-400 font-black tabular-nums">+{formatBaht(headroom)}/วัน</span>
              ) : (
                <span className="text-danger font-black tabular-nums">−{formatBaht(requiredDailyReduction)}/วัน</span>
              )}
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Target size={12} className="text-sky-400 shrink-0" />
                ถ้าจะให้เหลือ {leftoverTarget}%:
              </span>
              {safeToSpendForTarget > 0 ? (
                <span className={`font-bold tabular-nums ${actualDailyVariableAvg <= safeToSpendForTarget ? 'text-emerald-400' : 'text-warn'}`}>
                  ใช้ได้ {formatBaht(safeToSpendForTarget)}/วัน
                </span>
              ) : (
                <span className="font-bold text-warn">เดือนนี้ไม่ทันแล้ว</span>
              )}
            </div>
            {hasOneOff && (
              <div
                className="flex justify-between items-center py-0.5"
                title="ของชิ้นใหญ่ และกลุ่มที่นานๆ ใช้ที (เช่น ไอที งานอดิเรก) นับว่าจ่ายแล้ว แต่ไม่เอาไปคูณกับวันที่เหลือ"
              >
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ShoppingBag size={12} className="text-neutral-400 shrink-0" />
                  ของเป็นก้อน (นับครั้งเดียว):
                </span>
                <span className="text-neutral-300 font-bold tabular-nums">{formatBaht(oneOffExcluded)}</span>
              </div>
            )}
          </div>
        </div>

        {/* POD 3: Projected EOM Surplus */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none">
          {projectedSurplus < 0 && <span aria-hidden="true" data-edge className="absolute left-0 inset-y-0 w-0.5 bg-danger" />}
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase text-neutral-400 truncate flex items-center gap-1.5">
              <Award size={13} className={`${surplusText} shrink-0`} />
              คาดว่าจะเหลือสิ้นเดือน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${surplusText}`}>
                  {projectedSurplus >= 0 ? `+${formatBaht(projectedSurplus)}` : `−${formatBaht(Math.abs(projectedSurplus))}`}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums whitespace-nowrap">
                  เหลือ {projectedSurplusPct}%
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden relative border border-neutral-800">
                <div
                  className={`h-full ${isDeficit ? 'bg-danger' : isUnderTarget ? 'bg-warn' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, projectedSurplusPct))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>เป้า {leftoverTarget}% = {formatBaht(targetLeftover)}</span>
                <span className={surplusText}>
                  {isDeficit ? 'ติดลบ' : isUnderTarget ? `ต่ำกว่าเป้า ${leftoverTarget}%` : 'ถึงเป้าแล้ว'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                {isDeficit || isUnderTarget ? (
                  <AlertTriangle size={12} className={`${surplusText} shrink-0`} />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                )}
                สถานะ:
              </span>
              {isDeficit && <span className="text-danger font-bold">ใช้น้อยลงอีก {formatBaht(requiredReduction)} ถึงไม่ติดลบ</span>}
              {isUnderTarget && <span className="text-warn font-bold">ขาดอีก {formatBaht(targetShortfall)} ถึงเป้า</span>}
              {!isDeficit && !isUnderTarget && <span className="text-emerald-400 font-bold">คุมงบได้ตามเป้า</span>}
            </div>
            {estimatedIncome > 0 && (
              <div className="py-0.5 text-neutral-400">รวมรายรับที่ยังไม่ลง {formatBaht(estimatedIncome)} จากประวัติ</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryForecasting.displayName = 'SummaryForecasting';
