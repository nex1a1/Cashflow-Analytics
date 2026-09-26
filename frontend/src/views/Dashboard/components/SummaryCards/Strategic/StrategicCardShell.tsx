// src/views/Dashboard/components/SummaryCards/Strategic/StrategicCardShell.tsx
import React, { memo } from 'react';
import { StrategicCardShellProps } from '../types';

export const StrategicCardShell = memo(({
  icon: Icon,
  borderColorClass,
  hoverBgClass = 'hover:bg-surface-hover',
  label,
  badge,
  thresholdRow,
  overlayTitle,
  overlayBadge,
  overlayBody,
  showOverlay = true,
  children,
}: StrategicCardShellProps) => {
  const isInteractive = showOverlay && Boolean(overlayBody);
  return (
    <div
      className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full min-h-[140px] bg-canvas ${hoverBgClass} transition-none border-l ${borderColorClass} ${
        isInteractive ? 'cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white' : ''
      }`}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? `${label}${overlayTitle ? ` — ${overlayTitle}` : ''}` : undefined}
    >
      <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
        <Icon size={72} />
      </div>

      <div className="flex-1 flex flex-col justify-between w-full h-full transition-none gap-2">
        {/* Top: Label + Tactical Badge */}
        <div className="flex items-center justify-between gap-1.5 leading-none">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate">
            {label}
          </span>
          {badge}
        </div>

        {/* Center: Hero Metric Area */}
        <div className="my-auto z-10 flex flex-col justify-center">
          {children}
        </div>

        {/* Bottom: Benchmark / Threshold / Context Footer */}
        {thresholdRow && (
          <div className="mt-auto pt-1.5 border-t border-neutral-800/80">
            {thresholdRow}
          </div>
        )}
      </div>

      {showOverlay && overlayBody && (
        <div className="absolute inset-0 p-2.5 bg-canvas opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-none z-20 flex flex-col justify-between">
          {overlayTitle && (
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 border-b border-line pb-1.5 flex justify-between items-center shrink-0 gap-1">
              <span className="truncate">{overlayTitle}</span>
              {overlayBadge}
            </div>
          )}
          {overlayBody}
        </div>
      )}
    </div>
  );
});

StrategicCardShell.displayName = 'StrategicCardShell';
