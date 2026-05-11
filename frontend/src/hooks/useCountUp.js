import { useState, useEffect, useRef } from 'react';

/**
 * A hook that animates a number from its previous value to a new target value.
 * @param {number} target The target value to animate to.
 * @param {number} duration Animation duration in milliseconds.
 * @returns {number} The current animated value.
 */
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current ?? 0;
    if (start === target) return;
    
    prevTarget.current = target;
    const startTime = performance.now();
    const diff = target - start;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quartic ease out
      const eased = 1 - Math.pow(1 - progress, 4);
      
      setValue(start + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
