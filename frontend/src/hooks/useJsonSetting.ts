import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsService } from '@/services/api';

// ค่าล่าสุดที่รู้ต่อ key — mount ใหม่ (เปิด modal / สลับแท็บ) เริ่มจากของเดิม ไม่กระพริบเป็นค่าว่างก่อนโหลดเสร็จ
const lastKnown = new Map<string, unknown>();

/**
 * ค่า JSON หนึ่งก้อนใน settings (เช่น รายการประจำที่ซ่อน, โปรไฟล์ภาษี). อ่านตอน mount, เขียนแบบ optimistic + rollback.
 * ทั้งก้อนเป็น setting เดียว — บันทึกก่อนโหลดเสร็จจะเขียนทับของเดิมด้วยค่าว่าง จึงรอโหลดก่อนเสมอ.
 * update รับฟังก์ชันจากค่าล่าสุด (ไม่ใช่ค่าจาก render) กันสองการแก้ติดกันทับกัน
 */
export default function useJsonSetting<T>(key: string, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => (lastKnown.has(key) ? (lastKnown.get(key) as T) : parse(undefined)));
  const latest = useRef(value);
  const loaded = useRef<Promise<void>>(Promise.resolve());

  const apply = useCallback((next: T) => {
    lastKnown.set(key, next);
    latest.current = next;
    setValue(next);
  }, [key]);

  useEffect(() => {
    let alive = true;
    loaded.current = settingsService.getAll()
      .then(s => { if (alive) apply(parse(s[key])); })
      .catch(() => { /* ไม่มีค่า = ใช้ค่าว่าง ไม่ต้องรบกวนผู้ใช้ */ });
    return () => { alive = false; };
  }, [key, parse, apply]);

  const update = useCallback(async (fn: (current: T) => T): Promise<boolean> => {
    await loaded.current;
    const before = latest.current;
    const next = fn(before);
    apply(next);
    try {
      await settingsService.save(key, next);
      return true;
    } catch {
      apply(before);
      return false;
    }
  }, [key, apply]);

  return [value, update] as const;
}
