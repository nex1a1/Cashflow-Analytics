// src/components/AppToast.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function AppToast({ toast, isDarkMode }) {
  const isError = toast.type === 'error';
  return (
    <div className={`
      fixed bottom-8 left-1/2 -translate-x-1/2
      text-white px-6 py-3 rounded-full shadow-2xl
      transition-all duration-300 flex items-center gap-3 z-50
      ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
      ${isError
        ? 'bg-red-600 border border-red-500'
        : isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800'}
    `}>
      {isError
        ? <AlertCircle className="w-6 h-6 text-red-200 shrink-0" />
        : <CheckCircle  className="w-6 h-6 text-green-400 shrink-0" />}
      <span className="font-medium text-base">{toast.message}</span>
    </div>
  );
}

AppToast.propTypes = {
  toast: PropTypes.shape({
    visible:  PropTypes.bool.isRequired,
    message:  PropTypes.string.isRequired,
    type:     PropTypes.oneOf(['success', 'error']).isRequired,
  }).isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};