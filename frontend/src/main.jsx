import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, 
  LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults, 
  LineController, BarController
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, 
  LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler
);

defaults.font.family = 'Tahoma, sans-serif';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);