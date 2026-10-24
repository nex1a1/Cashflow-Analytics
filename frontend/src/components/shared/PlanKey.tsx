import { memo } from 'react';
import { tc } from '@/constants/theme';

/** key for the hatched "plan" look of future-dated (not yet reached) amounts */
export const PlanKey = memo(({ className = '' }: { className?: string }) => (
  <span className={`flex items-center gap-1.5 select-none ${className}`} title="ช่วงที่ยังไม่ถึง: ข้อมูลที่ลงล่วงหน้า">
    <span
      aria-hidden="true"
      className="inline-block w-2.5 h-2.5 border border-ink-muted"
      style={{ backgroundImage: `repeating-linear-gradient(135deg, ${tc('ink-muted')} 0 1px, transparent 1px 4px)` }}
    />
    <span className="text-[11px] font-medium leading-none text-slate-400">แผน (ยังไม่ถึง)</span>
  </span>
));
PlanKey.displayName = 'PlanKey';
