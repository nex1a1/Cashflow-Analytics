// src/utils/chartOptions.js
// ─────────────────────────────────────────────────────────────
// Chart.js options ที่ใช้ซ้ำใน DashboardView
// แทนที่จะเขียน inline object ยาวๆ ซ้ำ 3–4 ครั้ง
// ─────────────────────────────────────────────────────────────

/**
 * Tooltip options ที่ใช้ร่วมกันทุก chart
 */
const getTooltipOptions = (isDarkMode) => ({
  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
  titleColor:      isDarkMode ? '#f1f5f9' : '#1e293b',
  bodyColor:       isDarkMode ? '#94a3b8' : '#475569',
  borderColor:     isDarkMode ? '#334155' : '#e2e8f0',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
});

/**
 * Scale options (แกน X/Y) ที่ใช้ร่วมกัน
 * @param {boolean} isDarkMode
 * @param {boolean} beginAtZero - Line chart ต้องการ beginAtZero: true
 */
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

// ─────────────────────────────────────────────────────────────
// Main chart options (combo / bar / line)
// ─────────────────────────────────────────────────────────────

/**
 * Options สำหรับ Combo chart (Bar + Line ซ้อนกัน)
 * ต่างจาก bar/line ตรงที่ legend แสดงอยู่ (position: 'bottom')
 */
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
        label: (ctx) =>
          ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode),
});

/**
 * Options สำหรับ Bar chart
 */
export const getBarChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode),
});

/**
 * Options สำหรับ Line chart
 */
export const getLineChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: { duration: 800, easing: 'easeInOutQuart' },
  scales: getScaleOptions(isDarkMode, true), // beginAtZero: true
});

// ─────────────────────────────────────────────────────────────
// Doughnut chart options
// ─────────────────────────────────────────────────────────────

/**
 * Options สำหรับ Doughnut chart (สัดส่วนรายจ่าย)
 */
export const getDoughnutChartOptions = (isDarkMode) => ({
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...getTooltipOptions(isDarkMode),
      cornerRadius: 8, // Doughnut ใช้ cornerRadius เล็กกว่านิดหน่อย
      callbacks: {
        label: (ctx) =>
          ` ${ctx.label}: ${ctx.raw?.toLocaleString('th-TH')} ฿`,
      },
    },
  },
  animation: {
    animateScale:  true,
    animateRotate: true,
    duration:      1000,
  },
});