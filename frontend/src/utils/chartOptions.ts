// src/utils/chartOptions.ts
import { formatMoney } from './formatters';

const getTooltipOptions = (isDarkMode: boolean) => ({
  backgroundColor: '#121212',
  titleColor:      '#ffffff',
  bodyColor:       '#cbd5e1',
  borderColor:     '#303030',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 0,
});

const formatTickValue = (v: number): string => {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
};

const getScaleOptions = (isDarkMode: boolean, beginAtZero = false, yType = 'linear', autoSkip = true) => ({
  x: {
    ticks: {
      color: '#94a3b8',
      font: { size: 9 },
      maxRotation: 90,
      minRotation: 0,
      autoSkip: autoSkip,
      autoSkipPadding: 15,
    },
    grid: {
      display: true,
      color: 'rgba(148, 163, 184, 0.05)',
      drawTicks: false,
    },
    border: { display: false },
  },
  y: {
    type: yType,
    ...(beginAtZero && { beginAtZero: true }),
    ...(yType === 'linear' && { grace: '15%' }),
    ticks: {
      color: '#94a3b8',
      font: { size: 10, weight: '500' },
      padding: 8,
      maxTicksLimit: 12,
      callback: (v: any) => typeof v === 'number' ? formatTickValue(v) : v,
    },
    grid: { 
      color: 'rgba(148, 163, 184, 0.12)', 
      lineWidth: 1,
      drawTicks: false,
    },
    border: { 
      display: true, 
      color: 'rgba(148, 163, 184, 0.2)',
      dash: [4, 4] 
    },
  },
});

export const getComboChartOptions = (isDarkMode: boolean, yType = 'linear', autoSkip = true) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ฿`,
      },
    },
  },
  maxBarThickness: 80,
  barPercentage: 0.6,
  categoryPercentage: 0.8,
  animation: { duration: 800, easing: 'easeInOutQuart' as const },
  scales: getScaleOptions(isDarkMode, false, yType, autoSkip),
});

export const getBarChartOptions = (isDarkMode: boolean, yType = 'linear', autoSkip = true) =>
  getComboChartOptions(isDarkMode, yType, autoSkip);

export const getLineChartOptions = (isDarkMode: boolean, yType = 'linear', autoSkip = true) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' as const },
  scales: getScaleOptions(isDarkMode, true, yType, autoSkip),
});

export const getDoughnutChartOptions = (isDarkMode: boolean) => ({
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      cornerRadius: 0,
      callbacks: {
        label: (ctx: any) => ` ${ctx.label}: ${formatMoney(ctx.raw)} ฿`,
      },
    },
  },
  animation: { animateScale: true, animateRotate: true, duration: 1000 },
});
