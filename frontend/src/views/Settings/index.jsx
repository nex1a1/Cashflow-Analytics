import { useState, useMemo, useCallback } from 'react';
import { Settings2, Info, Coins, Wallet } from 'lucide-react';

import OrphanWarningBanner from './components/OrphanWarningBanner';
import SectionCard from './components/SectionCard';
import CategoryRow from './components/CategoryRow';
import CashflowGroupsCard from './components/CashflowGroupsCard';
import DayTypesCard from './components/DayTypesCard';
import DangerZone from './components/DangerZone';

export default function SettingsView({
  categories, handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory,
  dayTypeConfig, handleDayTypeConfigChange, handleDeleteAllData,
  cashflowGroups = [], setCashflowGroups,
  handleAddCashflowGroup, handleUpdateCashflowGroup, handleDeleteCashflowGroup, handleMoveCashflowGroup,
  transactions = [],
  handleAddDayType, handleDeleteDayType, handleMoveDayType,
  triggerToast
}) {
  const dm = true;
  const [newCatId, setNewCatId] = useState(null);
  
  const onAddCategory = useCallback((type) => {
    handleAddCategory(type);
    setTimeout(() => {
      const added = [...categories].reverse().find(c => c.type === type);
      if (added) setNewCatId(added.id);
    }, 0);
  }, [handleAddCategory, categories]);

  const handleChangeCashflowGroup = useCallback((id, field, value) => {
    // 1. Optimistic Update
    setCashflowGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    
    // 2. Persistent Save
    const group = cashflowGroups.find(g => g.id === id);
    if (group) {
      handleUpdateCashflowGroup({ ...group, [field]: value });
    }
  }, [cashflowGroups, setCashflowGroups, handleUpdateCashflowGroup]);

  const [cashflowDeleteError, setCashflowDeleteError] = useState(null);
  const handleDeleteGroup = useCallback((id) => {
    if (categories.some(c => c.cashflowGroup === id)) {
      setCashflowDeleteError({ id, msg: 'ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่' });
      setTimeout(() => setCashflowDeleteError(null), 4000);
      return;
    }
    handleDeleteCashflowGroup(id);
  }, [categories, handleDeleteCashflowGroup]);


  const txCountByGroup = useMemo(() => {
    // 1. Build a fast lookup map for Category ID/Name to CashflowGroup ID
    const catToGroupMap = {};
    categories.forEach(c => {
      if (c.cashflowGroup) {
        catToGroupMap[c.id] = c.cashflowGroup;
        if (c.name) {
          catToGroupMap[c.name] = c.cashflowGroup;
        }
      }
    });

    // 2. Count transactions by CashflowGroup ID in a single pass O(T)
    const map = {};
    transactions.forEach(t => {
      const groupId = catToGroupMap[t.category_id] || catToGroupMap[t.category];
      if (groupId) {
        map[groupId] = (map[groupId] || 0) + 1;
      }
    });
    return map;
  }, [transactions, categories]);

  const incomeCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'income').sort((a, b) => a.order_index - b.order_index), 
  [categories]);

  const expenseCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'expense').sort((a, b) => a.order_index - b.order_index), 
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-1 pt-1 pb-10">

      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className={`text-lg font-black tracking-wide flex items-center gap-2.5 ${'text-slate-100'}`}>
          <Settings2 className={`w-5 h-5 ${'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]'}`} /> 
          <span>การตั้งค่าระบบ</span>
        </h1>
        <div className={`flex items-center gap-2 px-3 py-1.5 border text-[11px] font-semibold rounded-sm transition-all duration-300 ${
          'bg-slate-900/60 border-slate-850/80 text-slate-350 shadow-sm'
        }`}>
          <Info className={`w-3.5 h-3.5 shrink-0 ${'text-sky-400'}`} />
          <span><b>NEED/WANT/SAVE</b> = รูปแบบการจัดสรรเงิน</span>
        </div>
      </div>

      <OrphanWarningBanner categories={categories} cashflowGroups={cashflowGroups} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.2fr_1fr] gap-4 items-start mb-4">

        {/* ── LEFT COLUMN: Categories ── */}
        <div className="flex flex-col gap-4">
          <SectionCard
            accentColor="blue"
            icon={<Wallet className="w-3.5 h-3.5" />}
            title="หมวดหมู่รายจ่าย"
            badge={expenseCategories.length}
            action={{ label: 'เพิ่มรายจ่าย', onClick: () => onAddCategory('expense') }}
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
                <p className={`text-center py-6 text-xs ${'text-slate-600'}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            accentColor="emerald"
            icon={<Coins className="w-3.5 h-3.5" />}
            title="หมวดหมู่รายรับ"
            badge={incomeCategories.length}
            action={{ label: 'เพิ่มรายรับ', onClick: () => onAddCategory('income') }}
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
                <p className={`text-center py-6 text-xs ${'text-slate-600'}`}>ยังไม่มีหมวดหมู่รายรับ</p>
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
}
