import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function Tooltip({ children, content, position = 'bottom' }) {
  const [isVisible, setIsVisible] = useState(false);
  const { isDarkMode: dm } = useTheme();

  // Position styles
  const positions = {
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
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? -5 : position === 'top' ? 5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute z-[9999] px-2.5 py-1.5 text-[11px] font-bold rounded-sm whitespace-nowrap shadow-lg border pointer-events-none ${positions[position]} ${
              dm 
                ? 'bg-slate-800 text-slate-200 border-slate-700 shadow-black/50' 
                : 'bg-slate-800 text-white border-slate-700 shadow-slate-300/50'
            }`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}