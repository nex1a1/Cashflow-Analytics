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

const getScaleOptions = (isDarkMode, beginAtZero = false) => ({
  x: {
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 11 },
    },
    grid:   { display: false },
    border: { display: false },
  },
  y: {
    ...(beginAtZero && { beginAtZero: true }),
    ticks: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      font: { size: 11 },
      callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
    },
    grid:   { color: isDarkMode ? '#1e293b' : '#f1f5f9', lineWidth: 1 },
    border: { dash: [4, 4], display: false },
  },
});

export const getComboChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color:         isDarkMode ? '#cbd5e1' : '#475569',
        padding:       16,
        usePointStyle: true,
        pointStyle:    'circle',
        font:          { size: 12, weight: 'bold' },
      },
    },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode),
});

// เพิ่ม showLegend parameter
export const getBarChartOptions = (isDarkMode, showLegend = false) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { 
        display: showLegend,
        position: 'bottom',
        labels: { 
           color: isDarkMode ? '#cbd5e1' : '#475569', 
           usePointStyle: true, 
           boxWidth: 6,         // ลดขนาดจุดสี
           font: { size: 10 }   // ลดขนาดตัวอักษร
        }
    },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode),
});

// เพิ่ม showLegend parameter
export const getLineChartOptions = (isDarkMode, showLegend = false) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { 
        display: showLegend,
        position: 'bottom',
        labels: { color: isDarkMode ? '#cbd5e1' : '#475569', usePointStyle: true, boxWidth: 8 }
    },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, true),
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