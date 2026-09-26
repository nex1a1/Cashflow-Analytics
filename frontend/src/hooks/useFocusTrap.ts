import { useCallback, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ref callback for a modal panel: moves focus inside on mount (unless a child already
 * autofocused), keeps Tab / Shift+Tab cycling within the panel, and restores focus to the
 * opener on unmount. Esc handling stays in each modal.
 */
export function useFocusTrap<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((node: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;

    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);

    if (!node.contains(document.activeElement)) (focusables()[0] ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);

    cleanup.current = () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);
}
