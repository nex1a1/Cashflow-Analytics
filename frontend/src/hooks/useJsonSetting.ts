import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsService } from '@/services/api';
import { fetchSettings } from './settingsStore';

// ค่าล่าสุดที่รู้ต่อ key — mount ใหม่ (เปิด modal / สลับแท็บ) เริ่มจากของเดิม ไม่กระพริบเป็นค่าว่างก่อนโหลดเสร็จ
const lastKnown = new Map<string, unknown>();

/**
 * ค่า JSON หนึ่งก้อนใน settings (เช่น รายการประจำที่ซ่อน, โปรไฟล์ภาษี). อ่านตอน mount, เขียนแบบ optimistic + rollback.
 * ทั้งก้อนเป็น setting เดียว — บันทึกก่อนโหลดเสร็จจะเขียนทับของเดิมด้วยค่าว่าง จึงรอโหลดก่อนเสมอ.
 * update รับฟังก์ชันจากค่าล่าสุด (ไม่ใช่ค่าจาก render) กันสองการแก้ติดกันทับกัน
 * ถ้าโหลดครั้งแรกพลาด update จะลองโหลดใหม่ก่อน และคืน false ถ้ายังไม่ได้ — ไม่เขียนทับค่าที่เก็บไว้ด้วยค่าว่าง
 */
export default function useJsonSetting<T>(key: string, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => (lastKnown.has(key) ? (lastKnown.get(key) as T) : parse(undefined)));
  // ready = ค่าจริงจากเซิร์ฟเวอร์มาแล้ว (หรือเคยโหลดไว้) — หน้าที่ค่านี้เปลี่ยนรูปหน้าจอ (เช่น Kakeibo ย้ายแถวเข้า Fix Cost) รอ ready ก่อนวาดได้
  const [ready, setReady] = useState(() => lastKnown.has(key));
  const latest = useRef(value);
  // true = โหลดค่าจริงสำเร็จ; false = โหลดพลาด (หน้าใช้ค่าว่างอ่านอย่างเดียว ห้ามบันทึกทับ)
  const loaded = useRef<Promise<boolean>>(Promise.resolve(true));

  const apply = useCallback((next: T) => {
    lastKnown.set(key, next);
    latest.current = next;
    setValue(next);
  }, [key]);

  useEffect(() => {
    let alive = true;
    const run = (async () => {
      try {
        const s = await fetchSettings();
        if (alive) apply(parse(s[key]));
        return true;
      } catch {
        return false; // ไม่มีค่า = ใช้ค่าว่าง ไม่ต้องรบกวนผู้ใช้ (ตอนบันทึกจะลองโหลดใหม่)
      }
    })();
    loaded.current = run;
    run.then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [key, parse, apply]);

  const update = useCallback(async (fn: (current: T) => T): Promise<boolean> => {
    if (!(await loaded.current)) {
      try {
        apply(parse((await fetchSettings())[key]));
        loaded.current = Promise.resolve(true);
      } catch {
        return false;
      }
    }
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
  }, [key, parse, apply]);

  return [value, update, ready] as const;
}
