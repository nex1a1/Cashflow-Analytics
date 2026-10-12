import { useLayoutEffect, useRef, type RefObject } from 'react';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // = --m-ease in index.css

/**
 * Animates the rows of a list (`[data-flip-id]` elements inside `ref`) on every render after the first:
 * a row that moved glides from its old spot to its new one (FLIP), a row that wasn't there rises in.
 * Removed rows just go (a caller can fade one out before removing it). Positions are relative to the
 * list's content, so scrolling doesn't count; rows ending up off screen are skipped. A slide still running
 * (quick re-sort, typing in search) is cancelled and the new one starts from where the row is on screen.
 * Remount the list (key) to start over without animating. Reduced motion: no animation.
 * ponytail: positions are only re-read on render, so a window resize between renders makes the next one slide a little.
 */
export function useFlipList(ref: RefObject<HTMLElement>) {
  const lastTops = useRef<Map<string, number> | null>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const prev = lastTops.current;
    const animate = prev && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const base = list.getBoundingClientRect().top - list.scrollTop;
    const tops = new Map<string, number>();
    list.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(el => {
      const id = el.dataset.flipId!;
      const rect = el.getBoundingClientRect();
      const seen = rect.top - base; // includes any running slide's offset
      const running = el.getAnimations?.().filter(a => a.id === 'flip') ?? [];
      running.forEach(a => a.cancel());
      const top = running.length ? el.getBoundingClientRect().top - base : seen;
      tops.set(id, top);
      if (!animate || rect.bottom < 0 || rect.top > window.innerHeight) return;
      const old = prev.get(id);
      const dy = old === undefined ? 0 : old + (seen - top) - top;
      if (old === undefined) el.animate?.([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { id: 'flip', duration: 220, easing: EASE });
      else if (dy) el.animate?.([{ translate: `0 ${dy}px` }, { translate: '0 0' }], { id: 'flip', duration: 300, easing: EASE });
    });
    lastTops.current = tops;
  });
}
