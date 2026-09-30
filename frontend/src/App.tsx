import React from 'react';
import MainLayout from './components/layout/MainLayout';
import { ToastProvider } from './context/ToastContext';
import { AppUIProvider } from './context/AppUIContext';
import { AppDataProvider } from './context/AppDataContext';
import { AppFilterProvider } from './context/AppFilterContext';
import { PortfolioProvider } from './context/PortfolioContext';
import './assets/styles/darkMode.css';

export default function App() {
  return (
    <ToastProvider>
      <AppUIProvider>
        <AppDataProvider>
          <PortfolioProvider>
            <AppFilterProvider>
              <MainLayout />
            </AppFilterProvider>
          </PortfolioProvider>
        </AppDataProvider>
      </AppUIProvider>
    </ToastProvider>
  );
}
