// src/utils/chartOptions.js
import { formatMoney } from './formatters';

// ─────────────────────────────────────────────────────────────
const getTooltipOptions = (isDarkMode) => ({
  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
  titleColor:      isDarkMode ? '#f1f5f9' : '#1e293b',
  bodyColor:       isDarkMode ? '#94a3b8' : '#475569',
  borderColor:     isDarkMode ? '#334155' : '#e2e8f0',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 2,
});

const formatTickValue = (v) => {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
};

const getScaleOptions = (isDarkMode, beginAtZero = false, yType = 'linear', autoSkip = true) => ({
  x: {
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 9 },
      maxRotation: 90,
      minRotation: 0,
      autoSkip: autoSkip,
      autoSkipPadding: 15,
    },
    grid: {
      display: true,
      color: isDarkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(100, 116, 139, 0.05)',
      drawTicks: false,
    },
    border: { display: false },
  },
  y: {
    type: yType,
    ...(beginAtZero && { beginAtZero: true }),
    ...(yType === 'linear' && { grace: '15%' }),
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 10, weight: '500' },
      padding: 8,
      maxTicksLimit: 12,
      callback: (v) => formatTickValue(v),
    },
    grid: { 
      color: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
      lineWidth: 1,
      drawTicks: false,
    },
    border: { 
      display: true, 
      color: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
      dash: [4, 4] 
    },
  },
});

export const getComboChartOptions = (isDarkMode, yType = 'linear', autoSkip = true) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ฿`,
      },
    },
  },
  maxBarThickness: 80,
  barPercentage: 0.6,
  categoryPercentage: 0.8,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, false, yType, autoSkip),
});

export const getBarChartOptions = (isDarkMode, yType = 'linear', autoSkip = true) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ฿`,
      },
    },
  },
  maxBarThickness: 80,
  barPercentage: 0.6,
  categoryPercentage: 0.8,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, false, yType, autoSkip),
});

export const getLineChartOptions = (isDarkMode, yType = 'linear', autoSkip = true) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, true, yType, autoSkip),
});

export const getDoughnutChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      cornerRadius: 2,
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.raw)} ฿`,
      },
    },
  },
  animation: { animateScale: true, animateRotate: true, duration: 1000 },
});
