import { describe, it, expect } from 'vitest';
import { autoCategorize, cleanNumber } from '../csvParser';

// 'อื่นๆ' is what autoCategorize answers when no rule matches, so a miss is easy to tell apart from a wrong hit
const cats = [
  'เงินเดือน', 'การลงทุนและออมเงิน', 'อุปกรณ์ไอที/คอมพิวเตอร์', 'การเดินทาง', 'อาหารและเครื่องดื่ม', 'ประกอบคอม & ฮาร์ดแวร์', 'อื่นๆ',
].map((name, i) => ({ id: String(i), name, type: name === 'เงินเดือน' ? 'income' : 'expense' }));

describe('autoCategorize', () => {
  it('parking is travel, not an IT purchase ("จอดรถ" contains "จอ")', () => {
    expect(autoCategorize('จอดรถ', '', cats)).toBe('การเดินทาง');
  });

  it('a real monitor ("จอ") is still IT equipment', () => {
    expect(autoCategorize('จอคอม', '', cats)).toBe('อุปกรณ์ไอที/คอมพิวเตอร์');
  });

  it('short English tokens only match as whole words ("tokyo" is not the KO stock)', () => {
    expect(autoCategorize('tokyo trip', '', cats)).toBe('อื่นๆ');
    expect(autoCategorize('ko ปันผล', '', cats)).toBe('การลงทุนและออมเงิน');
  });

  it('"hotel" is not overtime ("ot") and "groups" is not a UPS', () => {
    expect(autoCategorize('hotel', '', cats)).toBe('อื่นๆ');
    expect(autoCategorize('groups meeting', '', cats)).toBe('อื่นๆ');
  });

  it('whole-word English still works (ups, ot)', () => {
    expect(autoCategorize('ups สำรองไฟ', '', cats)).toBe('ประกอบคอม & ฮาร์ดแวร์');
    expect(autoCategorize('ot ดึก', '', cats)).toBe('อาหารและเครื่องดื่ม');
  });
});

describe('cleanNumber', () => {
  it('strips baht sign, spaces and thousands commas', () => {
    expect(cleanNumber('฿ 1,234.50')).toBe(1234.5);
  });
  it('treats dashes and blanks as zero', () => {
    expect(cleanNumber('-')).toBe(0);
    expect(cleanNumber('')).toBe(0);
  });
});
