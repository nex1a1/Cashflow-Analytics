import React from 'react';
import { MotionConfig } from 'framer-motion';
import MainLayout from './components/layout/MainLayout';
import { useAppController } from './hooks/app/useAppController';
import './assets/styles/darkMode.css';

export default function App() {
  const controller = useAppController();
  return (
    <MotionConfig transition={{ duration: 0 }} reducedMotion="always">
      <MainLayout controller={controller} />
    </MotionConfig>
  );
}
