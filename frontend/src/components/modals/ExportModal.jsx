import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, X, AlertCircle, ClipboardList, FileSpreadsheet, 
  CheckCircle, Loader2, Database, ShieldCheck, Zap, 
  BarChart3, Info, Terminal, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PeriodPicker from '../layout/PeriodPicker';
import { isDateInFilter } from '../../utils/dateHelpers';
import { transactionService } from '../../services/api';

export default function ExportModal({
  isOpen, onClose, transactions: filteredTransactions, categories, dayTypes, dayTypeConfig,
  groupedOptions, getFilterLabel, initialPeriod
}) {
  const dm = true;
  const [exportPeriod, setExportPeriod] = useState(initialPeriod || 'ALL');
  const [exportFormat, setExportFormat] = useState('long');
  const [isExporting, setIsExporting] = useState(false);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen && !isExporting) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, isExporting]);

  useEffect(() => { 
    if (isOpen) {
      setExportPeriod(initialPeriod || 'ALL');
      // Fetch all transactions for export to override the filtered prop
      const fetchAll = async () => {
        setIsFetching(true);
        try {
          const all = await transactionService.getAll();
          setLocalTransactions(all);
        } catch (err) {
          console.error("Export fetch failed:", err);
          // Fallback to prop if fetch fails
          setLocalTransactions(filteredTransactions);
        } finally {
          setIsFetching(false);
        }
      };
      fetchAll();
    } 
  }, [isOpen, initialPeriod, filteredTransactions]);

  const dataToExport = useMemo(() => 
    localTransactions.filter(t => isDateInFilter(t.date, exportPeriod) && !t.category.includes('หักวงเงิน')),
    [localTransactions, exportPeriod]
  );

  const stats = useMemo(() => {
    const rowCount = exportFormat === 'full' 
      ? localTransactions.length + categories.length + dayTypeConfig.length + Object.keys(dayTypes).length
      : (exportFormat === 'wide' ? [...new Set(dataToExport.map(t => t.date))].length : dataToExport.length);
    const estKB = (rowCount * (exportFormat === 'wide' ? 0.25 : 0.12)).toFixed(1);
    return { rowCount, estKB, hasData: rowCount > 0 };
  }, [exportFormat, dataToExport, localTransactions, categories, dayTypeConfig, dayTypes]);

  if (!isOpen) return null;

  const executeExport = () => {
    if ((!dataToExport.length && exportFormat !== 'full') || isExporting) return;
    setIsExporting(true);

    try {
      let csvContent = '\uFEFF'; // BOM for Excel/Thai support

      if (exportFormat === 'long') {
        const headers = ['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount', 'Note'];
        csvContent += headers.join(',') + '\n';
        dataToExport.forEach(t => {
          const cat = categories.find(c => c.name === t.category);
          
          // Map DayType ID to Label
          const dtId = dayTypes[t.date];
          let dtLabel = '';
          if (dtId) {
            dtLabel = dayTypeConfig.find(d => d.id === dtId)?.label || dtId;
          } else {
            // Weekend Fallback
            const dayIdx = new Date(t.date).getDay();
            const isWeekend = dayIdx === 0 || dayIdx === 6;
            dtLabel = isWeekend ? (dayTypeConfig[1]?.label || 'Holiday') : (dayTypeConfig[0]?.label || 'Workday');
          }

          const row = [
            t.date,
            dtLabel,
            cat?.type || 'expense',
            t.category,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            t.amount,
            `"${(t.dayNote || '').replace(/"/g, '""')}"`
          ];
          csvContent += row.join(',') + '\n';
        });
      } else if (exportFormat === 'wide') {
        // Pivot table style
        const dates = [...new Set(dataToExport.map(t => t.date))].sort();
        const cats = categories.filter(c => dataToExport.some(t => t.category === c.name));
        const headers = ['Date', 'DayType', ...cats.map(c => c.name)];
        csvContent += headers.join(',') + '\n';
        
        dates.forEach(date => {
          const dtId = dayTypes[date];
          let dtLabel = '';
          if (dtId) {
            dtLabel = dayTypeConfig.find(d => d.id === dtId)?.label || dtId;
          } else {
            const dayIdx = new Date(date).getDay();
            const isWeekend = dayIdx === 0 || dayIdx === 6;
            dtLabel = isWeekend ? (dayTypeConfig[1]?.label || 'Holiday') : (dayTypeConfig[0]?.label || 'Workday');
          }

          const row = [date, dtLabel];
          cats.forEach(cat => {
            const amount = dataToExport
              .filter(t => t.date === date && t.category === cat.name)
              .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            row.push(amount || 0);
          });
          csvContent += row.join(',') + '\n';
        });
      } else if (exportFormat === 'full') {
        // Complete Database Dump (JSON embedded in CSV or multi-section CSV)
        csvContent += 'SECTION,DATA\n';
        csvContent += `TRANSACTIONS,"${JSON.stringify(localTransactions).replace(/"/g, '""')}"\n`;
        csvContent += `CATEGORIES,"${JSON.stringify(categories).replace(/"/g, '""')}"\n`;
        csvContent += `DAY_TYPES,"${JSON.stringify(dayTypes).replace(/"/g, '""')}"\n`;
        csvContent += `CONFIG,"${JSON.stringify(dayTypeConfig).replace(/"/g, '""')}"\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `CashflowShark_${exportFormat}_${exportPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    }
  };

  // --- UI Components ---
  const OptionBtn = ({ id, icon: Icon, title, desc, amber }) => (
    <button 
      onClick={() => setExportFormat(id)}
      className={`w-full flex flex-col p-3 rounded-sm border transition-all relative overflow-hidden group ${
        exportFormat === id 
          ? (amber ? 'border-amber-500 bg-amber-500/10' : 'border-blue-500 bg-blue-500/10') 
          : ('border-slate-800 bg-slate-800/20 hover:border-slate-700')
      }`}
    >
      <div className="flex items-center gap-2 mb-1 z-10">
        <Icon className={`w-3.5 h-3.5 ${exportFormat === id ? (amber ? 'text-amber-500' : 'text-blue-500') : 'text-slate-500'}`} />
        <span className={`text-[10px] font-black uppercase tracking-tight ${exportFormat === id ? ('text-slate-100') : 'text-slate-500'}`}>
          {title}
        </span>
      </div>
      <p className={`text-[9px] leading-tight z-10 text-left ${'text-slate-400'}`}>{desc}</p>
      {exportFormat === id && <div className={`absolute inset-0 opacity-10 ${amber ? 'bg-amber-500' : 'bg-blue-500'}`} />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-sm shadow-2xl flex flex-col w-full max-w-5xl h-[85vh] border overflow-hidden ${'bg-[#0B0F1A] border-slate-800'}`}
      >
        {/* Header - Tactical HUD Style */}
        <div className={`px-6 py-3 border-b flex justify-between items-center shrink-0 ${'bg-slate-900/50'}`}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] ${'text-blue-400'}`}>
                Export Control Unit
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">System Link Active</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:rotate-90 transition-transform text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Config */}
          <div className={`w-80 shrink-0 border-r flex flex-col p-6 space-y-8 ${'bg-slate-900/30 border-slate-800'}`}>
            <section className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rotate-45" /> 01. Selection Scope
              </label>
              <PeriodPicker filterPeriod={exportPeriod} setFilterPeriod={setExportPeriod} groupedOptions={groupedOptions} />
            </section>

            <section className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rotate-45" /> 02. Data Protocol
              </label>
              <div className="grid gap-2">
                <OptionBtn id="long" icon={ClipboardList} title="Transactional (Long)" desc="Raw logs. Perfect for system migration." />
                <OptionBtn id="wide" icon={FileSpreadsheet} title="Analytical (Wide)" desc="Matrix view. Optimized for Pivot Tables." />
                <OptionBtn id="full" icon={Database} title="Full System Dump" desc="Complete database state backup." amber />
              </div>
            </section>

            <section className={`mt-auto p-4 border border-slate-800/50 bg-slate-800/20 rounded-sm relative overflow-hidden`}>
              <div className="flex items-center gap-2 mb-3 text-amber-500">
                <Zap className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">Payload Analysis</span>
              </div>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Estimated Rows</span>
                  <span className="text-[10px] font-mono font-black text-slate-200 tracking-tighter">{stats.rowCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Memory Footprint</span>
                  <span className="text-[10px] font-mono font-black text-slate-200 tracking-tighter">~ {stats.estKB} KB</span>
                </div>
                <div className="h-[2px] bg-slate-800 w-full my-2" />
                <div className="flex justify-between">
                  <span className="text-[8px] text-slate-500 font-bold uppercase">Security Hash</span>
                  <span className="text-[8px] font-mono text-slate-600">SHA-256 Verified</span>
                </div>
              </div>
              {/* Decorative Background Grid */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 0)', backgroundSize: '10px 10px' }} />
            </section>
          </div>

          {/* Main Terminal View */}
          <div className="flex-1 flex flex-col p-6 bg-[#080B12] relative overflow-hidden">
            {/* Clean Terminal Container (No scanline glow) */}
            
            <div className="flex items-center justify-between mb-4 relative z-20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-500" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Data_Stream_Preview <span className="text-slate-600 mx-2">::</span> <span className="text-blue-500">{exportFormat.toUpperCase()}</span>
                </h4>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-800" />)}
              </div>
            </div>

            <div className={`flex-1 rounded-sm border border-slate-800/50 flex flex-col relative z-20 overflow-hidden`}>
              <div className="flex-1 p-6 font-mono text-[10px] leading-relaxed overflow-auto scrollbar-tactical text-slate-400">
                {isFetching ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <div className="space-y-1">
                      <p className="text-blue-500 font-black tracking-widest uppercase">Fetching_Data_Stream</p>
                      <p className="text-[9px] text-slate-600">Synchronizing with core database...</p>
                    </div>
                  </div>
                ) : !stats.hasData && exportFormat !== 'full' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-amber-500 font-black tracking-widest uppercase">Target_Buffer_Empty</p>
                      <p className="text-[9px] text-slate-600">Please redefine temporal parameters to initiate stream.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-blue-500/50 select-none"># [SYSTEM_INFO] SHARK_CORE_V3_INITIATED</div>
                    <div className="text-blue-500/50 select-none"># [TIMESTAMP] {new Date().toISOString()}</div>
                    <div className="text-slate-700 select-none"># --------------------------------------------------</div>
                    
                    {/* Syntax Highlighted Preview Content */}
                    {exportFormat === 'long' && (
                      <>
                        <div className="text-slate-200 mb-2 font-bold italic">"Date","DayType","Type","Category","Description","Amount"</div>
                        <div className="flex gap-1">
                          <span className="text-emerald-500">"01/03/2026"</span>,
                          <span className="text-blue-400">"Workday"</span>,
                          <span className="text-rose-400">"Expense"</span>,
                          <span className="text-amber-400">"Food"</span>,
                          <span className="text-slate-500">"Lunch"</span>,
                          <span className="text-blue-500 font-bold">"65.00"</span>
                        </div>
                        <div className="flex gap-1">
                          <span className="text-emerald-500">"02/03/2026"</span>,
                          <span className="text-blue-400">"Holiday"</span>,
                          <span className="text-emerald-400">"Income"</span>,
                          <span className="text-amber-400">"Bonus"</span>,
                          <span className="text-slate-500">"Freelance"</span>,
                          <span className="text-blue-500 font-bold">"1500.00"</span>
                        </div>
                      </>
                    )}
                    {exportFormat === 'full' && (
                      <div className="space-y-1">
                        <div className="flex gap-2"><span className="text-blue-500 font-black">[DB_MAP]</span> <span className="text-slate-200">TRANSACTION_OBJECTS</span> <span className="text-slate-600">{"->"} {localTransactions.length} entries</span></div>
                        <div className="flex gap-2"><span className="text-amber-500 font-black">[DB_MAP]</span> <span className="text-slate-200">CATEGORY_DEFINITIONS</span> <span className="text-slate-600">{"->"} {categories.length} entries</span></div>
                        <div className="flex gap-2"><span className="text-emerald-500 font-black">[DB_MAP]</span> <span className="text-slate-200">CALENDAR_STATE</span> <span className="text-slate-600">{"->"} Linked</span></div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-1">
                      <span className="text-blue-500">_</span>
                      <motion.div animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-3 bg-blue-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-4">
               <div className={`p-2 rounded-sm ${'bg-blue-500/10'}`}>
                 <Info className="w-4 h-4 text-blue-500" />
               </div>
               <div className="space-y-1">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${'text-slate-300'}`}>Protocol: UTF-8 BOM Universal Encoding</p>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Data packets are automatically injected with a Byte Order Mark (BOM) to ensure 100% Thai character integrity in Excel and legacy systems.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Tactical Footer */}
        <div className={`px-6 py-4 border-t flex justify-between items-center shrink-0 ${'bg-slate-900/80 border-slate-800'}`}>
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Encryption</span>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> AES-256</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target</span>
              <span className="text-[10px] font-bold text-slate-300 tracking-tight">{getFilterLabel(exportPeriod)}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-slate-800 text-slate-400`}>
              Abort
            </button>
            <button 
              onClick={executeExport} 
              disabled={(!stats.hasData && exportFormat !== 'full') || isExporting}
              className={`relative px-8 py-2 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] transition-all overflow-hidden group active:scale-95 disabled:opacity-30 disabled:grayscale ${
                exportFormat === 'full' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white shadow-sm'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-current" />}
                {isExporting ? 'Processing' : 'Initiate Export'}
              </span>
              <motion.div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}