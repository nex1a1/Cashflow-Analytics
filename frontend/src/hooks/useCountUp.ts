import { useState, useEffect, useRef } from 'react';

/**
 * A hook that animates a number from its previous value to a new target value.
 * @param target The target value to animate to.
 * @param duration Animation duration in milliseconds.
 * @returns The current animated value.
 */
export function useCountUp(target: number, duration: number = 800): number {
  const [value, setValue] = useState<number>(target);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef<number>(target);

  useEffect(() => {
    const start = prevTarget.current ?? 0;
    if (start === target) return;

    prevTarget.current = target;
    const startTime = performance.now();
    const diff = target - start;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quartic ease out
      const eased = 1 - Math.pow(1 - progress, 4);

      setValue(start + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return value;
}
