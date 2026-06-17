import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/index.css';
import { ToastProvider } from './context/ToastContext';

// Offline-First Fonts
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/bai-jamjuree/300.css";
import "@fontsource/bai-jamjuree/400.css";
import "@fontsource/bai-jamjuree/500.css";
import "@fontsource/bai-jamjuree/600.css";
import "@fontsource/bai-jamjuree/700.css";

import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, 
  LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults, 
  LineController, BarController
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, LineElement, 
  LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler,
  SankeyController, Flow
);

defaults.font.family = "'Inter', 'Bai Jamjuree', sans-serif";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
