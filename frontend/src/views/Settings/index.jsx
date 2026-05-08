import { useState, useMemo } from 'react';
import { Settings2, Info, Coins, Wallet } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

import OrphanWarningBanner from './components/OrphanWarningBanner';
import SectionCard from './components/SectionCard';
import CategoryRow from './components/CategoryRow';
import CashflowGroupsCard from './components/CashflowGroupsCard';
import DayTypesCard from './components/DayTypesCard';
import AdvancedOptions from './components/AdvancedOptions';
import DangerZone from './components/DangerZone';

export default function SettingsView({
  categories, handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory,
  dayTypeConfig, handleDayTypeConfigChange, handleDeleteAllData, saveSettingToDb,
  cashflowGroups = [], setCashflowGroups,
  handleAddCashflowGroup, handleUpdateCashflowGroup, handleDeleteCashflowGroup,
  transactions = [],
  handleAddDayType, handleDeleteDayType, handleMoveDayType,
  enableSmartInsights, setEnableSmartInsights, triggerToast
}) {
  const { isDarkMode: dm } = useTheme();
  const [newCatId, setNewCatId] = useState(null);
  
  const onAddCategory = (type) => {
    handleAddCategory(type);
    setTimeout(() => {
      const added = [...categories].reverse().find(c => c.type === type);
      if (added) setNewCatId(added.id);
    }, 0);
  };

  const handleChangeCashflowGroup = (id, field, value) => {
    const group = cashflowGroups.find(g => g.id === id);
    if (group) {
      handleUpdateCashflowGroup({ ...group, [field]: value });
    }
  };

  const [cashflowDeleteError, setCashflowDeleteError] = useState(null);
  const handleDeleteGroup = (id) => {
    if (categories.some(c => c.cashflowGroup === id)) {
      setCashflowDeleteError({ id, msg: 'ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่' });
      setTimeout(() => setCashflowDeleteError(null), 4000);
      return;
    }
    handleDeleteCashflowGroup(id);
  };

  const handleMoveCashflowGroup = async (id, direction) => {
    const idx = cashflowGroups.findIndex(g => g.id === id);
    if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < cashflowGroups.length) {
      const updated = [...cashflowGroups];
      [updated[idx], updated[ti]] = [updated[ti], updated[idx]];
      
      const finalUpdated = updated.map((g, i) => ({ ...g, order_index: i + 1 }));
      setCashflowGroups(finalUpdated);

      try {
        for (const group of finalUpdated) {
          await handleUpdateCashflowGroup(group);
        }
      } catch (err) {
        console.error('Failed to save groups order:', err);
      }
    }
  };

  const txCountByGroup = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id || c.name === t.category);
      if (cat?.cashflowGroup) map[cat.cashflowGroup] = (map[cat.cashflowGroup] || 0) + 1;
    });
    return map;
  }, [transactions, categories]);

  const incomeCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'income').sort((a, b) => a.order_index - b.order_index), 
  [categories]);

  const expenseCategories = useMemo(() => 
    [...categories].filter(c => c.type === 'expense').sort((a, b) => a.order_index - b.order_index), 
  [categories]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full px-1 pt-1 pb-10">

      <div className="flex items-center justify-between mb-3 gap-4">
        <h1 className={`text-lg font-black flex items-center gap-2 ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
          <Settings2 className="w-5 h-5 text-[#00509E]" /> การตั้งค่าระบบ
        </h1>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-[11px] ${dm ? 'bg-blue-950/30 border-blue-900/40 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
          <Info className={`w-3 h-3 shrink-0 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <span><b>Fixed</b> = รายจ่ายคงที่ &nbsp;·&nbsp; <b>Bg</b> = เทสีพื้นหลังคอลัมน์ใน Dashboard</span>
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
                  isFirst={idx === 0} isLast={idx === expenseCategories.length - 1} />
              ))}
              {expenseCategories.length === 0 && (
                <p className={`text-center py-6 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
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
                  isFirst={idx === 0} isLast={idx === incomeCategories.length - 1} />
              ))}
              {incomeCategories.length === 0 && (
                <p className={`text-center py-6 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายรับ</p>
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

      <AdvancedOptions enableSmartInsights={enableSmartInsights} setEnableSmartInsights={setEnableSmartInsights} />
      <DangerZone transactions={transactions} handleDeleteAllData={handleDeleteAllData} />

    </div>
  );
}
