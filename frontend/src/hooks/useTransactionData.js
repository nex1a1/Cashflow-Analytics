// src/hooks/useTransactionData.js
// ─────────────────────────────────────────────────────────────
// รับผิดชอบทุกอย่างที่เกี่ยวกับ transactions + API
// แยกออกจาก App.jsx เพื่อให้ App.jsx เหลือแค่ UI orchestration
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  CATEGORIES_KEY, DAY_TYPE_CONFIG_KEY,
  OLD_PALETTE_MAP, DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from '../constants';
import { parseDateStrToObj } from '../utils/dateHelpers';
import { settingsService, calendarService } from '../services/api';
import { getThaiMonth } from '../utils/formatters';

const sortTransactions = (dataArr) =>
  [...dataArr].sort((a, b) => {
    const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
    if (dateDiff !== 0) return dateDiff;
    return String(a.id).localeCompare(String(b.id));
  });

export default function useTransactionData({
  setCategories,
  setDayTypes,
  setDayTypeConfig,
  setDbStatus,
}) {
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Load all data from DB ───────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Network error transactions');
      const data = await res.json();
      setTransactions(sortTransactions(data));
      setDbStatus('Online (SQLite3)');

      // Calendar
      try {
        const calRes = await fetch(CALENDAR_API_URL);
        if (calRes.ok) {
          const calData = await calRes.json();
          const dbDayTypes = {};
          calData.forEach(row => { dbDayTypes[row.date] = row.type_id; });
          setDayTypes(dbDayTypes);
        }
      } catch (calErr) {
        console.error('Failed to load calendar data:', calErr);
      }

      // Settings (categories + dayTypeConfig)
      try {
        const setRes = await fetch(SETTINGS_API_URL);
        if (setRes.ok) {
          const dbSettings = await setRes.json();

          if (dbSettings[CATEGORIES_KEY]) {
            let parsed = dbSettings[CATEGORIES_KEY].map(c => {
              let cGroup = c.cashflowGroup;
              let cFixed = c.isFixed;
              let cColor = c.color || OLD_PALETTE_MAP[c.colorId] || '#64748B';

              if (!cGroup) {
                if (c.type === 'income') {
                  cGroup = (c.name || '').includes('เงินเดือน') ? 'salary' : 'bonus';
                } else {
                  const n = c.name || '';
                  if (n.match(/หอ|เช่า|คอนโด/))           cGroup = 'rent';
                  else if (n.match(/รายเดือน|สมาชิก|หนี้/)) cGroup = 'subs';
                  else if (n.match(/ลงทุน|ออม/))            cGroup = 'invest';
                  else if (n.match(/อาหาร|กิน|เครื่องดื่ม/)) cGroup = 'food';
                  else if (n.match(/คอม|ไอที|IT/i))         cGroup = 'it';
                  else                                        cGroup = 'variable';
                  cFixed = cGroup === 'rent' || cGroup === 'subs' || cGroup === 'invest' || n.match(/บ้าน|บัตร/);
                }
              }
              return { ...c, type: c.type || 'expense', cashflowGroup: cGroup, isFixed: !!cFixed, color: cColor };
            });

            if (!parsed.find(c => c.name === 'เงินเดือน'))           parsed.unshift(DEFAULT_CATEGORIES[0]);
            if (!parsed.find(c => c.name === 'รายรับพิเศษ/โบนัส'))   parsed.unshift(DEFAULT_CATEGORIES[1]);
            if (!parsed.find(c => c.name.includes('หักวงเงิน'))) {
              const debtCat = DEFAULT_CATEGORIES.find(c => c.id === 'cat_default_debt');
              if (debtCat) parsed.push(debtCat);
            }

            setCategories(parsed);
          }

          if (dbSettings[DAY_TYPE_CONFIG_KEY]) {
            setDayTypeConfig(dbSettings[DAY_TYPE_CONFIG_KEY]);
          }
        }
      } catch (setErr) {
        console.error('Failed to load settings from DB:', setErr);
      }

    } catch (err) {
      setTransactions([]);
      setDbStatus('Offline (ไม่สามารถเชื่อมต่อ Database)');
    }
  }, [setCategories, setDayTypes, setDayTypeConfig, setDbStatus]);

  // ─── Save transactions ────────────────────────────────────
  const saveToDb = useCallback(async (items) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!res.ok) throw new Error('Network response was not ok');
    } catch (err) {
      console.error('Failed to save to DB:', err);
    }
    await loadData();
  }, [loadData]);

  // ─── CRUD handlers ────────────────────────────────────────
  const handleSaveTransaction = useCallback(async (item) => {
    try {
      await saveToDb([item]);
    } catch (err) {
      console.error('Failed to save transaction:', err);
      throw err;
    }
  }, [saveToDb]);

  const handleUpdateTransaction = useCallback((id, field, value) => {
    const item = transactions.find(t => t.id === id);
    if (item) saveToDb({ ...item, [field]: value });
  }, [transactions, saveToDb]);

  const handleDeleteTransaction = useCallback(async (id) => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Network Error');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
    await loadData();
  }, [loadData]);

  const handleDeleteMonth = useCallback(async (period) => {
    if (!period.match(/^\d{4}-\d{2}$/)) {
      return alert('กรุณาเลือกรายเดือนเพื่อทำการลบข้อมูล');
    }
    if (!window.confirm(`🚨 ยืนยันการลบข้อมูลของเดือน ${getThaiMonth(period)} ทั้งหมดหรือไม่? (ไม่สามารถกู้คืนได้)`)) return;

    setIsProcessing(true);
    const itemsToDelete = transactions.filter(t => {
      if (!t.date) return false;
      const parts = t.date.split('/');
      return parts.length === 3 && `${parts[2]}-${parts[1]}` === period;
    });

    try {
      for (const item of itemsToDelete) {
        await fetch(`${API_URL}/${item.id}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error('Failed to delete month transactions:', err);
    }

    await loadData();
    setIsProcessing(false);
    return true; // ให้ App.jsx แสดง toast
  }, [transactions, loadData]);

  const handleDeleteAllData = useCallback(async ({ setShowToast }) => {
    if (!window.confirm('🚨 อันตราย: ยืนยันการลบข้อมูล "ทั้งหมด" (รายการบัญชี, ปฏิทิน และรีเซ็ตการตั้งค่ากลับเป็นค่าเริ่มต้น)?\nการกระทำนี้ไม่สามารถกู้คืนได้!')) return;

    setIsProcessing(true);
    try {
      const res = await fetch(RESET_API_URL, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset database');

      await settingsService.save(CATEGORIES_KEY, DEFAULT_CATEGORIES);
      await settingsService.save(DAY_TYPE_CONFIG_KEY, DEFAULT_DAY_TYPES);

      setTransactions([]);
      setDayTypes({});
      setCategories(DEFAULT_CATEGORIES);
      setDayTypeConfig(DEFAULT_DAY_TYPES);

      setShowToast(true);
      setTimeout(() => { setShowToast(false); window.location.reload(); }, 1500);
    } catch (err) {
      console.error('DB Reset failed', err);
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [setDayTypes, setCategories, setDayTypeConfig]);

  return {
    transactions,
    isProcessing,
    setIsProcessing,
    loadData,
    saveToDb,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
  };
}