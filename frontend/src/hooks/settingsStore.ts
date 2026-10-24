import { settingsService } from '@/services/api';

type Settings = Awaited<ReturnType<typeof settingsService.getAll>>;

let inflight: Promise<Settings> | null = null;

/** อ่าน settings ทั้งก้อน — hook หลายตัวที่ mount พร้อมกันใช้คำขอเดียวกัน (ไม่เก็บแคช: เสร็จแล้วคำขอถัดไปอ่านใหม่เสมอ) */
export function fetchSettings(): Promise<Settings> {
  if (!inflight) {
    const p: Promise<Settings> = settingsService.getAll().finally(() => { if (inflight === p) inflight = null; });
    inflight = p;
  }
  return inflight;
}
