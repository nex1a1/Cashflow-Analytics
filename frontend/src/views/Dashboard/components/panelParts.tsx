// Pieces every dashboard panel header repeats: the title with its red accent bar, the segmented switch,
// and the hint that explains why an option is disabled.
import { ComponentType } from 'react';

/** Accent bar + muted icon + uppercase title. Renders no wrapper, so callers keep their own row (and can put switches after it). */
export const PanelTitle = ({ icon: Icon, title, iconClassName = '', titleClassName = '', titleKey }: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  iconClassName?: string;
  titleClassName?: string;
  /** remounts the title when it changes, so `m-in` animates the new text */
  titleKey?: string;
}) => (
  <>
    <div className="w-[3px] h-3 bg-accent shrink-0" />
    {Icon && <Icon className={`w-3.5 h-3.5 text-neutral-400 ${iconClassName}`} />}
    <h2 key={titleKey} className={`text-[11px] font-black uppercase tracking-[0.2em] text-neutral-200 ${titleClassName}`}>{title}</h2>
  </>
);

/** Frame of a segmented switch (a row of buttons). */
export const SEG_GROUP = 'flex p-0.5 rounded-none border shadow-xs bg-canvas border-line/60';

/** One button of a segmented switch; `activeCls` is the selected look. */
export const segBtn = (active: boolean, activeCls = 'bg-surface-elevated text-accent-ink shadow-xs') =>
  `px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${active ? activeCls : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'}`;

/** Look of an option that can't be picked right now. */
export const DISABLED_OPTION = 'opacity-40 cursor-not-allowed text-neutral-600 bg-transparent hover:bg-transparent hover:text-neutral-600';

const HINT_ALIGN = { left: 'left-0', right: 'right-0', center: 'left-1/2 -translate-x-1/2' };

/**
 * Why a disabled option is disabled: shown under it on hover or keyboard focus.
 * Put it inside a `relative group/hint` wrapper next to the button.
 */
export const DisabledHint = ({ id, text, align }: { id?: string; text: string; align: keyof typeof HINT_ALIGN }) => (
  <div id={id} role="tooltip" className={`absolute top-full ${HINT_ALIGN[align]} mt-1.5 opacity-0 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100 pointer-events-none transition-opacity z-50 invisible group-hover/hint:visible group-focus-within/hint:visible whitespace-nowrap`}>
    <div className="rounded-none py-1 px-2.5 text-[11px] font-medium shadow-2xl bg-surface text-neutral-300 border border-line-strong flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span>{text}</span>
    </div>
  </div>
);
