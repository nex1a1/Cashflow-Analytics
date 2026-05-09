// src/hooks/useTransactionData.js
import { useState, useCallback } from 'react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from '../constants';
import { parseDateStrToObj, toISODate, fromISODate } from '../utils/dateHelpers';
import { settingsService, categoryService, groupService, dayTypeService, transactionService, analyticsService } from '../services/api';
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
  const [summaryData, setSummaryData] = useState(null); // Aggregated analytics from backend
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  /**
   * Loads raw transactions for a specific window
   */
  const loadData = useCallback(async (startDate, endDate) => {
    try {
      setDbStatus('กำลังโหลด...');
      const txData = await transactionService.getAll(startDate, endDate);
      setTransactions(sortTransactions(txData));
      setDbStatus('Online (SQLite3)');
    } catch (err) {
      console.error(err);
      setTransactions([]);
      setDbStatus('Offline (Database Error)');
    }
  }, [setDbStatus]);

  /**
   * Loads aggregated analytics summary for a window
   */
  const loadAnalytics = useCallback(async (startDate, endDate) => {
    try {
      const data = await analyticsService.getDashboardData(startDate, endDate);
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }, []);

  /**
   * Initial bootstrap of master data
   */
  const bootstrap = useCallback(async () => {
    try {
      // 1. Groups
      try {
        const groups = await groupService.getAll();
        if (groups?.length) setCashflowGroups(groups);
      } catch (err) { console.error('Groups load failed'); }

      // 2. Categories
      try {
        const categories = await categoryService.getAll();
        if (categories?.length) {
          setCategories(categories.map(c => ({
            id: c.id, name: c.name, icon: c.icon, color: c.color,
            isFixed: !!c.is_fixed, cashflowGroup: c.cashflow_group_id,
            type: c.group_type, order_index: c.order_index || 0
          })));
        }
      } catch (err) { console.error('Categories load failed'); }

      // 3. Day Types
      try {
        const dtData = await dayTypeService.getAll();
        if (dtData?.length) setDayTypeConfig(dtData);
      } catch (err) { console.error('DayTypes load failed'); }

      // 4. Calendar Usage
      try {
        const calData = await calendarService.getAll();
        const usage = {};
        calData.forEach(row => { usage[row.date] = row.type_id; });
        setDayTypes(usage);
      } catch (err) { console.error('Calendar load failed'); }

    } catch (err) { console.error('Bootstrap failed', err); }
  }, [setCategories, setDayTypes, setDayTypeConfig, setCashflowGroups]);

  const saveToDb = useCallback(async (items) => {
    try {
      const res = await transactionService.save(items);
      return res;
    } catch (err) { 
      showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
      throw err;
    }
  }, [showToast]);

  const handleSaveTransaction = useCallback(async (item) => { 
    await saveToDb([item]); 
  }, [saveToDb]);

  const handleUpdateTransaction = useCallback((id, field, value) => {
    const item = transactions.find(t => t.id === id);
    if (item) {
      const updatedItem = { ...item, [field]: value };
      // หากมีการอัปเดต category_id ให้ล้างค่า category (ชื่อ) เพื่อให้ Backend ใช้ ID เป็นหลัก
      if (field === 'category_id') {
        updatedItem.category = null;
      }
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

  return { 
    transactions, 
    summaryData, 
    isProcessing, 
    setIsProcessing, 
    loadData, 
    loadAnalytics,
    bootstrap,
    saveToDb, 
    handleSaveTransaction, 
    handleUpdateTransaction, 
    handleDeleteTransaction, 
    handleDeleteMonth, 
    handleDeleteAllData 
  };
}
