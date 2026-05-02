// src/utils/dateHelpers.js

/**
 * แปลง DD/MM/YYYY เป็น YYYY-MM-DD
 */
export const toISODate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('/')) return dateStr;
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

/**
 * แปลง YYYY-MM-DD เป็น DD/MM/YYYY
 */
export const fromISODate = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('-')) return isoStr;
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export const parseDateStrToObj = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  
  // รองรับทั้ง YYYY-MM-DD และ DD/MM/YYYY
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, parseInt(m) - 1, d);
  }
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date();
  return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
};

export const isDateInFilter = (dateStr, filter) => {
  if (filter === 'ALL') return true;
  if (!dateStr) return false;
  
  // แปลงให้เป็น DD/MM/YYYY เพื่อใช้ Logic เดิมในการเปรียบเทียบ
  const displayDate = dateStr.includes('-') ? fromISODate(dateStr) : dateStr;
  
  const parts = displayDate.split('/');
  if (parts.length !== 3) return false;
  const m = parseInt(parts[1], 10), y = parts[2];
  if (filter === y) return true;
  if (filter.includes('-')) {
    const [fy, fType] = filter.split('-');
    if (y !== fy) return false;
    if (fType === 'H1') return m >= 1 && m <= 6;
    if (fType === 'H2') return m >= 7 && m <= 12;
    if (fType === 'Q1') return m >= 1 && m <= 3;
    if (fType === 'Q2') return m >= 4 && m <= 6;
    if (fType === 'Q3') return m >= 7 && m <= 9;
    if (fType === 'Q4') return m >= 10 && m <= 12;
    return fType === parts[1];
  }
  return false;
};

export const generateDatesForPeriod = (period, allTransactions) => {
    if (!allTransactions || allTransactions.length === 0) return [];

    const filteredTx = allTransactions.filter(t => isDateInFilter(t.isoDate || t.date, period));
    if (filteredTx.length === 0) return [];

    const txDates = filteredTx.map(t => parseDateStrToObj(t.isoDate || t.date).getTime());
    const minTxDate = new Date(Math.min(...txDates));
    const maxTxDate = new Date(Math.max(...txDates));

    let start, end;

    if (period === 'ALL') {
        start = new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1);
        end = maxTxDate;
    } else if (period.match(/^\d{4}$/)) {
        start = new Date(period, 0, 1);
        end = new Date(period, 11, 31);
    } else if (period.match(/^\d{4}-H1$/)) {
        const y = period.split('-')[0];
        start = new Date(y, 0, 1);
        end = new Date(y, 5, 30);
    } else if (period.match(/^\d{4}-H2$/)) {
        const y = period.split('-')[0];
        start = new Date(y, 6, 1);
        end = new Date(y, 11, 31);
    } else if (period.match(/^\d{4}-Q(\d)$/)) {
        const [y, qStr] = period.split('-Q');
        const q = parseInt(qStr);
        start = new Date(y, (q - 1) * 3, 1);
        end = new Date(y, q * 3, 0); 
    } else if (period.match(/^\d{4}-\d{2}$/)) {
        const [y, m] = period.split('-');
        start = new Date(y, parseInt(m) - 1, 1);
        end = new Date(y, parseInt(m), 0); 
    } else {
        return [];
    }

    if (period !== 'ALL' && !period.match(/^\d{4}-\d{2}$/)) {
        if (end > maxTxDate) {
            end = maxTxDate;
        }
        const minMonthStart = new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1);
        if (start < minMonthStart) {
            start = minMonthStart;
        }
    }

    const dateArray = [];
    let curr = new Date(start);
    let sanityCheck = 0;
    while (curr <= end && sanityCheck < 5000) {
        const d = String(curr.getDate()).padStart(2, '0');
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const y = curr.getFullYear();
        dateArray.push(`${d}/${m}/${y}`);
        curr.setDate(curr.getDate() + 1);
        sanityCheck++;
    }
    return dateArray;
};