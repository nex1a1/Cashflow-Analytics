export const THAI_MONTHS: readonly string[] = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT: readonly string[] = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const formatMoney = (amount: number | string): string =>
  (Number(amount) || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const getThaiMonth = (yearMonth: string): string => {
  if (!yearMonth?.includes('-')) return yearMonth;
  const [y, m] = yearMonth.split('-');
  const mIdx = Number.parseInt(m, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) return `${THAI_MONTHS[mIdx]} ${y}`;
  return yearMonth;
};

const SUB_PERIOD_LABELS: Record<string, (y: string) => string> = {
  H1: (y) => `ครึ่งปีแรก (H1/${y})`,
  H2: (y) => `ครึ่งปีหลัง (H2/${y})`,
  Q1: (y) => `ไตรมาส 1 (Q1/${y})`,
  Q2: (y) => `ไตรมาส 2 (Q2/${y})`,
  Q3: (y) => `ไตรมาส 3 (Q3/${y})`,
  Q4: (y) => `ไตรมาส 4 (Q4/${y})`,
};

export const getFilterLabel = (period: string): string => {
  if (period === 'ALL') return 'ดูภาพรวมทั้งหมด (All Time)';
  if (/^\d{4}$/.test(period)) return `ปี ${period}`;
  
  if (period.includes(',')) {
    const count = period.split(',').length;
    return `เลือกเฉพาะเจาะจง (${count} เดือน)`;
  }

  if (period.includes('_')) {
    const [start, end] = period.split('_');
    return `${getThaiMonth(start)} - ${getThaiMonth(end)}`;
  }

  if (period.includes('-')) {
    const [y, type] = period.split('-');
    const subPeriodFormatter = SUB_PERIOD_LABELS[type];
    if (subPeriodFormatter) return subPeriodFormatter(y);
    return getThaiMonth(period);
  }
  return period;
};

export const hexToRgb = (hexStr: string | null | undefined = '#94a3b8'): string => {
    if (!hexStr || typeof hexStr !== 'string') return '148, 163, 184';
    const raw = hexStr.replace('#', '');
    const hex = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    if (hex.length !== 6) return '148, 163, 184'; 
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '148, 163, 184';
    return `${r}, ${g}, ${b}`;
};

export interface ThaiDayInfo {
  label: string;
  fullName: string;
  color: string;
  bg: string;
  border: string;
}

export const THAI_DAY_CONFIG: readonly ThaiDayInfo[] = [
  { label: 'อา.', fullName: 'วันอาทิตย์ (พระอาทิตย์)', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.35)' },
  { label: 'จ.',  fullName: 'วันจันทร์ (พระจันทร์)',    color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)',  border: 'rgba(251, 191, 36, 0.35)' },
  { label: 'อ.',  fullName: 'วันอังคาร (พระอังคาร)',   color: '#f472b6', bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.35)' },
  { label: 'พ.',  fullName: 'วันพุธ (พระพุธ)',        color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)',  border: 'rgba(52, 211, 153, 0.35)' },
  { label: 'พฤ.', fullName: 'วันพฤหัสบดี (พระพฤหัสบดี)', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)',  border: 'rgba(251, 146, 60, 0.35)' },
  { label: 'ศ.',  fullName: 'วันศุกร์ (พระศุกร์)',       color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)',  border: 'rgba(56, 189, 248, 0.35)' },
  { label: 'ส.',  fullName: 'วันเสาร์ (พระเสาร์)',      color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.35)' },
];

export const getThaiDayInfo = (dateStr?: string | null): ThaiDayInfo | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  const d = Number.parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const dateObj = new Date(y, m - 1, d);
  return THAI_DAY_CONFIG[dateObj.getDay()] || null;
};
