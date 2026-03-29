// src/components/AppToast.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function AppToast({ toast, isDarkMode }) {
  const isError = toast.type === 'error';
  return (
    <div className={`
      fixed bottom-8 left-1/2 -translate-x-1/2
      text-white px-5 py-2.5 rounded-sm shadow-2xl border
      transition-all duration-300 flex items-center gap-2.5 z-50
      ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
      ${isError ? 'bg-red-600 border-red-700' : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-slate-700')}
    `}>
      {isError
        ? <AlertCircle className="w-5 h-5 text-red-200 shrink-0" />
        : <CheckCircle  className="w-5 h-5 text-emerald-400 shrink-0" />}
      <span className="font-bold text-sm">{toast.message}</span>
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