// src/hooks/useTransactionData.ts
import { useState, useCallback, useMemo, useRef } from 'react';
import { parseDateStrToObj } from '../utils/dateHelpers';
import { latestOnly } from '../utils/latestOnly';
import { shiftMonth } from '../utils/payCycle';
import { getThaiMonth } from '../utils/formatters';
import {
  calendarService,
  categoryService,
  groupService,
  dayTypeService,
  transactionService,
  analyticsService
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { Category, CashflowGroup, DayNote, DayType, FrequentItem, TransactionDisplay } from '../types';

// Same-date rows keep the order they arrived in: the API already sends (date, created_at, rowid) order, the
// response has no created_at to re-sort by, and the id is a random UUID — so it must not be used as a tie-break.
// Array.prototype.sort is stable, which is what keeps the entry order.
export const sortTransactions = (dataArr: TransactionDisplay[]): TransactionDisplay[] =>
  [...dataArr].sort((a, b) => (parseDateStrToObj(a.date)?.getTime() || 0) - (parseDateStrToObj(b.date)?.getTime() || 0));

export interface UseTransactionDataProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setDayTypes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<string, DayNote>>>;
  setDayTypeConfig: React.Dispatch<React.SetStateAction<DayType[]>>;
  setDbStatus: React.Dispatch<React.SetStateAction<string>>;
  setCashflowGroups: React.Dispatch<React.SetStateAction<CashflowGroup[]>>;
}

export default function useTransactionData({
  categories,
  setCategories,
  setDayTypes,
  setDayNotes,
  setDayTypeConfig,
  setDbStatus,
  setCashflowGroups
}: UseTransactionDataProps) {
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null); // Aggregated analytics from backend
  const [totalCount, setTotalCount] = useState(0); // every active transaction in the DB, not just the loaded window
  const [masterPeriods, setMasterPeriods] = useState<string[]>([]); // List of all months with data
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]); // All-time frequent transactions
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  // The window being shown, kept in refs: refreshData is captured by toast buttons ("เลิกทำ") and awaited
  // callbacks, so reading state there reloaded whatever window was current when they were created.
  const dataRange = useRef<{ start: string | null; end: string | null }>({ start: null, end: null });
  const analyticsRange = useRef<{ start: string | null; end: string | null }>({ start: null, end: null });
  // A slow earlier response (e.g. "ALL") must not overwrite the window the user picked afterwards
  const beginDataLoad = useMemo(() => latestOnly(), []);
  const beginAnalyticsLoad = useMemo(() => latestOnly(), []);
  const { showToast } = useToast();

  /**
   * Loads raw transactions for a specific window
   */
  const loadData = useCallback(
    async (startDate: string | null, endDate: string | null) => {
      dataRange.current = { start: startDate, end: endDate };
      const isCurrent = beginDataLoad();
      try {
        setDbStatus('กำลังโหลด...');
        const txData = await transactionService.getAll(startDate || undefined, endDate || undefined);
        if (!isCurrent()) return;
        setTransactions(sortTransactions(txData));
        setDbStatus('Online (SQLite3)');
      } catch (err) {
        if (!isCurrent()) return;
        console.error(err);
        setTransactions([]);
        setDbStatus('Offline (Database Error)');
      }
    },
    [setDbStatus, beginDataLoad]
  );

  /**
   * Loads aggregated analytics summary for a window
   */
  const loadAnalytics = useCallback(
    async (startDate: string | null, endDate: string | null) => {
      analyticsRange.current = { start: startDate, end: endDate };
      const isCurrent = beginAnalyticsLoad();
      try {
        const data = await analyticsService.getDashboardData(
          startDate || undefined,
          endDate || undefined
        );
        if (isCurrent()) setSummaryData(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    },
    [beginAnalyticsLoad]
  );

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        loadData(dataRange.current.start, dataRange.current.end),
        loadAnalytics(analyticsRange.current.start, analyticsRange.current.end),
        transactionService.getFrequentItems().then(setFrequentItems),
        transactionService.getPeriods().then(setMasterPeriods),
        transactionService.getCount().then(r => setTotalCount(r.count))
      ]);
    } catch (err) {
      console.error('Refresh failed', err);
    }
  }, [loadData, loadAnalytics]);

  /**
   * Initial bootstrap of master data
   */
  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      // 1. Periods & Frequent Items (Master Lists)
      try {
        const [periods, frequent, total] = await Promise.all([
          transactionService.getPeriods(),
          transactionService.getFrequentItems(),
          transactionService.getCount()
        ]);
        setMasterPeriods(periods);
        setTotalCount(total.count);
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
        const notes: Record<string, DayNote> = {};
        calData.forEach((row: any) => {
          usage[row.date] = row.type_id;
          if (row.note) notes[row.date] = { text: row.note, icon: row.note_icon || '' };
        });
        setDayTypes(usage);
        setDayNotes(notes);
      } catch (err) {
        console.error('Calendar load failed:', err);
      }
    } catch (err) {
      console.error('Bootstrap failed overall:', err);
    } finally {
      setIsBootstrapping(false);
    }
  }, [setCategories, setDayTypes, setDayNotes, setDayTypeConfig, setCashflowGroups]);

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
          return true;
        } catch (err) {
          console.error('Update failed:', err);
          setTransactions(previousTransactions);
          return false;
        }
      }
      return false;
    },
    [transactions, categories, saveToDb, refreshData]
  );

  // Deletes are soft (is_deleted = 1) and upsert-by-id revives a row, so undo = save the
  // snapshot back. Confirmation is the caller's ConfirmDeleteButton / useConfirmTimeout.
  const offerUndo = useCallback(
    (message: string, snapshot: TransactionDisplay[]) => {
      if (snapshot.length === 0) return;
      showToast(message, 'info', {
        label: 'เลิกทำ',
        onClick: async () => {
          try {
            await transactionService.save(snapshot as any);
            await refreshData();
            showToast(`กู้คืน ${snapshot.length} รายการแล้ว`, 'success');
          } catch (err: any) {
            showToast('กู้คืนไม่สำเร็จ: ' + err.message, 'error');
          }
        },
      });
    },
    [refreshData, showToast]
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      const snapshot = transactions.filter(t => t.id === id);
      try {
        await transactionService.deleteById(id);
        await refreshData();
        const label = snapshot[0]?.description || snapshot[0]?.category || 'รายการ';
        offerUndo(`ลบ "${label}" แล้ว`, snapshot);
      } catch (err: any) {
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
      }
    },
    [transactions, refreshData, showToast, offerUndo]
  );

  const handleDeleteMonth = useCallback(
    async (isoMonth: string): Promise<boolean> => {
      if (!isoMonth.match(/^\d{4}-\d{2}$/)) return false;
      setIsProcessing(true);
      try {
        // Snapshot from the DB (state may be filtered to another range) so undo restores everything
        const next = shiftMonth(isoMonth, 1);
        const lastDay = new Date(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1, 0).getDate();
        const snapshot = await transactionService.getAll(`${isoMonth}-01`, `${isoMonth}-${String(lastDay).padStart(2, '0')}`);
        await transactionService.deleteMonth(isoMonth);
        await refreshData();
        offerUndo(`ลบข้อมูลเดือน ${getThaiMonth(isoMonth)} แล้ว (${snapshot.length} รายการ)`, snapshot);
        return true;
      } catch (err: any) {
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message, 'error');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshData, showToast, offerUndo]
  );

  const handleDeleteAllData = useCallback(
    async (opts?: { setShowToast?: any }) => {
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
    totalCount,
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
