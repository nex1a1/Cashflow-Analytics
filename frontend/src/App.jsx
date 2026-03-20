import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, ClipboardList,  
  Download, CheckCircle, PlusCircle, Trash2, Inbox,
  Database, FileSpreadsheet, AlertCircle, Settings,
  X, CalendarPlus, Zap,
  Moon, Sun, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star
} from 'lucide-react';
import {
  API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL,
  CATEGORIES_KEY, DAY_TYPES_KEY, DAY_TYPE_CONFIG_KEY,
  OLD_PALETTE_MAP, DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES
} from './constants';

import { parseDateStrToObj, isDateInFilter } from './utils/dateHelpers';
import { autoCategorize, parseCSV, cleanNumber } from './utils/csvParser';
import AnimatedNumber from './components/ui/AnimatedNumber';
import useCategories from './hooks/useCategories';
import useAnalytics from './hooks/useAnalytics';
import SettingsView from './components/SettingsView';
import CalendarView from './components/CalendarView';
import LedgerView from './components/LedgerView';
import PeriodPicker from './components/PeriodPicker';
import DashboardView from './components/DashboardView';
import BatchAddModal from './components/BatchAddModal';
import ExportModal from './components/ExportModal';
import ImportGuideModal from './components/ImportGuideModal';
import ImportPreviewModal from './components/ImportPreviewModal';
import {getThaiMonth, getFilterLabel} from './utils/formatters';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults, LineController, BarController
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler);
defaults.font.family = 'Tahoma, sans-serif';

/////////////////////////////////////

const darkModeStyles = `
  .dark-mode { background-color: #0f172a !important; color: #e2e8f0 !important; }
  .dark-mode .bg-white { background-color: #1e293b !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50, .dark-mode .bg-slate-100 { background-color: #0f172a !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50\\/80 { background-color: rgba(15, 23, 42, 0.8) !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50\\/50 { background-color: rgba(15, 23, 42, 0.5) !important; border-color: #334155 !important; }
  .dark-mode .bg-blue-50\\/50 { background-color: rgba(30, 58, 138, 0.5) !important; border-color: #1e3a8a !important; }
  .dark-mode .bg-blue-50 { background-color: rgba(30, 58, 138, 0.5) !important; border-color: #1e3a8a !important; }
  .dark-mode .border-blue-200 { border-color: #1e3a8a !important; }
  .dark-mode .text-slate-900 { color: #e2e8f0 !important; }
  .dark-mode .text-slate-800 { color: #cbd5e1 !important; }
  .dark-mode .text-slate-700 { color: #e2e8f0 !important; }
  .dark-mode .text-slate-600 { color: #cbd5e1 !important; }
  .dark-mode .text-slate-500 { color: #94a3b8 !important; }
  .dark-mode .text-\\[\\#00509E\\] { color: #60a5fa !important; }
  .dark-mode .border-\\[\\#00509E\\] { border-color: #60a5fa !important; }
  .dark-mode .hover\\:text-\\[\\#00509E\\]:hover { color: #93c5fd !important; }
  .dark-mode .border-slate-200 { border-color: #334155 !important; }
  .dark-mode .border-slate-300 { border-color: #475569 !important; }
  .dark-mode .border-slate-100 { border-color: #1e293b !important; }
  .dark-mode .hover\\:bg-slate-50:hover { background-color: #334155 !important; }
  .dark-mode .hover\\:bg-slate-100:hover { background-color: #475569 !important; }
  .dark-mode .hover\\:bg-slate-200:hover { background-color: #64748b !important; }
  
  .dark-mode input, .dark-mode select:not(.day-type-badge), .dark-mode textarea { 
    background-color: transparent !important; 
    border-color: #475569 !important; 
  }
  .dark-mode select optgroup { background-color: #0f172a !important; color: #60a5fa !important; font-weight: bold; }
  .dark-mode select option { background-color: #1e293b !important; color: #f8fafc !important; }
  .dark-mode table thead th { background-color: #0f172a !important; color: #cbd5e1 !important; border-color: #334155 !important; }
  
  input[type="color"] { -webkit-appearance: none; border: none; padding: 0; overflow: hidden; border-radius: 4px; }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  input[type="color"]::-webkit-color-swatch { border: none; border-radius: 4px; }
`;

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('expense_dark_mode') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('ALL');
  
  const [dayTypes, setDayTypes] = useState({});
  const [dayTypeConfig, setDayTypeConfig] = useState(DEFAULT_DAY_TYPES);

  // ฟังก์ชันยิง API เซฟลง Database
  const saveSettingToDb = async (key, value) => {
      try {
          await fetch(SETTINGS_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value })
          });
      } catch (err) {
          console.error(`Failed to save ${key} to DB:`, err);
      }
  };
  
  const handleDayTypeChange = async (dateStr, type) => {
      const newTypes = { ...dayTypes, [dateStr]: type };
      setDayTypes(newTypes);
      try {
          await fetch(CALENDAR_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date: dateStr, type_id: type })
          });
      } catch (err) {
          console.error("Failed to save day type to DB:", err);
      }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState('ALL');

  const [isProcessing, setIsProcessing] = useState(false);
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');
  const [hideFixedExpenses, setHideFixedExpenses] = useState(false); 
  const [dashboardCategory, setDashboardCategory] = useState('ALL');
  const [chartGroupBy, setChartGroupBy] = useState('monthly');
  const [topXLimit, setTopXLimit] = useState(7);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [showImportGuide, setShowImportGuide] = useState(false); 
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: ''
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
      localStorage.setItem('expense_dark_mode', isDarkMode);
      defaults.color = isDarkMode ? '#94a3b8' : '#475569';
      defaults.scale.grid.color = isDarkMode ? '#334155' : '#e2e8f0';
  }, [isDarkMode]);

  useEffect(() => {
      setAdvancedFilterDate('ALL');
  }, [filterPeriod]);

// --- DATA LOADING & SAVING ---
  const loadData = async () => {
    const sortTransactions = (dataArr) => {
        return [...dataArr].sort((a, b) => {
            const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
            if (dateDiff !== 0) return dateDiff;
            return String(a.id).localeCompare(String(b.id));
        });
    };

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Network error transactions");
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
      } catch (calErr) {
          console.error("Failed to load calendar data:", calErr);
      }

      try {
          const setRes = await fetch(SETTINGS_API_URL);
          if (setRes.ok) {
              const dbSettings = await setRes.json();
              if (dbSettings[CATEGORIES_KEY]) {
                  let parsed = dbSettings[CATEGORIES_KEY];
                  parsed = parsed.map(c => {
                      let cGroup = c.cashflowGroup;
                      let cFixed = c.isFixed;
                      let cColor = c.color;
                      if (!cColor) cColor = OLD_PALETTE_MAP[c.colorId] || '#64748B';
                      if (!cGroup) {
                          if (c.type === 'income') {
                              cGroup = (c.name || "").includes('เงินเดือน') ? 'salary' : 'bonus';
                          } else {
                              const n = c.name || "";
                              if (n.match(/หอ|เช่า|คอนโด/)) cGroup = 'rent';
                              else if (n.match(/รายเดือน|สมาชิก|หนี้/)) cGroup = 'subs';
                              else if (n.match(/ลงทุน|ออม/)) cGroup = 'invest';
                              else if (n.match(/อาหาร|กิน|เครื่องดื่ม/)) cGroup = 'food';
                              else if (n.match(/คอม|ไอที|IT/i)) cGroup = 'it';
                              else cGroup = 'variable';
                              cFixed = cGroup === 'rent' || cGroup === 'subs' || cGroup === 'invest' || n.match(/บ้าน|บัตร/);
                          }
                      }
                      return { ...c, type: c.type || 'expense', cashflowGroup: cGroup, isFixed: !!cFixed, color: cColor };
                  });
                  if (!parsed.find(c => c.name === 'เงินเดือน')) parsed.unshift(DEFAULT_CATEGORIES[0]);
                  if (!parsed.find(c => c.name === 'รายรับพิเศษ/โบนัส')) parsed.unshift(DEFAULT_CATEGORIES[1]);
                  
                  if (!parsed.find(c => c.name.includes('หักวงเงิน'))) {
                      const debtCat = DEFAULT_CATEGORIES.find(c => c.id === 'cat_default_debt');
                      if (debtCat) parsed.push(debtCat);
                  }
                  
                  setCategories(parsed);
              }
              if (dbSettings[DAY_TYPE_CONFIG_KEY]) {
                  setDayTypeConfig(dbSettings[DAY_TYPE_CONFIG_KEY]);
              }
          }
      } catch (setErr) {
          console.error("Failed to load settings from DB:", setErr);
      }

    } catch (err) {
      setTransactions([]);
      setDbStatus('Offline (ไม่สามารถเชื่อมต่อ Database)');
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveToDb = async (items) => {
      try {
        const res = await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items)
        });
        if (!res.ok) throw new Error("Network response was not ok");
      } catch (err) {
        console.error("Failed to save to DB:", err);
      }
      await loadData(); 
  };

  // --- ACTIONS ---
  const {
    categories,
    setCategories,
    handleCategoryChange: _handleCategoryChange,
    handleAddCategory,
    handleDeleteCategory: _handleDeleteCategory,
    handleMoveCategory,
  } = useCategories(DEFAULT_CATEGORIES, saveSettingToDb, saveToDb);

  const handleCategoryChange = (catId, field, value) =>
    _handleCategoryChange(catId, field, value, transactions);
  const handleDeleteCategory = (id) =>
    _handleDeleteCategory(id, transactions);

  const handleUpdateDayTypeConfig = (newConfig) => {
      setDayTypeConfig(newConfig);
      saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };

  const processCSVText = async (rawText) => {
    try {
        const rawTrimmed = rawText.trim();
        if (!rawTrimmed) { 
            alert("ไม่พบข้อมูล");
            setIsProcessing(false); 
            return; 
        }

        let newList = [];
        let batchId = Date.now();
        let newDayTypes = { ...dayTypes }; 
        let updatedDayTypeConfig = [...dayTypeConfig];
        let updatedCategories = [...categories];       
        let isConfigChanged = false;
        let isCategoryChanged = false;

        const getOrCreateDayType = (label) => {
            if (!label || label.trim() === '') return null;
            label = label.trim();
            let found = updatedDayTypeConfig.find(dt => dt.label === label);
            if (!found) {
                found = { id: `dt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: label, color: '#64748B' };
                updatedDayTypeConfig.push(found);
                isConfigChanged = true;
            }
            return found.id;
        };

        const getOrCreateCategory = (name, typeStr = 'รายจ่าย') => {
            if (!name || name.trim() === '') return updatedCategories.filter(c => c.type === 'expense')[0]?.name || "อื่นๆ";
            name = name.trim();
            let found = updatedCategories.find(c => c.name === name);
            if (!found) {
                const isIncome = typeStr === 'รายรับ' || typeStr === 'income';
                found = {
                    id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: name, icon: "📌", color: isIncome ? "#10B981" : "#64748B",
                    type: isIncome ? 'income' : 'expense',
                    cashflowGroup: isIncome ? 'bonus' : 'variable', isFixed: false
                };
                updatedCategories.push(found);
                isCategoryChanged = true;
            }
            return found.name;
        };

        const parsedRows = parseCSV(rawTrimmed);
        if (parsedRows.length < 2) { 
            alert("ข้อมูลไม่ถูกต้อง หรือมีน้อยกว่า 2 บรรทัด");
            setIsProcessing(false); 
            return; 
        }
        
        const headers = parsedRows[0];
        const dateColIndex = 0;
        const noteColIndex = headers.length - 1;
        const excludeCategories = ['date', 'วันที่', 'notes', 'หมายเหตุ', 'รวม', 'total'];
        const isCsvLong = headers.length >= 4 && (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน');

        for (let i = 1; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            if (row.length < 2) continue;
            const dateStr = row[dateColIndex];
            if(!dateStr || !dateStr.includes('/')) continue;

            if (isCsvLong) {
                let catName, desc, amtStr, typeStr = 'รายจ่าย';
                
                if (headers[1] === 'ชนิดวัน' && row.length >= 6) {
                     const typeId = getOrCreateDayType(row[1]);
                     if (typeId) newDayTypes[dateStr] = typeId;
                     typeStr = row[2]; catName = row[3]; desc = row[4]; amtStr = row[5];
                } else if (headers[1] === 'ประเภท' && row.length >= 5) {
                     typeStr = row[1]; catName = row[2]; desc = row[3]; amtStr = row[4];
                } else {
                     catName = row[1]; desc = row[2]; amtStr = row[3];
                }
                
                const finalCatName = getOrCreateCategory(catName, typeStr);
                const amount = cleanNumber(amtStr);
                
                if (amount !== 0) {
                    newList.push({
                        id: `csv_${batchId}_${i}`, date: dateStr, category: finalCatName,
                        description: desc || finalCatName, amount: Math.abs(amount),
                        dayNote: ''
                    });
                }
                continue;
            }

            const note = (row.length === headers.length) ? (row[noteColIndex] || '') : '';
            for (let j = 1; j < Math.min(row.length, headers.length); j++) {
                if (j === noteColIndex) continue;
                const rawHeader = headers[j];
                if (!rawHeader || excludeCategories.some(exc => rawHeader.toLowerCase().includes(exc))) continue;

                const amount = cleanNumber(row[j]);
                if (amount !== 0) { 
                    let cleanStr = rawHeader.replace(/\n|\r/g, ' ').trim();
                    let catName = cleanStr.split('(')[0].trim().replace(/[A-Za-z]+.*$/, '').trim() || cleanStr;
                    let description = note && note.trim() ? `${catName} · ${note.trim()}` : catName;
                    if (!note && catName === 'อื่นๆ') description = catName;

                    const autoCat = autoCategorize(catName, catName, updatedCategories);
                    const finalCatName = autoCat !== 'อื่นๆ' ? autoCat : getOrCreateCategory(catName, 'รายจ่าย');

                    newList.push({ 
                        id: `csv_${batchId}_${i}_${j}`, date: dateStr, category: finalCatName, 
                        description: description, amount: Math.abs(amount), 
                        dayNote: note
                    });
                }
            }
        }

        if(newList.length > 0) {
            setImportPreview({ items: newList, updatedDayTypeConfig, updatedCategories, isConfigChanged, isCategoryChanged, newDayTypes });
        } else {
            alert("ไม่พบข้อมูลที่จะบันทึก ตรวจสอบรูปแบบข้อมูลอีกครั้ง");
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const confirmImport = async () => {
      if (!importPreview) return;
      setIsProcessing(true);
      const { items, updatedDayTypeConfig, updatedCategories, isConfigChanged, isCategoryChanged, newDayTypes } = importPreview;
      try {
          await saveToDb(items);
          setDayTypes(prev => ({ ...prev, ...newDayTypes }));
          try {
              for (const [date, type_id] of Object.entries(newDayTypes)) {
                  await fetch(CALENDAR_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, type_id }) });
              }
          } catch(e) { console.error("Calendar sync failed:", e); }
          if (isConfigChanged) { setDayTypeConfig(updatedDayTypeConfig); saveSettingToDb(DAY_TYPE_CONFIG_KEY, updatedDayTypeConfig); }
          if (isCategoryChanged) { setCategories(updatedCategories); saveSettingToDb(CATEGORIES_KEY, updatedCategories); }
          setImportPreview(null);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
          setActiveTab('ledger');
      } catch(err) {
          alert("เกิดข้อผิดพลาด: " + err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
          await processCSVText(evt.target.result);
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => { alert("เกิดข้อผิดพลาดในการอ่านไฟล์"); setIsProcessing(false); };
      reader.readAsText(file);
  };

  const handleUpdateTransaction = (id, field, value) => {
    const item = transactions.find(t => t.id === id);
    if(item) saveToDb({ ...item, [field]: value });
  };

  const handleDeleteTransaction = async (id) => {
      if(window.confirm('ยืนยันการลบรายการนี้?')) { 
          try {
              const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
              if (!res.ok) throw new Error("Network Error");
          } catch (err) { 
              console.error("Failed to delete transaction:", err);
          }
          await loadData();
      }
  };

  const handleSaveTransaction = async (item) => {
    try {
      await saveToDb([item]);
    } catch (err) {
      console.error("Failed to save transaction:", err);
      throw err; 
    }
  };

  const handleDeleteMonth = async (period) => {
      if (!period.match(/^\d{4}-\d{2}$/)) return alert("กรุณาเลือกรายเดือนเพื่อทำการลบข้อมูล");
      if (window.confirm(`🚨 ยืนยันการลบข้อมูลของเดือน ${getThaiMonth(period)} ทั้งหมดหรือไม่? (ไม่สามารถกู้คืนได้)`)) {
          setIsProcessing(true);
          const itemsToDelete = transactions.filter(t => {
              if (!t.date) return false;
              const parts = t.date.split('/');
              return parts.length === 3 && `${parts[2]}-${parts[1]}` === period;
          });
          
          try {
              for (const item of itemsToDelete) {
                  await fetch(`${API_URL}/${item.id}`, { method: 'DELETE' });
              }
          } catch(err) {
              console.error("Failed to delete month transactions:", err);
          }
          
          await loadData();
          setIsProcessing(false);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
      }
  };

  const handleDeleteAllData = async () => {
      if (window.confirm('🚨 อันตราย: ยืนยันการลบข้อมูล "ทั้งหมด" (รายการบัญชี, ปฏิทิน และรีเซ็ตการตั้งค่ากลับเป็นค่าเริ่มต้น)?\nการกระทำนี้ไม่สามารถกู้คืนได้!')) {
          setIsProcessing(true);
          try {
              const res = await fetch(RESET_API_URL, { method: 'DELETE' });
              if (!res.ok) throw new Error("Failed to reset database");
              
              await saveSettingToDb(CATEGORIES_KEY, DEFAULT_CATEGORIES);
              await saveSettingToDb(DAY_TYPE_CONFIG_KEY, DEFAULT_DAY_TYPES);
              
              setTransactions([]);
              setDayTypes({});
              setCategories(DEFAULT_CATEGORIES);
              setDayTypeConfig(DEFAULT_DAY_TYPES);
              
              setShowToast(true);
              
              setTimeout(() => {
                  setShowToast(false);
                  window.location.reload(); 
              }, 1500);

          } catch (err) {
              console.error("DB Reset failed", err);
              alert("เกิดข้อผิดพลาดในการล้างข้อมูล: " + err.message);
          } finally {
              setIsProcessing(false);
          }
      }
  };

  const handleOpenAddModal = (dateStr, type) => {
      const parts = dateStr.split('/');
      let formattedDate = new Date().toISOString().split('T')[0];
      if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
      }
      setAddForm(prev => ({
          ...prev, 
          date: formattedDate, 
          type: type, 
          category: categories.find(c => c.type === type)?.name || ''
      }));
      setShowAddModal(true);
  };

  const handleSaveBatch = async (finalItems) => {
      setIsProcessing(true);
      try {
          await saveToDb(finalItems);
          setShowToast(true); 
          setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
          console.error(err);
          alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  // --- FILTERS & COMPUTATIONS ---
  const groupedOptions = useMemo(() => {
      const yearsMap = {};
      transactions.forEach(t => {
          if (!t.date) return;
          const parts = t.date.split('/');
          if(parts.length === 3) {
              const m = parseInt(parts[1], 10), y = parts[2];
              if (!yearsMap[y]) yearsMap[y] = { months: new Set(), quarters: new Set(), halves: new Set() };
              yearsMap[y].months.add(`${y}-${parts[1]}`);
              if (m >= 1 && m <= 3) yearsMap[y].quarters.add(`${y}-Q1`);
              if (m >= 4 && m <= 6) yearsMap[y].quarters.add(`${y}-Q2`);
              if (m >= 7 && m <= 9) yearsMap[y].quarters.add(`${y}-Q3`);
              if (m >= 10 && m <= 12) yearsMap[y].quarters.add(`${y}-Q4`);
              if (m >= 1 && m <= 6) yearsMap[y].halves.add(`${y}-H1`);
              if (m >= 7 && m <= 12) yearsMap[y].halves.add(`${y}-H2`);
          }
      });
      const sortedYears = Object.keys(yearsMap).sort().reverse();
      return { yearsMap, sortedYears };
  }, [transactions]);

  const rawAvailableMonths = useMemo(() => {
      const m = new Set();
      transactions.forEach(t => {
          if (!t.date) return;
          const p = t.date.split('/');
          if(p.length === 3) m.add(`${p[2]}-${p[1]}`);
      });
      return Array.from(m).sort().reverse();
  }, [transactions]);

  useEffect(() => {
      if (filterPeriod === 'ALL' && rawAvailableMonths.length > 0) setFilterPeriod(rawAvailableMonths[0]); 
  }, [rawAvailableMonths]);

  const isReadOnlyView = !filterPeriod.match(/^\d{4}-\d{2}$/);

  const validAnalyticsTxs = useMemo(() => transactions.filter(t => {
      const catObj = categories.find(c => c.name === t.category);
      if (catObj?.cashflowGroup === 'debt') return false;
      return true;
  }), [transactions, categories]);

  const analytics = useAnalytics({
    transactions: validAnalyticsTxs,
    categories,
    filterPeriod,
    hideFixedExpenses,
    dashboardCategory,
    chartGroupBy,
    topXLimit,
    dayTypes,
    dayTypeConfig,
    isDarkMode,
  });

  const availableDatesInPeriod = useMemo(() => {
      const filtered = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
      const dates = new Set(filtered.map(t => t.date));
      return Array.from(dates).sort((a, b) => parseDateStrToObj(a) - parseDateStrToObj(b));
  }, [transactions, filterPeriod]);

  const displayTransactions = useMemo(() => {
    let filtered = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
    
    if (advancedFilterDate !== 'ALL') {
        filtered = filtered.filter(t => t.date === advancedFilterDate);
    }
    if (advancedFilterCategory !== 'ALL') {
        filtered = filtered.filter(t => t.category === advancedFilterCategory);
    }
    if (advancedFilterGroup !== 'ALL') {
        filtered = filtered.filter(t => {
            const catObj = categories.find(c => c.name === t.category) || { type: 'expense', cashflowGroup: 'variable', isFixed: false };
            switch (advancedFilterGroup) {
                case 'INCOME': return catObj.type === 'income';
                case 'EXPENSE': return catObj.type === 'expense';
                case 'FIXED': return catObj.isFixed;
                case 'VARIABLE': return catObj.type === 'expense' && !catObj.isFixed;
                case 'FOOD': return catObj.cashflowGroup === 'food';
                case 'RENT': return catObj.cashflowGroup === 'rent';
                case 'SUBS': return catObj.cashflowGroup === 'subs';
                case 'IT': return catObj.cashflowGroup === 'it';
                case 'INVEST': return catObj.cashflowGroup === 'invest';
                default: return true;
            }
        });
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => 
            (t.description || "").toLowerCase().includes(q) || 
            (t.category || "").toLowerCase().includes(q)
        );
    }
    return filtered;
  }, [transactions, filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, categories]);

  return (
    <div className={`text-slate-800 bg-slate-100 min-h-screen flex flex-col ${isDarkMode ? 'dark-mode' : ''}`} style={{ fontFamily: 'Tahoma, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: darkModeStyles}} />
      <div className={`max-w-[98%] 2xl:max-w-screen-2xl w-full mx-auto my-4 border-t-4 border-[#00509E] shadow-xl rounded-xl pb-6 flex-grow flex flex-col overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-[#00509E] to-blue-800 text-white p-3 rounded-xl shadow-md"><Database className="w-7 h-7" /></div>
                <div>
                    <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Cashflow Analytics <span className="text-[#D81A21] text-2xl font-black italic">MASTER</span></h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-sm flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><span className={`w-2.5 h-2.5 rounded-full ${dbStatus.includes('Online') ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`}></span>{dbStatus}</span>
                        <span className={`text-sm ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>|</span>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ข้อมูล: <AnimatedNumber value={transactions.length} /> รายการ</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-lg transition-colors border shadow-sm ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`} title="สลับโหมดมืด/สว่าง">
                    {isDarkMode ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={() => {
                    setAddForm(prev => ({
                        ...prev, 
                        date: new Date().toISOString().split('T')[0], 
                        category: categories.find(c => c.type === 'expense')?.name || '',
                    }));
                    setShowAddModal(true);
                }} className="text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95">
                  <CalendarPlus className="w-4 h-4" /> เพิ่มข้อมูลด่วน
                </button>
                <button onClick={() => setShowExportModal(true)} className={`hidden md:flex text-sm font-bold flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm border active:scale-95 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/50' : 'bg-blue-50 text-[#00509E] border-blue-200 hover:bg-[#00509E] hover:text-white'}`}><Download className="w-4 h-4" /> ส่งออก CSV</button>
                <div className="flex items-center gap-1.5">
                  <label className={`cursor-pointer flex items-center gap-2 font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 ${isProcessing ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-300 text-slate-600') : (isDarkMode ? 'bg-[#00509E] hover:bg-blue-700 text-white' : 'bg-[#00509E] hover:bg-[#003d7a] text-white')}`}>
                      {isProcessing ? <Zap className="w-5 h-5 animate-pulse text-[#F4B800]" /> : <FileSpreadsheet className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-200'}`} />}
                      <span>{isProcessing ? 'กำลังประมวลผล...' : 'อัปโหลด CSV'}</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isProcessing} ref={fileInputRef} />
                  </label>
                  <button
                    onClick={() => setShowImportGuide(true)}
                    className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center transition-all active:scale-95 border ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                    title="คู่มือการ Import"
                  >?</button>
                </div>
            </div>
        </div>

        <div className={`sticky top-0 z-50 flex flex-col md:flex-row justify-between items-center px-6 border-b gap-4 transition-colors duration-300 backdrop-blur-sm ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'}`}>
          <div className="flex w-full md:w-auto overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'dashboard' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><BarChart3 className="w-5 h-5" /> เจาะลึกวิเคราะห์</button>
            <button onClick={() => setActiveTab('calendar')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'calendar' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><CalendarIcon className="w-5 h-5" /> ปฏิทิน</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'ledger' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><ClipboardList className="w-5 h-5" /> ฐานข้อมูลบัญชี</button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'settings' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><Settings className="w-5 h-5" /> ตั้งค่าระบบ</button>
          </div>
          {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'ledger' || activeTab === 'calendar') && (
            <div className="flex items-center gap-3 py-3 w-full md:w-auto justify-end flex-wrap">
                <PeriodPicker
                  filterPeriod={filterPeriod}
                  setFilterPeriod={setFilterPeriod}
                  groupedOptions={groupedOptions}
                  isDarkMode={isDarkMode}
                />
            </div>
          )}
        </div>

        <div className={`p-6 relative flex-grow overflow-y-auto custom-scrollbar transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          {activeTab === 'dashboard' && <DashboardView analytics={analytics} transactions={transactions} filterPeriod={filterPeriod} getFilterLabel={getFilterLabel} hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses} dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory} chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy} topXLimit={topXLimit} setTopXLimit={setTopXLimit} categories={categories} dayTypeConfig={dayTypeConfig} isDarkMode={isDarkMode} dayTypes={dayTypes} />}
          {activeTab === 'calendar' && <CalendarView transactions={transactions} filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths} handleOpenAddModal={handleOpenAddModal} categories={categories} isDarkMode={isDarkMode} dayTypes={dayTypes} handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig} getFilterLabel={getFilterLabel} isReadOnlyView={isReadOnlyView} onSaveTransaction={handleSaveTransaction} handleDeleteTransaction={handleDeleteTransaction} />}
          {activeTab === 'ledger' && <LedgerView 
            displayTransactions={displayTransactions} 
            isReadOnlyView={isReadOnlyView} 
            getFilterLabel={getFilterLabel} 
            filterPeriod={filterPeriod} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            handleOpenAddModal={handleOpenAddModal} 
            handleUpdateTransaction={handleUpdateTransaction} 
            handleDeleteTransaction={handleDeleteTransaction} 
            handleDeleteMonth={handleDeleteMonth} 
            categories={categories} 
            advancedFilterCategory={advancedFilterCategory} 
            setAdvancedFilterCategory={setAdvancedFilterCategory} 
            advancedFilterGroup={advancedFilterGroup} 
            setAdvancedFilterGroup={setAdvancedFilterGroup} 
            advancedFilterDate={advancedFilterDate} 
            setAdvancedFilterDate={setAdvancedFilterDate} 
            availableDatesInPeriod={availableDatesInPeriod} 
            isDarkMode={isDarkMode} 
          />}
          {activeTab === 'settings' && <SettingsView 
            categories={categories} 
            handleAddCategory={handleAddCategory} 
            handleCategoryChange={handleCategoryChange} 
            handleDeleteCategory={handleDeleteCategory} 
            handleMoveCategory={handleMoveCategory} 
            dayTypeConfig={dayTypeConfig}
            setDayTypeConfig={handleUpdateDayTypeConfig}
            isDarkMode={isDarkMode} 
            handleDeleteAllData={handleDeleteAllData}
            saveSettingToDb={saveSettingToDb}
            transactions={transactions}
        />}
        </div>
      </div>
      {/* --- ADD TRANSACTION MODAL --- */}
      <BatchAddModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaveBatch={handleSaveBatch}
        categories={categories}
        transactions={transactions}
        isDarkMode={isDarkMode}
        defaultDate={addForm.date}
        defaultType={addForm.type}
        defaultCategory={addForm.category}
      />
    {/* --- IMPORT PREVIEW MODAL --- */}
   <ImportPreviewModal
     importPreview={importPreview}
     setImportPreview={setImportPreview}
     confirmImport={confirmImport}
     isProcessing={isProcessing}
     isDarkMode={isDarkMode}
     categories={categories}
   />

      {/* --- IMPORT GUIDE MODAL --- */}
   <ImportGuideModal
     isOpen={showImportGuide}
     onClose={() => setShowImportGuide(false)}
     isDarkMode={isDarkMode}
   />
    {/* --- EXPORT MODAL --- */}
    <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        transactions={transactions}
        categories={categories}
        dayTypes={dayTypes}
        dayTypeConfig={dayTypeConfig}
        isDarkMode={isDarkMode}
        groupedOptions={groupedOptions}
        getFilterLabel={getFilterLabel}
        initialPeriod={filterPeriod}
    />
      {/* --- TOAST --- */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 z-50 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'} ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800'}`}>
          <CheckCircle className="w-6 h-6 text-green-400" />
          <span className="font-medium text-base">ทำรายการสำเร็จ!</span>
      </div>
    </div>
  );
}