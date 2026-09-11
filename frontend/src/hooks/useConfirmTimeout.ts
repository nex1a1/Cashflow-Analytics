import { useEffect, useRef, useState } from 'react';

// Click-to-arm, click-again-to-confirm within a window (e.g. delete buttons).
export function useConfirmTimeout(delayMs = 3000) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const trigger = (onConfirm: () => void) => {
    if (confirming) {
      if (timer.current) clearTimeout(timer.current);
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), delayMs);
    }
  };

  return { confirming, trigger };
}
