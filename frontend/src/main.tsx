import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/index.css';
import { applyTheme, tc } from './constants/theme';
// Offline-First Fonts
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import './assets/styles/fonts.css';

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
defaults.color = tc('ink-body');
defaults.borderColor = tc('line');

applyTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
