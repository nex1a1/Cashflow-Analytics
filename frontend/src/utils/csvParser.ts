// src/utils/csvParser.ts

interface CategoryRule {
  pattern: RegExp;
  name: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  { pattern: /เงินเดือน|salary/, name: "เงินเดือน" },
  { pattern: /โบนัส|รายรับพิเศษ|ขายของ/, name: "รายรับพิเศษ/โบนัส" },
  { pattern: /หุ้น|nvda|xom|ko|qqq|webull|ออมทอง|กองทุน|ลงทุน/, name: "การลงทุนและออมเงิน" },
  { pattern: /ค่าเช่า|ค่าหอ|หอพัก|อพาร์ทเม้นท์|คอนโด|ห้องพัก/, name: "ค่าเช่า/ค่าหอพัก" },
  { pattern: /ไอแพด|ipad|iphone|ไอโฟน|มือถือ|samsung|xiaomi|tablet|แท็บเล็ต|apple watch|smartwatch/, name: "สมาร์ทโฟน & ไอทีพกพา" },
  { pattern: /mainboard|psu|ram|ryzen|cpu|case|ssd|การ์ดจอ|vga|cooler|heatsink|fan|ups|สำรองไฟ/, name: "ประกอบคอม & ฮาร์ดแวร์" },
  { pattern: /keyboard|คีย์บอร์ด|เมาส์|mouse|ไมค์|microphone|maono|dac|soundcard|sound blaster|headphone|หูฟัง|earbud|in-ear|joystick|จอย|flydigi|xbox|connection|สายเชื่อมต่อ|enclosure|usb/, name: "เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง" },
  { pattern: /โต๊ะ|table|desk|chair|เก้าอี้|bewell|pegboard|mousepad|แผ่นรองเมาส์|monitor arm|ขาตั้งจอ/, name: "เฟอร์นิเจอร์ & จัดโต๊ะคอม" },
  { pattern: /คอม|computer|ผ่อน|จอ/, name: "อุปกรณ์ไอที/คอมพิวเตอร์" },
  { pattern: /gemini|vip|subscription|netflix|youtube|spotify|yt premium|รายเดือน|สมาชิก/, name: "บริการรายเดือน" },
  { pattern: /max value|maxvalue|lotus|big c|tops|makro|ซุปเปอร์|ห้าง|เซเว่น|7-11|ดองกิ/, name: "ซุปเปอร์มาร์เก็ต/ห้าง" },
  { pattern: /shopee|lazada|ออนไลน์|สั่งของ|tiktok shop/, name: "ช้อปปิ้งออนไลน์" },
  { pattern: /ตัดผม|ยา|คลินิก|สุขภาพ|ความงาม|หาหมอ|โรงพยาบาล|ขูดหินปูน|ป่วย/, name: "สุขภาพและความงาม" },
  { pattern: /น้ำมัน|ทางด่วน|รถ|bts|mrt|เดินทาง|taxi|grab|วิน|จอดรถ|สะพานใหม่|มีนบุรี|รังสิต|ทองหล่อ|commart/, name: "การเดินทาง" },
  { pattern: /หนัง|gundam|เกม|ของเล่น|บันเทิง|ดูหนัง|คอนเสิร์ต|imax|เบสบอล|pool|discord/, name: "บันเทิงและสันทนาการ" },
  { pattern: /ซักผ้า|ผงซักฟอก|ของใช้/, name: "ที่อยู่อาศัยและของใช้" },
  { pattern: /ข้าว|อาหาร|เที่ยง|เย็น|หุง|ผลไม้|ขนม|lunch|dinner|cook|เครื่องดื่ม|ชา|กาแฟ|ot/, name: "อาหารและเครื่องดื่ม" },
  { pattern: /พ่อ|แม่|ลูก|ครอบครัว|ให้เงิน|หมา|แมว|สัตว์เลี้ยง/, name: "ครอบครัวและสัตว์เลี้ยง" },
];

export const autoCategorize = (description: string, categoryName: string, categoryList: any[]): string => {
  const t = ((description || "") + " " + (categoryName || "")).toLowerCase();
  const matchedRule = CATEGORY_RULES.find(rule => rule.pattern.test(t));
  const matchedName = matchedRule ? matchedRule.name : "อื่นๆ";
  
  const exists = categoryList.find(c => c.name === matchedName);
  return exists ? exists.name : (categoryList.filter(c=>c.type==='expense')[0]?.name || "อื่นๆ");
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
}

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

  if (char === ',') {
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
  let cleaned = val.replace(/[฿\s,"]/g, '');
  if (cleaned === '-' || cleaned === '') return 0;
  return Number.parseFloat(cleaned) || 0;
};
