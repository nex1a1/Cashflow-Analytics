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
import { formatMoney, getThaiMonth, getFilterLabel, hexToRgb } from './utils/formatters';
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
  
  // State สำหรับ Day Types ของปฏิทิน (โหลดจาก DB ใน loadData)
  const [dayTypes, setDayTypes] = useState({});
  const [dayTypeConfig, setDayTypeConfig] = useState(DEFAULT_DAY_TYPES);
  const [paymentMethods, setPaymentMethods] = useState([]);
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
      // 1. อัปเดต UI ทันที (Optimistic Update)
      const newTypes = { ...dayTypes, [dateStr]: type };
      setDayTypes(newTypes);

      // 2. ยิง API เซฟลง DB
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

  // Advanced Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState('ALL');
  const [advancedFilterWallet, setAdvancedFilterWallet] = useState('ALL');

  const [isProcessing, setIsProcessing] = useState(false);
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');
  const [hideFixedExpenses, setHideFixedExpenses] = useState(false); 
  const [dashboardCategory, setDashboardCategory] = useState('ALL');
  const [chartGroupBy, setChartGroupBy] = useState('monthly');
  const [topXLimit, setTopXLimit] = useState(7);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [showImportGuide, setShowImportGuide] = useState(false); // { items, format, rawText }
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PER_PAGE = 30;
  const [exportPeriod, setExportPeriod] = useState('ALL');
  const [exportFormat, setExportFormat] = useState('long'); // ใช้เก็บช่วงเวลาตอน Export
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [addForm, setAddForm] = useState({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      paymentMethodId: ''
  });

  const fileInputRef = useRef(null);

  // Toggle Dark Mode Effects
  useEffect(() => {
      localStorage.setItem('expense_dark_mode', isDarkMode);
      defaults.color = isDarkMode ? '#94a3b8' : '#475569';
      defaults.scale.grid.color = isDarkMode ? '#334155' : '#e2e8f0';
  }, [isDarkMode]);

  // ล้างเฉพาะตัวกรองวันที่ เมื่อเปลี่ยนเดือน (ตัวกรองอื่นยังคงอยู่เพื่อให้เช็คข้อมูลข้ามเดือนได้)
  useEffect(() => {
      setAdvancedFilterDate('ALL');
  }, [filterPeriod]);

// --- DATA LOADING & SAVING ---
  const loadData = async () => {
    // ฟังก์ชันช่วยเรียงลำดับวันที่
    const sortTransactions = (dataArr) => {
        return [...dataArr].sort((a, b) => {
            const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
            if (dateDiff !== 0) return dateDiff;
            return String(a.id).localeCompare(String(b.id));
        });
    };

    // โหลดข้อมูลจาก Database (Transactions, Calendar Days, Settings)
    try {
      // โหลดรายการบัญชี
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Network error transactions");
      const data = await res.json();
      setTransactions(sortTransactions(data));
      setDbStatus('Online (SQLite3)');

      // โหลดชนิดวันบนปฏิทิน
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

      // โหลดการตั้งค่าระบบ (Categories & DayType Config)
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
                  setCategories(parsed);
              }
              if (dbSettings[DAY_TYPE_CONFIG_KEY]) {
                  setDayTypeConfig(dbSettings[DAY_TYPE_CONFIG_KEY]);
              }
              
              // 🌟 [เพิ่มใหม่] โหลดข้อมูลกระเป๋าเงิน (ถ้าไม่มีให้ใช้ค่าเริ่มต้น)
              if (dbSettings['payment_methods_config']) {
                  setPaymentMethods(dbSettings['payment_methods_config']);
              } else {
                  setPaymentMethods([
                      { id: 'pm_scb', name: 'SCB (ใช้จ่าย)', type: 'bank', color: '#8B5CF6' },
                      { id: 'pm_cash', name: 'เงินสด', type: 'cash', color: '#10B981' },
                      { id: 'pm_credit', name: 'บัตรเครดิต', type: 'credit', color: '#3B82F6' }
                  ]);
              }
          }
      } catch (setErr) {
          console.error("Failed to load settings from DB:", setErr);
      }

    } catch (err) {
      // Fallback: ถ้า Database ล่ม แสดง offline
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

// wrapper เพราะต้องส่ง transactions เข้าไปด้วย
const handleCategoryChange = (catId, field, value) =>
  _handleCategoryChange(catId, field, value, transactions);
const handleDeleteCategory = (id) =>
  _handleDeleteCategory(id, transactions);
  // ฟังก์ชันใหม่สำหรับจัดการเซฟชนิดวัน (รวบยอดทั้ง State, LocalStorage และ DB)
  const handleUpdateDayTypeConfig = (newConfig) => {
      setDayTypeConfig(newConfig);
      saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };
  // 🌟 [เพิ่มใหม่] ฟังก์ชันสำหรับบันทึกกระเป๋าเงิน
  const handleUpdatePaymentMethods = (newMethods) => {
      setPaymentMethods(newMethods);
      saveSettingToDb('payment_methods_config', newMethods);
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

        // 🌟 Helper สำหรับหากระเป๋าเงินตอน Import
        const getPaymentMethodId = (pmName) => {
            if (!pmName || pmName.trim() === '') return null;
            const found = paymentMethods.find(p => p.name.toLowerCase() === pmName.trim().toLowerCase());
            return found ? found.id : null;
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
        // 🌟 หา Index ของคอลัมน์กระเป๋าเงิน (ถ้ามี)
        const pmColIndex = headers.findIndex(h => h === 'กระเป๋าเงิน' || h === 'Wallet' || h === 'ช่องทางชำระ');
        const excludeCategories = ['date', 'วันที่', 'notes', 'หมายเหตุ', 'รวม', 'total', 'กระเป๋าเงิน', 'wallet', 'ช่องทางชำระ'];
        const isCsvLong = headers.length >= 4 && (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน');

        for (let i = 1; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            if (row.length < 2) continue;
            const dateStr = row[dateColIndex];
            if(!dateStr || !dateStr.includes('/')) continue;

            if (isCsvLong) {
                let catName, desc, amtStr, typeStr = 'รายจ่าย', pmId = null;
                
                // 🌟 ดึงข้อมูลกระเป๋าถ้าหาคอลัมน์เจอ
                if (pmColIndex !== -1 && row[pmColIndex]) {
                    pmId = getPaymentMethodId(row[pmColIndex]);
                }

                if (headers[1] === 'ชนิดวัน' && row.length >= 6) {
                     const typeId = getOrCreateDayType(row[1]);
                     if (typeId) newDayTypes[dateStr] = typeId;
                     typeStr = row[2]; catName = row[3]; 
                     
                     // ถ้ารูปแบบใหม่ที่มี 7 คอลัมน์ กระเป๋าจะอยู่ตำแหน่ง [4] และดันที่เหลือไป
                     if (pmColIndex === 4 && row.length >= 7) {
                         desc = row[5]; amtStr = row[6];
                     } else {
                         desc = row[4]; amtStr = row[5];
                     }
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
                        dayNote: '', paymentMethodId: pmId // 🌟 แนบกระเป๋าไปแสดงในพรีวิว
                    });
                }
                continue;
            }

            // รูปแบบ Wide format (ตาราง Excel วันละบรรทัด)
            const note = (row.length === headers.length) ? (row[noteColIndex] || '') : '';
            for (let j = 1; j < Math.min(row.length, headers.length); j++) {
                if (j === noteColIndex || j === pmColIndex) continue;
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
                    
                    let pmId = pmColIndex !== -1 && row[pmColIndex] ? getPaymentMethodId(row[pmColIndex]) : null;

                    newList.push({ 
                        id: `csv_${batchId}_${i}_${j}`, date: dateStr, category: finalCatName, 
                        description: description, amount: Math.abs(amount), 
                        dayNote: note, paymentMethodId: pmId 
                    });
                }
            }
        }

        if(newList.length > 0) {
            setImportPreview({ items: newList, updatedDayTypeConfig, updatedCategories, isConfigChanged, isCategoryChanged, newDayTypes });
            setPreviewPage(1);
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

  // ── ยืนยัน import หลังดู preview ──────────────────────────────────────
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

  const updatePreviewItem = (id, field, value) => {
      setImportPreview(prev => ({
          ...prev,
          items: prev.items.map(item =>
              item.id === id ? { ...item, [field]: value } : item
          )
      }));
  };

  const deletePreviewItem = (id) => {
      setImportPreview(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id)
      }));
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
      // ส่งเป็น array เพราะ API คาดหวัง array (ดูจาก submitBatch)
      await saveToDb([item]);
    } catch (err) {
      console.error("Failed to save transaction:", err);
      throw err; // ส่ง error กลับไปให้ DayDetailModal จัดการ
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
      if (window.confirm('🚨 อันตราย: ยืนยันการลบข้อมูล "ทั้งหมด" (รายการบัญชี และ ชนิดวันบนปฏิทิน)?\nการกระทำนี้ไม่สามารถกู้คืนได้!')) {
          setIsProcessing(true);
          try {
              const res = await fetch(RESET_API_URL, { method: 'DELETE' });
              if (!res.ok) throw new Error("Failed to reset database");
              
              setTransactions([]);
              setDayTypes({});
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);
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
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      }
      setAddForm(prev => ({
          ...prev, 
          date: formattedDate, 
          type: type, 
          category: categories.find(c => c.type === type)?.name || '',
          paymentMethodId: paymentMethods.length > 0 ? paymentMethods[0].id : ''
      }));
      setShowAddModal(true);
  };

// --- BATCH ADD SYSTEM ---
  const handleAddPending = () => {
      if(!addForm.amount || isNaN(addForm.amount) || Number(addForm.amount) <= 0) return alert('กรุณาใส่จำนวนเงินให้ถูกต้อง (มากกว่า 0)');
      if(!addForm.date) return alert('กรุณาเลือกวันที่');

      const [y, m, d] = addForm.date.split('-');
      const formattedDate = `${d}/${m}/${y}`;
      const targetCat = addForm.category || categories.find(c => c.type === addForm.type)?.name || 'อื่นๆ';
      const catObj = categories.find(c => c.name === targetCat);
      
      // 🌟 ดึงข้อมูลกระเป๋าที่เลือกมา
      const pmObj = paymentMethods.find(p => p.id === addForm.paymentMethodId) || paymentMethods[0];

      const newItem = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          date: formattedDate,
          category: targetCat,
          description: addForm.description || targetCat,
          amount: Number(addForm.amount),
          dayNote: '',
          paymentMethodId: pmObj ? pmObj.id : null, // 🌟 ส่ง ID ไปรอเซฟลง DB
          _catObj: catObj,
          _pmObj: pmObj, // 🌟 เก็บ Object ไว้ให้ UI แสดงป้ายสวยๆ
          _isInc: addForm.type === 'income'
      };

      setPendingItems([...pendingItems, newItem]);
      setAddForm(prev => ({ ...prev, description: '', amount: '' }));
  };

  const handleRemovePending = (tempId) => {
      setPendingItems(pendingItems.filter(item => item.id !== tempId));
  };

  const submitBatch = async () => {
      if (pendingItems.length === 0) return;
      setIsProcessing(true);
      try {
          const finalItems = pendingItems.map((item, idx) => ({
              id: `tx_${Date.now()}_${idx}`,
              date: item.date,
              category: item.category,
              description: item.description,
              amount: item.amount,
              dayNote: item.dayNote,
              paymentMethodId: item.paymentMethodId // 🌟 ส่ง ID ให้ Database
          }));

          await saveToDb(finalItems);
          setPendingItems([]);
          setShowAddModal(false);
          setShowToast(true); 
          setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
          console.error(err);
          alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAddFormKeyDown = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault(); 
          handleAddPending();
      }
  };
// --- Quick Suggestions สำหรับหน้า Batch Add ---
  const quickSuggestions = useMemo(() => {
      const typeTx = transactions.filter(t => {
          const c = categories.find(cat => cat.name === t.category);
          return c?.type === addForm.type;
      });

      const frequency = {};
      typeTx.forEach(t => {
          const key = `${t.category}|${t.description || t.category}|${t.amount}`;
          frequency[key] = (frequency[key] || 0) + 1;
      });

      return Object.keys(frequency)
          .map(key => ({ key, count: frequency[key] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map(item => {
              const [category, description, amount] = item.key.split('|');
              return { category, description, amount, count: item.count };
          });
  }, [transactions, categories, addForm.type]);

  const applyAddFormSuggestion = (sugg) => {
      setAddForm(prev => ({
          ...prev,
          category: sugg.category,
          description: sugg.description === sugg.category ? '' : sugg.description,
          amount: sugg.amount
      }));
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

 const analytics = useAnalytics({
  transactions,
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
    if (advancedFilterWallet !== 'ALL') {
        filtered = filtered.filter(t => t.paymentMethodId === advancedFilterWallet);
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

  const openExportModal = () => {
      setExportPeriod(filterPeriod); // ตั้งค่าเริ่มต้นให้ตรงกับหน้าที่ดูอยู่
      setShowExportModal(true);
  };

  const executeExport = () => {
    const dataToExport = transactions.filter(t => isDateInFilter(t.date, exportPeriod));
    if (dataToExport.length === 0) return alert("ไม่มีข้อมูลในช่วงเวลาที่เลือก");

    const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
    let csvContent = '';
    let filename = '';

    if (exportFormat === 'long') {
      // 🌟 เพิ่มหัวข้อคอลัมน์ "กระเป๋าเงิน"
      csvContent = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,กระเป๋าเงิน,รายละเอียด,จำนวนเงิน\n";
      dataToExport.forEach(item => {
        const [d, m, y] = item.date.split('/');
        const dayOfWeek = new Date(y, parseInt(m)-1, d).getDay();
        const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
        const currentTypeId = dayTypes[item.date] || defaultType;
        const typeConfig = dayTypeConfig.find(dt => dt.id === currentTypeId) || dayTypeConfig[0];
        const catObj = categories.find(c => c.name === item.category);
        const isInc = catObj?.type === 'income';
        const pmObj = paymentMethods.find(p => p.id === item.paymentMethodId);
        const pmName = pmObj ? pmObj.name : '';
        csvContent += `${item.date},${escapeCSV(typeConfig?.label || '')},${isInc ? 'รายรับ' : 'รายจ่าย'},${escapeCSV(item.category)},${escapeCSV(pmName)},${escapeCSV(item.description || '')},${item.amount}\n`;
      });
      filename = `Cashflow_Long_${exportPeriod.replace('/', '-')}.csv`;
    } else {
      const expCats = categories.filter(c => c.type === 'expense');
      const usedCatNames = [...new Set(dataToExport.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').map(t => t.category))];
      const orderedCats = expCats.filter(c => usedCatNames.includes(c.name)).map(c => c.name);
      csvContent = ['Date', ...orderedCats, 'รวม (Total)', 'Notes'].map(h => escapeCSV(h)).join(',') + '\n';
      const allDates = [...new Set(dataToExport.map(t => t.date))].sort((a, b) => {
        const [da,ma,ya] = a.split('/'); const [db,mb,yb] = b.split('/');
        return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
      });
      allDates.forEach(dateStr => {
        const dayTx = dataToExport.filter(t => t.date === dateStr);
        const notes = dayTx.filter(t => t.description && t.description !== t.category).map(t => t.description).join(', ');
        const rowValues = orderedCats.map(catName => {
          const total = dayTx.filter(t => t.category === catName).reduce((s,t) => s + (parseFloat(t.amount)||0), 0);
          return total > 0 ? `฿ ${total.toFixed(2)}` : '฿ -';
        });
        const dayTotal = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').reduce((s,t) => s + (parseFloat(t.amount)||0), 0);
        csvContent += [dateStr, ...rowValues, `฿ ${dayTotal.toFixed(2)}`, notes].map(v => escapeCSV(v)).join(',') + '\n';
      });
      filename = `Cashflow_Wide_${exportPeriod.replace('/', '-')}.csv`;
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setShowExportModal(false);
  };

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
                        // 🌟 [เพิ่มใหม่] ให้ Default เป็นกระเป๋าใบแรกที่ตั้งค่าไว้ (ถ้ามี)
                        paymentMethodId: paymentMethods.length > 0 ? paymentMethods[0].id : '' 
                    }));
                    setShowAddModal(true);
                }} className="text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95">
                  <CalendarPlus className="w-4 h-4" /> เพิ่มข้อมูลด่วน
                </button>
                <button onClick={openExportModal} className={`hidden md:flex text-sm font-bold flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm border active:scale-95 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/50' : 'bg-blue-50 text-[#00509E] border-blue-200 hover:bg-[#00509E] hover:text-white'}`}><Download className="w-4 h-4" /> ส่งออก CSV</button>
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
          {activeTab === 'calendar' && <CalendarView transactions={transactions} filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths} handleOpenAddModal={handleOpenAddModal} categories={categories} isDarkMode={isDarkMode} dayTypes={dayTypes} handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig} getFilterLabel={getFilterLabel} isReadOnlyView={isReadOnlyView} onSaveTransaction={handleSaveTransaction} handleDeleteTransaction={handleDeleteTransaction} paymentMethods={paymentMethods}/>}
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
            paymentMethods={paymentMethods}
            advancedFilterWallet={advancedFilterWallet}
            setAdvancedFilterWallet={setAdvancedFilterWallet}
          />}
          {activeTab === 'settings' && <SettingsView 
            categories={categories} 
            handleAddCategory={handleAddCategory} 
            handleCategoryChange={handleCategoryChange} 
            handleDeleteCategory={handleDeleteCategory} 
            handleMoveCategory={handleMoveCategory} 
            dayTypeConfig={dayTypeConfig}
            setDayTypeConfig={handleUpdateDayTypeConfig}
            paymentMethods={paymentMethods}
            setPaymentMethods={handleUpdatePaymentMethods}
            isDarkMode={isDarkMode} 
            handleDeleteAllData={handleDeleteAllData}
            saveSettingToDb={saveSettingToDb}
        />}
        </div>
      </div>

      {/* --- ADD TRANSACTION MODAL (STAGING AREA) --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 transition-all">
            {/* ขยายความกว้างเป็น max-w-6xl เพื่อรองรับ 3 คอลัมน์ */}
            <div className={`rounded-2xl shadow-2xl flex flex-col w-[96vw] max-w-[1300px] max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className={`p-5 border-b flex justify-between items-center shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><CalendarPlus className="w-6 h-6 text-emerald-600"/> สรุปค่าใช้จ่ายประจำวัน (Batch Add)</h3>
                    <button onClick={() => { setShowAddModal(false); setPendingItems([]); }} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-200'}`}><X className="w-5 h-5"/></button>
                </div>

                <div className={`flex-grow overflow-y-auto flex flex-col lg:flex-row custom-scrollbar transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                    
                    {/* คอลัมน์ 1: ฟอร์มกรอกข้อมูล (27%) */}
                    <div className={`w-full lg:w-[27%] p-6 border-b lg:border-b-0 lg:border-r space-y-4 shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                        <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <button onClick={() => setAddForm({...addForm, type: 'expense', category: categories.find(c=>c.type==='expense')?.name || ''})} className={`flex-1 py-2 font-bold text-sm rounded-md transition-all ${addForm.type === 'expense' ? (isDarkMode ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายจ่าย</button>
                            <button onClick={() => setAddForm({...addForm, type: 'income', category: categories.find(c=>c.type==='income')?.name || ''})} className={`flex-1 py-2 font-bold text-sm rounded-md transition-all ${addForm.type === 'income' ? (isDarkMode ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายรับ</button>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>วันที่ (Date)</label>
                            <input type="date" value={addForm.date} onChange={(e) => setAddForm({...addForm, date: e.target.value})} className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 font-medium transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 focus:border-[#00509E]'}`} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>หมวดหมู่ (Category)</label>
                            <select value={addForm.category} onChange={(e) => setAddForm({...addForm, category: e.target.value})} className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 font-bold transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 focus:border-[#00509E]'}`}>
                                <option value="" disabled>เลือกหมวดหมู่...</option>
                                {categories.filter(c => c.type === addForm.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รายละเอียด (Description)</label>
                            <input type="text" value={addForm.description} onChange={(e) => setAddForm({...addForm, description: e.target.value})} onKeyDown={handleAddFormKeyDown} placeholder="เช่น ค่าข้าวเที่ยง, รถไฟฟ้า" className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500' : 'border-slate-300 focus:border-[#00509E]'}`} />
                        </div>
                        {/* 🌟 [เพิ่มใหม่] UI ปุ่มเลือกกระเป๋าเงิน */}
                        <div className="pt-2">
                            <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>จ่ายจากกระเป๋าไหน? (Wallet)</label>
                            <div className="flex flex-wrap gap-2">
                                {paymentMethods.length === 0 ? (
                                    <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีกระเป๋าเงิน (ไปเพิ่มที่หน้าตั้งค่า)</span>
                                ) : (
                                    paymentMethods.map(pm => (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => setAddForm({...addForm, paymentMethodId: pm.id})}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                addForm.paymentMethodId === pm.id 
                                                ? (isDarkMode ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[#00509E] border-[#00509E] text-white shadow-md') 
                                                : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                                            }`}
                                        >
                                            {pm.type === 'credit' ? '💳' : (pm.type === 'cash' ? '💵' : '🏦')} {pm.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        {/* --- จบส่วน UI เลือกกระเป๋า --- */}
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>จำนวนเงิน (Amount)</label>
                            <input type="number" value={addForm.amount} onChange={(e) => setAddForm({...addForm, amount: e.target.value})} onKeyDown={handleAddFormKeyDown} placeholder="0.00" className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 font-black text-xl text-right transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400 focus:border-blue-500 focus:ring-blue-500' : 'border-slate-300 focus:border-[#00509E] text-[#00509E]'}`} />
                        </div>
                        <button onClick={handleAddPending} className={`w-full mt-2 px-4 py-3 border rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-[#00509E] border-slate-300'}`}>
                            <PlusCircle className="w-5 h-5"/> เพิ่มลงตะกร้า (Enter)
                        </button>
                    </div>

                    {/* คอลัมน์ 2: Quick Suggestions (27%) */}
                    <div className={`w-full lg:w-[27%] p-6 border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/> 
                                    รายการที่ใช้บ่อย
                                </h4>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>คลิกเพื่อดึงข้อมูลลงฟอร์ม</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {quickSuggestions.length === 0 ? (
                               <p className={`text-sm text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีข้อมูล</p>
                            ) : (
                              quickSuggestions.map((s, idx) => {
                                const catObj = categories.find(c => c.name === s.category);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => applyAddFormSuggestion(s)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 text-left group ${
                                      isDarkMode
                                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[#00509E]/30 shadow-sm hover:shadow'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" 
                                        style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})` }}
                                      >
                                        {catObj?.icon}
                                      </div>
                                      <div className="overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {s.description}
                                            </p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-[#00509E]'}`}>
                                            {s.count} ครั้ง
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {s.category}
                                        </p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-black shrink-0 ${addForm.type === 'expense' ? (isDarkMode ? 'text-red-400' : 'text-[#D81A21]') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                      {s.amount} ฿
                                    </span>
                                  </button>
                                );
                              })
                            )}
                        </div>
                    </div>

                    {/* คอลัมน์ 3: ตะกร้าที่รอการบันทึก (46%) */}
                    <div className={`w-full lg:w-[46%] flex flex-col p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><ClipboardList className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}/> รายการที่รอการบันทึก</h4>
                            <span className={`text-white px-2.5 py-0.5 rounded-full text-xs font-bold ${isDarkMode ? 'bg-blue-600' : 'bg-[#00509E]'}`}>{pendingItems.length} รายการ</span>
                        </div>
                        <div className={`flex-grow overflow-y-auto custom-scrollbar border rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            {pendingItems.length === 0 ? (
                                <div className={`h-full min-h-[250px] flex flex-col items-center justify-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <Inbox className={`w-12 h-12 mb-3 ${isDarkMode ? 'opacity-20' : 'opacity-30'}`} />
                                    <p className="text-sm font-medium">ยังไม่มีรายการในตะกร้า</p>
                                    <p className="text-xs mt-1">กรอกข้อมูลด้านซ้ายแล้วกด "เพิ่มลงตะกร้า"</p>
                                </div>
                            ) : (
                                <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {pendingItems.map((item, idx) => {
                                        return (
                                            <div key={item.id} className={`flex items-center justify-between p-3 transition-colors group animate-in fade-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                                {/* 🌟 โครงสร้างรายการ 1 บรรทัด */}
                                                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                                    <div className={`text-xs font-bold w-5 text-right shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>{idx+1}.</div>
                                                    
                                                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                                        <div className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={item.description}>{item.description}</div>
                                                        
                                                        {/* 🌟 แถวของป้าย (Badge) บังคับให้อยู่บรรทัดเดียว (overflow-hidden) */}
                                                        <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden w-full">
                                                            {/* 1. ป้ายรายรับ/รายจ่าย (ไม่ย่อ) */}
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0 ${item._isInc ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                                                {item._isInc ? 'รายรับ' : 'รายจ่าย'}
                                                            </span>
                                                            
                                                            {/* 2. ป้ายหมวดหมู่ (ถ้ายาวไปให้ใส่ ... แทน) */}
                                                            <span 
                                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink min-w-0 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                                                                style={{ backgroundColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.4 : 0.3})` }}
                                                            >
                                                                <span className="shrink-0">{item._catObj?.icon}</span>
                                                                <span className="truncate">{item.category}</span>
                                                            </span>

                                                            {/* 3. ป้ายกระเป๋าเงิน (ถ้ายาวไปให้ใส่ ... แทน) */}
                                                            {item._pmObj && (
                                                                <span 
                                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink min-w-0 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                                                                    style={{ backgroundColor: `rgba(${hexToRgb(item._pmObj.color || '#3B82F6')}, ${isDarkMode ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._pmObj.color || '#3B82F6')}, ${isDarkMode ? 0.4 : 0.3})` }}
                                                                >
                                                                    <span className="shrink-0">{item._pmObj.type === 'credit' ? '💳' : (item._pmObj.type === 'cash' ? '💵' : '🏦')}</span>
                                                                    <span className="truncate">{item._pmObj.name}</span>
                                                                </span>
                                                            )}

                                                            {/* 4. วันที่ */}
                                                            <span className={`text-[10px] font-medium hidden sm:inline shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                                {item.date}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 pl-2 shrink-0">
                                                    <span className={`font-black text-base whitespace-nowrap ${item._isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-[#D81A21]')}`}>{formatMoney(item.amount)} ฿</span>
                                                    <button onClick={() => handleRemovePending(item.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-600/80' : 'text-slate-300 hover:text-white hover:bg-red-500'}`} title="ลบออกจากตะกร้า"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`p-5 border-t flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ยอดรวมในตะกร้า:</span>
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>
                            <AnimatedNumber value={pendingItems.reduce((acc, curr) => acc + (curr._isInc ? curr.amount : -curr.amount), 0)} /> ฿
                        </span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => { setShowAddModal(false); setPendingItems([]); }} className={`flex-1 sm:flex-none px-5 py-3 border rounded-xl font-bold transition-all active:scale-95 ${isDarkMode ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700' : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-100'}`}>ทิ้งข้อมูล</button>
                        <button onClick={submitBatch} disabled={pendingItems.length === 0 || isProcessing} className={`flex-1 sm:flex-none px-6 py-3 disabled:opacity-50 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-md transition-all active:scale-95 ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            {isProcessing ? <Zap className="w-5 h-5 animate-pulse"/> : <CheckCircle className="w-5 h-5"/>} 
                            {isProcessing ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลง DB'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- IMPORT PREVIEW MODAL --- */}
      {importPreview && (() => {
        const allItems = importPreview.items;
        // Group by date for pagination — don't split a day across pages
        const dateGroups = [];
        allItems.forEach(item => {
          const last = dateGroups[dateGroups.length - 1];
          if (!last || last[0].date !== item.date) dateGroups.push([item]);
          else last.push(item);
        });
        // Pack groups into pages of ~PREVIEW_PER_PAGE items
        const pages = [[]];
        dateGroups.forEach(group => {
          const cur = pages[pages.length - 1];
          const curCount = cur.reduce((s, g) => s + g.length, 0);
          if (curCount > 0 && curCount + group.length > PREVIEW_PER_PAGE) pages.push([group]);
          else cur.push(group);
        });
        const totalPages = pages.length || 1;
        const pageGroups = pages[previewPage - 1] || [];
        const pageItems = pageGroups.flat();
        const allCats = importPreview.updatedCategories || categories;
        return (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ maxHeight: 'calc(100vh - 48px)' }}>

              {/* Header */}
              <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>📋 ตรวจสอบก่อน Import</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      พบ <strong className={isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}>{allItems.length} รายการ</strong>
                    </span>
                    {importPreview.isCategoryChanged && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">จะสร้างหมวดหมู่ใหม่</span>}
                    <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>แก้ไขได้ก่อน import</span>
                  </div>
                </div>
                <button onClick={() => setImportPreview(null)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
              </div>

              {/* Table header */}
              <div className={`grid grid-cols-[55px_120px_100px_1fr_80px_36px] gap-2 px-4 py-2 text-[11px] font-bold border-b shrink-0 ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <span>ประเภท</span><span>หมวดหมู่</span><span>กระเป๋าเงิน</span><span>รายละเอียด</span><span className="text-right">จำนวนเงิน</span><span/>
              </div>

              {/* Rows — grouped by date */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {pageItems.map((item, idx) => {
                  const catObj = allCats.find(c => c.name === item.category);
                  const isInc = catObj?.type === 'income';
                  const isNewDate = idx === 0 || item.date !== pageItems[idx - 1].date;
                  const inputCls = `w-full bg-transparent outline-none text-xs px-1.5 py-1 rounded border focus:ring-1 transition-colors ${isDarkMode ? 'border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500 hover:bg-slate-800' : 'border-slate-200 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E] hover:bg-slate-100'}`;
                  return (
                    <div key={item.id}>
                      {isNewDate && (
                        <div className={`px-4 py-1.5 text-xs font-black sticky top-0 z-10 border-b ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {item.date}
                        </div>
                      )}
                      {/* 🌟 ปรับขนาดช่องให้ตรงกับ Header */}
                      <div className={`grid grid-cols-[55px_120px_100px_1fr_80px_36px] gap-2 px-4 py-1.5 items-center border-b transition-colors ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                        {/* Type badge */}
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center truncate ${isInc ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                          {isInc ? 'รายรับ' : 'รายจ่าย'}
                        </span>
                        {/* Category */}
                        <select
                          value={item.category}
                          onChange={e => updatePreviewItem(item.id, 'category', e.target.value)}
                          className={`text-[11px] font-bold py-1 px-1 rounded border outline-none cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                        >
                          {allCats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                        </select>
                        
                        {/* 🌟 Wallet (กระเป๋าเงิน) */}
                        <select
                          value={item.paymentMethodId || ''}
                          onChange={e => updatePreviewItem(item.id, 'paymentMethodId', e.target.value)}
                          className={`text-[10px] font-bold py-1 px-1 rounded border outline-none cursor-pointer transition-colors ${item.paymentMethodId ? (isDarkMode ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-[#00509E]') : (isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-white border-slate-200 text-slate-400')}`}
                        >
                          <option value="" disabled>👛 กระเป๋า...</option>
                          {paymentMethods?.map(pm => <option key={pm.id} value={pm.id}>{pm.type === 'credit' ? '💳' : (pm.type === 'cash' ? '💵' : '🏦')} {pm.name}</option>)}
                        </select>

                        {/* Description */}
                        <input type="text" value={item.description} onChange={e => updatePreviewItem(item.id, 'description', e.target.value)} className={inputCls} />
                        {/* Amount */}
                        <input type="number" value={item.amount} onChange={e => updatePreviewItem(item.id, 'amount', parseFloat(e.target.value) || 0)} className={`${inputCls} text-right font-bold`} />
                        {/* Delete */}
                        <button onClick={() => deletePreviewItem(item.id)} className={`p-1 rounded transition-colors ${isDarkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}>
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination + Footer */}
              <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                {/* Pagination */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewPage(p => Math.max(1, p-1))} disabled={previewPage === 1} className={`p-1.5 rounded-lg border disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4"/></button>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>หน้า {previewPage}/{totalPages} ({allItems.length} รายการ)</span>
                  <button onClick={() => setPreviewPage(p => Math.min(totalPages, p+1))} disabled={previewPage === totalPages} className={`p-1.5 rounded-lg border disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4"/></button>
                </div>
                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setImportPreview(null)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold border transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>ยกเลิก</button>
                  <button onClick={confirmImport} disabled={isProcessing || allItems.length === 0} className="flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Zap className="w-4 h-4 animate-pulse"/> : <CheckCircle className="w-4 h-4"/>}
                    {isProcessing ? 'กำลัง Import...' : `Import ${allItems.length} รายการ`}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- IMPORT GUIDE MODAL --- */}
      {showImportGuide && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ maxHeight: 'calc(100vh - 48px)' }}>

            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  📖 คู่มือการ Import CSV
                </h3>
                <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รองรับ 2 รูปแบบ — ระบบจะตรวจจับอัตโนมัติ</p>
              </div>
              <button onClick={() => setShowImportGuide(false)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">

              {/* Format 1 */}
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`px-4 py-3 flex items-center gap-2 ${isDarkMode ? 'bg-emerald-900/20 border-b border-emerald-900/40' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                  <span className="text-base">📊</span>
                  <div>
                    <p className={`font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Format 1 — Excel Wide Format (ตารางรายวัน)</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>สำหรับคนที่บันทึกค่าใช้จ่ายใน Excel แบบแยกคอลัมน์</p>
                  </div>
                </div>
                <div className={`p-4 space-y-3 ${isDarkMode ? 'bg-slate-800/30' : 'bg-white'}`}>
                  <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างไฟล์:</div>
                  <div className="overflow-x-auto">
                    <table className={`text-xs w-full border-collapse rounded-lg overflow-hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}>
                          {['วันที่','ข้าวเที่ยง','ข้าวเย็น','ของใช้','ซื้อของออนไลน์','อื่นๆ','รวม','Notes'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-bold border-b border-r last:border-r-0" style={{borderColor: isDarkMode ? '#334155' : '#e2e8f0'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['01/02/2026','฿25','฿40','฿0','฿0','฿0','฿65',''],
                          ['02/02/2026','฿23','฿0','฿150','฿299','฿750','฿1,222','Shopee + Gemini'],
                        ].map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? (isDarkMode ? 'bg-slate-800/60' : 'bg-white') : (isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1.5 border-b border-r last:border-r-0 font-mono" style={{borderColor: isDarkMode ? '#1e293b' : '#f1f5f9'}}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <p>✅ ระบบจะ <strong>auto-map ชื่อคอลัมน์ → หมวดหมู่</strong> อัตโนมัติ เช่น "ข้าวเที่ยง" → อาหารและเครื่องดื่ม</p>
                    <p>✅ คอลัมน์ <strong>รวม, Notes, วันที่</strong> จะถูกข้ามอัตโนมัติ</p>
                    <p>✅ Notes จะเป็น description เฉพาะหมวด <strong>ช้อปปิ้งออนไลน์</strong> และ <strong>อื่นๆ</strong></p>
                    <p>✅ รองรับทั้ง <strong>.csv ที่ export จาก Excel</strong> โดยตรง</p>
                  </div>
                </div>
              </div>

              {/* Format 2 */}
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`px-4 py-3 flex items-center gap-2 ${isDarkMode ? 'bg-blue-900/20 border-b border-blue-900/40' : 'bg-blue-50 border-b border-blue-200'}`}>
                  <span className="text-base">🗂️</span>
                  <div>
                    <p className={`font-black text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>Format 2 — System Export (Long Format)</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>สำหรับไฟล์ที่ Export จากระบบนี้ หรือสร้างเอง</p>
                  </div>
                </div>
                <div className={`p-4 space-y-3 ${isDarkMode ? 'bg-slate-800/30' : 'bg-white'}`}>
                  <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างไฟล์:</div>
                  <div className="overflow-x-auto">
                    <table className={`text-xs w-full border-collapse rounded-lg overflow-hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}>
                          {['วันที่','ชนิดวัน','ประเภท','หมวดหมู่','กระเป๋าเงิน','รายละเอียด','จำนวนเงิน'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-bold border-b border-r last:border-r-0" style={{borderColor: isDarkMode ? '#334155' : '#e2e8f0'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['01/02/2026','วันหยุด','รายจ่าย','อาหารและเครื่องดื่ม','เงินสด','ข้าวเที่ยง','25'],
                          ['01/02/2026','วันหยุด','รายจ่าย','ช้อปปิ้งออนไลน์','บัตรเครดิต','Shopee','299'],
                          ['02/02/2026','ทำงาน','รายรับ','เงินเดือน','KBANK','เงินเดือนเดือน ก.พ.','25000'],
                        ].map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? (isDarkMode ? 'bg-slate-800/60' : 'bg-white') : (isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                            {row.map((cell, j) => (
                              <td key={j} className={`px-2 py-1.5 border-b border-r last:border-r-0 font-mono ${j === 4 ? (isDarkMode ? 'text-blue-400 font-bold' : 'text-[#00509E] font-bold') : ''}`} style={{borderColor: isDarkMode ? '#1e293b' : '#f1f5f9'}}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <p>✅ <strong>หมวดหมู่ตรงกับระบบ</strong> → import ตรงๆ ไม่ต้อง auto-map</p>
                    <p>✅ ถ้าหมวดหมู่ไม่มีในระบบ → <strong>สร้างให้อัตโนมัติ</strong></p>
                    <p>✅ ชนิดวัน (ทำงาน/วันหยุด) จะ<strong>ซิงค์กับปฏิทิน</strong>ด้วย</p>
                    <p>✅ รองรับทั้ง <strong>รายรับ และ รายจ่าย</strong> ในไฟล์เดียวกัน</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className={`rounded-xl p-4 border text-xs space-y-1.5 ${isDarkMode ? 'bg-amber-900/10 border-amber-900/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <p className="font-black text-sm mb-2">💡 เคล็ดลับ</p>
                <p>• ระบบ<strong>ตรวจจับ format อัตโนมัติ</strong> ไม่ต้องเลือกเอง</p>
                <p>• หลัง upload จะมี<strong>หน้า Preview</strong> ให้ตรวจสอบและแก้ไขก่อน import จริง</p>
                <p>• ไฟล์ขนาดใหญ่ 900+ รายการรองรับได้ แบ่งหน้าให้อัตโนมัติ</p>
                <p>• encoding ไฟล์ควรเป็น <strong>UTF-8</strong> หรือ <strong>UTF-8 with BOM</strong></p>
              </div>

            </div>

            <div className={`px-6 py-4 border-t shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <button
                  onClick={() => {
                    // 🌟 Long Format sample — อัปเดตคอลัมน์ กระเป๋าเงิน
                    const sample = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,กระเป๋าเงิน,รายละเอียด,จำนวนเงิน\n" +
                      // รายรับ
                      "01/03/2026,ทำงาน,รายรับ,เงินเดือน,KBANK,เงินเดือนประจำเดือนมีนาคม,25000\n" +
                      // รายจ่ายปกติ
                      "01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,เงินสด,ข้าวเที่ยง,65\n" +
                      "01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,SCB,กาแฟ,45\n" +
                      // description ว่าง (ใช้ชื่อ category แทน)
                      "01/03/2026,ทำงาน,รายจ่าย,การเดินทาง,บัตรเครดิต,,89\n" +
                      // description มี comma (ต้องครอบด้วย quotes)
                      "02/03/2026,วันหยุด,รายจ่าย,อาหารและเครื่องดื่ม,เงินสด,\"ข้าว, น้ำ, ขนม\",150\n" +
                      // จำนวนเงินแบบมี comma
                      "02/03/2026,วันหยุด,รายจ่าย,ช้อปปิ้งออนไลน์,SPayLater,Shopee ลดราคา,\"1,350\"\n" +
                      // หมวดหมู่ที่ไม่มีในระบบ — จะสร้างใหม่อัตโนมัติ
                      "02/03/2026,วันหยุด,รายจ่าย,ของฝาก,KBANK,ของฝากเพื่อน,280\n" +
                      // วันหยุด ไม่มีชนิดวัน
                      "03/03/2026,,รายจ่าย,อาหารและเครื่องดื่ม,เงินสด,ข้าวเช้า,55\n" +
                      // รายรับพิเศษ
                      "03/03/2026,ทำงาน,รายรับ,รายรับพิเศษ/โบนัส,KBANK,โบนัสพิเศษ,5000\n";
                    const blob = new Blob(["\ufeff" + sample], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = 'sample_long_format.csv';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }}
                  className={`py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-[#00509E] border border-blue-200'}`}
                >
                  📋 ตัวอย่าง Long
                </button>
                <button
                  onClick={() => {
                    // Wide Format sample — ครอบคลุมทุกกรณี
                    const sample = '"Date","อาหารและเครื่องดื่ม","ช้อปปิ้งออนไลน์","การเดินทาง","ที่อยู่อาศัยและของใช้","อื่นๆ","รวม (Total)","Notes"\n' +
                      // วันปกติ มีหลาย category
                      '"01/03/2026","฿ 110.00","฿ -","฿ 89.00","฿ -","฿ -","฿ 199.00",""\n' +
                      // Notes มี comma ต้องครอบ quotes
                      '"02/03/2026","฿ 120.00","฿ 350.00","฿ -","฿ -","฿ -","฿ 470.00","Shopee ลดราคา, จ่ายค่าส่งด้วย"\n' +
                      // วันที่ไม่มีรายจ่ายเลย
                      '"03/03/2026","฿ -","฿ -","฿ -","฿ -","฿ -","฿ -",""\n' +
                      // category เดียวหลายรายการ รวมยอดไว้แล้ว
                      '"04/03/2026","฿ 235.00","฿ -","฿ -","฿ -","฿ -","฿ 235.00","ข้าวเช้า+เที่ยง+เย็น"\n' +
                      // Notes ไม่มี description ก็ว่างได้
                      '"05/03/2026","฿ -","฿ 1350.00","฿ -","฿ 450.00","฿ -","฿ 1800.00",""\n' +
                      // อื่นๆ พร้อม Notes อธิบาย
                      '"06/03/2026","฿ 80.00","฿ -","฿ -","฿ -","฿ 200.00","฿ 280.00","ค่ายา"\n';
                    const blob = new Blob(["﻿" + sample], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = 'sample_wide_format.csv';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }}
                  className={`py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                >
                  📊 ตัวอย่าง Wide
                </button>
              </div>
              <button onClick={() => setShowImportGuide(false)} className={`w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

{/* --- EXPORT MODAL --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* 1. ขยายขนาด Modal จาก max-w-md เป็น max-w-3xl */}
            <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-3xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><Download className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> ส่งออกไฟล์ CSV</h3>
                    <button onClick={() => setShowExportModal(false)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
                </div>
                
                {/* --- 2 คอลัมน์ที่ปรับสมดุล (Balanced Layout) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  
                  {/* กล่องซ้าย: เลือกรอบบิล */}
                  <div className={`border rounded-xl p-5 flex flex-col h-full shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                      <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>เลือกรอบบิลที่ต้องการส่งออก</label>
                      <PeriodPicker
                        filterPeriod={exportPeriod}
                        setFilterPeriod={setExportPeriod}
                        groupedOptions={groupedOptions}
                        isDarkMode={isDarkMode}
                      />
                      {/* เพิ่มข้อความ Hint ช่วยเติมเต็มพื้นที่ว่างให้สมดุลกับฝั่งขวา */}
                      <p className={`text-[11px] mt-3 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        *แนะนำให้ส่งออกแบบ <strong className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>รายเดือน</strong> เพื่อให้ตาราง Wide Format แยกยอดรายวันได้อย่างสมบูรณ์
                      </p>
                      
                      <div className={`mt-auto pt-5 flex gap-3 items-start text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#00509E]'}`}>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <p>
                          ระบบจะดึงข้อมูล <span className={isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'}>รายรับ</span> และ <span className={isDarkMode ? 'text-red-400 font-bold' : 'text-red-600 font-bold'}>รายจ่าย</span> ใน 
                          <span className={`font-bold ml-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {getFilterLabel(exportPeriod)}
                          </span> มาสร้างเป็นไฟล์ CSV เพื่อนำไปวิเคราะห์ต่อได้ทันที
                        </p>
                      </div>
                  </div>

                  {/* กล่องขวา: รูปแบบไฟล์ */}
                  <div className={`border rounded-xl p-5 flex flex-col h-full shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                    <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>รูปแบบไฟล์</label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* เปลี่ยน Emoji เป็น Icon จริง */}
                      <button onClick={() => setExportFormat('long')} className={`flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${exportFormat === 'long' ? (isDarkMode ? 'border-blue-500 bg-blue-900/20 shadow-inner' : 'border-[#00509E] bg-blue-50/50 shadow-inner') : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`}>
                        <span className={`text-sm font-black mb-1.5 flex items-center gap-1.5 ${exportFormat === 'long' ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                          <ClipboardList className="w-4 h-4"/> Long Format
                        </span>
                        <span className={`text-[11px] leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 รายการ<br/>(เหมาะสำหรับ Import กลับ)</span>
                      </button>
                      <button onClick={() => setExportFormat('wide')} className={`flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${exportFormat === 'wide' ? (isDarkMode ? 'border-blue-500 bg-blue-900/20 shadow-inner' : 'border-[#00509E] bg-blue-50/50 shadow-inner') : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`}>
                        <span className={`text-sm font-black mb-1.5 flex items-center gap-1.5 ${exportFormat === 'wide' ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                          <FileSpreadsheet className="w-4 h-4"/> Wide Format
                        </span>
                        <span className={`text-[11px] leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 วัน<br/>(เหมาะสำหรับอ่านใน Excel)</span>
                      </button>
                    </div>
                    
                    <div className={`mt-auto pt-5 flex gap-3 items-start text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <p>
                          ไฟล์ที่ส่งออกรองรับ <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ภาษาไทย 100%</span> สามารถนำไปเปิดในโปรแกรม Excel หรือ Google Sheets ได้โดยสระและตัวอักษรไม่เพี้ยน
                        </p>
                    </div>
                  </div>

                </div>

                {/* 🌟 แสดงตัวอย่างข้อมูล (Preview Table) เต็มความกว้าง 🌟 */}
                <div className={`mb-6 border rounded-lg overflow-hidden transition-all duration-300 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className={`px-4 py-2.5 text-sm font-bold border-b flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    👀 ตัวอย่างหน้าตาไฟล์ที่จะได้ ({exportFormat === 'long' ? 'Long Format' : 'Wide Format'})
                  </div>
                  <div className={`overflow-x-auto custom-scrollbar p-0 ${isDarkMode ? 'bg-slate-900/40' : 'bg-white'}`}>
                    {exportFormat === 'long' ? (
                      <table className={`w-full text-xs text-left whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <thead className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                          <tr>
                            <th className="px-4 py-3 font-bold">วันที่</th>
                            <th className="px-4 py-3 font-bold">ชนิดวัน</th>
                            <th className="px-4 py-3 font-bold">ประเภท</th>
                            <th className="px-4 py-3 font-bold">หมวดหมู่</th>
                            <th className="px-4 py-3 font-bold text-blue-500">กระเป๋าเงิน</th>
                            <th className="px-4 py-3 font-bold">รายละเอียด</th>
                            <th className="px-4 py-3 font-bold text-right">จำนวนเงิน</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                          <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5">ทำงาน</td><td className="px-4 py-2.5">รายจ่าย</td><td className="px-4 py-2.5">อาหารและเครื่องดื่ม</td><td className="px-4 py-2.5 text-blue-500 font-bold">SCB</td><td className="px-4 py-2.5">ข้าวเที่ยง</td><td className="px-4 py-2.5 text-right font-mono font-bold">65</td></tr>
                          <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5">ทำงาน</td><td className="px-4 py-2.5">รายจ่าย</td><td className="px-4 py-2.5">การเดินทาง</td><td className="px-4 py-2.5 text-blue-500 font-bold">บัตรเครดิต</td><td className="px-4 py-2.5">รถไฟฟ้า</td><td className="px-4 py-2.5 text-right font-mono font-bold">45</td></tr>
                          <tr><td className="px-4 py-2.5">02/03/2026</td><td className="px-4 py-2.5">วันหยุด</td><td className="px-4 py-2.5 text-emerald-500 font-bold">รายรับ</td><td className="px-4 py-2.5">รายรับพิเศษ/โบนัส</td><td className="px-4 py-2.5 text-blue-500 font-bold">KBANK</td><td className="px-4 py-2.5">ขายของ</td><td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-500">500</td></tr>
                        </tbody>
                      </table>
                    ) : (
                      <table className={`w-full text-xs text-left whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <thead className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                          <tr>
                            <th className="px-4 py-3 font-bold">Date</th>
                            <th className="px-4 py-3 font-bold text-right">อาหารและเครื่องดื่ม</th>
                            <th className="px-4 py-3 font-bold text-right">ช้อปปิ้งออนไลน์</th>
                            <th className="px-4 py-3 font-bold text-right">รวม (Total)</th>
                            <th className="px-4 py-3 font-bold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                          <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5 text-right font-mono font-bold">฿ 110.00</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ 110.00</td><td className="px-4 py-2.5 text-slate-400"></td></tr>
                          <tr><td className="px-4 py-2.5">02/03/2026</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-bold">฿ 299.00</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ 299.00</td><td className="px-4 py-2.5">Shopee</td></tr>
                          <tr><td className="px-4 py-2.5">03/03/2026</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ -</td><td className="px-4 py-2.5 text-slate-400"></td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowExportModal(false)} className={`px-4 py-2.5 rounded-lg font-bold transition-all active:scale-95 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>ยกเลิก</button>
                    <button onClick={executeExport} className={`px-5 py-2.5 text-white rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#00509E] hover:bg-[#003d7a]'}`}><FileSpreadsheet className="w-4 h-4"/> ดาวน์โหลด CSV</button>
                </div>
            </div>
        </div>
      )}

      {/* --- TOAST --- */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 z-50 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'} ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800'}`}>
          <CheckCircle className="w-6 h-6 text-green-400" />
          <span className="font-medium text-base">ทำรายการสำเร็จ!</span>
      </div>
    </div>
  );
}