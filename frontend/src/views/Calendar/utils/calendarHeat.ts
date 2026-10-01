import { tc } from '@/constants/theme';

/**
 * ฿ ต่อวันที่เริ่มนับเป็น กลาง · สูง · พีค. เกณฑ์ตายตัว ไม่เทียบกับวันที่แพงที่สุดของเดือน —
 * วันล่วงหน้า (เช่น ค่าหอ ฿6,950 ที่ยังมาไม่ถึง) จะได้ไม่กดให้วันอื่นจางหายหมด.
 */
export const CALENDAR_HEAT_STEPS = [300, 1000, 3000] as const;

/** 0 = ไม่มีรายจ่าย · 1 = ปกติ · 2 = กลาง (warn) · 3 = สูง (expense) · 4 = พีค (expense เต็ม + แถบบน) */
export const getCalendarHeatLevel = (exp: number): number => {
  if (!exp || exp <= 0) return 0;
  if (exp >= CALENDAR_HEAT_STEPS[2]) return 4;
  if (exp >= CALENDAR_HEAT_STEPS[1]) return 3;
  if (exp >= CALENDAR_HEAT_STEPS[0]) return 2;
  return 1;
};

/**
 * พื้น cell ย้อมจางเท่านั้น: ตัวเลขสีแดง/เขียน/เทาใน cell ต้องยังได้ >= 4.5:1 (มีเทสต์คุม).
 * ความแรงของระดับบอกที่ป้ายยอดรวม (CALENDAR_HEAT_CHIP) ไม่ใช่ที่ความเข้มของพื้นหลัง.
 */
export const CALENDAR_HEAT_TINT = {
  2: { token: 'warn', alpha: 0.06 },
  3: { token: 'expense', alpha: 0.08 },
  4: { token: 'expense', alpha: 0.12 },
} as const;

export const CALENDAR_HEAT_COLORS: Record<number, string> = {
  0: 'transparent',
  1: 'transparent',
  2: tc(CALENDAR_HEAT_TINT[2].token, CALENDAR_HEAT_TINT[2].alpha),
  3: tc(CALENDAR_HEAT_TINT[3].token, CALENDAR_HEAT_TINT[3].alpha),
  4: tc(CALENDAR_HEAT_TINT[4].token, CALENDAR_HEAT_TINT[4].alpha),
};

/**
 * ป้ายยอดรวมรายวัน (฿…) ตามระดับ — ไม่ใช้ border เพราะ border lock ทำให้เป็นเส้นบางสีเดียว.
 * ระดับ 3 ใช้ตัวอักษรขาวบนพื้นแดงจาง (ตัวแดงบนแดงจางได้แค่ ~4.2:1) ส่วน 2 / 4 ผ่าน >= 5:1.
 */
export const CALENDAR_HEAT_CHIP: Record<number, string> = {
  0: 'text-expense',
  1: 'text-expense',
  2: 'bg-warn/20 text-warn',
  3: 'bg-expense/25 text-ink-display',
  4: 'bg-expense text-canvas',
};
