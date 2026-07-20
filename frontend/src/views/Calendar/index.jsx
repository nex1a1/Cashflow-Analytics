import { useMemo, useState, useEffect } from 'react';
import DayDetailModal from '../../components/modals/DayDetailModal/index';
import { CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { hexToRgb } from '../../utils/formatters';
import CalendarSkeleton from './components/CalendarSkeleton';
import CalendarDayCell from './components/CalendarDayCell';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export default function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, cashflowGroups, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction, paymentMethods,
  isLoading, frequentItems = []
}) {
  const isDarkMode = true;
  const [selectedDate, setSelectedDate] = useState(null);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState(new Set());
  const [legendSortMode, setLegendSortMode] = useState(() => localStorage.getItem('shark_calendar_legend_sort') || 'structure');

  const handleSetSortMode = (mode) => {
    setLegendSortMode(mode);
    localStorage.setItem('shark_calendar_legend_sort', mode);
  };

  const toggleCategory = (catId) => {
    setExcludedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };
  
  // ── Logic: Smooth Loading Transition ───────────────────────
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      // Add a tiny delay to prevent the "flash" on ultra-fast local transitions
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const viewDate = useMemo(() => {
    if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = filterPeriod.split('-');
      return new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    }
    return new Date();
  }, [filterPeriod]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(y, m, 1).getDay();

  const suffixDaysCount = useMemo(() => {
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainder = totalCells % 7;
    return remainder === 0 ? 0 : 7 - remainder;
  }, [firstDayOfMonth, daysInMonth]);

  const { dayData: calendarData, monthInc, monthExp } = useMemo(() => {
    let dayData = {};
    let tInc = 0, tExp = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    const targetMonthYear = `${y}-${(m + 1).toString().padStart(2, '0')}`;

    transactions.forEach(t => {
      if (!t.date || !t.date.startsWith(targetMonthYear)) return;

      const txD = parseInt(t.date.split('-')[2], 10);
      if (dayData[txD]) {
        const catObj = categories.find(c => c.name === t.category);
        const catId = catObj ? catObj.id : t.category;
        if (excludedCategoryIds.has(catId)) return;

        const amt = parseFloat(t.amount) || 0;
        
        if (catObj?.type === 'income') {
          dayData[txD].inc += amt;
          dayData[txD].incItems.push({ ...t, _catObj: catObj });
          tInc += amt;
        } else {
          dayData[txD].exp += amt;
          dayData[txD].items.push({ ...t, _catObj: catObj });
          tExp += amt;
        }
      }
    });

    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a, b) => b.amount - a.amount);
      dayData[i].incItems.sort((a, b) => b.amount - a.amount);
    }
    
    return { dayData, monthInc: tInc, monthExp: tExp };
  }, [transactions, y, m, daysInMonth, categories, excludedCategoryIds]);

  const dayTypeCounts = useMemo(() => {
    const counts = {};
    dayTypeConfig.forEach(dt => { counts[dt.id] = 0; });
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dow = new Date(y, m, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const def = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
      const cur = dayTypes[dateStr] || def;
      if (cur) counts[cur] = (counts[cur] || 0) + 1;
    }
    return counts;
  }, [dayTypes, daysInMonth, m, y, dayTypeConfig]);

  const groupedLegendData = useMemo(() => {
    const targetMonthYear = `${y}-${(m + 1).toString().padStart(2, '0')}`;
    const catsMap = new Map();
    const catAmounts = {};
    
    transactions.forEach(t => {
      if (!t.date || !t.date.startsWith(targetMonthYear)) return;
      
      const catObj = categories.find(c => c.name === t.category);
      const amt = parseFloat(t.amount) || 0;
      const catId = catObj ? catObj.id : t.category;

      if (!catsMap.has(catId)) {
        if (catObj) {
          catsMap.set(catId, catObj);
        } else {
          catsMap.set(catId, {
            id: t.category,
            name: t.category,
            color: '#94a3b8',
            type: 'expense',
            cashflowGroup: null
          });
        }
      }
      catAmounts[catId] = (catAmounts[catId] || 0) + amt;
    });

    const activeCatsArray = Array.from(catsMap.values());
    if (activeCatsArray.length === 0) {
      return { sortedGroups: [], catAmounts: {} };
    }

    const groupsMap = {};

    const getGroupObj = (groupId, categoryType) => {
      if (groupId) {
        const found = cashflowGroups.find(g => g.id === groupId);
        if (found) return found;
      }
      return {
        id: groupId || 'uncategorized',
        name: categoryType === 'income' ? 'รายรับอื่นๆ' : 'หมวดหมู่อื่นๆ',
        type: categoryType || 'expense',
        icon: categoryType === 'income' ? '💰' : '📌',
        color: '#64748b',
        order_index: 9999
      };
    };

    activeCatsArray.forEach(cat => {
      const groupId = cat.cashflowGroup || 'uncategorized';
      const groupKey = `${cat.type}_${groupId}`;
      const amt = catAmounts[cat.id] || 0;

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          groupObj: getGroupObj(cat.cashflowGroup, cat.type),
          categories: [],
          groupTotal: 0
        };
      }
      groupsMap[groupKey].categories.push(cat);
      groupsMap[groupKey].groupTotal += amt;
    });

    Object.values(groupsMap).forEach(gData => {
      gData.categories.sort((a, b) => {
        if (legendSortMode === 'amount') {
          const amtA = catAmounts[a.id] || 0;
          const amtB = catAmounts[b.id] || 0;
          if (amtB !== amtA) return amtB - amtA;
          return a.name.localeCompare(b.name, 'th');
        } else {
          const catIdxA = a.order_index ?? 999;
          const catIdxB = b.order_index ?? 999;
          if (catIdxA !== catIdxB) return catIdxA - catIdxB;
          return a.name.localeCompare(b.name, 'th');
        }
      });
    });

    const sortedGroups = Object.values(groupsMap).sort((a, b) => {
      const typeOrder = { income: 0, savings: 1, expense: 2 };
      const typeA = typeOrder[a.groupObj.type] ?? 9;
      const typeB = typeOrder[b.groupObj.type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;

      const idxA = a.groupObj.order_index ?? 9999;
      const idxB = b.groupObj.order_index ?? 9999;
      if (idxA !== idxB) return idxA - idxB;

      return a.groupObj.name.localeCompare(b.groupObj.name, 'th');
    });

    return {
      sortedGroups,
      catAmounts
    };
  }, [transactions, y, m, categories, cashflowGroups, legendSortMode]);

  const prevMonth = () => {
    const d = new Date(y, m - 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m + 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  const goToCurrentMonth = () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setFilterPeriod(currentMonthStr);
  };

  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const today = new Date();
  const monthNet = monthInc - monthExp;

  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const WEEKEND_IDX = [0, 6];

  const styles = {
    surface: 'bg-[#181818]',
    surfaceAlt: 'bg-[#121212]',
    border: 'border-[#2d2d2d]',
    textMuted: 'text-slate-400',
    gapColor: 'bg-[#2d2d2d]',
  };

  // ── Unified Render ──────────────────────────────────────────
  
  // 1. Calculate current month string for the "Switch" button
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  // 2. Decide what the "Main Content" is
  let content = null;

  if (showSkeleton) {
    content = <CalendarSkeleton />;
  } else if (isReadOnlyView) {
    content = (
      <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-20 rounded-none border-2 border-dashed h-[60vh] transition-colors ${'bg-[#121212] border-[#2d2d2d] text-slate-400'}`}>
          <div className={`p-4 rounded-none mb-4 ${styles.surfaceAlt} border border-[#2d2d2d]`}>
            <CalendarDays className={`w-12 h-12 ${'text-[#da291c]'}`} />
          </div>
          <p className={`text-xl font-bold mb-2 ${'text-slate-200'}`}>โหมดปฏิทินรองรับเฉพาะรายเดือน</p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-6 ${styles.textMuted}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br/>
            ปฏิทินจะแสดงผลได้ดีที่สุดเมื่อดูเป็นรายเดือนครับ
          </p>
          <button 
            onClick={goToCurrentMonth}
            className="px-5 py-2.5 rounded-none text-sm font-bold bg-[#da291c] hover:bg-[#b01e0a] text-white transition-none"
          >
            สลับไปดูเดือนปัจจุบัน ({getFilterLabel(currentMonthStr)})
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col h-full space-y-3.5 w-full">
        {/* Header */}
        <div className={`${styles.surface} rounded-none border ${styles.border} p-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className={`text-xl font-black flex items-center gap-2 tracking-wide ${'text-slate-100'}`}>
                <CalendarIcon className={`w-5 h-5 ${'text-[#da291c]'}`} />
                {thaiMonths[m]} {y}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {monthInc > 0 && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'}`}>
                    ▲ {formatValue(monthInc)} ฿
                  </span>
                )}
                {monthExp > 0 && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${'bg-red-950/40 text-red-400 border-red-800/40'}`}>
                    ▼ {formatValue(monthExp)} ฿
                  </span>
                )}
                {(monthInc > 0 || monthExp > 0) && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${monthNet >= 0 ? ('bg-yellow-500/10 text-yellow-450 border-yellow-500/20') : ('bg-rose-500/10 text-rose-450 border-rose-500/20')}`}>
                    คงเหลือ {formatValue(monthNet)} ฿
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={prevMonth} 
                className="p-1.5 rounded-none border disabled:opacity-30 disabled:cursor-not-allowed border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={goToCurrentMonth} 
                className="px-3 py-1.5 rounded-none border text-[12px] font-bold border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                เดือนปัจจุบัน
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1.5 rounded-none border disabled:opacity-30 disabled:cursor-not-allowed border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`rounded-none border ${styles.border} overflow-hidden flex-1 flex flex-col`}>
          <div className={`grid grid-cols-7 gap-[1px] bg-[#2d2d2d] border-b ${styles.border}`}>
            {DAYS_LABEL.map((label, i) => (
              <div key={label} className={`py-2 text-center text-[14px] font-black tracking-wider ${styles.surfaceAlt} ${WEEKEND_IDX.includes(i) ? ('text-red-400') : styles.textMuted}`}>
                {label}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 gap-[1px] ${styles.gapColor} flex-1`}>
            {Array(firstDayOfMonth).fill(null).map((_, i) => (
              <div 
                key={`blank-${i}`} 
                className={`min-h-[120px] 2xl:min-h-[140px] ${styles.surfaceAlt} ${
                  'bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40'
                }`} 
              />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
              const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
              const dow = new Date(y, m, d).getDay();
              const isWeekend = WEEKEND_IDX.includes(dow);
              const defType = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
              const dayType = dayTypes[dateStr] || defType;

              return (
                <CalendarDayCell
                  key={d}
                  day={d}
                  data={calendarData[d]}
                  dateStr={dateStr}
                  isToday={isToday}
                  isWeekend={isWeekend}
                  dayTypeConfig={dayTypeConfig}
                  dayType={dayType}
                  handleDayTypeChange={handleDayTypeChange}
                  onSelectDate={setSelectedDate}
                />
              );
            })}

            {Array.from({ length: suffixDaysCount }).map((_, i) => (
              <div 
                key={`suffix-blank-${i}`} 
                className={`min-h-[120px] 2xl:min-h-[140px] ${styles.surfaceAlt} ${
                  'bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40'
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Category Color Legend */}
        {groupedLegendData.sortedGroups && groupedLegendData.sortedGroups.length > 0 && (
          <div className={`${styles.surface} rounded-none border ${styles.border} p-3.5 px-4 space-y-4`}>
            <div className="flex items-center gap-3 mb-1 flex-wrap sm:flex-nowrap">
              <span className="text-[12px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-none bg-[#da291c] animate-pulse" />
                หมวดหมู่ธุรกรรมในเดือนนี้ (Category Colors)
              </span>
              
              <div className="flex items-center gap-1.5 shrink-0 border border-[#2d2d2d] bg-[#121212] p-0.5 text-[10px] font-black tracking-wider">
                <button
                  onClick={() => handleSetSortMode('structure')}
                  className={`px-2 py-0.5 rounded-none transition-none cursor-pointer ${
                    legendSortMode === 'structure'
                      ? 'bg-[#da291c] text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent'
                  }`}
                >
                  เรียงตามกลุ่ม
                </button>
                <button
                  onClick={() => handleSetSortMode('amount')}
                  className={`px-2 py-0.5 rounded-none transition-none cursor-pointer ${
                    legendSortMode === 'amount'
                      ? 'bg-[#da291c] text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent'
                  }`}
                >
                  เรียงตามยอดเงิน
                </button>
              </div>

              <div className="h-[1px] bg-[#2d2d2d] flex-1 min-w-[20px]" />
              
              {excludedCategoryIds.size > 0 && (
                <button
                  onClick={() => setExcludedCategoryIds(new Set())}
                  className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-none border border-[#da291c] bg-[#da291c]/10 text-[#da291c] hover:bg-[#da291c]/20 transition-none cursor-pointer shrink-0"
                >
                  แสดงทั้งหมด (Show All)
                </button>
              )}
            </div>

            {/* Groups Grid */}
            <div className="flex flex-col gap-3">
              {groupedLegendData.sortedGroups.map(({ groupObj, categories: groupCats, groupTotal }) => {
                const groupColor = groupObj.color || '#64748b';
                
                let amtColor = 'text-red-400';
                let amtPrefix = '-';
                if (groupObj.type === 'income') {
                  amtColor = 'text-emerald-400';
                  amtPrefix = '+';
                } else if (groupObj.type === 'savings') {
                  amtColor = 'text-amber-400';
                  amtPrefix = '±';
                }
                
                return (
                  <div key={groupObj.id} className="flex flex-row items-center gap-4 py-2 border-b border-[#2d2d2d]/30 pb-3 last:border-b-0 last:pb-0">
                    {/* Group Header & Total Column */}
                    <div className="flex items-center justify-between w-[270px] shrink-0 pr-4 border-r border-[#2d2d2d]/50">
                      <span className="text-[12px] font-black text-slate-300 tracking-wide flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
                        {groupObj.icon && <span className="text-[12px] shrink-0">{groupObj.icon}</span>}
                        <span className="truncate">{groupObj.name}</span>
                      </span>
                      <span className={`text-[11px] font-mono font-black tracking-wide tabular-nums shrink-0 ml-2 ${amtColor}`}>
                        {amtPrefix}{formatValue(groupTotal)} ฿
                      </span>
                    </div>

                    {/* Group Categories Column */}
                    <div className="flex flex-wrap gap-2 flex-grow pl-1">
                      {groupCats.map(cat => {
                        const color = cat.color || '#94a3b8';
                        const isExcluded = excludedCategoryIds.has(cat.id);
                        const amt = groupedLegendData.catAmounts[cat.id] || 0;
                        
                        return (
                          <button 
                            key={cat.id} 
                            onClick={() => toggleCategory(cat.id)}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-none border cursor-pointer select-none transition-none bg-transparent ${
                              isExcluded 
                                ? 'opacity-35 hover:opacity-60' 
                                : 'hover:brightness-110'
                            }`}
                            style={{
                              backgroundColor: isExcluded 
                                ? 'transparent' 
                                : `rgba(${hexToRgb(color)}, ${isDarkMode ? 0.08 : 0.03})`,
                              borderColor: isExcluded 
                                ? `rgba(${hexToRgb(color)}, 0.1)` 
                                : `rgba(${hexToRgb(color)}, ${isDarkMode ? 0.25 : 0.15})`,
                              color: color,
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-none shrink-0" 
                              style={{ 
                                backgroundColor: color,
                                opacity: isExcluded ? 0.4 : 1
                              }} 
                            />
                            <span className="opacity-90">{cat.name}</span>
                            <span className="text-[10px] opacity-75 font-mono font-bold tabular-nums ml-1.5">
                              {formatValue(amt)} ฿
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Footer */}
        <div className={`${styles.surface} rounded-none border ${styles.border} p-3 px-4 flex flex-wrap gap-2.5 items-center`}>
          <span className={`text-[13px] font-bold mr-1 ${styles.textMuted}`}>สรุป:</span>
          {dayTypeConfig.map(dt => {
            const count = dayTypeCounts[dt.id] || 0;
            if (count === 0) return null;
            return (
              <div
                key={dt.id}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-none border text-[10px] font-black tracking-wider uppercase"
                style={{
                  backgroundColor: `rgba(${hexToRgb(dt.color)}, 0.08)`,
                  borderColor: `rgba(${hexToRgb(dt.color)}, 0.25)`,
                  color: dt.color,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: dt.color }} />
                <span>{dt.label} (<span className="tabular-nums font-mono">{count}</span>)</span>
              </div>
            );
          })}
          <div className="ml-auto text-[12px] font-black px-2.5 py-0.5 rounded-none border bg-[#121212] border-[#2d2d2d] text-slate-300 tabular-nums font-mono">
            {daysInMonth} วัน
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-6 w-full min-h-[600px]">
      {content}

      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}
          transactions={transactions}
          categories={categories}
          cashflowGroups={cashflowGroups}
          onClose={() => setSelectedDate(null)}
          onSave={async (item) => { await onSaveTransaction(item); }}
          onDelete={(id) => { handleDeleteTransaction(id); }}
          paymentMethods={paymentMethods}
          frequentItems={frequentItems}
        />
      )}
    </div>
  );
}
