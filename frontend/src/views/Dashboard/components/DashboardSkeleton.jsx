import React from 'react';

export default function DashboardSkeleton() {
  const isDarkMode = true;
  const shimmer = 'bg-slate-800 animate-pulse';
  const surface = 'bg-slate-900';
  const border = 'border-slate-800';

  return (
    <div className="w-full pb-10 flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* Smart Insight Header Skeleton */}
      <div className={`h-12 w-full rounded-sm border ${border} ${shimmer}`} />

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-28 rounded-sm border ${border} ${surface} p-4 flex flex-col gap-3`}>
             <div className={`h-3 w-16 rounded-sm ${shimmer}`} />
             <div className={`h-8 w-24 rounded-sm ${shimmer}`} />
             <div className={`h-3 w-20 rounded-sm ${shimmer}`} />
          </div>
        ))}
      </div>

      {/* Expense Proportion Row */}
      <div className={`h-32 w-full rounded-sm border ${border} ${surface} p-4 flex items-center gap-4`}>
         <div className={`h-24 w-24 rounded-full ${shimmer}`} />
         <div className="flex-1 flex flex-col gap-2">
            <div className={`h-4 w-1/3 rounded-sm ${shimmer}`} />
            <div className={`h-8 w-full rounded-sm ${shimmer}`} />
         </div>
      </div>

      {/* Main Chart + Top Transactions Row */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-stretch">
        <div className={`h-[400px] rounded-sm border ${border} ${surface} ${shimmer}`} />
        <div className={`h-[400px] rounded-sm border ${border} ${surface} ${shimmer}`} />
      </div>

      {/* Activity Timeline Skeleton */}
      <div className={`h-[250px] w-full rounded-sm border ${border} ${surface} ${shimmer}`} />

      {/* Cashflow Table Skeleton */}
      <div className={`h-[400px] w-full rounded-sm border ${border} ${surface} ${shimmer}`} />

    </div>
  );
}
