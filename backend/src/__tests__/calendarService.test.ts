import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import type { Request, Response } from 'express';
import db from '../config/db';
import { upsertCalendarDay } from '../controllers/calendarController';
import { initSchema } from '../models/schema';
import { ensureCalendarNoteIcon } from '../models/migrations';
import calendarService from '../services/calendarService';
import { calendarDaySchema } from '../validations/calendarValidation';

const WORK = 'test-dt-work';
const HOLIDAY = 'test-dt-holiday';
const DATE = '2099-03-01';

const cleanup = () => {
  db.prepare('DELETE FROM calendar_days WHERE date = ?').run(DATE);
  db.prepare('DELETE FROM day_types WHERE id IN (?, ?)').run(WORK, HOLIDAY);
};

const post = (body: object) =>
  upsertCalendarDay({ body } as Request, { json: () => {} } as unknown as Response, (err?: unknown) => { throw err; });

describe('calendar day note', () => {
  beforeAll(() => {
    initSchema();
    cleanup();
    const insert = db.prepare("INSERT INTO day_types (id, name, label, color, order_index) VALUES (?, ?, ?, '#888888', 99)");
    insert.run(WORK, 'test-work', 'test งาน');
    insert.run(HOLIDAY, 'test-holiday', 'test หยุด');
  });
  afterAll(cleanup);

  const row = () => calendarService.getAll().find(r => r.date === DATE)!;

  it('บันทึก note พร้อมประเภทวัน แล้วอ่านกลับได้', () => {
    calendarService.upsert(DATE, WORK, 'วันเกิด');
    expect(row().day_type_id).toBe(WORK);
    expect(row().note).toBe('วันเกิด');
  });

  it('เปลี่ยนประเภทวันโดยไม่ส่ง note ต้องไม่ลบ note เดิม', () => {
    calendarService.upsert(DATE, HOLIDAY);
    expect(row().day_type_id).toBe(HOLIDAY);
    expect(row().note).toBe('วันเกิด');
  });

  it("ส่ง '' เพื่อลบ note และตัดช่องว่างหัวท้าย", () => {
    calendarService.upsert(DATE, HOLIDAY, '  วันแรกทำงาน  ');
    expect(row().note).toBe('วันแรกทำงาน');
    calendarService.upsert(DATE, HOLIDAY, '');
    expect(row().note).toBe('');
  });

  it('POST /calendar ที่ไม่ส่ง note (เปลี่ยนแค่ประเภทวัน) ต้องไม่ลบโน้ต', () => {
    post({ date: DATE, type_id: WORK, note: 'ครบรอบ' });
    post({ date: DATE, type_id: HOLIDAY });
    expect(row().day_type_id).toBe(HOLIDAY);
    expect(row().note).toBe('ครบรอบ');
  });

  it('บันทึกไอคอนคู่กับโน้ต และคงไว้เมื่อเปลี่ยนแค่ประเภทวันหรือแค่ข้อความ', () => {
    calendarService.upsert(DATE, WORK, 'วันเกิด', 'cake');
    expect(row().note_icon).toBe('cake');
    calendarService.upsert(DATE, HOLIDAY);
    expect(row().note_icon).toBe('cake');
    calendarService.upsert(DATE, HOLIDAY, 'วันเกิดแฟน');
    expect(row().note).toBe('วันเกิดแฟน');
    expect(row().note_icon).toBe('cake');
  });

  it("ส่ง icon '' เพื่อล้างไอคอนอย่างเดียว · ล้างโน้ตแล้วไอคอนหายตาม", () => {
    calendarService.upsert(DATE, HOLIDAY, 'วันเกิดแฟน', '');
    expect(row().note).toBe('วันเกิดแฟน');
    expect(row().note_icon).toBe('');

    calendarService.upsert(DATE, HOLIDAY, 'วันเกิดแฟน', 'gift');
    calendarService.upsert(DATE, HOLIDAY, '');
    expect(row().note).toBe('');
    expect(row().note_icon).toBe('');
  });

  it('POST /calendar ที่ไม่ส่ง note/note_icon ไม่แตะโน้ตและไอคอน', () => {
    post({ date: DATE, type_id: WORK, note: 'ครบรอบ', note_icon: 'heart' });
    post({ date: DATE, type_id: HOLIDAY });
    expect(row().note).toBe('ครบรอบ');
    expect(row().note_icon).toBe('heart');
  });

  it('note ยาวเกิน 200 ตัวอักษร หรือชื่อไอคอนยาวเกิน 40 ไม่ผ่าน validation', () => {
    const body = { date: DATE, type_id: WORK };
    expect(calendarDaySchema.safeParse({ ...body, note: 'ก'.repeat(200) }).success).toBe(true);
    expect(calendarDaySchema.safeParse({ ...body, note: 'ก'.repeat(201) }).success).toBe(false);
    expect(calendarDaySchema.safeParse({ ...body, note_icon: 'a'.repeat(40) }).success).toBe(true);
    expect(calendarDaySchema.safeParse({ ...body, note_icon: 'a'.repeat(41) }).success).toBe(false);
  });
});

describe('ensureCalendarNoteIcon (DB เดิมที่ไม่มีคอลัมน์ note_icon)', () => {
  it('เพิ่มคอลัมน์โดยไม่ทำให้ข้อมูลเดิมหาย · รันซ้ำได้ · ข้ามเมื่อยังไม่มีตาราง', () => {
    const legacy = new Database(':memory:');
    expect(() => ensureCalendarNoteIcon(legacy)).not.toThrow();

    legacy.exec('CREATE TABLE calendar_days (date TEXT PRIMARY KEY, day_type_id TEXT NOT NULL, note TEXT) STRICT');
    legacy.prepare("INSERT INTO calendar_days VALUES ('2099-01-01', 'x', 'เดิม')").run();
    ensureCalendarNoteIcon(legacy);
    ensureCalendarNoteIcon(legacy);

    const cols = (legacy.prepare('PRAGMA table_info(calendar_days)').all() as { name: string }[]).map(c => c.name);
    expect(cols.filter(c => c === 'note_icon')).toHaveLength(1);
    expect(legacy.prepare('SELECT note, note_icon FROM calendar_days').get()).toEqual({ note: 'เดิม', note_icon: null });
  });
});
