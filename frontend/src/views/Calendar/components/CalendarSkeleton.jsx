
export default function CalendarSkeleton() {
  const isDarkMode = true;
  const shimmer = 'bg-slate-700 animate-pulse';
  const surface = 'bg-slate-900';
  const surfaceAlt = 'bg-slate-800';
  const border = 'border-slate-700';
  const gapColor = 'bg-slate-700';
  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  return (
    <div className="flex flex-col h-full pb-6 space-y-3 max-w-screen-2xl mx-auto w-full">
      {/* Header skeleton */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-3 md:p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-6 w-36 rounded-sm ${shimmer}`} />
            <div className={`h-5 w-20 rounded-sm ${shimmer}`} />
            <div className={`h-5 w-20 rounded-sm ${shimmer}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-7 w-7 rounded-sm ${shimmer}`} />
            <div className={`h-7 w-24 rounded-sm ${shimmer}`} />
            <div className={`h-7 w-7 rounded-sm ${shimmer}`} />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className={`rounded-sm border ${border} shadow-sm overflow-hidden flex-1 flex flex-col`}>
        {/* Day labels */}
        <div className={`grid grid-cols-7 ${surfaceAlt} border-b ${border}`}>
          {DAYS_LABEL.map(label => (
            <div key={label} className="py-2 flex justify-center">
              <div className={`h-4 w-6 rounded-sm ${shimmer}`} />
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className={`grid grid-cols-7 gap-[1px] ${gapColor} flex-1`}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className={`min-h-[120px] 2xl:min-h-[140px] flex flex-col ${surfaceAlt}`}>
              <div className={`flex items-center justify-between px-1.5 py-1 border-b ${border}`}>
                <div className={`h-5 w-5 rounded-sm ${shimmer}`} />
                <div className={`h-4 w-10 rounded-sm ${shimmer}`} />
              </div>
              <div className="flex flex-col gap-1.5 p-1.5 flex-grow">
                {i % 3 === 0 && <div className={`h-3 w-14 rounded-sm ${shimmer}`} />}
                {i % 4 === 0 && <div className={`h-3 w-16 rounded-sm ${shimmer}`} />}
                {i % 5 === 0 && <div className={`h-3 w-12 rounded-sm ${shimmer}`} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-2 px-3 flex gap-2 items-center`}>
        <div className={`h-4 w-10 rounded-sm ${shimmer}`} />
        <div className={`h-5 w-16 rounded-sm ${shimmer}`} />
        <div className={`h-5 w-16 rounded-sm ${shimmer}`} />
        <div className={`ml-auto h-5 w-12 rounded-sm ${shimmer}`} />
      </div>
    </div>
  );
}
