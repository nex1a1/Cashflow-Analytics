// Chart.js is only drawn by the full-mode Dashboard and the Portfolio tab: they import this module, so Chart.js
// stays out of the entry bundle (the Lite overview never loads it).
import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults,
  LineController, BarController, DoughnutController
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { tc } from '@/constants/theme';

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, LineElement,
  LineController, BarController, DoughnutController, Title, Tooltip, Legend, ArcElement, Filler,
  SankeyController, Flow
);

defaults.font.family = "'Inter', 'Bai Jamjuree', sans-serif";
defaults.color = tc('ink-body');
defaults.borderColor = tc('line');
// Short grow-in for every chart (Chart.js default is 1s); none when the OS asks for reduced motion.
defaults.set('animation', {
  duration: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 450,
  easing: 'easeOutQuart',
});
