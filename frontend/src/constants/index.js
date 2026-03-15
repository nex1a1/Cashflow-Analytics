// src/constants/index.js

export const API_URL = 'http://localhost:3000/api/transactions';
export const CALENDAR_API_URL = 'http://localhost:3000/api/calendar';
export const RESET_API_URL = 'http://localhost:3000/api/reset-all';
export const SETTINGS_API_URL = 'http://localhost:3000/api/settings';
export const CATEGORIES_KEY = 'expense_custom_categories_v2';
export const DAY_TYPES_KEY = 'expense_day_types';
export const DAY_TYPE_CONFIG_KEY = 'expense_day_type_config';

export const OLD_PALETTE_MAP = {
  'slate': '#64748B', 'red': '#EF4444', 'orange': '#F97316', 'amber': '#F59E0B',
  'green': '#10B981', 'teal': '#14B8A6', 'blue': '#3B82F6', 'indigo': '#6366F1',
  'purple': '#8B5CF6', 'pink': '#EC4899', 'rose': '#F43F5E', 'gundam-blue': '#00509E',
  'gundam-red': '#D81A21', 'gundam-gold': '#F4B800', 'income-green': '#059669'
};

export const DEFAULT_CATEGORIES = [
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

export const DEFAULT_DAY_TYPES = [
    { id: 'WORK', label: 'ทำงาน', color: '#22C55E' },     // Green
    { id: 'HOLIDAY', label: 'วันหยุด', color: '#E2E8F0' }, // Light Slate
    { id: 'SICK', label: 'ป่วย', color: '#EF4444' },       // Red
    { id: 'LEAVE', label: 'ลากิจ', color: '#EAB308' },      // Yellow
    { id: 'EVENT', label: 'กิจกรรม บ.', color: '#A855F7' }   // Purple
];