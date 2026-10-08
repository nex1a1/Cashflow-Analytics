// src/utils/csvParser.ts

interface CategoryRule {
  pattern: RegExp;
  name: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  { pattern: /เงินเดือน|salary/, name: "เงินเดือน" },
  { pattern: /โบนัส|รายรับพิเศษ|ขายของ/, name: "รายรับพิเศษ/โบนัส" },
  // Short Latin tokens use \b: a bare "ko" / "ot" / "ups" matched inside tokyo, hotel, groups...
  { pattern: /หุ้น|nvda|xom|\bko\b|qqq|webull|ออมทอง|กองทุน|ลงทุน/, name: "การลงทุนและออมเงิน" },
  { pattern: /ค่าเช่า|ค่าหอ|หอพัก|อพาร์ทเม้นท์|คอนโด|ห้องพัก/, name: "ค่าเช่า/ค่าหอพัก" },
  { pattern: /ไอแพด|ipad|iphone|ไอโฟน|มือถือ|samsung|xiaomi|tablet|แท็บเล็ต|apple watch|smartwatch/, name: "สมาร์ทโฟน & ไอทีพกพา" },
  { pattern: /mainboard|\bpsu\b|\bram\b|ryzen|\bcpu\b|\bcase\b|\bssd\b|การ์ดจอ|\bvga\b|cooler|heatsink|\bfan\b|\bups\b|สำรองไฟ/, name: "ประกอบคอม & ฮาร์ดแวร์" },
  { pattern: /keyboard|คีย์บอร์ด|mouse|เมาส์|ไมค์|microphone|\bmic\b|maono|\bdac\b|soundcard|sound blaster/, name: "เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง" },
  { pattern: /headphone|หูฟัง|earbud|in-ear|joystick|จอย|flydigi|xbox|connection|สายเชื่อมต่อ|enclosure|\busb\b/, name: "เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง" },
  { pattern: /โต๊ะ|table|desk|chair|เก้าอี้|bewell|pegboard|mousepad|แผ่นรองเมาส์|monitor arm|ขาตั้งจอ/, name: "เฟอร์นิเจอร์ & จัดโต๊ะคอม" },
  { pattern: /คอม|computer|ผ่อน|จอ(?!ด)/, name: "อุปกรณ์ไอที/คอมพิวเตอร์" }, // (?!ด): "จอดรถ" is parking, not a monitor
  { pattern: /gemini|vip|subscription|netflix|youtube|spotify|yt premium|รายเดือน|สมาชิก/, name: "บริการรายเดือน" },
  { pattern: /max value|maxvalue|lotus|big c|tops|makro|ซุปเปอร์|ห้าง|เซเว่น|7-11|ดองกิ/, name: "ซุปเปอร์มาร์เก็ต/ห้าง" },
  { pattern: /shopee|lazada|ออนไลน์|สั่งของ|tiktok shop/, name: "ช้อปปิ้งออนไลน์" },
  { pattern: /ตัดผม|ยา|คลินิก|สุขภาพ|ความงาม|หาหมอ|โรงพยาบาล|ขูดหินปูน|ป่วย/, name: "สุขภาพและความงาม" },
  { pattern: /น้ำมัน|ทางด่วน|รถ|bts|mrt|เดินทาง|taxi|grab|วิน|จอดรถ|สะพานใหม่|มีนบุรี|รังสิต|ทองหล่อ|commart/, name: "การเดินทาง" },
  { pattern: /หนัง|gundam|เกม|ของเล่น|บันเทิง|ดูหนัง|คอนเสิร์ต|imax|เบสบอล|pool|discord/, name: "บันเทิงและสันทนาการ" },
  { pattern: /ซักผ้า|ผงซักฟอก|ของใช้/, name: "ที่อยู่อาศัยและของใช้" },
  { pattern: /ข้าว|อาหาร|เที่ยง|เย็น|หุง|ผลไม้|ขนม|lunch|dinner|cook|เครื่องดื่ม|ชา|กาแฟ|\bot\b/, name: "อาหารและเครื่องดื่ม" },
  { pattern: /พ่อ|แม่|ลูก|ครอบครัว|ให้เงิน|หมา|แมว|สัตว์เลี้ยง/, name: "ครอบครัวและสัตว์เลี้ยง" },
];

export const autoCategorize = (description: string, categoryName: string, categoryList: any[]): string => {
  const t = ((description || "") + " " + (categoryName || "")).toLowerCase();
  const matchedRule = CATEGORY_RULES.find(rule => rule.pattern.test(t));
  const matchedName = matchedRule ? matchedRule.name : "อื่นๆ";
  
  const exists = categoryList.find(c => c.name === matchedName);
  return exists ? exists.name : (categoryList.find(c => c.type === 'expense')?.name || "อื่นๆ");
};

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
