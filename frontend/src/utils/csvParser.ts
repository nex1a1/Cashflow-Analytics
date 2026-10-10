// src/utils/csvParser.ts

const pushNonEmptyRow = (rows: string[][], row: string[]) => {
  if (row.some(c => c.trim() !== '')) {
    rows.push(row);
  }
};

interface ParserState {
  rows: string[][];
  row: string[];
  current: string;
  inQuotes: boolean;
  delimiter: ',' | ';';
}

/**
 * Excel in many locales saves CSV with ';' (and our own export offers it): take whichever of the two the header line uses more,
 * not counting quoted text. Descriptions further down may contain either character freely.
 */
const detectDelimiter = (text: string): ',' | ';' => {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === '\n' || ch === '\r') break;
      if (ch === ',') commas++;
      else if (ch === ';') semicolons++;
    }
  }
  return semicolons > commas ? ';' : ',';
};

const flushCell = (state: ParserState) => {
  state.row.push(state.current);
  state.current = '';
};

const flushRow = (state: ParserState) => {
  flushCell(state);
  pushNonEmptyRow(state.rows, state.row);
  state.row = [];
};

const processChar = (
  char: string,
  nextChar: string | undefined,
  state: ParserState
): { skipNext: boolean } => {
  if (char === '"') {
    if (state.inQuotes && nextChar === '"') {
      state.current += '"';
      return { skipNext: true };
    }
    state.inQuotes = !state.inQuotes;
    return { skipNext: false };
  }

  if (state.inQuotes) {
    state.current += char;
    return { skipNext: false };
  }

  if (char === state.delimiter) {
    flushCell(state);
    return { skipNext: false };
  }

  if (char === '\n' || char === '\r') {
    flushRow(state);
    return { skipNext: char === '\r' && nextChar === '\n' };
  }

  state.current += char;
  return { skipNext: false };
};

export const parseCSV = (text: string): string[][] => {
  const state: ParserState = {
    rows: [],
    row: [],
    current: '',
    inQuotes: false,
    delimiter: detectDelimiter(text),
  };

  for (let i = 0; i < text.length; i++) {
    const { skipNext } = processChar(text[i], text[i + 1], state);
    if (skipNext) i++;
  }

  if (state.current !== '' || state.row.length > 0) {
    flushRow(state);
  }

  return state.rows.map(r => r.map(c => c.trim()));
};

export const cleanNumber = (val: string | null | undefined): number => {
  if (!val) return 0;
  let cleaned = val.replace(/[฿\s"]/g, '').replace('−', '-'); // the app displays a true minus; a number copied from a page must still import as negative
  // "85,50" is a decimal comma (files from decimal-comma locales): a thousands group always has three digits, so one or two can't be one
  cleaned = /^-?\d+,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replaceAll(',', '');
  if (cleaned === '-' || cleaned === '') return 0;
  return Number.parseFloat(cleaned) || 0;
};
