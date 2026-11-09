import { useDashboardContext } from '../../context/DashboardContext';
import { SummaryVitals } from './SummaryVitals';
import { SummaryStrategic } from './Strategic/SummaryStrategic';
import type { SummaryAnalytics } from './types';

/** Both panels share one frame; the minimum height is what the overview tab needs at its tallest (rent and investing lines shown), so switching tabs never moves the page. */
const PANEL_FRAME = 'flex flex-col rounded-none overflow-hidden border border-line bg-canvas shadow-xs min-h-[537px]';

export default function SummaryCards() {
  const { analytics, showSkeleton } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1+2. Core Vitals (stacked) + Strategic Analysis Bar (tabbed), side by side */}
      <div className="w-full flex gap-3">
        <div className={`w-[300px] shrink-0 ${PANEL_FRAME}`}>
          <SummaryVitals analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
        </div>

        <div className={`flex-1 min-w-0 ${PANEL_FRAME}`}>
          <SummaryStrategic analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
        </div>
      </div>
    </div>
  );
}

export * from './types';
