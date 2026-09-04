// src/utils/dateHelpers.ts

/**
 * แปลง DD/MM/YYYY เป็น YYYY-MM-DD
 */
export const toISODate = (dateStr: string): string => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('/')) return dateStr;
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

/**
 * แปลง YYYY-MM-DD เป็น DD/MM/YYYY
 */
export const fromISODate = (isoStr: string): string => {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('-')) return isoStr;
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export const parseDateStrToObj = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  
  // รองรับทั้ง YYYY-MM-DD และ DD/MM/YYYY
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10));
  }
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date();
  return new Date(Number.parseInt(parts[2], 10), Number.parseInt(parts[1], 10) - 1, Number.parseInt(parts[0], 10));
};

const matchQuarterOrHalf = (fType: string, m: number): boolean => {
  if (fType === 'H1') return m >= 1 && m <= 6;
  if (fType === 'H2') return m >= 7 && m <= 12;
  if (fType === 'Q1') return m >= 1 && m <= 3;
  if (fType === 'Q2') return m >= 4 && m <= 6;
  if (fType === 'Q3') return m >= 7 && m <= 9;
  if (fType === 'Q4') return m >= 10 && m <= 12;
  return false;
};

export const isDateInFilter = (dateStr: string, filter: string): boolean => {
  if (filter === 'ALL') return true;
  if (!dateStr) return false;
  
  const displayDate = dateStr.includes('-') ? fromISODate(dateStr) : dateStr;
  const parts = displayDate.split('/');
  if (parts.length !== 3) return false;
  const m = Number.parseInt(parts[1], 10), y = parts[2];
  const currentDate = `${y}-${String(m).padStart(2, '0')}`;

  // Support Multi-select: YYYY-MM,YYYY-MM,...
  if (filter.includes(',')) {
    return filter.split(',').includes(currentDate);
  }

  // Support Custom Range: YYYY-MM_YYYY-MM
  if (filter.includes('_')) {
    const [start, end] = filter.split('_');
    return currentDate >= start && currentDate <= end;
  }

  if (filter === y) return true;
  if (filter.includes('-')) {
    const [fy, fType] = filter.split('-');
    if (y !== fy) return false;
    if (['H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4'].includes(fType)) {
      return matchQuarterOrHalf(fType, m);
    }
    return fType === parts[1];
  }
  return false;
};

export const buildDateSequence = (start: Date, end: Date, maxDays = 3650): string[] => {
  const dateArray: string[] = [];
  let curr = new Date(start);
  let sanityCheck = 0;
  while (curr <= end && sanityCheck < maxDays) {
    const d = String(curr.getDate()).padStart(2, '0');
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const y = curr.getFullYear();
    dateArray.push(`${y}-${m}-${d}`);
    const nextDate = new Date(curr);
    nextDate.setDate(nextDate.getDate() + 1);
    curr = nextDate;
    sanityCheck++;
  }
  return dateArray;
};

export const resolvePeriodDateBounds = (period: string): { start: Date; end: Date } | null => {
  if (/^\d{4}$/.test(period)) {
    return {
      start: new Date(Number.parseInt(period, 10), 0, 1),
      end: new Date(Number.parseInt(period, 10), 11, 31),
    };
  }
  if (/^\d{4}-H1$/.test(period)) {
    const y = period.split('-')[0];
    return {
      start: new Date(Number.parseInt(y, 10), 0, 1),
      end: new Date(Number.parseInt(y, 10), 5, 30),
    };
  }
  if (/^\d{4}-H2$/.test(period)) {
    const y = period.split('-')[0];
    return {
      start: new Date(Number.parseInt(y, 10), 6, 1),
      end: new Date(Number.parseInt(y, 10), 11, 31),
    };
  }
  if (/^\d{4}-Q(\d)$/.test(period)) {
    const [y, qStr] = period.split('-Q');
    const q = Number.parseInt(qStr, 10);
    return {
      start: new Date(Number.parseInt(y, 10), (q - 1) * 3, 1),
      end: new Date(Number.parseInt(y, 10), q * 3, 0),
    };
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return {
      start: new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, 1),
      end: new Date(Number.parseInt(y, 10), Number.parseInt(m, 10), 0),
    };
  }
  if (period.includes('_')) {
    const [startMonth, endMonth] = period.split('_');
    const [sy, sm] = startMonth.split('-');
    const [ey, em] = endMonth.split('-');
    return {
      start: new Date(Number.parseInt(sy, 10), Number.parseInt(sm, 10) - 1, 1),
      end: new Date(Number.parseInt(ey, 10), Number.parseInt(em, 10), 0),
    };
  }
  return null;
};

const generateMultiSelectDates = (months: string[]): string[] => {
  let dateArray: string[] = [];
  const sortedMonths = [...months].sort((a, b) => a.localeCompare(b));
  for (const mStr of sortedMonths) {
    const [y, m] = mStr.split('-');
    const start = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, 1);
    const end = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10), 0);
    dateArray = dateArray.concat(buildDateSequence(start, end));
  }
  return dateArray;
};

const getAllTransactionsBounds = (allTransactions: any[], period: string): { start: Date; end: Date } | null => {
  if (!allTransactions || allTransactions.length === 0) return null;
  const filteredTx = allTransactions.filter(t => isDateInFilter(t.isoDate || t.date, period));
  if (filteredTx.length === 0) return null;

  const txDates = filteredTx.map(t => parseDateStrToObj(t.isoDate || t.date).getTime());
  const minTxDate = new Date(Math.min(...txDates));
  const maxTxDate = new Date(Math.max(...txDates));

  return {
    start: new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1),
    end: maxTxDate,
  };
};

const clampBoundsToTransactions = (
  bounds: { start: Date; end: Date },
  period: string,
  allTransactions: any[]
): { start: Date; end: Date } => {
  if (period === 'ALL' || /^\d{4}-\d{2}$/.test(period) || !allTransactions || allTransactions.length === 0) {
    return bounds;
  }
  const filteredTx = allTransactions.filter(t => isDateInFilter(t.isoDate || t.date, period));
  if (filteredTx.length === 0) return bounds;

  const txDates = filteredTx.map(t => parseDateStrToObj(t.isoDate || t.date).getTime());
  const maxTxDate = new Date(Math.max(...txDates));
  const minTxDate = new Date(Math.min(...txDates));

  let { start, end } = bounds;
  if (end > maxTxDate) end = maxTxDate;
  const minMonthStart = new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1);
  if (start < minMonthStart) start = minMonthStart;
  return { start, end };
};

export const generateDatesForPeriod = (period: string, allTransactions: any[]): string[] => {
  if (period.includes(',')) {
    return generateMultiSelectDates(period.split(','));
  }

  let bounds: { start: Date; end: Date } | null = null;
  if (period === 'ALL') {
    bounds = getAllTransactionsBounds(allTransactions, period);
    if (!bounds) return [];
  } else {
    bounds = resolvePeriodDateBounds(period);
    if (!bounds) return [];
    bounds = clampBoundsToTransactions(bounds, period, allTransactions);
  }

  return buildDateSequence(bounds.start, bounds.end);
};

/**
 * Returns { startDate, endDate } in YYYY-MM-DD format for a given period string.
 */
export const getPeriodDateRange = (period: string): { startDate: string | null; endDate: string | null } => {
  if (period === 'ALL') return { startDate: null, endDate: null };
  const bounds = resolvePeriodDateBounds(period);
  if (!bounds) return { startDate: null, endDate: null };

  const toStr = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };
  return { startDate: toStr(bounds.start), endDate: toStr(bounds.end) };
};
