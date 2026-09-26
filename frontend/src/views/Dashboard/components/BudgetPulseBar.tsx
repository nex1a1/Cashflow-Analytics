import React from 'react';
import { useDashboardContext } from '../context/DashboardContext';
import type { SummaryAnalytics } from './SummaryCards/types';

const baht = (n: number) => Math.round(Math.abs(n)).toLocaleString('th-TH');

/**
 * One-line answer to "how much can I spend today?" for the running month / pay cycle.
 * Reuses useAnalytics' forecast (safeToSpend, remainingDays, projectedSurplus), so it
 * only renders when that forecast exists — i.e. the period contains today.
 */
export default function BudgetPulseBar() {
  const { analytics, showSkeleton } = useDashboardContext();
  const a = analytics as SummaryAnalytics | undefined;
  if (!a?.showForecasting || !a.forecastingDetails) return null;

  const perDay = Math.max(0, Math.floor(a.safeToSpend));
  const daysLeft = a.forecastingDetails.remainingDays;
  const eom = a.projectedSurplus;
  const overBudget = eom < 0;

  return (
    <section
      aria-label="สรุปงบวันนี้"
      className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-3.5 border bg-surface ${overBudget ? 'tint-danger' : 'border-line'}`}
    >
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-body" aria-busy={showSkeleton}>
        <span>
          เหลือใช้ได้{' '}
          <strong className={`text-2xl font-black tabular-nums tracking-tight ${perDay === 0 ? 'text-danger' : 'text-ink-display'}`}>
            ฿{baht(perDay)}
          </strong>
          <span className="text-ink-muted">/วัน</span>
        </span>
        <span aria-hidden="true" className="text-ink-muted">·</span>
        <span>
          อีก <strong className="text-lg font-black tabular-nums text-ink-display">{daysLeft}</strong> วัน
        </span>
        <span aria-hidden="true" className="text-ink-muted">·</span>
        <span>
          คาดสิ้นเดือน{' '}
          <strong className={`text-lg font-black tabular-nums ${overBudget ? 'text-danger' : 'text-income'}`}>
            {overBudget ? '−' : '+'}฿{baht(eom)}
          </strong>
          {overBudget && <span className="ml-1.5 text-danger font-bold">ขาดดุล</span>}
        </span>
      </p>
      <p className="ml-auto text-xs text-ink-muted">
        คิดจากรายรับ หักภาระคงที่และที่ใช้ไปแล้ว หารด้วยวันที่เหลือ
      </p>
    </section>
  );
}
