// src/hooks/useTransactionData.ts
import { useState, useCallback } from 'react';
import { parseDateStrToObj } from '../utils/dateHelpers';
import {
  calendarService,
  categoryService,
  groupService,
  dayTypeService,
  transactionService,
  analyticsService
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { Category, CashflowGroup, DayType, FrequentItem, TransactionDisplay } from '../types';

const sortTransactions = (dataArr: TransactionDisplay[]): TransactionDisplay[] =>
  [...dataArr].sort((a, b) => {
    const dateDiff = (parseDateStrToObj(a.date)?.getTime() || 0) - (parseDateStrToObj(b.date)?.getTime() || 0);
    if (dateDiff !== 0) return dateDiff;

    if ((a as any).created_at && (b as any).created_at) {
      return new Date((a as any).created_at).getTime() - new Date((b as any).created_at).getTime();
    }

    return String(a.id).localeCompare(String(b.id));
  });

export interface UseTransactionDataProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setDayTypes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDayTypeConfig: React.Dispatch<React.SetStateAction<DayType[]>>;
  setDbStatus: React.Dispatch<React.SetStateAction<string>>;
  setCashflowGroups: React.Dispatch<React.SetStateAction<CashflowGroup[]>>;
  excludeFuture?: boolean;
}

export default function useTransactionData({
  categories,
  setCategories,
  setDayTypes,
  setDayTypeConfig,
  setDbStatus,
  setCashflowGroups,
  excludeFuture = false
}: UseTransactionDataProps) {
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null); // Aggregated analytics from backend
  const [masterPeriods, setMasterPeriods] = useState<string[]>([]); // List of all months with data
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]); // All-time frequent transactions
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [currentRange, setCurrentRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null
  });
  const { showToast } = useToast();

  /**
   * Loads raw transactions for a specific window
   */
  const loadData = useCallback(
    async (startDate: string | null, endDate: string | null) => {
      try {
        setCurrentRange({ start: startDate, end: endDate });
        setDbStatus('กำลังโหลด...');
        const txData = await transactionService.getAll(startDate || undefined, endDate || undefined);
        setTransactions(sortTransactions(txData));
        setDbStatus('Online (SQLite3)');
      } catch (err) {
        console.error(err);
        setTransactions([]);
        setDbStatus('Offline (Database Error)');
      }
    },
    [setDbStatus]
  );

  /**
   * Loads aggregated analytics summary for a window
   */
  const loadAnalytics = useCallback(
    async (startDate: string | null, endDate: string | null) => {
      try {
        const data = await analyticsService.getDashboardData(
          startDate || undefined,
          endDate || undefined,
          excludeFuture
        );
        setSummaryData(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    },
    [excludeFuture]
  );

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        loadData(currentRange.start, currentRange.end),
        loadAnalytics(currentRange.start, currentRange.end),
        transactionService.getFrequentItems().then(setFrequentItems),
        transactionService.getPeriods().then(setMasterPeriods)
      ]);
    } catch (err) {
      console.error('Refresh failed', err);
    }
  }, [loadData, loadAnalytics, currentRange]);

  /**
   * Initial bootstrap of master data
   */
  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      // 1. Periods & Frequent Items (Master Lists)
      try {
        const [periods, frequent] = await Promise.all([
          transactionService.getPeriods(),
          transactionService.getFrequentItems()
        ]);
        setMasterPeriods(periods);
        setFrequentItems(frequent);
      } catch (err) {
        console.error('Master lists load failed:', err);
      }

      // 2. Groups
      try {
        const groups = await groupService.getAll();
        if (groups?.length) setCashflowGroups(groups);
      } catch (err) {
        console.error('Groups load failed:', err);
      }

      // 3. Categories
      try {
        const cats = await categoryService.getAll();
        if (cats?.length) {
          setCategories(
            cats.map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon,
              color: c.color,
              cashflowGroup: c.cashflow_group_id,
              type: c.group_type,
              allocation_type: c.allocation_type,
              order_index: c.order_index || 0
            }))
          );
        }
      } catch (err) {
        console.error('Categories load failed:', err);
      }

      // 4. Day Types
      try {
        const dtData = await dayTypeService.getAll();
        if (dtData?.length) setDayTypeConfig(dtData);
      } catch (err) {
        console.error('DayTypes load failed:', err);
      }

      // 5. Calendar Usage
      try {
        const calData = await calendarService.getAll();
        const usage: Record<string, string> = {};
        calData.forEach((row: any) => {
          usage[row.date] = row.type_id;
        });
        setDayTypes(usage);
      } catch (err) {
        console.error('Calendar load failed:', err);
      }
    } catch (err) {
      console.error('Bootstrap failed overall:', err);
    } finally {
      setIsBootstrapping(false);
    }
  }, [setCategories, setDayTypes, setDayTypeConfig, setCashflowGroups]);

  const saveToDb = useCallback(
    async (items: any) => {
      try {
        const res = await transactionService.save(items);
        return res;
      } catch (err: any) {
        showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
        throw err;
      }
    },
    [showToast]
  );

  const handleSaveTransaction = useCallback(
    async (item: any) => {
      await saveToDb([item]);
      await refreshData();
    },
    [saveToDb, refreshData]
  );

  const handleUpdateTransaction = useCallback(
    async (id: string, field: string, value: any) => {
      const itemIndex = transactions.findIndex(t => t.id === id);
      if (itemIndex > -1) {
        const item = transactions[itemIndex];
        const updatedItem = { ...item, [field]: value };

        if (field === 'category_id') {
          const catObj = (categories || []).find(c => c.id === value);
          if (catObj) {
            updatedItem.category = catObj.name;
            (updatedItem as any).category_icon = catObj.icon;
            if (catObj.type === 'income') {
              updatedItem.allocation_type = null;
            } else if (catObj.allocation_type) {
              updatedItem.allocation_type = catObj.allocation_type;
            }
          }
        }

        // 1. Optimistic UI Update
        const previousTransactions = [...transactions];
        const newTransactions = [...transactions];
        newTransactions[itemIndex] = updatedItem;
        setTransactions(sortTransactions(newTransactions));

        // 2. Background Sync
        try {
          await saveToDb(updatedItem);
          await refreshData();
        } catch (err) {
          console.error('Update failed:', err);
          setTransactions(previousTransactions);
        }
      }
    },
    [transactions, categories, saveToDb, refreshData]
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      if (!window.confirm('ยืนยันการลบรายการนี้?')) return;
      try {
        await transactionService.deleteById(id);
        await refreshData();
      } catch (err: any) {
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleDeleteMonth = useCallback(
    async (isoMonth: string): Promise<boolean> => {
      if (!isoMonth.match(/^\d{4}-\d{2}$/)) return false;
      if (!window.confirm(`ยืนยันการลบข้อมูลเดือน ${isoMonth}?`)) return false;
      setIsProcessing(true);
      try {
        await transactionService.deleteMonth(isoMonth);
        await refreshData();
        return true;
      } catch (err: any) {
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshData, showToast]
  );

  const handleDeleteAllData = useCallback(
    async (opts?: { setShowToast?: any }) => {
      if (!window.confirm('🚨 ยืนยันการลบข้อมูลทั้งหมด?')) return;
      setIsProcessing(true);
      try {
        await transactionService.resetAll();
        showToast('ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: any) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [showToast]
  );

  return {
    transactions,
    summaryData,
    masterPeriods,
    frequentItems,
    isProcessing,
    isBootstrapping,
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
