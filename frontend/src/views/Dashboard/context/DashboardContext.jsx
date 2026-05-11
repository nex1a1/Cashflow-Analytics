import React, { createContext, useContext, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children, value }) => {
  const { isDarkMode } = useTheme();
  
  // Memoize the context value to avoid unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...value,
    dm: isDarkMode // Convenience alias used throughout dashboard components
  }), [value, isDarkMode]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};
