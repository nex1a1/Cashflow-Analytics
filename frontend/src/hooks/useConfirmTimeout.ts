import { useEffect, useRef, useState } from 'react';

/**
 * The app's one confirmation pattern (no window.confirm): first click arms, a second click
 * within `delayMs` confirms. Esc or the timeout disarms.
 */
export function useConfirmTimeout(delayMs = 3000, { escCancels = true }: { escCancels?: boolean } = {}) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    setConfirming(false);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!confirming || !escCancels) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirming, escCancels]);

  const trigger = (onConfirm: () => void) => {
    if (confirming) {
      cancel();
      onConfirm();
    } else {
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), delayMs);
    }
  };

  return { confirming, trigger, cancel };
}
