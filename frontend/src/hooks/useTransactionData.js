// src/hooks/useTransactionData.js
import { useState, useCallback } from 'react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  CATEGORIES_KEY, DAY_TYPE_CONFIG_KEY, CASHFLOW_GROUPS_KEY,
  OLD_PALETTE_MAP, DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from '../constants';
import { parseDateStrToObj, toISODate, fromISODate } from '../utils/dateHelpers';
import { settingsService } from '../services/api';
import { useToast } from '../context/ToastContext';

const sortTransactions = (dataArr) =>
  [...dataArr].sort((a, b) => {
    const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
    if (dateDiff !== 0) return dateDiff;
    return String(a.id).localeCompare(String(b.id));
  });

export const DEFAULT_CASHFLOW_GROUPS = [
  { id: 'cg_salary', name: 'เงินเดือน', type: 'income', isDefault: true, order: 1 },
  { id: 'cg_bonus', name: 'พิเศษ/โบนัส', type: 'income', isDefault: true, order: 2 },
  { id: 'cg_rent', name: 'ค่าหอ/ที่พัก', type: 'expense', isDefault: true, order: 1 },
  { id: 'cg_subs', name: 'รายเดือน/หนี้', type: 'expense', isDefault: true, order: 2 },
  { id: 'cg_food', name: 'ค่ากิน', type: 'expense', isDefault: true, order: 3 },
  { id: 'cg_invest', name: 'ลงทุน/ออม', type: 'expense', isDefault: true, order: 4 },
  { id: 'cg_it', name: 'ไอที/คอมฯ', type: 'expense', isDefault: true, order: 5 },
  { id: 'cg_variable', name: 'ผันแปรอื่นๆ', type: 'expense', isDefault: true, order: 6 },
];

export default function useTransactionData({
  setCategories,
  setDayTypes,
  setDayTypeConfig,
  setDbStatus,
  setCashflowGroups // 🚀 รับ state เข้ามา
}) {
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Network error transactions');
      const data = await res.json();
      setTransactions(sortTransactions(data));
      setDbStatus('Online (SQLite3)');

      try {
        const calRes = await fetch(CALENDAR_API_URL);
        if (calRes.ok) {
          const calData = await calRes.json();
          const dbDayTypes = {};
          calData.forEach(row => { dbDayTypes[row.date] = row.type_id; });
          setDayTypes(dbDayTypes);
        }
      } catch (calErr) { console.error('Failed to load calendar data:', calErr); }

      try {
        const setRes = await fetch(SETTINGS_API_URL);
        if (setRes.ok) {
          const dbSettings = await setRes.json();

          // 🚀 โหลด Cashflow Groups (ถ้าไม่มีใช้ค่า Default)
          const loadedGroups = dbSettings[CASHFLOW_GROUPS_KEY] || DEFAULT_CASHFLOW_GROUPS;
          if (setCashflowGroups) setCashflowGroups(loadedGroups);

          if (dbSettings[CATEGORIES_KEY]) {
            let parsed = dbSettings[CATEGORIES_KEY].map(c => {
              let cGroup = c.cashflowGroup;
              let cFixed = c.isFixed;
              let cColor = c.color || OLD_PALETTE_MAP[c.colorId] || '#64748B';

              // 🚀 Auto-migrate กลุ่มแบบเก่า (string ธรรมดา) ให้เป็น cg_ prefix
              if (cGroup && !cGroup.startsWith('cg_')) {
                cGroup = `cg_${cGroup}`; 
              }

              if (!cGroup) {
                if (c.type === 'income') {
                  cGroup = (c.name || '').includes('เงินเดือน') ? 'cg_salary' : 'cg_bonus';
                } else {
                  const n = c.name || '';
                  if (n.match(/หอ|เช่า|คอนโด/))           cGroup = 'cg_rent';
                  else if (n.match(/รายเดือน|สมาชิก|หนี้/)) cGroup = 'cg_subs';
                  else if (n.match(/ลงทุน|ออม/))            cGroup = 'cg_invest';
                  else if (n.match(/อาหาร|กิน|เครื่องดื่ม/)) cGroup = 'cg_food';
                  else if (n.match(/คอม|ไอที|IT/i))         cGroup = 'cg_it';
                  else                                        cGroup = 'cg_variable';
                  cFixed = cGroup === 'cg_rent' || cGroup === 'cg_subs' || cGroup === 'cg_invest' || n.match(/บ้าน|บัตร/);
                }
              }
              return { ...c, type: c.type || 'expense', cashflowGroup: cGroup, isFixed: !!cFixed, color: cColor };
            });

            if (!parsed.find(c => c.name === 'เงินเดือน'))           parsed.unshift(DEFAULT_CATEGORIES[0]);
            if (!parsed.find(c => c.name === 'รายรับพิเศษ/โบนัส'))   parsed.unshift(DEFAULT_CATEGORIES[1]);
            setCategories(parsed);
          }

          if (dbSettings[DAY_TYPE_CONFIG_KEY]) {
            setDayTypeConfig(dbSettings[DAY_TYPE_CONFIG_KEY]);
          }
        }
      } catch (setErr) { console.error('Failed to load settings from DB:', setErr); }

    } catch (err) {
      setTransactions([]);
      setDbStatus('Offline (ไม่สามารถเชื่อมต่อ Database)');
    }
  }, [setCategories, setDayTypes, setDayTypeConfig, setDbStatus, setCashflowGroups]);

  const saveToDb = useCallback(async (items) => {
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
      if (!res.ok) throw new Error('Network response was not ok');
    } catch (err) { console.error('Failed to save to DB:', err); }
    await loadData();
  }, [loadData]);

  const handleSaveTransaction = useCallback(async (item) => { 
    const finalItem = {
      ...item,
      isoDate: item.isoDate || (item.date.includes('-') ? item.date : toISODate(item.date)),
      date: item.date.includes('-') ? fromISODate(item.date) : item.date
    };
    await saveToDb([finalItem]); 
  }, [saveToDb]);

  const handleUpdateTransaction = useCallback((id, field, value) => {
    const item = transactions.find(t => t.id === id);
    if (item) {
      const updatedItem = { ...item, [field]: value };
      if (field === 'date') {
        updatedItem.isoDate = value.includes('-') ? value : toISODate(value);
        updatedItem.date = value.includes('-') ? fromISODate(value) : value;
      }
      saveToDb(updatedItem);
    }
  }, [transactions, saveToDb]);

  const handleDeleteTransaction = useCallback(async (id) => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    await loadData();
  }, [loadData]);

  const handleDeleteMonth = useCallback(async (period) => {
    if (!period.match(/^\d{4}-\d{2}$/)) return;
    if (!window.confirm('ยืนยันการลบเดือนนี้?')) return;
    setIsProcessing(true);
    try {
      const itemsToDelete = transactions.filter(t => t.date && t.date.includes(`/${period.split('-')[1]}/${period.split('-')[0]}`));
      await Promise.all(itemsToDelete.map(item => fetch(`${API_URL}/${item.id}`, { method: 'DELETE' })));
      await loadData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [transactions, loadData, showToast]);

  const handleDeleteAllData = useCallback(async ({ setShowToast: _setShowToast }) => {
    if (!window.confirm('🚨 ยืนยันการลบข้อมูลทั้งหมด?')) return;
    setIsProcessing(true);
    try {
      await fetch(RESET_API_URL, { method: 'DELETE' });
      await settingsService.save(CATEGORIES_KEY, DEFAULT_CATEGORIES);
      await settingsService.save(DAY_TYPE_CONFIG_KEY, DEFAULT_DAY_TYPES);
      await settingsService.save(CASHFLOW_GROUPS_KEY, DEFAULT_CASHFLOW_GROUPS); // 🚀 Reset Groups
      setTransactions([]); setDayTypes({}); setCategories(DEFAULT_CATEGORIES); setDayTypeConfig(DEFAULT_DAY_TYPES);
      if(setCashflowGroups) setCashflowGroups(DEFAULT_CASHFLOW_GROUPS);
      showToast('ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (err) { 
      showToast('Error: ' + err.message, 'error'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [setDayTypes, setCategories, setDayTypeConfig, setCashflowGroups, showToast]);

  return { transactions, isProcessing, setIsProcessing, loadData, saveToDb, handleSaveTransaction, handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth, handleDeleteAllData };
}