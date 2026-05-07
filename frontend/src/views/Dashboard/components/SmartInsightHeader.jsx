import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function SmartInsightHeader({ insights }) {
  const { isDarkMode: dm } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Reset index if insights length changes (e.g. changing months)
  useEffect(() => {
    setCurrentIndex(0);
  }, [insights?.length]);

  useEffect(() => {
    if (!insights || insights.length === 0 || !isVisible || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [insights, isVisible, isPaused]);

  if (!insights || insights.length === 0 || !isVisible) return null;

  // Safe fallback in case of out of bounds during render cycle
  const currentInsight = insights[currentIndex] || insights[0];
  if (!currentInsight) return null;

  const getTextColor = (type) => {
    switch (type) {
      case 'success': return dm ? 'text-emerald-400' : 'text-emerald-500';
      case 'warning': return dm ? 'text-amber-400' : 'text-amber-500';
      case 'error':   return dm ? 'text-red-400' : 'text-red-500';
      case 'anomaly': return dm ? 'text-purple-400' : 'text-purple-500';
      case 'info':
      default:        return dm ? 'text-blue-400' : 'text-blue-500';
    }
  };

  const nextInsight = () => setCurrentIndex((prev) => (prev + 1) % insights.length);
  const prevInsight = () => setCurrentIndex((prev) => (prev === 0 ? insights.length - 1 : prev - 1));

  return (
    <div className="flex justify-end mb-2 sm:-mb-2 relative z-10">
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold shadow-sm transition-colors w-full sm:w-auto max-w-full sm:max-w-2xl ${dm ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-800' : 'bg-white/90 border-slate-200 hover:bg-white backdrop-blur-sm'}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <Sparkles className={`w-3.5 h-3.5 shrink-0 ${getTextColor(currentInsight.type)}`} />
        
        <div className="relative flex items-center justify-start flex-1 w-full sm:min-w-[400px] sm:max-w-[700px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`m-0 flex-1 whitespace-normal leading-snug ${dm ? 'text-slate-300' : 'text-slate-600'}`}
            >
              <span className="mr-1">{currentInsight.icon}</span>
              {currentInsight.message}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={`flex items-center gap-0.5 ml-2 pl-2 border-l shrink-0 self-stretch ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          {insights.length > 1 && (
            <>
              <button onClick={prevInsight} className={`p-0.5 rounded-full transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={nextInsight} className={`p-0.5 rounded-full transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={() => setIsVisible(false)} className={`p-0.5 ml-0.5 rounded-full transition-colors ${dm ? 'hover:bg-red-500/20 hover:text-red-400 text-slate-500' : 'hover:bg-red-50 hover:text-red-500 text-slate-400'}`} title="ซ่อนคำแนะนำ">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

SmartInsightHeader.propTypes = {
  insights: PropTypes.array,
};