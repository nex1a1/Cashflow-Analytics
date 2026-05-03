// src/components/AppToast.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function AppToast({ toast }) {
  const { isDarkMode } = useTheme();
  const isError = toast.type === 'error';
  
  return (
    <div 
      role="alert"
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2
        text-white px-5 py-3 rounded-sm shadow-2xl border
        transition-all duration-300 flex items-center gap-3 z-[9999] /* 🚨 ดัน Z-index ทะลุ Modal ไปเลย */
        ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
        ${isError 
          ? 'bg-red-600 border-red-700' 
          : (isDarkMode ? 'bg-emerald-700/90 border-emerald-800' : 'bg-emerald-600 border-emerald-700')} /* 🎨 เปลี่ยนเป็นสีเขียวเพื่อให้ดูรู้ทันทีว่าสำเร็จ */
      `}
    >
      {isError
        ? <AlertCircle className="w-5 h-5 text-red-100 shrink-0" />
        : <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />}
      <span className="font-bold text-sm tracking-wide">{toast.message}</span>
    </div>
  );
}

AppToast.propTypes = {
  toast: PropTypes.shape({
    visible:  PropTypes.bool.isRequired,
    message:  PropTypes.string.isRequired,
    type:     PropTypes.oneOf(['success', 'error']).isRequired,
  }).isRequired,
};