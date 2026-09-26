import React from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import { SummaryVitals } from './SummaryVitals';
import { SummaryStrategic } from './Strategic/SummaryStrategic';
import type { SummaryAnalytics } from './types';

export default function SummaryCards() {
  const { analytics, showSkeleton } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1+2. Core Vitals (stacked) + Strategic Analysis Bar (tabbed), side by side */}
      <div className="w-full flex gap-3">
        <div className="w-[300px] shrink-0 flex flex-col rounded-none overflow-hidden border border-line bg-canvas shadow-sm min-h-[502px]">
          <SummaryVitals analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-none overflow-hidden border border-line bg-canvas shadow-sm min-h-[502px]">
          <SummaryStrategic analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
        </div>
      </div>
    </div>
  );
}

export * from './types';
