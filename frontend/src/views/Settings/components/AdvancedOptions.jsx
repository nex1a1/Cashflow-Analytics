import { Settings2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function AdvancedOptions({ enableSmartInsights, setEnableSmartInsights }) {
  const { isDarkMode: dm } = useTheme();

  return (
    <div className={`border-2 overflow-hidden mb-4 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`px-4 py-2 border-b-2 flex items-center gap-2 ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100/60 border-slate-200'}`}>
        <Settings2 className={`w-4 h-4 ${dm ? 'text-slate-400' : 'text-slate-600'}`} />
        <h2 className={`text-sm font-black tracking-wide ${dm ? 'text-slate-300' : 'text-slate-700'}`}>ตั้งค่าขั้นสูง (Advanced Options)</h2>
      </div>
      <div className={`px-5 py-3 flex flex-col items-start gap-2 ${dm ? '' : 'bg-white/60'}`}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input type="checkbox" checked={enableSmartInsights} onChange={e => setEnableSmartInsights(e.target.checked)} className="sr-only peer" />
            <div className={`w-9 h-5 rounded-full transition-colors ${enableSmartInsights ? (dm ? 'bg-blue-600' : 'bg-blue-500') : (dm ? 'bg-slate-700' : 'bg-slate-300')}`}></div>
            <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4`}></div>
          </div>
          <div>
            <p className={`text-[13px] font-bold ${dm ? 'text-slate-200' : 'text-slate-800'}`}>เปิดการแจ้งเตือนอัจฉริยะ (Smart Insights)</p>
            <p className={`text-[11px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>แสดงแถบแจ้งเตือนวิเคราะห์พฤติกรรมการใช้จ่ายที่ด้านบนของ Dashboard</p>
          </div>
        </label>
      </div>
    </div>
  );
}
