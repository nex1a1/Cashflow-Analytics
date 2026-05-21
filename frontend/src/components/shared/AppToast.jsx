// src/components/AppToast.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

export default function AppToast({ toast }) {
  const { hideToast } = useToast();
  const isError = toast.type === 'error';
  
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div 
          role="alert"
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`
            fixed bottom-8 left-1/2
            text-white rounded-sm shadow-2xl border
            flex flex-col z-[9999] overflow-hidden /* 🚨 ดัน Z-index ทะลุ Modal ไปเลย */
            ${isError 
              ? 'bg-red-600 border-red-700' 
              : 'bg-emerald-700/95 border-emerald-800'}
          `}
        >
          <div className="flex items-center gap-3 pl-5 pr-3 py-3">
            {isError
              ? <AlertCircle className="w-5 h-5 text-red-100 shrink-0" />
              : <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />}
            <span className="font-bold text-sm tracking-wide mr-2">{toast.message}</span>
            <button 
              onClick={hideToast}
              className={`p-1 rounded-sm transition-colors opacity-80 hover:opacity-100 ${isError ? 'hover:bg-red-700' : 'hover:bg-emerald-800/50'}`}
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* ⏳ Timeout Progress Bar */}
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3, ease: 'linear' }}
            className={`h-[3px] w-full ${isError ? 'bg-red-900/50' : 'bg-white/30'}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

AppToast.propTypes = {
  toast: PropTypes.shape({
    visible:  PropTypes.bool.isRequired,
    message:  PropTypes.string.isRequired,
    type:     PropTypes.oneOf(['success', 'error']).isRequired,
  }).isRequired,
};