import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Crosshair, UploadCloud, BarChart3, ClipboardList, 
  Wallet, Calculator, PieChart, CalendarClock, TrendingUp, 
  Donut, Download, CheckCircle, PlusCircle, Pencil, Trash2, Inbox,
  ArrowUpRight, ArrowDownRight, CalendarDays, Database, FileSpreadsheet, AlertCircle, Settings,
  Coffee, ShieldCheck, Scale, Activity, Home, Flame, Filter, X, Search, Coins, PiggyBank, CalendarPlus, Zap,
  Moon, Sun, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Calendar as CalendarIcon
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, defaults, LineController, BarController
} from 'chart.js';
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler);
defaults.font.family = 'Tahoma, sans-serif';

// ==========================================
// 1. CONSTANTS & CONFIGURATIONS
// ==========================================
const API_URL = 'http://localhost:3000/api/transactions';
const LOCAL_FALLBACK_KEY = 'expense_local_fallback_v2';
const CATEGORIES_KEY = 'expense_custom_categories_v2';
const DAY_TYPES_KEY = 'expense_day_types';
const DAY_TYPE_CONFIG_KEY = 'expense_day_type_config';

const OLD_PALETTE_MAP = {
  'slate': '#64748B', 'red': '#EF4444', 'orange': '#F97316', 'amber': '#F59E0B',
  'green': '#10B981', 'teal': '#14B8A6', 'blue': '#3B82F6', 'indigo': '#6366F1',
  'purple': '#8B5CF6', 'pink': '#EC4899', 'rose': '#F43F5E', 'gundam-blue': '#00509E',
  'gundam-red': '#D81A21', 'gundam-gold': '#F4B800', 'income-green': '#059669'
};

const DEFAULT_CATEGORIES = [
  { id: 'inc1', name: "เงินเดือน", icon: "💰", color: '#059669', type: 'income', cashflowGroup: 'salary' },
  { id: 'inc2', name: "รายรับพิเศษ/โบนัส", icon: "🎁", color: '#10B981', type: 'income', cashflowGroup: 'bonus' },
  { id: 'c1', name: "อาหารและเครื่องดื่ม", icon: "🍜", color: '#F97316', type: 'expense', cashflowGroup: 'food', isFixed: false },
  { id: 'c13', name: "ค่าเช่า/ค่าหอพัก", icon: "🏢", color: '#3B82F6', type: 'expense', cashflowGroup: 'rent', isFixed: true },
  { id: 'c2', name: "ซุปเปอร์มาร์เก็ต/ห้าง", icon: "🛒", color: '#14B8A6', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c3', name: "ช้อปปิ้งออนไลน์", icon: "📦", color: '#8B5CF6', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c4', name: "บริการรายเดือน", icon: "💳", color: '#6366F1', type: 'expense', cashflowGroup: 'subs', isFixed: true },
  { id: 'c5', name: "การเดินทาง", icon: "🚗", color: '#64748B', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c6', name: "ที่อยู่อาศัยและของใช้", icon: "🏠", color: '#F59E0B', type: 'expense', cashflowGroup: 'variable', isFixed: true },
  { id: 'c7', name: "อุปกรณ์ไอที/คอมพิวเตอร์", icon: "💻", color: '#00509E', type: 'expense', cashflowGroup: 'it', isFixed: false },
  { id: 'c8', name: "การลงทุนและออมเงิน", icon: "📈", color: '#10B981', type: 'expense', cashflowGroup: 'invest', isFixed: true },
  { id: 'c9', name: "บันเทิงและสันทนาการ", icon: "🎬", color: '#EC4899', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c10', name: "สุขภาพและความงาม", icon: "💊", color: '#F43F5E', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c11', name: "ครอบครัวและสัตว์เลี้ยง", icon: "🐶", color: '#F4B800', type: 'expense', cashflowGroup: 'variable', isFixed: false },
  { id: 'c12', name: "อื่นๆ", icon: "📌", color: '#64748B', type: 'expense', cashflowGroup: 'variable', isFixed: false }
];

const DEFAULT_DAY_TYPES = [
    { id: 'WORK', label: 'ทำงาน', color: '#22C55E' },     // Green
    { id: 'HOLIDAY', label: 'วันหยุด', color: '#E2E8F0' }, // Light Slate
    { id: 'SICK', label: 'ป่วย', color: '#EF4444' },       // Red
    { id: 'LEAVE', label: 'ลากิจ', color: '#EAB308' },      // Yellow
    { id: 'EVENT', label: 'กิจกรรม บ.', color: '#A855F7' }   // Purple
];

const darkModeStyles = `
  .dark-mode { background-color: #0f172a !important; color: #f8fafc !important; }
  .dark-mode .bg-white { background-color: #1e293b !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50, .dark-mode .bg-slate-100 { background-color: #0f172a !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50\\/80 { background-color: rgba(15, 23, 42, 0.8) !important; border-color: #334155 !important; }
  .dark-mode .bg-slate-50\\/50 { background-color: rgba(15, 23, 42, 0.5) !important; border-color: #334155 !important; }
  .dark-mode .bg-blue-50\\/50 { background-color: rgba(30, 58, 138, 0.5) !important; border-color: #1e3a8a !important; }
  .dark-mode .bg-blue-50 { background-color: rgba(30, 58, 138, 0.5) !important; border-color: #1e3a8a !important; }
  .dark-mode .border-blue-200 { border-color: #1e3a8a !important; }
  .dark-mode .text-slate-900 { color: #ffffff !important; }
  .dark-mode .text-slate-800 { color: #f8fafc !important; }
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
  
  .dark-mode input, .dark-mode select:not(.day-type-badge), .dark-mode textarea { background-color: transparent !important; color: #f8fafc !important; border-color: #475569 !important; }
  .dark-mode select optgroup { background-color: #0f172a !important; color: #60a5fa !important; font-weight: bold; }
  .dark-mode select option { background-color: #1e293b !important; color: #f8fafc !important; }
  .dark-mode table thead th { background-color: #0f172a !important; color: #cbd5e1 !important; border-color: #334155 !important; }
  
  input[type="color"] { -webkit-appearance: none; border: none; padding: 0; overflow: hidden; border-radius: 4px; }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  input[type="color"]::-webkit-color-swatch { border: none; border-radius: 4px; }
`;

// ==========================================
// 2. HELPER FUNCTIONS & ANIMATION COMPONENTS
// ==========================================
const hexToRgb = (hexStr) => {
    let hex = hexStr || '#94a3b8';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '148, 163, 184'; 
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
};

const formatMoney = (amount) => (Number(amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseDateStrToObj = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date();
    return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
};

const getThaiMonth = (yearMonth) => {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const [y, m] = yearMonth.split('-');
  const mIdx = parseInt(m, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) return `${months[mIdx]} ${y}`;
  return yearMonth;
};

const getFilterLabel = (period) => {
    if (period === 'ALL') return 'ดูภาพรวมทั้งหมด (All Time)';
    if (period.match(/^\d{4}$/)) return `ปี ${period}`;
    if (period.includes('-')) {
      const [y, type] = period.split('-');
      if (type === 'H1') return `ครึ่งปีแรก (H1/${y})`;
      if (type === 'H2') return `ครึ่งปีหลัง (H2/${y})`;
      if (type === 'Q1') return `ไตรมาส 1 (Q1/${y})`;
      if (type === 'Q2') return `ไตรมาส 2 (Q2/${y})`;
      if (type === 'Q3') return `ไตรมาส 3 (Q3/${y})`;
      if (type === 'Q4') return `ไตรมาส 4 (Q4/${y})`;
      return getThaiMonth(period);
    }
    return period;
};

const isDateInFilter = (dateStr, filter) => {
    if (filter === 'ALL') return true;
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const m = parseInt(parts[1], 10), y = parts[2];
    if (filter === y) return true; 
    if (filter.includes('-')) {
        const [fy, fType] = filter.split('-');
        if (y !== fy) return false;
        if (fType === 'H1') return m >= 1 && m <= 6;
        if (fType === 'H2') return m >= 7 && m <= 12;
        if (fType === 'Q1') return m >= 1 && m <= 3;
        if (fType === 'Q2') return m >= 4 && m <= 6;
        if (fType === 'Q3') return m >= 7 && m <= 9;
        if (fType === 'Q4') return m >= 10 && m <= 12;
        return fType === parts[1];
    }
    return false;
};

const generateDatesForPeriod = (period, allTransactions) => {
    if (!allTransactions || allTransactions.length === 0) return [];

    const filteredTx = allTransactions.filter(t => isDateInFilter(t.date, period));
    if (filteredTx.length === 0) return [];

    const txDates = filteredTx.map(t => parseDateStrToObj(t.date).getTime());
    const minTxDate = new Date(Math.min(...txDates));
    const maxTxDate = new Date(Math.max(...txDates));

    let start, end;

    if (period === 'ALL') {
        start = new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1);
        end = maxTxDate;
    } else if (period.match(/^\d{4}$/)) {
        start = new Date(period, 0, 1);
        end = new Date(period, 11, 31);
    } else if (period.match(/^\d{4}-H1$/)) {
        const y = period.split('-')[0];
        start = new Date(y, 0, 1);
        end = new Date(y, 5, 30);
    } else if (period.match(/^\d{4}-H2$/)) {
        const y = period.split('-')[0];
        start = new Date(y, 6, 1);
        end = new Date(y, 11, 31);
    } else if (period.match(/^\d{4}-Q(\d)$/)) {
        const [y, qStr] = period.split('-Q');
        const q = parseInt(qStr);
        start = new Date(y, (q - 1) * 3, 1);
        end = new Date(y, q * 3, 0); 
    } else if (period.match(/^\d{4}-\d{2}$/)) {
        const [y, m] = period.split('-');
        start = new Date(y, parseInt(m) - 1, 1);
        end = new Date(y, parseInt(m), 0); 
    } else {
        return [];
    }

    if (period !== 'ALL' && !period.match(/^\d{4}-\d{2}$/)) {
        if (end > maxTxDate) {
            end = maxTxDate;
        }
        const minMonthStart = new Date(minTxDate.getFullYear(), minTxDate.getMonth(), 1);
        if (start < minMonthStart) {
            start = minMonthStart;
        }
    }

    const dateArray = [];
    let curr = new Date(start);
    let sanityCheck = 0;
    while (curr <= end && sanityCheck < 5000) {
        const d = String(curr.getDate()).padStart(2, '0');
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const y = curr.getFullYear();
        dateArray.push(`${d}/${m}/${y}`);
        curr.setDate(curr.getDate() + 1);
        sanityCheck++;
    }
    return dateArray;
};

const autoCategorize = (description, categoryName, categoryList) => {
  const t = ((description || "") + " " + (categoryName || "")).toLowerCase();
  let matchedName = "อื่นๆ";
  if (t.match(/เงินเดือน|salary/)) matchedName = "เงินเดือน";
  else if (t.match(/โบนัส|รายรับพิเศษ|คืนเงิน|bonus|ขายของ/)) matchedName = "รายรับพิเศษ/โบนัส";
  else if (t.match(/หุ้น|nvda|xom|ko|qqq|webull|ออมทอง|กองทุน|ลงทุน/)) matchedName = "การลงทุนและออมเงิน";
  else if (t.match(/ค่าเช่า|ค่าหอ|หอพัก|อพาร์ทเม้นท์|คอนโด|ห้องพัก/)) matchedName = "ค่าเช่า/ค่าหอพัก";
  else if (t.match(/คอม|computer|ผ่อน|mainboard|psu|ram|ryzen|cpu|case|ssd|usb|การ์ดจอ|keyboard|เมาส์|ไมค์|maono|สายรัด|จอ|ไอแพด|ipad/)) matchedName = "อุปกรณ์ไอที/คอมพิวเตอร์";
  else if (t.match(/gemini|vip|subscription|netflix|youtube|spotify|yt premium|รายเดือน|สมาชิก/)) matchedName = "บริการรายเดือน";
  else if (t.match(/max value|maxvalue|lotus|big c|tops|makro|ซุปเปอร์|ห้าง|เซเว่น|7-11|ดองกิ/)) matchedName = "ซุปเปอร์มาร์เก็ต/ห้าง";
  else if (t.match(/shopee|lazada|ออนไลน์|สั่งของ|tiktok shop/)) matchedName = "ช้อปปิ้งออนไลน์";
  else if (t.match(/ตัดผม|ยา|คลินิก|สุขภาพ|ความงาม|หาหมอ|โรงพยาบาล|ขูดหินปูน|ป่วย/)) matchedName = "สุขภาพและความงาม";
  else if (t.match(/น้ำมัน|ทางด่วน|รถ|bts|mrt|เดินทาง|taxi|grab|วิน|จอดรถ|สะพานใหม่|มีนบุรี|รังสิต|ทองหล่อ|commart/)) matchedName = "การเดินทาง";
  else if (t.match(/หนัง|gundam|เกม|ของเล่น|บันเทิง|ดูหนัง|คอนเสิร์ต|imax|เบสบอล|pool|discord/)) matchedName = "บันเทิงและสันทนาการ";
  else if (t.match(/ของใช้|ซักผ้า|บ้าน|อุปกรณ์|มือถือ|ค่าไฟ|ค่าน้ำ|เสื่อ|ป้าย|ทีแขวน|สมุด|กางเกง|สว่าน|โต๊ะ|ปลั๊ก|หมอน|แชมพู|กระบอก|ผงซักฟอก/)) matchedName = "ที่อยู่อาศัยและของใช้";
  else if (t.match(/ข้าว|อาหาร|ขนม|ผลไม้|lunch|dinner|cook|เครื่องดื่ม|ชา|กาแฟ|ot/)) matchedName = "อาหารและเครื่องดื่ม";
  else if (t.match(/พ่อ|แม่|ลูก|ครอบครัว|ให้เงิน|หมา|แมว|สัตว์เลี้ยง/)) matchedName = "ครอบครัวและสัตว์เลี้ยง";
  
  const exists = categoryList.find(c => c.name === matchedName);
  return exists ? exists.name : (categoryList.filter(c=>c.type==='expense')[0]?.name || "อื่นๆ");
};

const parseCSV = (text) => {
  let rows = [], row = [], current = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
      let char = text[i], nextChar = text[i + 1];
      if (char === '"') {
          if (inQuotes && nextChar === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) {
          row.push(current); current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          row.push(current);
          if (row.some(c => c.trim() !== '')) rows.push(row);
          row = []; current = '';
      } else { current += char; }
  }
  if (current !== '' || row.length > 0) {
      row.push(current);
      if (row.some(c => c.trim() !== '')) rows.push(row);
  }
  return rows.map(r => r.map(c => c.trim()));
};

const cleanNumber = (val) => {
  if (!val) return 0;
  let cleaned = val.replace(/[฿\s,"]/g, '');
  if (cleaned === '-' || cleaned === '') return 0;
  return parseFloat(cleaned) || 0;
};

// ==========================================
// 3. UI COMPONENTS
// ==========================================
const EditableInput = ({ initialValue, type = "text", onSave, className, placeholder }) => {
    const [val, setVal] = useState(initialValue || '');
    useEffect(() => { setVal(initialValue || ''); }, [initialValue]);
  
    return (
      <input
        type={type} value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
            let finalVal = val;
            if(type === 'number') { finalVal = parseFloat(val) || 0; setVal(finalVal); }
            if (finalVal !== initialValue) onSave(finalVal);
        }}
        className={className} step={type === 'number' ? "0.01" : undefined} placeholder={placeholder}
      />
    );
};

const Sparkline = ({ data, color }) => {
    if (!data || data.length === 0) return null;
    const chartData = {
        labels: data.map((_, i) => i),
        datasets: [{
            data: data,
            borderColor: color,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            fill: true,
            backgroundColor: `${color}15`
        }]
    };
    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false }, animation: { duration: 1000 } },
        scales: { x: { display: false }, y: { display: false, min: Math.min(...data) * 0.9 } },
        layout: { padding: 0 }
    };
    return <div className="h-10 w-24 ml-auto opacity-80 pointer-events-none transition-all duration-500"><Line data={chartData} options={options} /></div>;
};

const AnimatedNumber = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp = null;
        const duration = 800; 
        const initialValue = displayValue;
        const difference = value - initialValue;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(initialValue + (difference * easeProgress));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(value);
            }
        };
        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{formatMoney(displayValue)}</span>;
};

// --- SUB-VIEW: DASHBOARD ---
const DashboardView = ({ transactions, categories, filterPeriod, getFilterLabel, hideFixedExpenses, setHideFixedExpenses, analytics, dayTypeConfig, isDarkMode, dayTypes }) => {
    
    const datesInPeriod = analytics.datesInPeriod || [];

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-slate-400 py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Inbox className="w-20 h-20 mb-6 text-slate-300 animate-bounce" style={{animationDuration: '2s'}} />
              <p className="text-xl font-medium text-slate-600">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-emerald-700 font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left"><Coins className="w-5 h-5"/> รายรับสุทธิ (Income)</p>
                        <Sparkline data={analytics.sparklineIncome} color="#059669" />
                    </div>
                    <h3 className="text-4xl font-black text-emerald-600 tracking-tight"><AnimatedNumber value={analytics.totalIncome} /> <span className="text-xl font-medium">฿</span></h3>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-red-700 font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left"><Wallet className="w-5 h-5"/> รายจ่ายสุทธิ (Expenses)</p>
                        <Sparkline data={analytics.sparklineExpense} color="#DC2626" />
                    </div>
                    <h3 className="text-4xl font-black text-red-600 tracking-tight"><AnimatedNumber value={analytics.totalExpense} /> <span className="text-xl font-medium">฿</span></h3>
                </div>
                <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${analytics.netCashflow >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            <p className={`font-bold mb-1 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${analytics.netCashflow >= 0 ? 'text-[#00509E]' : 'text-orange-700'}`}><PiggyBank className="w-5 h-5"/> เงินคงเหลือ (Cashflow)</p>
                            {analytics.totalIncome > 0 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block transition-colors ${analytics.netCashflow >= 0 ? 'bg-blue-100 text-[#00509E]' : 'bg-orange-100 text-orange-700'}`}>
                                    ออมได้ <AnimatedNumber value={analytics.savingsRate} />%
                                </span>
                            )}
                        </div>
                        <Sparkline data={analytics.sparklineNet} color={analytics.netCashflow >= 0 ? "#00509E" : "#EA580C"} />
                    </div>
                    <h3 className={`text-4xl font-black tracking-tight ${analytics.netCashflow >= 0 ? 'text-[#00509E]' : 'text-orange-600'}`}><AnimatedNumber value={analytics.netCashflow} /> <span className="text-xl font-medium">฿</span></h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border-l-[5px] border-[#F4B800] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-[#F4B800]"><Flame className="w-32 h-32"/></div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold mb-1 flex items-center gap-1.5"><Flame className="w-4 h-4 text-[#F4B800]"/> อัตราเผาผลาญรายจ่าย</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight"><AnimatedNumber value={analytics.dailyAvg} /> <span className="text-lg text-slate-400 font-medium">฿/วัน</span></h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-l-[5px] border-blue-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500"><Home className="w-32 h-32"/></div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold mb-1 flex items-center gap-1.5"><Home className="w-4 h-4 text-blue-500"/> ค่าที่พัก/ค่าหอ</p>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight"><AnimatedNumber value={analytics.rentTotal} /> <span className="text-lg text-slate-400 font-medium">฿</span></h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                        <span className={`font-bold px-2 py-1 rounded border transition-colors ${analytics.rentPercentage > 30 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                            {analytics.rentPercentage > 30 ? 'เกิน 30% ของรายจ่าย' : 'สัดส่วนกำลังดี'}
                        </span>
                    </div>
                </div>

                <div className="bg-white border-l-[5px] border-purple-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-purple-500"><Scale className="w-32 h-32"/></div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold mb-1 flex items-center gap-1.5"><Scale className="w-4 h-4 text-purple-500"/> โครงสร้างรายจ่าย</p>
                        <div className="w-full bg-slate-100 rounded-full h-3 mt-3 mb-2 flex overflow-hidden">
                            <div className="bg-purple-500 h-3 transition-all duration-1000 ease-out" style={{width: `${analytics.fixedPercentage}%`}}></div>
                            <div className="bg-pink-400 h-3 transition-all duration-1000 ease-out" style={{width: `${analytics.variablePercentage}%`}}></div>
                        </div>
                        <div className="flex justify-between text-xs font-bold mt-2">
                            <span className="text-purple-600">ภาระคงที่ ({analytics.fixedPercentage}%)</span>
                            <span className="text-pink-600">ผันแปร ({analytics.variablePercentage}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline (GitHub Style Contribution Graph) */}
            {Object.keys(analytics.dayTypeCounts).length > 0 && (
                <div className={`rounded-xl shadow-sm border p-4 md:p-6 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b pb-3 gap-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            <CalendarClock className="w-5 h-5 text-[#00509E] dark:text-blue-400" />
                            ไทม์ไลน์กิจกรรม (Activity Graph)
                        </h3>
                        <span className={`text-sm font-medium px-3 py-1 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {getFilterLabel(filterPeriod)}
                        </span>
                    </div>

                    <div className={`border p-4 rounded-xl mb-6 transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        {datesInPeriod.length === 0 ? (
                            <div className="text-center text-slate-400 py-4 text-sm font-medium">กรุณาเลือกช่วงเวลาที่มีข้อมูลเพื่อแสดงไทม์ไลน์</div>
                        ) : (
                            <div className="flex flex-wrap gap-1 md:gap-[5px] justify-start">
                                {datesInPeriod.map((dateStr) => {
                                    const [d, m, y] = dateStr.split('/');
                                    const dateObj = new Date(y, parseInt(m)-1, d);
                                    const dayOfWeek = dateObj.getDay();
                                    const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                                    const currentType = dayTypes[dateStr] || defaultType;
                                    const typeConfig = dayTypeConfig.find(dt => dt.id === currentType) || dayTypeConfig[0];
                                    
                                    const today = new Date();
                                    const isToday = parseInt(d) === today.getDate() && parseInt(m)-1 === today.getMonth() && parseInt(y) === today.getFullYear();
                                    
                                    const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                                    const displayDate = `${parseInt(d)} ${shortMonths[parseInt(m)-1]} ${y.slice(2)}`;

                                    return (
                                        <div key={dateStr} className="group relative">
                                            <div 
                                                className={`w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-sm cursor-pointer transition-all duration-200 ${isToday ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10 shadow-md' : 'hover:scale-125 hover:z-10 hover:shadow-sm opacity-90 hover:opacity-100'}`}
                                                style={{ backgroundColor: typeConfig.color }}
                                            ></div>
                                            {/* Tooltip */}
                                            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[90px] bg-slate-800 text-white text-center rounded-md py-1.5 px-2 z-50 text-[11px] font-medium shadow-lg transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 pointer-events-none">
                                                <span className="text-slate-300 font-normal">{displayDate}</span><br/>
                                                <span style={{ color: typeConfig.color }}>{typeConfig.label}</span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 sm:gap-5 text-xs font-bold justify-center">
                        {dayTypeConfig.map(dt => {
                            const count = analytics.dayTypeCounts[dt.id] || 0;
                            return (
                                <div key={dt.id} className="flex items-center gap-1.5">
                                    <div className="w-3.5 h-3.5 rounded shadow-sm" style={{ backgroundColor: dt.color }}></div>
                                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{dt.label} <span className="text-slate-400 font-normal">({count})</span></span>
                                </div>
                            );
                        })}
                        <div className={`flex items-center gap-1.5 border-l-2 pl-3 sm:pl-5 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>รวมทั้งหมด <span className="text-slate-400 font-normal">({datesInPeriod.length} วัน)</span></span>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel-like Cashflow Summary Table */}
            {analytics.numMonths > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400"/> ตารางสรุปกระแสเงินสด (Cashflow Statement)</h3>
                      <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">รูปแบบคล้าย Excel</span>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-right text-sm whitespace-nowrap">
                          <thead className="bg-slate-100 border-b-2 border-slate-300">
                              <tr>
                                  <th className="px-4 py-3 font-bold text-center text-slate-800 bg-slate-200 sticky left-0 z-10">ช่วงเวลา</th>
                                  <th className="px-4 py-3 font-bold text-emerald-700 bg-emerald-50">เงินเดือน</th>
                                  <th className="px-4 py-3 font-bold text-emerald-700 bg-emerald-50">เงินพิเศษ/โบนัส</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">ค่าหอ</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">รายเดือน/หนี้</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">ค่ากิน</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">ค่าใช้สอยผันแปร</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">ลงทุน/ออม</th>
                                  <th className="px-4 py-3 font-bold text-slate-700">ไอที/คอมฯ</th>
                                  <th className="px-4 py-3 font-black text-red-800 bg-red-50 border-l-2 border-slate-300">ยอดใช้จ่ายสุทธิ</th>
                                  <th className="px-4 py-3 font-black text-[#00509E] bg-blue-50">เงินคงเหลือ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                              {analytics.sortedCashflow.map(row => (
                                  <tr key={row.monthStr} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-2 font-bold text-center text-slate-700 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{getThaiMonth(row.monthStr)}</td>
                                      <td className="px-4 py-2 font-medium text-emerald-600 bg-emerald-50/30">{row.salary > 0 ? formatMoney(row.salary) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-emerald-600 bg-emerald-50/30">{row.bonus > 0 ? formatMoney(row.bonus) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600">{row.rent > 0 ? formatMoney(row.rent) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600 bg-purple-50/30">{row.subs > 0 ? formatMoney(row.subs) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600">{row.food > 0 ? formatMoney(row.food) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600">{row.variable > 0 ? formatMoney(row.variable) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600">{row.invest > 0 ? formatMoney(row.invest) : '-'}</td>
                                      <td className="px-4 py-2 font-medium text-slate-600">{row.it > 0 ? formatMoney(row.it) : '-'}</td>
                                      <td className="px-4 py-2 font-bold text-red-600 bg-red-50/50 border-l-2 border-slate-200">{formatMoney(row.totalExp)}</td>
                                      <td className="px-4 py-2 font-black text-slate-800 bg-blue-50/50">{formatMoney(row.income - row.totalExp)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-slate-800 text-white font-bold border-t-2 border-slate-900">
                              <tr>
                                  <td className="px-4 py-3 text-center sticky left-0 z-10 bg-slate-900">รวมทั้งหมด</td>
                                  <td className="px-4 py-3 text-emerald-300">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.salary,0))}</td>
                                  <td className="px-4 py-3 text-emerald-300">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.bonus,0))}</td>
                                  <td className="px-4 py-3">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.rent,0))}</td>
                                  <td className="px-4 py-3 text-purple-300">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.subs,0))}</td>
                                  <td className="px-4 py-3">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.food,0))}</td>
                                  <td className="px-4 py-3">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.variable,0))}</td>
                                  <td className="px-4 py-3">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.invest,0))}</td>
                                  <td className="px-4 py-3">{formatMoney(analytics.sortedCashflow.reduce((s,r)=>s+r.it,0))}</td>
                                  <td className="px-4 py-3 text-red-300 border-l-2 border-slate-700">{formatMoney(analytics.totalExpense)}</td>
                                  <td className="px-4 py-3 text-blue-300">{formatMoney(analytics.netCashflow)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 flex flex-col h-full">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col flex-grow h-full hover:shadow-md transition-shadow duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-[#00509E]" /> 
                              {analytics.mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสดและรายจ่าย' : analytics.mainChartType === 'bar' ? 'เทรนด์รายจ่ายไลฟ์สไตล์เปรียบเทียบ' : `กราฟรายจ่ายรายวันในงวดที่เลือก`}
                          </h3>
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                                  <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ease-in-out ${hideFixedExpenses ? 'bg-[#D81A21]' : 'bg-slate-300'}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${hideFixedExpenses ? 'transform translate-x-4' : ''}`}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                  <Filter className="w-3 h-3"/> ซ่อนยอดภาระคงที่
                              </span>
                          </label>
                        </div>
                        <div className="relative w-full flex-grow min-h-[320px]">
                            {analytics.mainChartType === 'combo' ? (
                              <Chart type="bar" data={analytics.mainChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, animation: { duration: 1000 } }} />
                            ) : analytics.mainChartType === 'bar' ? (
                              <Bar data={analytics.mainChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: { duration: 1000 } }} />
                            ) : (
                              <Line data={analytics.mainChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, animation: { duration: 1000 } }} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col flex-grow h-full hover:shadow-md transition-shadow duration-300">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <PieChart className="w-5 h-5 text-[#00509E]" /> สัดส่วนรายจ่าย (ในกราฟ)
                        </h3>
                        <div className="w-full h-[220px] flex-shrink-0 flex justify-center relative mb-4">
                            <Doughnut data={analytics.catChartData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } }, animation: { animateScale: true, animateRotate: true, duration: 1000 } }}/>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xs text-slate-500 font-medium">ยอดรวม</span>
                                <span className="text-base font-black text-[#00509E]">{formatMoney(analytics.chartTotal)}</span>
                            </div>
                        </div>
                        <div className="w-full overflow-y-auto pr-2 custom-scrollbar flex-grow" style={{maxHeight: "300px"}}>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="px-2 py-2 font-semibold text-slate-600">หมวดหมู่</th>
                                        <th className="px-2 py-2 font-semibold text-slate-600 text-right">ยอดรวม</th>
                                        {analytics.numMonths > 1 && <th className="px-2 py-2 font-semibold text-slate-500 text-right bg-blue-50/50">เฉลี่ย/ด.</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analytics.sortedCats.map((cat, idx) => {
                                        const catDef = categories.find(c => c.name === cat.name);
                                        return (
                                          <tr key={idx} className="hover:bg-slate-50 group">
                                              <td className="px-2 py-2.5 flex items-center gap-1.5 truncate max-w-[120px]" title={cat.name}>
                                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style={{backgroundColor: analytics.catChartData.datasets[0].backgroundColor[idx]}}></div>
                                                  <span className="truncate text-xs font-medium">{catDef?.icon} {cat.name}</span>
                                              </td>
                                              <td className="px-2 py-2.5 text-right font-bold text-slate-800 text-xs">{formatMoney(cat.amount)}</td>
                                              {analytics.numMonths > 1 && <td className="px-2 py-2.5 text-right font-bold text-[#00509E] text-xs bg-blue-50/30">{formatMoney(cat.avgPerMonth)}</td>}
                                          </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <AlertCircle className="w-5 h-5 text-[#D81A21]" /> TOP 7 รายการที่จ่ายแพงที่สุด (ในกราฟ)
                    </h3>
                    <div className="space-y-3">
                        {analytics.top7Transactions.map((tx, idx) => {
                            const catDef = categories.find(c => c.name === tx.category);
                            return (
                              <div key={tx.id} className="flex justify-between items-start p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-100 hover:shadow-sm">
                                  <div className="overflow-hidden pr-2 flex items-center gap-3">
                                      <div className="text-lg font-black text-slate-300 w-6 text-center">{idx + 1}</div>
                                      <div>
                                          <p className="text-sm font-bold text-slate-800 truncate" title={tx.description}>{tx.description}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span 
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-white" 
                                                style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}
                                                title={tx.category}
                                            >
                                              {catDef?.icon} {tx.category}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">{tx.date}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <span className="font-black text-[#D81A21] whitespace-nowrap">{formatMoney(tx.amount)} ฿</span>
                              </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-300">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <PieChart className="w-5 h-5 text-[#00509E]" /> 7 หมวดหมู่ที่ละลายทรัพย์สุด
                    </h3>
                    <div className="space-y-5 mt-4">
                        {analytics.sortedCats.slice(0, 7).map((cat, idx) => {
                            const catDef = categories.find(c => c.name === cat.name);
                            const pColor = catDef?.color || '#D81A21';
                            return (
                              <div key={idx}>
                                  <div className="flex justify-between text-sm font-medium mb-1.5">
                                      <span className="text-slate-700 truncate pr-2 font-bold flex items-center gap-2" title={cat.name}>
                                          <span className="text-slate-400">{idx+1}.</span> {catDef ? catDef.icon : '📌'} {cat.name}
                                      </span>
                                      <span className="text-slate-900 font-black whitespace-nowrap">{formatMoney(cat.amount)} ฿</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{width: `${cat.percentage}%`, backgroundColor: pColor, opacity: 1 - (idx * 0.1)}}></div>
                                  </div>
                                  <div className="flex justify-between mt-1">
                                      <p className="text-[11px] text-slate-400">เฉลี่ย {formatMoney(cat.avgPerMonth)}/เดือน</p>
                                      <p className="text-[11px] font-bold" style={{color: pColor}}>{cat.percentage}%</p>
                                  </div>
                              </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-VIEW: CALENDAR (SEAMLESS GRID & ENHANCED UI) ---
const CalendarView = ({ transactions, filterPeriod, setFilterPeriod, rawAvailableMonths, handleOpenAddModal, categories, isDarkMode, dayTypes, handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView }) => {
    
    if (isReadOnlyView) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className={`flex flex-col items-center justify-center text-slate-500 py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200 h-[65vh] transition-colors ${isDarkMode ? 'dark:bg-slate-800 dark:border-slate-700' : ''}`}>
                    <CalendarDays className={`w-20 h-20 mb-6 text-slate-300 ${isDarkMode ? 'dark:text-slate-600' : ''}`} />
                    <p className={`text-2xl font-bold text-slate-700 mb-2 ${isDarkMode ? 'dark:text-slate-200' : ''}`}>โหมดภาพรวมกว้าง (ไม่สามารถแสดงปฏิทินได้)</p>
                    <p className={`text-base text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-center ${isDarkMode ? 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400' : ''}`}>
                        เพื่อป้องกันข้อมูลทับซ้อนกัน <br/>
                        กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น <strong className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>รายเดือน</strong> จากตัวกรองด้านบนครับ
                    </p>
                </div>
            </div>
        );
    }

    const viewDate = useMemo(() => {
        if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
            const [y, m] = filterPeriod.split('-');
            return new Date(parseInt(y), parseInt(m) - 1, 1);
        }
        return new Date(); 
    }, [filterPeriod]);

    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = new Date(y, m, 1).getDay();
    
    const calendarData = useMemo(() => {
        let dayData = {};
        for(let i=1; i<=daysInMonth; i++) {
            dayData[i] = { inc: 0, exp: 0, items: [] };
        }
        
        transactions.forEach(t => {
            const parts = t.date.split('/');
            if (parts.length === 3) {
                const txY = parseInt(parts[2]);
                const txM = parseInt(parts[1]) - 1;
                const txD = parseInt(parts[0]);
                
                if (txY === y && txM === m && dayData[txD]) {
                    const catObj = categories.find(c => c.name === t.category);
                    const amt = parseFloat(t.amount) || 0;
                    if (catObj?.type === 'income') {
                        dayData[txD].inc += amt;
                    } else {
                        dayData[txD].exp += amt;
                        dayData[txD].items.push({ ...t, _catObj: catObj });
                    }
                }
            }
        });
        
        for(let i=1; i<=daysInMonth; i++) {
            dayData[i].items.sort((a, b) => b.amount - a.amount);
        }

        return dayData;
    }, [transactions, y, m, daysInMonth, categories]);

    const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const blanks = Array(firstDayOfMonth).fill(null);
    const dayCells = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // คำนวณจำนวนชนิดวัน
    const dayTypeCounts = {};
    dayTypeConfig.forEach(dt => dayTypeCounts[dt.id] = 0);
    
    dayCells.forEach(d => {
        const dateStr = `${d.toString().padStart(2, '0')}/${(m+1).toString().padStart(2, '0')}/${y}`;
        const dayOfWeek = new Date(y, m, d).getDay();
        const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
        const currentType = dayTypes[dateStr] || defaultType;
        if(currentType) {
            dayTypeCounts[currentType] = (dayTypeCounts[currentType] || 0) + 1;
        }
    });

    const currentIndex = rawAvailableMonths.indexOf(filterPeriod);
    const hasPrev = currentIndex < rawAvailableMonths.length - 1; 
    const hasNext = currentIndex > 0;

    const prevMonth = () => { if (hasPrev) setFilterPeriod(rawAvailableMonths[currentIndex + 1]); };
    const nextMonth = () => { if (hasNext) setFilterPeriod(rawAvailableMonths[currentIndex - 1]); };
    const goToLatest = () => { if (rawAvailableMonths.length > 0) setFilterPeriod(rawAvailableMonths[0]); };

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 transition-colors">
                
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 transition-colors">
                    <h2 className="text-2xl font-bold text-[#00509E] flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6"/> {thaiMonths[m]} {y}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} disabled={!hasPrev} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
                        <button onClick={goToLatest} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-bold text-slate-700 text-sm transition-all active:scale-95">เดือนล่าสุดที่มีข้อมูล</button>
                        <button onClick={nextMonth} disabled={!hasNext} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
                    </div>
                </div>

                {/* Seamless Calendar Grid */}
                <div className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-700 border-slate-700' : 'bg-slate-200 border-slate-200'}`}>
                    {/* Header Row */}
                    <div className={`grid grid-cols-7 border-b ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        {days.map(d => <div key={d} className="py-2.5 text-center text-xs sm:text-sm font-bold text-slate-500">{d}</div>)}
                    </div>
                    
                    {/* Body Grid with 1px gaps forming seamless borders */}
                    <div className="grid grid-cols-7 gap-[1px]">
                        {/* Blanks */}
                        {blanks.map((_, i) => <div key={`blank-${i}`} className={`min-h-[160px] md:min-h-[180px] transition-colors ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/80'}`}></div>)}
                        
                        {/* Days */}
                        {dayCells.map(d => {
                            const data = calendarData[d];
                            const hasData = data.inc > 0 || data.exp > 0;
                            const dateStr = `${d.toString().padStart(2, '0')}/${(m+1).toString().padStart(2, '0')}/${y}`;
                            
                            const today = new Date();
                            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
                            
                            const dayOfWeek = new Date(y, m, d).getDay();
                            const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                            const currentType = dayTypes[dateStr] || defaultType;
                            const typeConfig = dayTypeConfig.find(dt => dt.id === currentType) || dayTypeConfig[0];
                            
                            return (
                                <div 
                                    key={d} 
                                    onClick={() => handleOpenAddModal(dateStr, 'expense')}
                                    className={`min-h-[160px] md:min-h-[180px] p-1.5 flex flex-col relative cursor-pointer transition-colors group
                                        ${isToday ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50/60') : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700/50' : 'bg-white hover:bg-slate-50')}
                                    `}
                                >
                                    {/* Header of the Cell */}
                                    <div className="flex justify-between items-start mb-1.5 shrink-0 gap-1">
                                        <span className={`font-black text-sm md:text-base leading-none pl-1 pt-0.5 ${isToday ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                                            {d}
                                        </span>
                                        
                                        {/* Day Type Selector Badge */}
                                        <div className="relative z-10" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={currentType} 
                                                onChange={(e) => handleDayTypeChange(dateStr, e.target.value)}
                                                className={`day-type-badge text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm cursor-pointer outline-none appearance-none text-center transition-colors border-none`}
                                                style={{
                                                    backgroundColor: typeConfig?.color || '#64748b',
                                                    color: '#ffffff'
                                                }}
                                            >
                                                {dayTypeConfig.map(dt => (
                                                    <option key={dt.id} value={dt.id} style={{backgroundColor: '#ffffff', color: '#1e293b'}}>{dt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {/* Top 5 List with Category Colors */}
                                    <div className="flex flex-col flex-grow overflow-hidden gap-[2px]">
                                        {data.items.slice(0, 5).map(tx => {
                                            const catColor = tx._catObj?.color || '#94a3b8';
                                            return (
                                                <div key={tx.id} 
                                                    className={`flex justify-between items-center rounded px-1.5 py-1 transition-colors border ${isDarkMode ? 'border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                                                    style={{
                                                        backgroundColor: `rgba(${hexToRgb(catColor)}, ${isDarkMode ? 0.2 : 0.1})`,
                                                        borderLeft: `3px solid ${catColor}`
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }}></div>
                                                        <span className={`truncate text-[10px] md:text-[11px] font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} title={tx.description}>{tx.description}</span>
                                                    </div>
                                                    <span className={`font-bold text-[10px] md:text-[11px] shrink-0 pl-1 ${tx._isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-[#D81A21]')}`} title={formatMoney(tx.amount)}>
                                                        {tx._isInc ? '+' : '-'}{Math.round(tx.amount).toLocaleString('th-TH')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {data.items.length > 5 && (
                                            <div className="text-center text-slate-400 text-[9px] md:text-[10px] mt-0.5 font-medium">+ อีก {data.items.length - 5} รายการ</div>
                                        )}
                                    </div>

                                    {/* Floating Plus Button on Hover (Removed Backdrop blur to fix flickering) */}
                                    <div className={`absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl ${isDarkMode ? 'bg-slate-900/60' : 'bg-white/60'}`}>
                                        <div className="bg-[#00509E] text-white p-2 rounded-full shadow-lg flex items-center gap-1 transform scale-90 group-hover:scale-100 transition-transform">
                                            <PlusCircle className="w-5 h-5"/>
                                        </div>
                                    </div>
                                    
                                    {/* Daily Total Summary */}
                                    {hasData && (
                                        <div className={`flex flex-col gap-[1px] mt-1 pt-1 border-t text-[10px] md:text-xs font-bold text-right w-full shrink-0 z-10 relative ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                            {data.inc > 0 && <div className={`truncate ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>+ {formatMoney(data.inc)}</div>}
                                            {data.exp > 0 && <div className={`truncate ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>- {formatMoney(data.exp)}</div>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Day Type Summary Counter */}
                <div className={`mt-4 flex flex-wrap gap-2 md:gap-4 items-center justify-center p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-sm font-bold text-slate-500 mr-2">สรุปวันในเดือนนี้:</span>
                    {dayTypeConfig.map(dt => {
                        const count = dayTypeCounts[dt.id] || 0;
                        return (
                            <div key={dt.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md shadow-sm" style={{ backgroundColor: dt.color, color: '#ffffff' }}>
                                <span className="text-xs font-bold">{dt.label} <span className="opacity-80">({count})</span></span>
                            </div>
                        );
                    })}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md shadow-sm ml-auto md:ml-2 font-bold text-xs ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                        รวม: {dayCells.length} วัน
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-VIEW: LEDGER (SMART PAGINATION + ADVANCED FILTERS + UI OVERHAUL) ---
const LedgerView = ({ 
    displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod, 
    searchQuery, setSearchQuery, handleOpenAddModal, handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth, categories,
    advancedFilterCategory, setAdvancedFilterCategory, advancedFilterGroup, setAdvancedFilterGroup, advancedFilterDate, setAdvancedFilterDate, availableDatesInPeriod, isDarkMode
}) => {
    
    const [currentPage, setCurrentPage] = useState(1);
    
    const pages = useMemo(() => {
        const result = [];
        let currentPageList = [];
        const TARGET_PER_PAGE = 40; 
        
        const dateGroups = [];
        let currentGroup = [];
        let currentGroupDate = null;
        
        displayTransactions.forEach(t => {
            if (t.date !== currentGroupDate) {
                if (currentGroup.length > 0) dateGroups.push(currentGroup);
                currentGroup = [t];
                currentGroupDate = t.date;
            } else {
                currentGroup.push(t);
            }
        });
        if (currentGroup.length > 0) dateGroups.push(currentGroup);
        
        dateGroups.forEach(group => {
            if (currentPageList.length + group.length > TARGET_PER_PAGE && currentPageList.length > 0) {
                result.push(currentPageList);
                currentPageList = [...group];
            } else {
                currentPageList.push(...group);
            }
        });
        if (currentPageList.length > 0) result.push(currentPageList);
        
        return result;
    }, [displayTransactions]);

    useEffect(() => { 
        setCurrentPage(1); 
    }, [filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate]);

    useEffect(() => {
        if (pages.length > 0 && currentPage > pages.length) {
            setCurrentPage(pages.length);
        }
    }, [pages.length, currentPage]);

    const clearFilters = () => {
        setSearchQuery('');
        setAdvancedFilterCategory('ALL');
        setAdvancedFilterGroup('ALL');
        setAdvancedFilterDate('ALL');
    };

    if (isReadOnlyView) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className={`flex flex-col items-center justify-center text-slate-500 py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200 h-[65vh] transition-colors ${isDarkMode ? 'dark:bg-slate-800 dark:border-slate-700' : ''}`}>
                    <CalendarDays className={`w-20 h-20 mb-6 text-slate-300 ${isDarkMode ? 'dark:text-slate-600' : ''}`} />
                    <p className={`text-2xl font-bold text-slate-700 mb-2 ${isDarkMode ? 'dark:text-slate-200' : ''}`}>โหมดภาพรวมกว้าง (อ่านอย่างเดียว)</p>
                    <p className={`text-base text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-center ${isDarkMode ? 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400' : ''}`}>
                        เพื่อความรวดเร็วและป้องกันเครื่องกระตุก (Lag) <br/>
                        กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น <strong className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>รายเดือน</strong> จากตัวกรองด้านบนครับ
                    </p>
                </div>
            </div>
        );
    }

    const totalPages = pages.length || 1;
    const currentData = pages[currentPage - 1] || [];
    const isFilterActive = searchQuery || advancedFilterDate !== 'ALL' || advancedFilterGroup !== 'ALL' || advancedFilterCategory !== 'ALL';

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 border border-blue-200 text-[#00509E] px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                        แสดงผลเฉพาะ: {getFilterLabel(filterPeriod)} ({displayTransactions.length} รายการ)
                    </div>
                    {displayTransactions.length > 0 && (
                        <button onClick={() => handleDeleteMonth(filterPeriod)} className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors border border-red-200 shadow-sm">
                            <Trash2 className="w-4 h-4" /> ลบข้อมูลเดือนนี้
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 mb-4 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1 border-b border-slate-100 pb-2">
                    <Filter className="w-4 h-4 text-[#00509E]"/> ตัวกรองข้อมูลขั้นสูง (กรองได้หลายเงื่อนไขพร้อมกัน)
                    {isFilterActive && (
                        <button onClick={clearFilters} className="ml-auto text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-red-100">
                            <X className="w-3 h-3"/> ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00509E] transition-colors"/>
                        <input 
                            type="text" placeholder="ค้นหาชื่อ, รายละเอียด..." 
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#00509E] focus:ring-1 focus:ring-[#00509E] text-sm bg-slate-50 focus:bg-white transition-all"
                        />
                    </div>
                    <select value={advancedFilterDate} onChange={(e) => setAdvancedFilterDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00509E] focus:ring-1 focus:ring-[#00509E] font-medium text-slate-700 bg-slate-50 focus:bg-white transition-all cursor-pointer appearance-none" style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">🗓️ ทุกวันที่</option>
                        {availableDatesInPeriod.map(d => <option key={d} value={d}>เฉพาะวันที่ {d}</option>)}
                    </select>
                    <select value={advancedFilterGroup} onChange={(e) => setAdvancedFilterGroup(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00509E] focus:ring-1 focus:ring-[#00509E] font-medium text-slate-700 bg-slate-50 focus:bg-white transition-all cursor-pointer appearance-none" style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">📦 ทุกกลุ่ม (กระแสเงินสด)</option>
                        <option value="INCOME">🟢 รายรับทั้งหมด</option>
                        <option value="EXPENSE">🔴 รายจ่ายทั้งหมด</option>
                        <option value="FIXED">🔒 เฉพาะ ภาระคงที่ (Fixed)</option>
                        <option value="VARIABLE">💸 เฉพาะ ผันแปร (Variable)</option>
                        <option value="FOOD">🍜 เฉพาะ ค่ากิน (Food)</option>
                        <option value="RENT">🏢 เฉพาะ ค่าหอ/ที่พัก (Rent)</option>
                        <option value="SUBS">💳 เฉพาะ รายเดือน/หนี้ (Subs/Debt)</option>
                        <option value="IT">💻 เฉพาะ ไอที/คอมฯ (IT)</option>
                        <option value="INVEST">📈 เฉพาะ ลงทุน/ออม (Invest)</option>
                    </select>
                    <select value={advancedFilterCategory} onChange={(e) => setAdvancedFilterCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00509E] focus:ring-1 focus:ring-[#00509E] font-medium text-slate-700 bg-slate-50 focus:bg-white transition-all cursor-pointer appearance-none" style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">🏷️ ทุกหมวดหมู่ย่อย</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="w-full flex-grow overflow-hidden border border-slate-200 bg-white shadow-sm rounded-xl flex flex-col transition-colors" style={{ height: 'calc(100vh - 450px)' }}>
              {displayTransactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 animate-in fade-in duration-500">
                    <Inbox className="w-16 h-16 mb-4 opacity-50" />
                    <p>ไม่พบรายการบัญชี หรือไม่พบข้อมูลตามตัวกรองที่เลือก</p>
                    {isFilterActive && (
                        <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-colors">
                            ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                </div>
              ) : (
                <>
                    <div className="overflow-auto flex-grow custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-slate-300">
                                <tr>
                                    <th className="px-4 py-2.5 font-bold text-slate-700 min-w-[130px]">วันที่</th>
                                    <th className="px-2 py-2.5 font-bold text-slate-700 min-w-[90px] text-center">ประเภท</th>
                                    <th className="px-4 py-2.5 font-bold text-slate-700 min-w-[290px]">หมวดหมู่</th>
                                    <th className="px-4 py-2.5 font-bold text-slate-700 w-full min-w-[250px]">รายละเอียด / หมายเหตุ</th>
                                    <th className="px-4 py-2.5 font-bold text-slate-700 text-right min-w-[150px]">จำนวนเงิน (฿)</th>
                                    <th className="px-2 py-2.5 font-bold text-slate-700 w-12 text-center">ลบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentData.map((item, index, arr) => {
                                   const isNewDate = index === 0 || item.date !== arr[index-1].date;
                                   const currentCatObj = categories.find(c => c.name === item.category) || categories[categories.length-1];
                                   const isInc = currentCatObj.type === 'income';
                                   const availableCatsForSelect = categories.filter(c => c.type === currentCatObj.type);
                                   
                                   return (
                                    <tr key={item.id} className={`group transition-colors duration-200 ${isNewDate ? 'border-t-2 border-slate-200' : ''} hover:bg-slate-50`}>
                                      <td className="px-4 py-1.5 align-middle">
                                        {isNewDate ? (
                                          <div className="flex items-center gap-2 font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm w-fit transition-colors">
                                              {item.date} 
                                              <div className="flex items-center ml-1 border-l pl-2 border-slate-200">
                                                  <button onClick={() => handleOpenAddModal(item.date, 'income')} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded transition-transform hover:scale-110" title="เพิ่มรายรับในวันนี้"><PlusCircle className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => handleOpenAddModal(item.date, 'expense')} className="text-red-500 hover:bg-red-100 p-1 rounded transition-transform hover:scale-110" title="เพิ่มรายจ่ายในวันนี้"><PlusCircle className="w-3.5 h-3.5" /></button>
                                              </div>
                                          </div>
                                        ) : <span className="text-slate-300 pl-4">"</span>}
                                      </td>
                                      <td className="px-2 py-1.5 align-middle text-center">
                                          <span className={`text-[10px] font-black px-2 py-1 rounded transition-colors ${isInc ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                              {isInc ? 'รายรับ' : 'รายจ่าย'}
                                          </span>
                                      </td>
                                      
                                      <td className="px-4 py-1.5 relative align-middle">
                                        <div 
                                            className="relative w-full min-w-[200px] flex items-center rounded-lg border transition-colors shadow-sm focus-within:ring-2 focus-within:ring-opacity-50" 
                                            style={{ 
                                                backgroundColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.2 : 0.1})`, 
                                                borderColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.4 : 0.3})`
                                            }}
                                        >
                                            <div className="absolute left-3 w-3 h-3 rounded-full pointer-events-none shadow-sm border border-white/30 transition-colors" style={{ backgroundColor: currentCatObj?.color || '#cbd5e1' }}></div>
                                            <select 
                                              value={item.category}
                                              onChange={(e) => handleUpdateTransaction(item.id, 'category', e.target.value)}
                                              className="w-full bg-transparent outline-none appearance-none pl-9 pr-8 py-1.5 cursor-pointer font-bold border-none transition-colors"
                                              style={{
                                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em',
                                                color: isDarkMode ? '#f8fafc' : (currentCatObj?.color || '#475569')
                                              }}
                                            >
                                                {availableCatsForSelect.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                                            </select>
                                        </div>
                                      </td>

                                      <td className="px-4 py-1.5 group/input relative align-middle">
                                        <Pencil className={`w-3.5 h-3.5 absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-300 pointer-events-none ${isInc ? 'text-emerald-600' : 'text-[#00509E]'}`} />
                                        <EditableInput 
                                            initialValue={item.description}
                                            onSave={(val) => handleUpdateTransaction(item.id, 'description', val)}
                                            className={`w-full bg-transparent border border-transparent outline-none focus:bg-white focus:ring-1 rounded-lg py-1.5 px-3 pl-8 text-slate-800 font-medium transition-all hover:bg-slate-100 ${isInc ? 'focus:border-emerald-500 focus:ring-emerald-500' : 'focus:border-[#00509E] focus:ring-[#00509E]'}`}
                                            placeholder="ระบุรายละเอียด..."
                                        />
                                      </td>
                                      <td className="px-4 py-1.5 group/input relative align-middle">
                                        <Pencil className={`w-3.5 h-3.5 absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-300 pointer-events-none ${isInc ? 'text-emerald-600' : 'text-[#D81A21]'}`} />
                                        <EditableInput 
                                            type="number"
                                            initialValue={item.amount === 0 ? '' : item.amount}
                                            onSave={(val) => handleUpdateTransaction(item.id, 'amount', val)}
                                            className={`w-full min-w-[120px] bg-transparent border border-transparent rounded-lg py-1.5 px-3 text-right font-black hover:bg-slate-100 focus:bg-white focus:ring-1 outline-none pl-8 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isInc ? 'text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500' : 'text-slate-900 focus:border-[#D81A21] focus:ring-[#D81A21]'}`}
                                            placeholder="0"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 text-center align-middle">
                                        <button onClick={() => handleDeleteTransaction(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบรายการนี้">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                   );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0 transition-colors">
                            <span className="text-sm font-medium text-slate-500">
                                แสดงหน้าที่ {currentPage} จากทั้งหมด {totalPages} หน้า (รวม {displayTransactions.length} รายการ)
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all active:scale-95"><ChevronLeft className="w-4 h-4"/></button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all active:scale-95"><ChevronRight className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )}
                </>
              )}
            </div>
        </div>
    );
};

// --- SUB-VIEW: SETTINGS (COMPACT UI + DAY TYPES) ---
const SettingsView = ({ 
    categories, handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory,
    dayTypeConfig, setDayTypeConfig
}) => {
    
    const handleDayTypeConfigChange = (id, field, value) => {
        const newConfig = dayTypeConfig.map(dt => dt.id === id ? { ...dt, [field]: value } : dt);
        setDayTypeConfig(newConfig);
        localStorage.setItem(DAY_TYPE_CONFIG_KEY, JSON.stringify(newConfig));
    };

    const handleAddDayType = () => {
        const newConfig = [...dayTypeConfig, { id: `dt_${Date.now()}`, label: 'ชนิดวันใหม่', color: '#64748B' }];
        setDayTypeConfig(newConfig);
        localStorage.setItem(DAY_TYPE_CONFIG_KEY, JSON.stringify(newConfig));
    };

    const handleDeleteDayType = (id) => {
        if(dayTypeConfig.length <= 2) return alert('ต้องมีชนิดวันอย่างน้อย 2 อัน (เช่น วันทำงาน และ วันหยุด)');
        if(window.confirm("ยืนยันการลบชนิดวันนี้?")) {
            const newConfig = dayTypeConfig.filter(dt => dt.id !== id);
            setDayTypeConfig(newConfig);
            localStorage.setItem(DAY_TYPE_CONFIG_KEY, JSON.stringify(newConfig));
        }
    };

    const handleMoveDayType = (id, direction) => {
        const index = dayTypeConfig.findIndex(c => c.id === id);
        if (index < 0) return;

        let targetIndex = direction === 'UP' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < dayTypeConfig.length) {
            const newConfig = [...dayTypeConfig];
            const temp = newConfig[index];
            newConfig[index] = newConfig[targetIndex];
            newConfig[targetIndex] = temp;
            setDayTypeConfig(newConfig);
            localStorage.setItem(DAY_TYPE_CONFIG_KEY, JSON.stringify(newConfig));
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto py-6">
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-[#00509E] transition-colors">
                <h3 className="font-bold flex items-center gap-2 mb-1"><Settings className="w-4 h-4"/> วิธีตั้งค่ากลุ่มกระแสเงินสด (Cashflow Group)</h3>
                <ul className="list-disc ml-5 space-y-0.5">
                    <li><strong className="text-purple-700">ภาระคงที่ (Fixed):</strong> หหนี้สินหรือค่าใช้จ่ายประจำ (เช่น ค่าหอ, ผ่อนรถ) เพื่อนำไปจัดโครงสร้างภาระหนี้</li>
                    <li><strong className="text-slate-700">กลุ่มกระแสเงินสด:</strong> จัดกลุ่มเพื่อแสดงผลในตาราง Excel</li>
                </ul>
            </div>

            {/* ส่วนรายรับ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-colors">
                <div className="p-4 border-b border-emerald-200 bg-emerald-50 flex justify-between items-center transition-colors">
                    <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-600" /> หมวดหมู่รายรับ (Income)
                    </h2>
                    <button onClick={() => handleAddCategory('income')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
                        <PlusCircle className="w-4 h-4" /> เพิ่ม
                    </button>
                </div>
                <div className="p-2 bg-white transition-colors">
                    {categories.filter(c => c.type === 'income').map(cat => (
                        <div key={cat.id} className="flex flex-wrap lg:flex-nowrap items-center gap-2 p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all duration-300 group">
                            {/* เลื่อน & ลบ */}
                            <div className="flex items-center gap-0.5 shrink-0 text-slate-300">
                                <button onClick={() => handleMoveCategory(cat.id, 'UP')} className="p-1 hover:text-emerald-600 rounded transition-colors hover:bg-emerald-50" title="เลื่อนขึ้น"><ChevronUp className="w-4 h-4"/></button>
                                <button onClick={() => handleMoveCategory(cat.id, 'DOWN')} className="p-1 hover:text-emerald-600 rounded transition-colors hover:bg-emerald-50" title="เลื่อนลง"><ChevronDown className="w-4 h-4"/></button>
                            </div>
                            
                            {/* ชื่อ & ไอคอน */}
                            <div className="flex items-center gap-2 flex-grow min-w-[200px]">
                                <input type="text" value={cat.icon || ""} onChange={(e) => handleCategoryChange(cat.id, 'icon', e.target.value)} maxLength="2" className="w-8 h-8 text-center text-lg bg-slate-100 rounded outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 shrink-0 transition-colors" title="ไอคอน" />
                                <input type="text" value={cat.name || ""} onChange={(e) => handleCategoryChange(cat.id, 'name', e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded outline-none focus:border-emerald-500 focus:ring-1 font-bold text-emerald-800 text-sm transition-colors" placeholder="ชื่อหมวดหมู่รายรับ" />
                            </div>

                            {/* ตั้งค่า & ลบ */}
                            <div className="flex items-center gap-2 w-full lg:w-auto ml-8 lg:ml-0 shrink-0">
                                <span className="text-[10px] font-bold text-emerald-600 lg:hidden">กลุ่ม:</span>
                                <select value={cat.cashflowGroup || 'bonus'} onChange={(e) => handleCategoryChange(cat.id, 'cashflowGroup', e.target.value)} className="bg-white border border-emerald-200 rounded text-xs font-bold text-emerald-800 py-1 px-2 outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                                    <option value="salary">เงินเดือน</option>
                                    <option value="bonus">เงินพิเศษ/โบนัส</option>
                                </select>
                                <input type="color" value={cat.color || '#059669'} onChange={(e) => handleCategoryChange(cat.id, 'color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 transition-transform hover:scale-110" title="เปลี่ยนสี"/>
                                <div className="w-px h-4 bg-slate-200 mx-1 transition-colors"></div>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ส่วนรายจ่าย */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-colors">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-[#00509E]" /> หมวดหมู่รายจ่าย (Expenses)
                    </h2>
                    <button onClick={() => handleAddCategory('expense')} className="bg-[#00509E] hover:bg-[#003d7a] text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
                        <PlusCircle className="w-4 h-4" /> เพิ่ม
                    </button>
                </div>
                <div className="p-2 bg-white transition-colors">
                    {categories.filter(c => c.type === 'expense').map(cat => (
                        <div key={cat.id} className={`flex flex-wrap lg:flex-nowrap items-center gap-2 p-2 border-b border-slate-100 last:border-0 transition-all duration-300 group ${cat.isFixed ? 'bg-purple-50/20 hover:bg-purple-50/50' : 'hover:bg-slate-50'}`}>
                            
                            {/* เลื่อน */}
                            <div className="flex items-center gap-0.5 shrink-0 text-slate-300">
                                <button onClick={() => handleMoveCategory(cat.id, 'UP')} className="p-1 hover:text-[#00509E] rounded transition-colors hover:bg-blue-50" title="เลื่อนขึ้น"><ChevronUp className="w-4 h-4"/></button>
                                <button onClick={() => handleMoveCategory(cat.id, 'DOWN')} className="p-1 hover:text-[#00509E] rounded transition-colors hover:bg-blue-50" title="เลื่อนลง"><ChevronDown className="w-4 h-4"/></button>
                            </div>

                            {/* ชื่อ & ไอคอน */}
                            <div className="flex items-center gap-2 flex-grow min-w-[200px]">
                                <input type="text" value={cat.icon || ""} onChange={(e) => handleCategoryChange(cat.id, 'icon', e.target.value)} maxLength="2" className="w-8 h-8 text-center text-lg bg-slate-100 rounded outline-none focus:ring-1 focus:ring-[#00509E] border border-slate-200 shrink-0 transition-colors" title="ไอคอน"/>
                                <input type="text" value={cat.name || ""} onChange={(e) => handleCategoryChange(cat.id, 'name', e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded outline-none focus:border-[#00509E] focus:ring-1 font-bold text-slate-800 text-sm transition-colors" placeholder="ชื่อหมวดหมู่รายจ่าย" />
                            </div>

                            {/* ตั้งค่า & ลบ */}
                            <div className="flex items-center gap-2 w-full lg:w-auto ml-8 lg:ml-0 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500 lg:hidden">กลุ่ม:</span>
                                <select value={cat.cashflowGroup || 'variable'} onChange={(e) => handleCategoryChange(cat.id, 'cashflowGroup', e.target.value)} className="bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 py-1 px-2 outline-none focus:border-[#00509E] max-w-[120px] truncate transition-colors cursor-pointer">
                                    <option value="rent">ค่าหอ/ที่พัก</option>
                                    <option value="subs">รายเดือน/หนี้</option>
                                    <option value="food">ค่ากิน</option>
                                    <option value="invest">ลงทุน/ออม</option>
                                    <option value="it">ไอที/คอมฯ</option>
                                    <option value="variable">ผันแปรอื่นๆ</option>
                                </select>
                                
                                <label className={`flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded transition-colors border ${cat.isFixed ? 'bg-purple-100 text-purple-800 border-purple-200' : 'hover:bg-slate-100 text-slate-400 border-transparent'}`} title="ตั้งเป็นภาระคงที่">
                                    <input type="checkbox" checked={!!cat.isFixed} onChange={(e) => handleCategoryChange(cat.id, 'isFixed', e.target.checked)} className="w-3 h-3 accent-purple-600 rounded cursor-pointer" />
                                    <span className="text-[11px] font-bold">Fixed</span>
                                </label>
                                
                                <input type="color" value={cat.color || '#64748B'} onChange={(e) => handleCategoryChange(cat.id, 'color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 transition-transform hover:scale-110" title="เปลี่ยนสี"/>
                                
                                <div className="w-px h-4 bg-slate-200 mx-1 transition-colors"></div>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ส่วนปรับแต่งชนิดวันของปฏิทิน */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-colors">
                <div className="p-4 border-b border-orange-200 bg-orange-50 flex justify-between items-center transition-colors">
                    <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                        <CalendarClock className="w-5 h-5 text-orange-600" /> ชนิดของวันบนปฏิทิน (Day Types)
                    </h2>
                    <button onClick={handleAddDayType} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
                        <PlusCircle className="w-4 h-4" /> เพิ่ม
                    </button>
                </div>
                <div className="p-2 bg-white transition-colors grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dayTypeConfig.map(dt => (
                        <div key={dt.id} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all duration-300 group">
                            <div className="flex flex-col items-center shrink-0 text-slate-300">
                                <button onClick={() => handleMoveDayType(dt.id, 'UP')} className="p-0.5 hover:text-orange-600 rounded transition-colors" title="เลื่อนขึ้น"><ChevronUp className="w-4 h-4"/></button>
                                <button onClick={() => handleMoveDayType(dt.id, 'DOWN')} className="p-0.5 hover:text-orange-600 rounded transition-colors" title="เลื่อนลง"><ChevronDown className="w-4 h-4"/></button>
                            </div>
                            
                            <input type="text" value={dt.label} onChange={(e) => handleDayTypeConfigChange(dt.id, 'label', e.target.value)} className="flex-grow px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-orange-500 focus:ring-1 font-bold text-slate-800 text-sm transition-colors" placeholder="ชื่อชนิดวัน" />

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500">สีป้าย:</span>
                                <input type="color" value={dt.color} onChange={(e) => handleDayTypeConfigChange(dt.id, 'color', e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0 transition-transform hover:scale-110" title="เปลี่ยนสี"/>
                                <div className="w-px h-4 bg-slate-200 mx-1 transition-colors"></div>
                                <button onClick={() => handleDeleteDayType(dt.id)} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('expense_dark_mode') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showToast, setShowToast] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('ALL');
  
  // State สำหรับ Day Types ของปฏิทิน
  const [dayTypes, setDayTypes] = useState(() => JSON.parse(localStorage.getItem(DAY_TYPES_KEY) || '{}'));
  const [dayTypeConfig, setDayTypeConfig] = useState(() => {
      const saved = localStorage.getItem(DAY_TYPE_CONFIG_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_DAY_TYPES;
  });

  const handleDayTypeChange = (dateStr, type) => {
      const newTypes = { ...dayTypes, [dateStr]: type };
      setDayTypes(newTypes);
      localStorage.setItem(DAY_TYPES_KEY, JSON.stringify(newTypes));
  };

  // Advanced Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState('ALL');

  const [isProcessing, setIsProcessing] = useState(false);
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');
  const [hideFixedExpenses, setHideFixedExpenses] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('ALL'); // ใช้เก็บช่วงเวลาตอน Export
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [addForm, setAddForm] = useState({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: ''
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
    const savedCats = localStorage.getItem(CATEGORIES_KEY);
    if (savedCats) {
      try { 
        let parsed = JSON.parse(savedCats);
        parsed = parsed.map(c => {
            let cGroup = c.cashflowGroup;
            let cFixed = c.isFixed;
            let cColor = c.color;
            
            if (!cColor) {
                cColor = OLD_PALETTE_MAP[c.colorId] || '#64748B'; 
            }

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
      } catch(e) { console.error(e); }
    }

    const sortTransactions = (dataArr) => {
        return [...dataArr].sort((a, b) => {
            const dateDiff = parseDateStrToObj(a.date) - parseDateStrToObj(b.date);
            if (dateDiff !== 0) return dateDiff;
            return String(a.id).localeCompare(String(b.id));
        });
    };

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setTransactions(sortTransactions(data));
      setDbStatus('Online (PostgreSQL)');
    } catch (err) {
      const localData = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '[]');
      setTransactions(sortTransactions(localData));
      setDbStatus('Offline (Local Storage)');
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
        const itemsArray = Array.isArray(items) ? items : [items];
        let localData = [];
        try { localData = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '[]'); } catch(e) {}
        itemsArray.forEach(newItem => {
            const idx = localData.findIndex(t => t.id === newItem.id);
            if (idx >= 0) localData[idx] = newItem; else localData.push(newItem);
        });
        localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(localData));
      }
      await loadData(); 
  };

  // --- ACTIONS ---
  const handleCategoryChange = async (catId, field, value) => {
    const oldCat = categories.find(c => c.id === catId);
    if (!oldCat) return;
    const updatedCats = categories.map(c => c.id === catId ? { ...c, [field]: value } : c);
    setCategories(updatedCats);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCats));

    if (field === 'name' && value !== oldCat.name) {
        const txToUpdate = transactions.filter(t => t.category === oldCat.name).map(t => ({...t, category: value}));
        if (txToUpdate.length > 0) await saveToDb(txToUpdate);
    }
  };

  const handleAddCategory = (type = 'expense') => {
    const newCat = { 
        id: `c${Date.now()}`, 
        name: type === 'income' ? "รายรับใหม่" : "หมวดหมู่ใหม่", 
        icon: type === 'income' ? "💵" : "✨", 
        color: type === 'income' ? "#059669" : "#64748B", 
        type: type,
        cashflowGroup: type === 'income' ? 'bonus' : 'variable',
        isFixed: false
    };
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCats));
  };

  const handleDeleteCategory = (catId) => {
    const catToDelete = categories.find(c => c.id === catId);
    const sameTypeCats = categories.filter(c => c.type === catToDelete.type);
    if (sameTypeCats.length <= 1) return alert(`ต้องมีหมวดหมู่อย่างน้อย 1 อัน`);
    if (window.confirm("ยืนยันการลบหมวดหมู่นี้?")) {
        const updatedCats = categories.filter(c => c.id !== catId);
        setCategories(updatedCats);
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCats));
    }
  };

  const handleMoveCategory = (id, direction) => {
      const index = categories.findIndex(c => c.id === id);
      if (index < 0) return;
      const targetType = categories[index].type;

      let targetIndex = -1;
      if (direction === 'UP') {
          for (let i = index - 1; i >= 0; i--) {
              if (categories[i].type === targetType) { targetIndex = i; break; }
          }
      } else {
          for (let i = index + 1; i < categories.length; i++) {
              if (categories[i].type === targetType) { targetIndex = i; break; }
          }
      }

      if (targetIndex !== -1) {
          const newCats = [...categories];
          const temp = newCats[index];
          newCats[index] = newCats[targetIndex];
          newCats[targetIndex] = temp;
          setCategories(newCats);
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCats));
      }
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
        let newDayTypes = { ...dayTypes }; // เตรียมอัปเดตชนิดวันจากไฟล์

        // ตรวจสอบว่าเป็นรูปแบบ TSV (ข้อมูลที่คัดลอกจาก Excel หรือ Export จากแอป)
        const firstLine = rawTrimmed.split('\n')[0];
        const isTSVLong = firstLine.includes('\t');

        if (isTSVLong) {
            const lines = rawTrimmed.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const row = lines[i].split('\t').map(c => c.trim());
                
                // ข้าม Header
                if (row[0] === 'วันที่' || row[0].toLowerCase() === 'date') continue;
                
                // ถ้ายาวอย่างน้อย 4 คอลัมน์ ถือว่าอาจจะใช่
                if (row.length >= 4) {
                    const dateStr = row[0];
                    if(!dateStr || !dateStr.includes('/')) continue; // ตรวจสอบรูปแบบวันที่เบื้องต้น

                    let catName, desc, amtStr;
                    // Format: วันที่ | ชนิดวัน | ประเภท | หมวดหมู่ | รายละเอียด | จำนวนเงิน (6 columns)
                    if (row.length >= 6) {
                         const foundType = dayTypeConfig.find(dt => dt.label === row[1]);
                         if (foundType) newDayTypes[dateStr] = foundType.id;
                         catName = row[3];
                         desc = row[4];
                         amtStr = row[5];
                    }
                    // Format: วันที่ | ประเภท | หมวดหมู่ | รายละเอียด | จำนวนเงิน (5 columns)
                    else if (row.length === 5) {
                         catName = row[2];
                         desc = row[3];
                         amtStr = row[4];
                    } 
                    // Format: วันที่ | หมวดหมู่ | รายละเอียด | จำนวนเงิน (4 columns)
                    else { 
                         catName = row[1];
                         desc = row[2];
                         amtStr = row[3];
                    }
                    
                    const amount = cleanNumber(amtStr);
                    if (amount !== 0) {
                         newList.push({
                             id: `csv_${batchId}_${i}`,
                             date: dateStr,
                             category: autoCategorize(desc, catName, categories),
                             description: desc || catName,
                             amount: Math.abs(amount),
                             dayNote: ''
                         });
                    }
                }
            }
        } else {
            // รูปแบบตารางกว้าง (Wide Format) แบบเดิม
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

            // กรณี Export เป็น CSV รองรับ 6 คอลัมน์ (มีชนิดวัน) หรือ 5 คอลัมน์
            const isCsvLong = headers.length >= 4 && (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน');

            for (let i = 1; i < parsedRows.length; i++) {
                const row = parsedRows[i];
                if (row.length < 2) continue;
                const dateStr = row[dateColIndex];
                if(!dateStr || !dateStr.includes('/')) continue;

                if (isCsvLong) {
                    let catName, desc, amtStr;
                    // Format: วันที่ | ชนิดวัน | ประเภท | หมวดหมู่ | รายละเอียด | จำนวนเงิน
                    if (headers[1] === 'ชนิดวัน' && row.length >= 6) {
                         const foundType = dayTypeConfig.find(dt => dt.label === row[1]);
                         if (foundType) newDayTypes[dateStr] = foundType.id;
                         catName = row[3]; desc = row[4]; amtStr = row[5];
                    }
                    // Format: วันที่ | ประเภท | หมวดหมู่ | รายละเอียด | จำนวนเงิน
                    else if (headers[1] === 'ประเภท' && row.length >= 5) {
                         catName = row[2]; desc = row[3]; amtStr = row[4];
                    } else {
                         catName = row[1]; desc = row[2]; amtStr = row[3];
                    }
                    const amount = cleanNumber(amtStr);
                    if (amount !== 0) {
                        newList.push({
                            id: `csv_${batchId}_${i}`,
                            date: dateStr,
                            category: autoCategorize(desc, catName, categories),
                            description: desc || catName,
                            amount: Math.abs(amount),
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
                        let description = catName;
                        if (note !== '' && (catName.includes('ออนไลน์') || catName.includes('อื่นๆ'))) description = note; 

                        newList.push({ 
                            id: `csv_${batchId}_${i}_${j}`, 
                            date: dateStr, 
                            category: autoCategorize(description, catName, categories), 
                            description: description, 
                            amount: Math.abs(amount), 
                            dayNote: note 
                        });
                    }
                }
            }
        }

        if(newList.length > 0) {
            await saveToDb(newList);
            setDayTypes(newDayTypes); // บันทึกชนิดวันลง State ปฏิทิน
            localStorage.setItem(DAY_TYPES_KEY, JSON.stringify(newDayTypes)); // เซฟลงเครื่อง
            alert(`อัปโหลดสำเร็จ ${newList.length} รายการ!`);
            setActiveTab('ledger');
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
            let localData = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '[]');
            localData = localData.filter(t => t.id !== id);
            localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(localData));
        }
        await loadData();
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
              let localData = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '[]');
              const idsToDelete = new Set(itemsToDelete.map(i => i.id));
              localData = localData.filter(t => !idsToDelete.has(t.id));
              localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(localData));
          }
          
          await loadData();
          setIsProcessing(false);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
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
          category: categories.find(c => c.type === type)?.name || ''
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

      const newItem = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          date: formattedDate,
          category: targetCat,
          description: addForm.description || targetCat,
          amount: Number(addForm.amount),
          dayNote: '',
          _catObj: catObj,
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
              dayNote: item.dayNote
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

  const analytics = useMemo(() => {
    const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
    let totalExpense = 0, totalIncome = 0, weekendTotal = 0, weekdayTotal = 0;
    let foodTotal = 0, fixedTotal = 0, variableTotal = 0, rentTotal = 0, itTotal = 0, investTotal = 0;
    let dayOfWeekMap = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    let uniqueMonthsSet = new Set(), cashflowMap = {}; 
    let dayIncomeMap = {}, dayExpenseMap = {};

    filteredTx.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        const catObj = categories.find(c => c.name === item.category) || { type: 'expense', cashflowGroup: 'variable', isFixed: false, color: '#64748B' };
        const isInc = catObj.type === 'income';
        const cGroup = catObj.cashflowGroup || 'variable';
        const isFixed = catObj.isFixed || false;

        if (!item.date) return;
        const parts = item.date.split('/');
        if (parts.length !== 3) return;
        
        const ym = `${parts[2]}-${parts[1]}`;
        uniqueMonthsSet.add(ym);

        if (!cashflowMap[ym]) cashflowMap[ym] = { monthStr: ym, salary: 0, bonus: 0, rent: 0, food: 0, invest: 0, it: 0, subs: 0, variable: 0, totalExp: 0, income: 0 };

        if (isInc) {
            totalIncome += amt; cashflowMap[ym].income += amt;
            dayIncomeMap[item.date] = (dayIncomeMap[item.date] || 0) + amt;
            if (cGroup === 'salary') cashflowMap[ym].salary += amt; else cashflowMap[ym].bonus += amt;
        } else {
            totalExpense += amt; cashflowMap[ym].totalExp += amt;
            dayExpenseMap[item.date] = (dayExpenseMap[item.date] || 0) + amt;
            const dayOfWeek = parseDateStrToObj(item.date).getDay();
            if(dayOfWeek === 0 || dayOfWeek === 6) weekendTotal += amt; else weekdayTotal += amt;
            dayOfWeekMap[dayOfWeek] += amt;

            if (cGroup === 'rent') { rentTotal += amt; cashflowMap[ym].rent += amt; }
            else if (cGroup === 'food') { foodTotal += amt; cashflowMap[ym].food += amt; }
            else if (cGroup === 'it') { itTotal += amt; cashflowMap[ym].it += amt; }
            else if (cGroup === 'invest') { investTotal += amt; cashflowMap[ym].invest += amt; }
            else if (cGroup === 'subs') { cashflowMap[ym].subs += amt; } 
            else { cashflowMap[ym].variable += amt; }

            if (isFixed) fixedTotal += amt; else variableTotal += amt;
        }
    });

    const netCashflow = totalIncome - totalExpense;
    const numMonths = uniqueMonthsSet.size || 1;
    const savingsRate = totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(1) : 0;

    const chartTx = filteredTx.filter(t => {
        const catObj = categories.find(c => c.name === t.category) || { type: 'expense', isFixed: false };
        if (catObj.type === 'income') return false; 
        if (hideFixedExpenses && catObj.isFixed) return false; 
        return true;
    });

    let catMap = {}, dayMap = {}, monthGroupMap = {};
    chartTx.forEach(item => {
        if (!item.date) return;
        const amt = parseFloat(item.amount) || 0;
        catMap[item.category] = (catMap[item.category] || 0) + amt;
        dayMap[item.date] = (dayMap[item.date] || 0) + amt;
        const parts = item.date.split('/');
        if (parts.length === 3) monthGroupMap[`${parts[2]}-${parts[1]}`] = (monthGroupMap[`${parts[2]}-${parts[1]}`] || 0) + amt;
    });

    const chartTotal = chartTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(c => ({
        name: c[0], amount: c[1], percentage: chartTotal > 0 ? ((c[1] / chartTotal) * 100).toFixed(1) : 0, avgPerMonth: c[1] / numMonths
    }));
    
    const uniqueDays = Object.keys(dayMap).length || 1;
    const dailyAvg = totalExpense / uniqueDays; 
    
    const foodDailyAvg = foodTotal / uniqueDays;
    const foodPercentage = totalExpense > 0 ? ((foodTotal / totalExpense) * 100).toFixed(1) : 0;
    const rentPercentage = totalExpense > 0 ? ((rentTotal / totalExpense) * 100).toFixed(1) : 0;
    const fixedPercentage = totalExpense > 0 ? ((fixedTotal / totalExpense) * 100).toFixed(1) : 0;
    const variablePercentage = totalExpense > 0 ? ((variableTotal / totalExpense) * 100).toFixed(1) : 0;

    const catChartData = {
      labels: sortedCats.map(c => c.name),
      datasets: [{
          data: sortedCats.map(c => c.amount),
          backgroundColor: sortedCats.map(c => {
             const catDef = categories.find(cat => cat.name === c.name);
             return catDef?.color || '#64748B'; 
          }),
          borderWidth: 2, borderColor: '#ffffff'
      }]
    };

    let mainChartData = null, mainChartType = 'bar';
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const isMultiMonthView = !isSingleMonthView;

    const sortedCashflow = Object.values(cashflowMap).sort((a,b) => a.monthStr.localeCompare(b.monthStr));
    
    const sparklineIncome = [];
    const sparklineExpense = [];
    const sparklineNet = [];

    if (isMultiMonthView) { 
        const sortedMonths = Object.keys(cashflowMap).sort();
        
        sortedMonths.forEach(m => {
            sparklineIncome.push(cashflowMap[m].income);
            sparklineExpense.push(cashflowMap[m].totalExp);
            sparklineNet.push(cashflowMap[m].income - cashflowMap[m].totalExp);
        });

        if (!hideFixedExpenses) {
            mainChartType = 'combo';
            mainChartData = {
                 labels: sortedMonths.map(m => getThaiMonth(m)),
                 datasets: [
                    { type: 'line', label: 'Cashflow', data: sortedMonths.map(m => cashflowMap[m].income - cashflowMap[m].totalExp), borderColor: '#00509E', backgroundColor: '#00509E', borderWidth: 3, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#ffffff', pointBorderWidth: 2 },
                    { type: 'bar', label: 'รายรับ', data: sortedMonths.map(m => cashflowMap[m].income), backgroundColor: '#10B981', borderRadius: 4 },
                    { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonths.map(m => cashflowMap[m].totalExp), backgroundColor: '#EF4444', borderRadius: 4 }
                 ]
             };
        } else {
            mainChartType = 'bar';
            mainChartData = { labels: sortedMonths.map(m => getThaiMonth(m)), datasets: [{ label: 'รายจ่ายไลฟ์สไตล์ (บาท)', data: sortedMonths.map(m => monthGroupMap[m] || 0), backgroundColor: '#D81A21', borderRadius: 4 }] };
        }
    } else {
        mainChartType = 'line';
        let y, m;
        if (filterPeriod.match(/^\d{4}-\d{2}$/)) [y, m] = filterPeriod.split('-');
        else { const today = new Date(); y = today.getFullYear(); m = (today.getMonth()+1).toString().padStart(2, '0'); }
        const daysInMonth = new Date(y, m, 0).getDate();
        const daysArray = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString().padStart(2, '0'));
        const dailyData = daysArray.map(d => dayMap[`${d}/${m}/${y}`] || 0);

        daysArray.forEach(d => {
            const dateKey = `${d}/${m}/${y}`;
            const inc = dayIncomeMap[dateKey] || 0;
            const exp = dayExpenseMap[dateKey] || 0;
            sparklineIncome.push(inc);
            sparklineExpense.push(exp);
            sparklineNet.push(inc - exp);
        });

        mainChartData = {
            labels: daysArray.map(d => `วันที่ ${d}`),
            datasets: [{
                label: hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์ (บาท)' : 'ยอดใช้จ่ายรายวัน (บาท)', data: dailyData,
                borderColor: hideFixedExpenses ? '#D81A21' : '#EF4444', backgroundColor: hideFixedExpenses ? 'rgba(216, 26, 33, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: hideFixedExpenses ? '#D81A21' : '#EF4444'
            }]
        };
    }

    // --- การคำนวณและสรุปจำนวนชนิดวัน (Day Types) สำหรับ Dashboard ---
    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
    const dayTypeCounts = {};
    dayTypeConfig.forEach(dt => dayTypeCounts[dt.id] = 0);

    datesInPeriod.forEach(dateStr => {
        const [d, m, currY] = dateStr.split('/');
        const dayOfWeek = new Date(currY, parseInt(m)-1, d).getDay();
        const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
        const currentType = dayTypes[dateStr] || defaultType;
        if(currentType && dayTypeCounts[currentType] !== undefined) {
            dayTypeCounts[currentType]++;
        } else if (currentType) {
             dayTypeCounts[currentType] = 1;
        }
    });

    return { 
        totalExpense, totalIncome, netCashflow, savingsRate, chartTotal, numMonths,
        sortedCats, top7Transactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, 7), 
        dailyAvg, uniqueDays,
        catChartData, mainChartData, mainChartType,
        foodTotal, foodDailyAvg, foodPercentage,
        rentTotal, rentPercentage,
        fixedTotal, variableTotal, fixedPercentage, variablePercentage,
        emergencyFundTarget: (totalExpense / numMonths) * 6, sortedCashflow,
        sparklineIncome, sparklineExpense, sparklineNet,
        dayTypeCounts, datesInPeriod
    };
  }, [transactions, filterPeriod, categories, hideFixedExpenses, dayTypes, dayTypeConfig]);

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

  const openExportModal = () => {
      setExportPeriod(filterPeriod); // ตั้งค่าเริ่มต้นให้ตรงกับหน้าที่ดูอยู่
      setShowExportModal(true);
  };

  const executeExport = () => {
    const dataToExport = transactions.filter(t => isDateInFilter(t.date, exportPeriod));
    
    if (dataToExport.length === 0) return alert("ไม่มีข้อมูลในช่วงเวลาที่เลือก");
    
    // สร้างหัวตาราง CSV เพิ่ม ชนิดวัน
    let csvContent = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n";
    
    // ฟังก์ชันช่วยครอบคำที่มีลูกน้ำด้วย ""
    const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    dataToExport.forEach(item => {
        // หาชนิดวันของวันที่นั้นๆ
        const [d, m, y] = item.date.split('/');
        const dayOfWeek = new Date(y, parseInt(m)-1, d).getDay();
        const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
        const currentTypeId = dayTypes[item.date] || defaultType;
        const typeConfig = dayTypeConfig.find(dt => dt.id === currentTypeId) || dayTypeConfig[0];
        const dayTypeLabel = typeConfig ? typeConfig.label : '';

        const catObj = categories.find(c => c.name === item.category);
        const isInc = catObj ? catObj.type === 'income' : false;
        const typeStr = isInc ? 'รายรับ' : 'รายจ่าย';
        
        // เพิ่มชนิดวันเข้าไปเป็นคอลัมน์ที่ 2
        csvContent += `${item.date},${escapeCSV(dayTypeLabel)},${typeStr},${escapeCSV(item.category)},${escapeCSV(item.description || '')},${item.amount}\n`;
    });

    // สร้างไฟล์ Blob แบบรองรับภาษาไทย (BOM)
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Expense_Export_${exportPeriod.replace('/', '-')}.csv`);
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
                    <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Cashflow Analytics <span className="text-[#D81A21] text-2xl font-black italic">PRO</span></h1>
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
                    setAddForm(prev => ({...prev, date: new Date().toISOString().split('T')[0], category: categories.find(c => c.type === 'expense')?.name || ''}));
                    setShowAddModal(true);
                }} className="text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95">
                  <CalendarPlus className="w-4 h-4" /> เพิ่มข้อมูลด่วน
                </button>
                <button onClick={openExportModal} className={`hidden md:flex text-sm font-bold flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm border active:scale-95 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/50' : 'bg-blue-50 text-[#00509E] border-blue-200 hover:bg-[#00509E] hover:text-white'}`}><Download className="w-4 h-4" /> ส่งออก CSV</button>
                <label className={`cursor-pointer flex items-center gap-2 font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 ${isProcessing ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-300 text-slate-600') : (isDarkMode ? 'bg-[#00509E] hover:bg-blue-700 text-white' : 'bg-[#00509E] hover:bg-[#003d7a] text-white')}`}>
                    {isProcessing ? <Zap className="w-5 h-5 animate-pulse text-[#F4B800]" /> : <FileSpreadsheet className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-200'}`} />}
                    <span>{isProcessing ? 'กำลังประมวลผล...' : 'อัปโหลด CSV'}</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isProcessing} ref={fileInputRef} />
                </label>
            </div>
        </div>

        <div className={`flex flex-col md:flex-row justify-between items-center px-6 border-b gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
          <div className="flex w-full md:w-auto overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'dashboard' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><BarChart3 className="w-5 h-5" /> เจาะลึกวิเคราะห์</button>
            <button onClick={() => setActiveTab('calendar')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'calendar' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><CalendarIcon className="w-5 h-5" /> ปฏิทิน</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'ledger' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><ClipboardList className="w-5 h-5" /> ฐานข้อมูลบัญชี</button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${activeTab === 'settings' ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50') : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')}`}><Settings className="w-5 h-5" /> ตั้งค่าระบบ</button>
          </div>
          {(activeTab === 'dashboard' || activeTab === 'ledger' || activeTab === 'calendar') && (
            <div className="flex items-center gap-3 py-3 w-full md:w-auto justify-end flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <CalendarDays className="w-5 h-5 text-[#D81A21]"/>
                  <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className={`bg-transparent text-base font-semibold outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      <option value="ALL">ดูภาพรวมทั้งหมด (All Time)</option>
                      {groupedOptions.sortedYears.map(year => {
                          const data = groupedOptions.yearsMap[year];
                          return (
                              <optgroup key={year} label={`▶ ข้อมูลปี ${year}`}>
                                  <option value={year}>➡️ สรุปทั้งปี {year}</option>
                                  {data.halves.has(`${year}-H2`) && <option value={`${year}-H2`}>ครึ่งปีหลัง (H2)</option>}
                                  {data.halves.has(`${year}-H1`) && <option value={`${year}-H1`}>ครึ่งปีแรก (H1)</option>}
                                  {data.quarters.has(`${year}-Q4`) && <option value={`${year}-Q4`}>ไตรมาส 4 (Q4)</option>}
                                  {data.quarters.has(`${year}-Q3`) && <option value={`${year}-Q3`}>ไตรมาส 3 (Q3)</option>}
                                  {data.quarters.has(`${year}-Q2`) && <option value={`${year}-Q2`}>ไตรมาส 2 (Q2)</option>}
                                  {data.quarters.has(`${year}-Q1`) && <option value={`${year}-Q1`}>ไตรมาส 1 (Q1)</option>}
                                  <option disabled={true}>--- รายเดือน ---</option>
                                  {Array.from(data.months).sort().reverse().map(m => (
                                      <option key={m} value={m}>{getThaiMonth(m)}</option>
                                  ))}
                              </optgroup>
                          );
                      })}
                  </select>
                </div>
            </div>
          )}
        </div>

        <div className={`p-6 relative flex-grow overflow-y-auto custom-scrollbar transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          {activeTab === 'dashboard' && <DashboardView analytics={analytics} transactions={transactions} filterPeriod={filterPeriod} getFilterLabel={getFilterLabel} hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses} categories={categories} dayTypeConfig={dayTypeConfig} isDarkMode={isDarkMode} dayTypes={dayTypes} />}
          {activeTab === 'calendar' && <CalendarView transactions={transactions} filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths} handleOpenAddModal={handleOpenAddModal} categories={categories} isDarkMode={isDarkMode} dayTypes={dayTypes} handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig} getFilterLabel={getFilterLabel} isReadOnlyView={isReadOnlyView} />}
          {activeTab === 'ledger' && <LedgerView displayTransactions={displayTransactions} isReadOnlyView={isReadOnlyView} getFilterLabel={getFilterLabel} filterPeriod={filterPeriod} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleOpenAddModal={handleOpenAddModal} handleUpdateTransaction={handleUpdateTransaction} handleDeleteTransaction={handleDeleteTransaction} handleDeleteMonth={handleDeleteMonth} categories={categories} advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory} advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup} advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate} availableDatesInPeriod={availableDatesInPeriod} isDarkMode={isDarkMode} />}
          {activeTab === 'settings' && <SettingsView categories={categories} handleAddCategory={handleAddCategory} handleCategoryChange={handleCategoryChange} handleDeleteCategory={handleDeleteCategory} handleMoveCategory={handleMoveCategory} dayTypeConfig={dayTypeConfig} setDayTypeConfig={setDayTypeConfig} />}
        </div>
      </div>

      {/* --- ADD TRANSACTION MODAL (STAGING AREA) --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 transition-all">
            <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className={`p-5 border-b flex justify-between items-center shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><CalendarPlus className="w-6 h-6 text-emerald-600"/> สรุปค่าใช้จ่ายประจำวัน (Batch Add)</h3>
                    <button onClick={() => { setShowAddModal(false); setPendingItems([]); }} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-200'}`}><X className="w-5 h-5"/></button>
                </div>

                <div className={`flex-grow overflow-y-auto flex flex-col lg:flex-row custom-scrollbar transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className={`w-full lg:w-2/5 p-6 border-b lg:border-b-0 lg:border-r space-y-4 shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
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
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>จำนวนเงิน (Amount)</label>
                            <input type="number" value={addForm.amount} onChange={(e) => setAddForm({...addForm, amount: e.target.value})} onKeyDown={handleAddFormKeyDown} placeholder="0.00" className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 font-black text-xl text-right transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400 focus:border-blue-500 focus:ring-blue-500' : 'border-slate-300 focus:border-[#00509E] text-[#00509E]'}`} />
                        </div>
                        <button onClick={handleAddPending} className={`w-full mt-2 px-4 py-3 border rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-[#00509E] border-slate-300'}`}>
                            <PlusCircle className="w-5 h-5"/> เพิ่มลงตะกร้า (Enter)
                        </button>
                    </div>

                    <div className={`w-full lg:w-3/5 flex flex-col p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
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
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`text-xs font-bold w-5 text-right ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>{idx+1}.</div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <div className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={item.description}>{item.description}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${item._isInc ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>{item._isInc ? 'รายรับ' : 'รายจ่าย'}</span>
                                                            <span 
                                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate border ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                                                                style={{ backgroundColor: `rgba(${hexToRgb(item._catObj?.color)}, ${isDarkMode ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._catObj?.color)}, ${isDarkMode ? 0.4 : 0.3})` }}
                                                            >
                                                                {item._catObj?.icon} {item.category}
                                                            </span>
                                                            <span className={`text-xs font-medium hidden sm:inline ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.date}</span>
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

      {/* --- EXPORT MODAL --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><Download className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> ส่งออกไฟล์ CSV</h3>
                    <button onClick={() => setShowExportModal(false)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
                </div>
                <div className={`mb-5 border rounded-xl p-4 space-y-2 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                    <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>เลือกรอบบิลที่ต้องการส่งออก (Export Period)</label>
                    <select value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-sm outline-none font-medium cursor-pointer appearance-none border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E]'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">ดาวน์โหลดข้อมูลทั้งหมด (All Time)</option>
                        {groupedOptions.sortedYears.map(year => {
                            const data = groupedOptions.yearsMap[year];
                            return (
                                <optgroup key={year} label={`▶ ข้อมูลปี ${year}`}>
                                    <option value={year}>➡️ สรุปทั้งปี {year}</option>
                                    {data.halves.has(`${year}-H2`) && <option value={`${year}-H2`}>ครึ่งปีหลัง (H2)</option>}
                                    {data.halves.has(`${year}-H1`) && <option value={`${year}-H1`}>ครึ่งปีแรก (H1)</option>}
                                    {data.quarters.has(`${year}-Q4`) && <option value={`${year}-Q4`}>ไตรมาส 4 (Q4)</option>}
                                    {data.quarters.has(`${year}-Q3`) && <option value={`${year}-Q3`}>ไตรมาส 3 (Q3)</option>}
                                    {data.quarters.has(`${year}-Q2`) && <option value={`${year}-Q2`}>ไตรมาส 2 (Q2)</option>}
                                    {data.quarters.has(`${year}-Q1`) && <option value={`${year}-Q1`}>ไตรมาส 1 (Q1)</option>}
                                    <option disabled={true}>--- รายเดือน ---</option>
                                    {Array.from(data.months).sort().reverse().map(m => (
                                        <option key={m} value={m}>{getThaiMonth(m)}</option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
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