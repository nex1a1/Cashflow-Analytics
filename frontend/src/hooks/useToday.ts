import { useEffect, useState } from 'react';
import { localTodayIso } from '@/utils/payCycle';

/**
 * Today's local date (YYYY-MM-DD) for anything drawn from it during render.
 * React Compiler caches render output by its inputs, and a bare `localTodayIso()` is not an input, so a view left open
 * overnight would keep yesterday's "today". As a hook value it is one: it is read on every render, and a timer
 * re-renders at the next local midnight even when nothing else changes.
 */
export default function useToday(): string {
  'use no memo'; // the clock read must run on every render
  const [, setTick] = useState(0);
  const today = localTodayIso();
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const id = setTimeout(() => setTick(t => t + 1), nextMidnight.getTime() - now.getTime() + 1000);
    return () => clearTimeout(id);
  }, [today]);
  return today;
}
