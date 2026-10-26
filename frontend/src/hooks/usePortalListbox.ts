import { useCallback, useEffect, useRef, useState } from 'react';

/** Where a portal popover sits: below the trigger (`top`) or above it (`bottom`). */
export interface PopoverCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openUpwards: boolean;
}

/** Fixed-position style for a popover placed by PopoverCoords. */
export const popoverPosition = (c: PopoverCoords) => ({
  ...(c.openUpwards ? { bottom: `${c.bottom}px` } : { top: `${c.top}px` }),
  left: `${c.left}px`,
  width: `${c.width}px`,
});

/**
 * Shared mechanics of a select whose list renders in a body portal: open state, keyboard
 * highlight, position (re-measured on resize), and dismissal on a mousedown outside trigger and
 * list or on any scroll outside the list. `measure` turns the trigger's rect into coordinates.
 * `close()` shuts the list and clears the highlight, then runs `onClose` and, with `refocus`,
 * hands focus back to the trigger.
 */
export function usePortalListbox<C extends PopoverCoords>(
  measure: (trigger: DOMRect) => C,
  initialCoords: C,
  { onClose, refocus = false }: { onClose?: () => void; refocus?: boolean } = {},
) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState<C>(initialCoords);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) setCoords(measure(triggerRef.current.getBoundingClientRect()));
  }, [measure]);

  const close = useCallback(() => {
    setOpen(false);
    onClose?.();
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, [onClose, refocus]);

  /** Move the highlight by ±1 through `count` items, wrapping, and keep it in view. */
  const moveActive = useCallback((delta: 1 | -1, count: number) => {
    if (count === 0) return;
    setActiveIndex(prev => {
      const next = (prev + delta + count) % count;
      itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      close();
    };
    const handleScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return; // scrolling the list itself
      close();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, close, updatePosition]);

  return { open, setOpen, close, activeIndex, setActiveIndex, coords, updatePosition, moveActive, triggerRef, popoverRef, itemRefs };
}
