import { describe, it, expect } from 'vitest';
import { cleanNumber, parseCSV } from '../csvParser';

describe('cleanNumber', () => {
  it('strips baht sign, spaces and thousands commas', () => {
    expect(cleanNumber('฿ 1,234.50')).toBe(1234.5);
  });
  it('treats dashes and blanks as zero', () => {
    expect(cleanNumber('-')).toBe(0);
    expect(cleanNumber('')).toBe(0);
  });
  it('reads the true minus the app displays ("−฿1,234.50" copied from a page), not as 0', () => {
    expect(cleanNumber('−฿1,234.50')).toBe(-1234.5);
    expect(cleanNumber('−85,50')).toBe(-85.5);
    expect(cleanNumber('−')).toBe(0);
  });
});

describe('cleanNumber — decimal comma', () => {
  it('a comma followed by one or two digits is a decimal comma (a thousands group has three)', () => {
    expect(cleanNumber('85,50')).toBe(85.5);
    expect(cleanNumber('฿ 1,5')).toBe(1.5);
    expect(cleanNumber('-12,05')).toBe(-12.05);
  });
  it('a decimal comma works after any number of digits', () => {
    expect(cleanNumber('1234,50')).toBe(1234.5);
    expect(cleanNumber('฿ 0,99')).toBe(0.99);
  });
  it('three digits after the comma is still a thousands separator', () => {
    expect(cleanNumber('12,345')).toBe(12345);
    expect(cleanNumber('1,234,567.89')).toBe(1234567.89);
  });
});

describe('parseCSV', () => {
  it('splits on commas, keeps quoted commas and doubled quotes, drops blank lines and trims cells', () => {
    expect(parseCSV('a, b ,"c,d","say ""hi"""\n\n1,2,3,4\n')).toEqual([['a', 'b', 'c,d', 'say "hi"'], ['1', '2', '3', '4']]);
  });
  it('reads CRLF files', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('uses semicolons when the header line is separated by them (Excel in many locales, and our own export option)', () => {
    expect(parseCSV('วันที่;ประเภท;หมวดหมู่;รายละเอียด;จำนวนเงิน\n2026-10-07;รายจ่าย;อาหาร;ข้าว;85.50')).toEqual([
      ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'],
      ['2026-10-07', 'รายจ่าย', 'อาหาร', 'ข้าว', '85.50'],
    ]);
  });
  it('a semicolon file keeps commas inside its cells (descriptions, thousands) and quoted semicolons', () => {
    expect(parseCSV('a;b;c\n1;ข้าว, น้ำ;1,200.50\n2;"x;y";3')).toEqual([['a', 'b', 'c'], ['1', 'ข้าว, น้ำ', '1,200.50'], ['2', 'x;y', '3']]);
  });
  it('a comma file keeps semicolons inside its cells', () => {
    expect(parseCSV('a,b,c\n1,ข้าว; น้ำ,3')).toEqual([['a', 'b', 'c'], ['1', 'ข้าว; น้ำ', '3']]);
  });
  it('the delimiter is read from the header line outside quotes, so a quoted semicolon in a comma header does not switch it', () => {
    expect(parseCSV('"a;b;c",d\n1,2')).toEqual([['a;b;c', 'd'], ['1', '2']]);
  });
  it('only the header line decides: later rows full of the other character do not flip it', () => {
    expect(parseCSV('a,b\n1;2;3;4,5')).toEqual([['a', 'b'], ['1;2;3;4', '5']]);
    expect(parseCSV('a;b\n1,2,3,4;5')).toEqual([['a', 'b'], ['1,2,3,4', '5']]);
  });
  it('a tie in the header goes to the comma', () => {
    expect(parseCSV('a,b;c\n1,2;3')).toEqual([['a', 'b;c'], ['1', '2;3']]);
  });
  it('a single column stays a single column', () => {
    expect(parseCSV('a\nb')).toEqual([['a'], ['b']]);
  });
});
