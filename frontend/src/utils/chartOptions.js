// src/utils/chartOptions.js
// ─────────────────────────────────────────────────────────────
const getTooltipOptions = (isDarkMode) => ({
  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
  titleColor:      isDarkMode ? '#f1f5f9' : '#1e293b',
  bodyColor:       isDarkMode ? '#94a3b8' : '#475569',
  borderColor:     isDarkMode ? '#334155' : '#e2e8f0',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
});

const formatTickValue = (v) => {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
};

const getScaleOptions = (isDarkMode, beginAtZero = false, yType = 'linear') => ({
  x: {
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 11 },
      maxRotation: 0,
      autoSkip: true,
    },
    grid:   { display: false },
    border: { display: false },
  },
  y: {
    type: yType,
    ...(beginAtZero && { beginAtZero: true }),
    ...(yType === 'linear' && { grace: '15%' }),
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 10, weight: '500' },
      padding: 4,
      maxTicksLimit: 12,
      callback: (v) => formatTickValue(v),
    },
    grid: { 
      color: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)', 
      lineWidth: 1 
    },
    border: { dash: [4, 4], display: false },
  },
});

export const getComboChartOptions = (isDarkMode, yType = 'linear') => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  maxBarThickness: 80,
  barPercentage: 0.6,
  categoryPercentage: 0.8,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, false, yType),
});

// เพิ่ม showLegend parameter
export const getBarChartOptions = (isDarkMode, yType = 'linear') => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  maxBarThickness: 80,
  barPercentage: 0.6,
  categoryPercentage: 0.8,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, false, yType),
});

// เพิ่ม showLegend parameter
export const getLineChartOptions = (isDarkMode, yType = 'linear') => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, true, yType),
});

export const getDoughnutChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.raw?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { animateScale: true, animateRotate: true, duration: 1000 },
});