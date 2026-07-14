// src/hooks/useTransactionData.js
import { useState, useCallback } from 'react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from '../constants';
import { parseDateStrToObj, toISODate, fromISODate } from '../utils/dateHelpers';
import { settingsService, calendarService, categoryService, groupService, dayTypeService, transactionService, analyticsService } from '../services/api';
import { useToast } from '../context/ToastContext';

const sortTransactions = (dataArr) =>
  [...dataArr].sort((a, b) => {
    const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
    if (dateDiff !== 0) return dateDiff;
    
    // Sort by created_at if available (Entry sequence)
    if (a.created_at && b.created_at) {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    
    // Fallback to ID only if timestamps are missing
    return String(a.id).localeCompare(String(b.id));
  });

export default function useTransactionData({
  setCategories,
  setDayTypes,
  setDayTypeConfig,
  setDbStatus,
  setCashflowGroups,
  excludeFuture
}) {
  const [transactions, setTransactions] = useState([]);
  const [summaryData, setSummaryData] = useState(null); // Aggregated analytics from backend
  const [masterPeriods, setMasterPeriods] = useState([]); // List of all months with data
  const [frequentItems, setFrequentItems] = useState([]); // All-time frequent transactions
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRange, setCurrentRange] = useState({ start: null, end: null }); // Track current window
  const { showToast } = useToast();

  /**
   * Loads raw transactions for a specific window
   */
  const loadData = useCallback(async (startDate, endDate) => {
    try {
      setCurrentRange({ start: startDate, end: endDate });
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
      const data = await analyticsService.getDashboardData(startDate, endDate, excludeFuture);
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }, [excludeFuture]);

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        loadData(currentRange.start, currentRange.end),
        loadAnalytics(currentRange.start, currentRange.end),
        transactionService.getFrequentItems().then(setFrequentItems),
        transactionService.getPeriods().then(setMasterPeriods)
      ]);
    } catch (err) { console.error('Refresh failed', err); }
  }, [loadData, loadAnalytics, currentRange]);

  /**
   * Initial bootstrap of master data
   */
  const bootstrap = useCallback(async () => {
    try {
      // 1. Periods & Frequent Items (Master Lists)
      try {
        const [periods, frequent] = await Promise.all([
          transactionService.getPeriods(),
          transactionService.getFrequentItems()
        ]);
        setMasterPeriods(periods);
        setFrequentItems(frequent);
      } catch (err) { console.error('Master lists load failed:', err); }

      // 2. Groups
      try {
        const groups = await groupService.getAll();
        if (groups?.length) setCashflowGroups(groups);
      } catch (err) { console.error('Groups load failed'); }

      // 3. Categories
      try {
        const categories = await categoryService.getAll();
        if (categories?.length) {
          setCategories(categories.map(c => ({
            id: c.id, name: c.name, icon: c.icon, color: c.color,
            cashflowGroup: c.cashflow_group_id,
            type: c.group_type, allocation_type: c.allocation_type,
            order_index: c.order_index || 0
          })));
        }
      } catch (err) { console.error('Categories load failed'); }

      // 4. Day Types
      try {
        const dtData = await dayTypeService.getAll();
        if (dtData?.length) setDayTypeConfig(dtData);
      } catch (err) { console.error('DayTypes load failed'); }

      // 5. Calendar Usage
      try {
        const calData = await calendarService.getAll();
        const usage = {};
        calData.forEach(row => { usage[row.date] = row.type_id; });
        setDayTypes(usage);
      } catch (err) { console.error('Calendar load failed:', err); }

    } catch (err) { console.error('Bootstrap failed overall:', err); }
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
    await refreshData();
  }, [saveToDb, refreshData]);

  const handleUpdateTransaction = useCallback(async (id, field, value) => {
    const itemIndex = transactions.findIndex(t => t.id === id);
    if (itemIndex > -1) {
      const item = transactions[itemIndex];
      const updatedItem = { ...item, [field]: value };

      // 1. Optimistic UI Update (ตอบสนองทันที)
      const newTransactions = [...transactions];
      newTransactions[itemIndex] = updatedItem;
      setTransactions(sortTransactions(newTransactions));

      // 2. Background Sync
      try {
        await saveToDb(updatedItem);
        // Refresh silently to get updated names/icons from backend
        await refreshData();
      } catch (err) {
        console.error("Update failed:", err);
        // Rollback on failure
        setTransactions(transactions);
      }
    }
  }, [transactions, saveToDb, refreshData]);

  const handleDeleteTransaction = useCallback(async (id) => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      await transactionService.deleteById(id);
      await refreshData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
    }
  }, [refreshData, showToast]);

  const handleDeleteMonth = useCallback(async (isoMonth) => {
    if (!isoMonth.match(/^\d{4}-\d{2}$/)) return;
    if (!window.confirm(`ยืนยันการลบข้อมูลเดือน ${isoMonth}?`)) return;
    setIsProcessing(true);
    try {
      await transactionService.deleteMonth(isoMonth);
      await refreshData();
      return true;
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [refreshData, showToast]);

  const handleDeleteAllData = useCallback(async ({ setShowToast: _setShowToast }) => {
    if (!window.confirm('🚨 ยืนยันการลบข้อมูลทั้งหมด?')) return;
    setIsProcessing(true);
    try {
      await transactionService.resetAll();
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
    masterPeriods,
    frequentItems,
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
    handleDeleteAllData,
    refreshData
  };
}
