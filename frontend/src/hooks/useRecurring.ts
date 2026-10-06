import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transactionService } from '@/services/api';
import { findRecurring, parseHiddenKeys, recurringWindow, RecurringItem, RecurringRow, RECURRING_HIDDEN_SETTING_KEY } from '@/utils/recurring';
import { latestOnly } from '@/utils/latestOnly';
import useJsonSetting from './useJsonSetting';

/**
 * รายการประจำของเดือน/รอบที่ targetIso อยู่. ประวัติโหลดเองตามช่วง (modal ไม่มีข้อมูลนอกช่วงที่ dashboard โหลดไว้);
 * localRows = แถวที่รู้อยู่ในหน้านี้ (รายการใน context / ตะกร้า) — ทำให้สิ่งที่เพิ่งใส่นับว่า "ลงแล้ว" ทันที
 */
export default function useRecurring(targetIso: string, cycle: boolean, localRows: RecurringRow[]) {
  const [history, setHistory] = useState<RecurringRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hidden, updateHidden] = useJsonSetting(RECURRING_HIDDEN_SETTING_KEY, parseHiddenKeys);
  const begin = useRef(latestOnly()).current;

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(targetIso);
  const { start, end } = valid ? recurringWindow(targetIso, cycle) : { start: '', end: '' };

  useEffect(() => {
    if (!start) return;
    const isCurrent = begin();
    setIsLoading(true);
    transactionService.getAll(start, end)
      .then(rows => { if (isCurrent()) setHistory(rows as RecurringRow[]); })
      .catch(() => { if (isCurrent()) setHistory([]); }) // ไม่มีประวัติ = ไม่แสดงส่วนนี้ ไม่ต้องเตือน
      .finally(() => { if (isCurrent()) setIsLoading(false); });
  }, [start, end, begin]);

  const hide = useCallback((key: string) => updateHidden(cur => [...cur.filter(k => k !== key), key]), [updateHidden]);
  const unhideAll = useCallback(() => updateHidden(() => []), [updateHidden]);

  const items: RecurringItem[] = useMemo(
    () => (valid ? findRecurring([...history, ...localRows], targetIso, cycle, new Set(hidden)) : []),
    [valid, history, localRows, targetIso, cycle, hidden],
  );

  return { items, isLoading, hiddenCount: hidden.length, hide, unhideAll };
}
