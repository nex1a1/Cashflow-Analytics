import React from 'react';
import MainLayout from './components/layout/MainLayout';
import { useAppController } from './hooks/app/useAppController';
import './assets/styles/darkMode.css';

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement,
  Filler, LineController, BarController,
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler,
  SankeyController, Flow
);

export default function App() {
  const controller = useAppController();
  return <MainLayout controller={controller} />;
}