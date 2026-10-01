import React from 'react';
import { DAY_OF_WEEK_LABELS } from '../utils/calendarPeriodHelpers';

// โครงเดียวกับหน้าจริง (หัว → ตาราง → สรุป → legend) เพื่อให้ตอนข้อมูลมาไม่มีอะไรกระโดด
// ไม่ใส่ animate-pulse: static engine (index.css) ปิด animation ทั้งหมดอยู่แล้ว
export default function CalendarSkeleton(): React.ReactElement {
  const block = 'bg-surface-elevated rounded-none';

  return (
    <div className="flex flex-col h-full space-y-3.5 w-full">
      {/* Header skeleton */}
      <div className="bg-surface rounded-none border border-line p-4">
        <div className="flex items-center gap-4">
          <div className={`h-7 w-40 ${block}`} />
          <div className={`h-5 w-24 ${block}`} />
          <div className={`h-5 w-24 ${block}`} />
          <div className={`h-5 w-28 ${block}`} />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="rounded-none border border-line overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-[1px] bg-line border-b border-line">
          {DAY_OF_WEEK_LABELS.map(label => (
            <div key={label} className="py-2 flex justify-center bg-surface">
              <div className={`h-[18px] w-6 ${block}`} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[1px] bg-line flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[120px] 2xl:min-h-[145px] flex flex-col bg-canvas">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-line/30">
                <div className={`h-5 w-5 ${block}`} />
                <div className={`h-[23px] w-16 ${block}`} />
              </div>
              <div className="flex flex-col gap-1.5 p-2 flex-grow">
                {i % 3 === 0 && <div className={`h-3 w-14 ${block}`} />}
                {i % 4 === 0 && <div className={`h-3 w-16 ${block}`} />}
                {i % 5 === 0 && <div className={`h-3 w-12 ${block}`} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="bg-surface rounded-none border border-line p-3 px-4 flex gap-2.5 items-center">
        <div className={`h-4 w-10 ${block}`} />
        <div className={`h-5 w-20 ${block}`} />
        <div className={`h-5 w-20 ${block}`} />
        <div className={`ml-auto h-5 w-14 ${block}`} />
      </div>

      {/* Legend skeleton */}
      <div className="bg-surface rounded-none border border-line p-3.5 px-4 flex gap-6 min-h-[150px]">
        <div className="flex-grow flex flex-col gap-3">
          <div className={`h-4 w-28 ${block}`} />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-7 w-28 ${block}`} />
            ))}
          </div>
        </div>
        <div className="hidden lg:flex w-[320px] shrink-0 flex-col gap-2.5 pl-5 border-l border-line/50">
          <div className={`h-4 w-32 ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-full ${block}`} />
        </div>
      </div>
    </div>
  );
}
