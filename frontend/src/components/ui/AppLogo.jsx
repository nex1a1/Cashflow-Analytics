// src/components/ui/AppLogo.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Minimalist Shark Outline Logo
 * Representing determination and relentless pursuit of financial goals.
 */
export default function AppLogo({ className = "w-6 h-6", color = "currentColor" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Stylized Shark Outline */}
      <path d="M2 12c5-1 7-5 12-5 3 0 6 2 8 5-2 3-5 5-8 5-5 0-7-4-12-5z" />
      <path d="M14 7l-2-5 4 5" /> {/* Dorsal Fin */}
      <path d="M14 17l-1 4 3-4" /> {/* Pelvic Fin */}
      <path d="M22 12l2-3v6l-2-3z" /> {/* Tail */}
      <circle cx="18" cy="11.5" r="0.5" fill={color} /> {/* Eye */}
    </svg>
  );
}

AppLogo.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
};
