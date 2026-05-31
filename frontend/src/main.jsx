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
import "@fontsource/ibm-plex-sans-thai-looped/300.css";
import "@fontsource/ibm-plex-sans-thai-looped/400.css";
import "@fontsource/ibm-plex-sans-thai-looped/500.css";
import "@fontsource/ibm-plex-sans-thai-looped/600.css";
import "@fontsource/ibm-plex-sans-thai-looped/700.css";

import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, 
  LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults, 
  LineController, BarController
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, LineElement, 
  LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler
);

defaults.font.family = "'Inter', 'IBM Plex Sans Thai Looped', sans-serif";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);