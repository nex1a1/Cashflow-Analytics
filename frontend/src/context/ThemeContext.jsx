import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const isDarkMode = true;
  const dm = true;

  useEffect(() => {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
  }, []);

  const toggleTheme = () => {};
  const setIsDarkMode = () => {};

  return (
    <ThemeContext.Provider value={{ isDarkMode, dm, toggleTheme, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};