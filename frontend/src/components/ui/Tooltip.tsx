// src/components/ui/Tooltip.tsx
import React, { useState } from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ children, content, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Position styles
  const positions: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute z-[9999] px-2.5 py-1 text-[11px] font-medium rounded-sm whitespace-nowrap shadow-lg border pointer-events-none ${positions[position]} bg-neutral-900 text-neutral-200 border-neutral-700 shadow-black/50`}
        >
          {content}
        </div>
      )}
    </div>
  );
}