// src/utils/formatters.js

export const formatMoney = (amount) =>
  (Number(amount) || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const getThaiMonth = (yearMonth) => {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const [y, m] = yearMonth.split('-');
  const mIdx = parseInt(m, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) return `${months[mIdx]} ${y}`;
  return yearMonth;
};

export const getFilterLabel = (period) => {
  if (period === 'ALL') return 'ดูภาพรวมทั้งหมด (All Time)';
  if (period.match(/^\d{4}$/)) return `ปี ${period}`;
  if (period.includes('-')) {
    const [y, type] = period.split('-');
    if (type === 'H1') return `ครึ่งปีแรก (H1/${y})`;
    if (type === 'H2') return `ครึ่งปีหลัง (H2/${y})`;
    if (type === 'Q1') return `ไตรมาส 1 (Q1/${y})`;
    if (type === 'Q2') return `ไตรมาส 2 (Q2/${y})`;
    if (type === 'Q3') return `ไตรมาส 3 (Q3/${y})`;
    if (type === 'Q4') return `ไตรมาส 4 (Q4/${y})`;
    return getThaiMonth(period);
  }
  return period;
};
export const hexToRgb = (hexStr) => {
    let hex = hexStr || '#94a3b8';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '148, 163, 184'; 
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
};