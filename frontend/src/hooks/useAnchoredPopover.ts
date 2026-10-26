import { useEffect, useRef, useState } from 'react';

const scrollPos = () => ({
  top: window.scrollY || document.documentElement.scrollTop,
  left: window.scrollX || document.documentElement.scrollLeft,
});

/**
 * A fixed-position popover opened from a button (rendered through a portal by the caller).
 * `place` turns the button's rect into the popover's top/left when it opens. It closes on a
 * mousedown outside both, on Esc, and when the page scrolls 5px or more from where it opened.
 * `stopEsc` keeps that Esc from reaching window listeners (a picker inside a modal that closes on Esc).
 */
export function useAnchoredPopover(place: (anchor: DOMRect) => { top: number; left: number }, { stopEsc = false } = {}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const initialScroll = useRef({ top: 0, left: 0 });

  const toggle = () => {
    if (!open && btnRef.current) {
      setPos(place(btnRef.current.getBoundingClientRect()));
      initialScroll.current = scrollPos();
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClose = (e: Event) => {
      const target = e.target as Node;
      if (e.type === 'mousedown' && (btnRef.current?.contains(target) || popRef.current?.contains(target))) return;
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'scroll') {
        const now = scrollPos();
        if (Math.abs(now.top - initialScroll.current.top) < 5 && Math.abs(now.left - initialScroll.current.left) < 5) return;
      }
      if (e.type === 'keydown' && stopEsc) e.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open, stopEsc]);

  return { open, setOpen, pos, btnRef, popRef, toggle };
}
