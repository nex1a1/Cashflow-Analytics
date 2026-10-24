import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsService } from '@/services/api';
import { fetchSettings } from './settingsStore';
import { BUDGETS_SETTING_KEY, parseBudgets } from '@/utils/budgetEnvelope';

// ค่าล่าสุดที่รู้ — ให้ตอน mount ใหม่ (สลับแท็บ) เริ่มจากของเดิม แผงงบจะไม่ผุดขึ้นมาดันเนื้อหาทีหลัง
let lastKnown: Record<string, number> = {};
let everLoaded = false;

/** งบของแต่ละกลุ่มรายจ่าย (สตางค์) — อ่านตอน mount; หน้าที่ใช้ mount ใหม่ทุกครั้งที่สลับแท็บ จึงเห็นค่าล่าสุดเสมอ */
export default function useBudgets() {
  const [budgets, setBudgets] = useState<Record<string, number>>(lastKnown);
  // ready = งบจริงมาแล้ว (หรือเคยโหลดไว้) — แผงงบซองรอค่านี้ก่อนวาด จะได้ไม่ผุดขึ้นทีหลัง
  const [ready, setReady] = useState(everLoaded);
  const latest = useRef(budgets);
  // งบทุกกลุ่มเก็บเป็น setting ก้อนเดียว — บันทึกก่อนโหลดเสร็จจะเขียนทับงบกลุ่มอื่นด้วย `{}` จึงต้องรอโหลดก่อน
  // (โหลดพลาด = false: ตอนบันทึกลองโหลดใหม่ และไม่บันทึกถ้ายังไม่ได้)
  const loaded = useRef<Promise<boolean>>(Promise.resolve(true));

  const apply = useCallback((next: Record<string, number>) => {
    lastKnown = next;
    latest.current = next;
    setBudgets(next);
  }, []);

  useEffect(() => {
    let alive = true;
    const run = (async () => {
      try {
        const s = await fetchSettings();
        if (alive) apply(parseBudgets(s[BUDGETS_SETTING_KEY]));
        return true;
      } catch {
        return false; // ไม่มีงบ = ไม่แสดงแถบ; ไม่ต้องรบกวนผู้ใช้
      }
    })();
    loaded.current = run;
    run.then(() => { everLoaded = true; if (alive) setReady(true); });
    return () => { alive = false; };
  }, [apply]);

  /** baht = null ลบงบของกลุ่มนั้น. Optimistic + rollback เมื่อบันทึกไม่สำเร็จ (คืน false ให้ผู้เรียกแสดง error ข้างช่อง) */
  const setBudget = useCallback(async (groupId: string, baht: number | null): Promise<boolean> => {
    if (!(await loaded.current)) {
      try {
        apply(parseBudgets((await fetchSettings())[BUDGETS_SETTING_KEY]));
        loaded.current = Promise.resolve(true);
      } catch {
        return false;
      }
    }
    const before = latest.current;
    const next = { ...before };
    if (baht && baht > 0) next[groupId] = Math.round(baht * 100);
    else delete next[groupId];
    apply(next);
    try {
      await settingsService.save(BUDGETS_SETTING_KEY, next);
      return true;
    } catch {
      apply(before);
      return false;
    }
  }, [apply]);

  return { budgets, setBudget, ready };
}
