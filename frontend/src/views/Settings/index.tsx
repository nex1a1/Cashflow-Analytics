import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { Settings2, Info, Coins, Wallet } from 'lucide-react';
import { Category, CashflowGroup, DayType, TransactionDisplay } from '../../types';

import OrphanWarningBanner from './components/OrphanWarningBanner';
import SectionCard from './components/SectionCard';
import CategoryRow from './components/CategoryRow';
import CashflowGroupsCard from './components/CashflowGroupsCard';
import DayTypesCard from './components/DayTypesCard';
import DangerZone from './components/DangerZone';

const EXPENSE_ICON = <Wallet className="w-3.5 h-3.5" />;
const INCOME_ICON = <Coins className="w-3.5 h-3.5" />;

export interface SettingsViewProps {
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  setCashflowGroups: React.Dispatch<React.SetStateAction<CashflowGroup[]>>;
  handleAddCategory: (type?: string) => Promise<any> | void;
  handleCategoryChange: (catId: string, field: string, value: any) => void;
  handleDeleteCategory: (id: string) => void;
  handleMoveCategory: (id: string, direction: string) => void;
  handleAddCashflowGroup: () => void;
  handleUpdateCashflowGroup: (group: any, options?: { silent?: boolean }) => void | Promise<any>;
  handleDeleteCashflowGroup: (id: string) => void;
  handleMoveCashflowGroup: (id: string, direction: 'UP' | 'DOWN') => void;
  dayTypeConfig: DayType[];
  handleDayTypeConfigChange: (id: string, field: string, value: any) => void;
  handleAddDayType: () => void;
  handleDeleteDayType: (id: string) => void;
  handleMoveDayType: (id: string, direction: 'UP' | 'DOWN') => void;
  handleDeleteAllData: () => void;
  transactions: TransactionDisplay[];
  triggerToast?: (msg: string, type?: string) => void;
}

const SettingsView = memo(function SettingsView({
  categories = [], handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory,
  dayTypeConfig = [], handleDayTypeConfigChange, handleDeleteAllData,
  cashflowGroups = [], setCashflowGroups,
  handleAddCashflowGroup, handleUpdateCashflowGroup, handleDeleteCashflowGroup, handleMoveCashflowGroup,
  transactions = [],
  handleAddDayType, handleDeleteDayType, handleMoveDayType,
  triggerToast
}: SettingsViewProps) {
  const [newCatId, setNewCatId] = useState<string | null>(null);
  
  const onAddCategory = useCallback(async (type: string) => {
    try {
      const addedId = await handleAddCategory(type);
      if (addedId) {
        setNewCatId(addedId);
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  }, [handleAddCategory]);

  const addExpenseAction = useMemo(() => ({
    label: 'เพิ่มรายจ่าย', onClick: () => onAddCategory('expense')
  }), [onAddCategory]);

  const addIncomeAction = useMemo(() => ({
    label: 'เพิ่มรายรับ', onClick: () => onAddCategory('income')
  }), [onAddCategory]);

  const handleChangeCashflowGroup = useCallback(async (id: string, field: string, value: any) => {
    // 1. Snapshot previous state for rollback
    const previousGroups = [...cashflowGroups];
    
    // 2. Optimistic Update
    setCashflowGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    
    // 3. Persistent Save (silent to prevent toast storms during debounced typing)
    const group = cashflowGroups.find(g => g.id === id);
    if (group) {
      try {
        await handleUpdateCashflowGroup({ ...group, [field]: value }, { silent: true });
      } catch {
        // Rollback state if persistent save failed
        setCashflowGroups(previousGroups);
      }
    }
  }, [cashflowGroups, setCashflowGroups, handleUpdateCashflowGroup]);

  const [cashflowDeleteError, setCashflowDeleteError] = useState<{ id: string; msg: string } | null>(null);
  const cashflowDeleteErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (cashflowDeleteErrorTimer.current) clearTimeout(cashflowDeleteErrorTimer.current);
  }, []);

  const handleDeleteGroup = useCallback((id: string) => {
    if (categories.some(c => c.cashflowGroup === id)) {
      if (cashflowDeleteErrorTimer.current) clearTimeout(cashflowDeleteErrorTimer.current);
      setCashflowDeleteError({ id, msg: 'ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่' });
      cashflowDeleteErrorTimer.current = setTimeout(() => {
        setCashflowDeleteError(null);
        cashflowDeleteErrorTimer.current = null;
      }, 4000);
      return;
    }
    handleDeleteCashflowGroup(id);
  }, [categories, handleDeleteCashflowGroup]);


  const txCountByGroup = useMemo(() => {
    // 1. Build a fast lookup map for Category ID/Name to CashflowGroup ID
    const catToGroupMap: Record<string, string> = {};
    categories.forEach(c => {
      const gId = c.cashflowGroup;
      if (gId) {
        catToGroupMap[c.id] = gId;
        if (c.name) {
          catToGroupMap[c.name] = gId;
        }
      }
    });

    // 2. Count transactions by CashflowGroup ID in a single pass O(T)
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const groupId = (t.category_id && catToGroupMap[t.category_id]) || (t.category && catToGroupMap[t.category]);
      if (groupId) {
        map[groupId] = (map[groupId] || 0) + 1;
      }
    });
    return map;
  }, [transactions, categories]);

  const incomeCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'income').sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), 
  [categories]);

  const expenseCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'expense').sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)), 
  [categories]);

  const incomeGroups = useMemo(() => 
    cashflowGroups.filter(g => g.type === 'income').sort((a, b) => a.order_index - b.order_index),
    [cashflowGroups]
  );

  const expenseGroups = useMemo(() => 
    cashflowGroups.filter(g => g.type === 'expense').sort((a, b) => a.order_index - b.order_index),
    [cashflowGroups]
  );

  return (
    <div className="w-full px-1 pt-1 pb-10">

      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-lg font-black tracking-wide flex items-center gap-2.5 text-slate-100">
          <Settings2 className="w-5 h-5 text-[#da291c] drop-shadow-[0_0_8px_rgba(218,41,28,0.35)]" /> 
          <span>การตั้งค่าระบบ</span>
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 border text-[11px] font-semibold rounded-full bg-[#1c1c1c] border-[#303030] text-[#cbd5e1]">
          <Info className="w-3.5 h-3.5 shrink-0 text-[#da291c]" />
          <span><b>NEED/WANT/SAVE</b> = รูปแบบการจัดสรรเงิน</span>
        </div>
      </div>

      <OrphanWarningBanner categories={categories} cashflowGroups={cashflowGroups} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.2fr_1fr] gap-4 items-start mb-4">

        {/* ── LEFT COLUMN: Categories ── */}
        <div className="flex flex-col gap-4">
          <SectionCard
            accentColor="brand"
            icon={EXPENSE_ICON}
            title="หมวดหมู่รายจ่าย"
            badge={expenseCategories.length}
            action={addExpenseAction}
          >
            <div>
              {expenseCategories.map((cat, idx) => (
                <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false}
                  onMove={handleMoveCategory} onChange={handleCategoryChange}
                  onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups}
                  filteredGroups={expenseGroups}
                  isFirst={idx === 0} isLast={idx === expenseCategories.length - 1} />
              ))}
              {expenseCategories.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-600">ยังไม่มีหมวดหมู่รายจ่าย</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            accentColor="emerald"
            icon={INCOME_ICON}
            title="หมวดหมู่รายรับ"
            badge={incomeCategories.length}
            action={addIncomeAction}
          >
            <div>
              {incomeCategories.map((cat, idx) => (
                <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true}
                  onMove={handleMoveCategory} onChange={handleCategoryChange}
                  onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups}
                  filteredGroups={incomeGroups}
                  isFirst={idx === 0} isLast={idx === incomeCategories.length - 1} />
              ))}
              {incomeCategories.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-600">ยังไม่มีหมวดหมู่รายรับ</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN: Structure, Settings & Danger Zone ── */}
        <div className="flex flex-col gap-4">


          <CashflowGroupsCard 
            cashflowGroups={cashflowGroups}
            handleAddCashflowGroup={handleAddCashflowGroup}
            handleMoveCashflowGroup={handleMoveCashflowGroup}
            handleChangeCashflowGroup={handleChangeCashflowGroup}
            handleDeleteGroup={handleDeleteGroup}
            cashflowDeleteError={cashflowDeleteError}
            txCountByGroup={txCountByGroup}
            categories={categories}
          />

          <DayTypesCard 
            dayTypeConfig={dayTypeConfig}
            handleAddDayType={handleAddDayType}
            handleMoveDayType={handleMoveDayType}
            handleDayTypeConfigChange={handleDayTypeConfigChange}
            handleDeleteDayType={handleDeleteDayType}
          />
        </div>
      </div>

      <DangerZone transactions={transactions} handleDeleteAllData={handleDeleteAllData} />
    </div>
  );
});

export default SettingsView;
