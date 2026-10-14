import { useRef, type ReactNode } from 'react';
import { useFlipList } from '@/hooks/useFlipList';

/** A Settings list whose `[data-flip-id]` rows slide when re-ordered, rise in when added and fade out when removed. */
export default function FlipBox({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFlipList(ref, { exit: true });
  return <div ref={ref} className={`relative ${className}`}>{children}</div>;
}
