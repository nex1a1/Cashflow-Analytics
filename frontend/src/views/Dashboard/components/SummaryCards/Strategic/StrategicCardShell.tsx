// src/views/Dashboard/components/SummaryCards/Strategic/StrategicCardShell.tsx
import { memo } from 'react';
import { StrategicCardShellProps } from '../types';

/**
 * A rule / metric card. Its detail view covers the card on hover or keyboard focus.
 * Hidden with `visibility` (not just opacity), so screen readers skip it until it shows.
 */
export const StrategicCardShell = memo(({
  icon: Icon,
  edgeClass,
  label,
  badge,
  thresholdRow,
  overlayTitle,
  overlayBadge,
  overlayBody,
  showOverlay = true,
  children,
}: StrategicCardShellProps) => {
  const hasDetails = showOverlay && Boolean(overlayBody);

  return (
    <section
      aria-label={label}
      tabIndex={hasDetails ? 0 : undefined}
      className={`group relative p-3 flex flex-col h-full min-h-[140px] bg-canvas hover:bg-surface-hover ${
        hasDetails ? 'cursor-help focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent-ink' : ''
      }`}
    >
      {edgeClass && <span aria-hidden="true" data-edge className={`absolute left-0 inset-y-0 w-0.5 ${edgeClass}`} />}
      <div className="flex-1 flex flex-col justify-between w-full gap-2">
        <div className="flex items-center justify-between gap-1.5 min-h-5">
          <span className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold text-ink-muted">
            <Icon size={13} className="shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          {badge}
        </div>

        <div className="my-auto flex flex-col justify-center">
          {children}
        </div>

        {thresholdRow && (
          <div className="mt-auto pt-1.5 border-t border-line">
            {thresholdRow}
          </div>
        )}
      </div>

      {hasDetails && (
        <div
          data-details
          className="absolute inset-0 p-2.5 bg-canvas z-20 flex flex-col invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
        >
          {overlayTitle && (
            <div className="text-[11px] font-semibold text-ink-muted border-b border-line pb-1.5 flex justify-between items-center shrink-0 gap-1">
              <span className="truncate">{overlayTitle}</span>
              {overlayBadge}
            </div>
          )}
          {overlayBody}
        </div>
      )}
    </section>
  );
});

StrategicCardShell.displayName = 'StrategicCardShell';
