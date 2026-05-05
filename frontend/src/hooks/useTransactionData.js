// src/hooks/useTransactionData.js
import { useState, useCallback } from 'react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  CATEGORIES_KEY, DAY_TYPE_CONFIG_KEY, CASHFLOW_GROUPS_KEY,
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from '../constants';
import { parseDateStrToObj, toISODate, fromISODate } from '../utils/dateHelpers';
import { settingsService, categoryService, groupService, dayTypeService } from '../services/api';
import { useToast } from '../context/ToastContext';

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
  setCashflowGroups
}) {
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setDbStatus('กำลังโหลด...');
      
      // 1. Load Transactions
      const txRes = await fetch(API_URL);
      if (!txRes.ok) throw new Error('Network error transactions');
      const txData = await txRes.json();
      setTransactions(sortTransactions(txData));
      setDbStatus('Online (SQLite3)');

      // 2. Load Groups from DB
      try {
        const groups = await groupService.getAll();
        if (groups && groups.length > 0) {
          setCashflowGroups(groups);
        }
      } catch (err) { console.error('Failed to load groups:', err); }

      // 3. Load Categories from DB
      try {
        const categories = await categoryService.getAll();
        if (categories && categories.length > 0) {
          const mapped = categories.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            isFixed: !!c.is_fixed,
            cashflowGroup: c.cashflow_group_id,
            type: c.group_type
          }));
          setCategories(mapped);
        }
      } catch (err) { console.error('Failed to load categories:', err); }

      // 4. Load Day Type Master Data (Configuration)
      try {
        const dtData = await dayTypeService.getAll();
        if (dtData && dtData.length > 0) {
          setDayTypeConfig(dtData.map(dt => ({
            id: dt.id,
            label: dt.label,
            color: dt.color,
            name: dt.name
          })));
        }
      } catch (err) { console.error('Failed to load day types master data:', err); }

      // 5. Load Calendar usage data
      try {
        const calRes = await fetch(CALENDAR_API_URL);
        if (calRes.ok) {
          const calData = await calRes.json();
          const dbDayTypesUsage = {};
          calData.forEach(row => { 
            dbDayTypesUsage[row.date] = row.type_id; 
          });
          setDayTypes(dbDayTypesUsage);
        }
      } catch (calErr) { console.error('Failed to load calendar usage data:', calErr); }

    } catch (err) {
      console.error(err);
      setTransactions([]);
      setDbStatus('Offline (ไม่สามารถเชื่อมต่อ Database)');
    }
  }, [setCategories, setDayTypes, setDayTypeConfig, setDbStatus, setCashflowGroups]);

  const saveToDb = useCallback(async (items) => {
    try {
      const res = await fetch(API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(Array.isArray(items) ? items : [items]) 
      });
      if (!res.ok) throw new Error('Network response was not ok');
    } catch (err) { 
      console.error('Failed to save to DB:', err);
      throw err;
    }
    await loadData();
  }, [loadData]);

  const handleSaveTransaction = useCallback(async (item) => { 
    await saveToDb([item]); 
  }, [saveToDb]);

  const handleUpdateTransaction = useCallback((id, field, value) => {
    const item = transactions.find(t => t.id === id);
    if (item) {
      const updatedItem = { ...item, [field]: value };
      /*console.log("🔥 ข้อมูลที่กำลังจะส่งไป Backend:", updatedItem);*/
      saveToDb(updatedItem);
    }
  }, [transactions, saveToDb]);

  const handleDeleteTransaction = useCallback(async (id) => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
    }
  }, [loadData, showToast]);

  const handleDeleteMonth = useCallback(async (isoMonth) => {
    if (!isoMonth.match(/^\d{4}-\d{2}$/)) return;
    if (!window.confirm(`ยืนยันการลบข้อมูลเดือน ${isoMonth}?`)) return;
    setIsProcessing(true);
    try {
      await fetch(`${API_URL}/month/${isoMonth}`, { method: 'DELETE' });
      await loadData();
      return true;
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [loadData, showToast]);

  const handleDeleteAllData = useCallback(async ({ setShowToast: _setShowToast }) => {
    if (!window.confirm('🚨 ยืนยันการลบข้อมูลทั้งหมด?')) return;
    setIsProcessing(true);
    try {
      await fetch(RESET_API_URL, { method: 'DELETE' });
      showToast('ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (err) { 
      showToast('Error: ' + err.message, 'error'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [showToast]);

  return { transactions, isProcessing, setIsProcessing, loadData, saveToDb, handleSaveTransaction, handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth, handleDeleteAllData };
}
