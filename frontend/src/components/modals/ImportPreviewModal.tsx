// src/components/ImportPreviewModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight, CheckCircle, Zap } from 'lucide-react';
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ImportPreviewModalProps {
  importPreview: any;
  setImportPreview: (val: any) => void;
  confirmImport: () => void;
  isProcessing?: boolean;
  categories: any[];
}

export default function ImportPreviewModal({ importPreview, setImportPreview, confirmImport, isProcessing, categories }: ImportPreviewModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  const [previewPage, setPreviewPage] = useState(1);
  const PER_PAGE = 30;

  // กลับไปหน้า 1 เสมอเมื่อข้อมูลเปลี่ยน
  useEffect(() => { if (importPreview) setPreviewPage(1); }, [importPreview]);

  // ดักปุ่ม ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && importPreview) setImportPreview(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [importPreview, setImportPreview]);

  if (!importPreview) return null;

  const updateItem  = (id: string, field: string, value: any) => setImportPreview((prev: any) => ({ ...prev, items: prev.items.map((i: any) => i.id === id ? { ...i, [field]: value } : i) }));
  const deleteItem  = (id: string) => setImportPreview((prev: any) => ({ ...prev, items: prev.items.filter((i: any) => i.id !== id) }));

  const allItems = importPreview.items;
  const allCats  = importPreview.updatedCategories || categories;

  // ใช้ useMemo และ Slice แบ่งหน้าแบบตรงไปตรงมา
  const { pageItems, totalPages } = useMemo(() => {
    const total = Math.ceil(allItems.length / PER_PAGE) || 1;
    // ป้องกันกรณีลบข้อมูลจนหมดหน้า แล้วเลขหน้าค้าง
    const safePage = Math.min(previewPage, total); 
    const startIndex = (safePage - 1) * PER_PAGE;
    
    return {
      pageItems: allItems.slice(startIndex, startIndex + PER_PAGE),
      totalPages: total
    };
  }, [allItems, previewPage]);

  const inputCls = "w-full bg-surface outline-none text-xs px-2 py-1.5 rounded-none border border-line-strong text-slate-300 focus:border-accent transition-colors";

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="ตรวจสอบข้อมูลก่อนนำเข้า" tabIndex={-1} className="rounded-none shadow-2xl flex flex-col w-full max-w-3xl border border-line-strong bg-canvas"
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-line bg-surface flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              📋 ตรวจสอบก่อน Import <span className="text-ink-muted font-normal">/ Data Import Preview</span>
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-300">
                พบ <strong className="text-accent">{allItems.length} รายการ</strong>
              </span>
              {importPreview.isCategoryChanged && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-none bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  จะสร้างหมวดหมู่ใหม่
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-mono">แก้ไขได้ก่อน import</span>
            </div>
          </div>
          <button onClick={() => setImportPreview(null)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-2.5 text-[11px] font-bold border-b shrink-0 bg-surface-hover border-line text-slate-300 uppercase tracking-wider select-none">
          <span>ประเภท</span><span>หมวดหมู่</span><span>รายละเอียด</span><span className="text-right">จำนวนเงิน</span><span />
        </div>

        {/* Rows */}
        <div className="flex-grow overflow-y-auto min-h-0 scrollbar-tactical bg-surface">
          {pageItems.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">ไม่มีรายการข้อมูล</div>
          ) : (
            pageItems.map((item: any, idx: number) => {
              const catObj = allCats.find((c: any) => c.name === item.category);
              const isInc  = catObj?.type === 'income';
              const isNewDate = idx === 0 || item.date !== pageItems[idx - 1].date;
              
              return (
                <div key={item.id}>
                  {isNewDate && (
                    <div className="px-4 py-1.5 text-[11px] font-bold sticky top-0 z-10 border-b bg-surface-hover text-slate-300 border-line select-none font-mono">
                      {item.date}
                    </div>
                  )}
                  <div className="grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-2 items-center border-b transition-colors border-line/50 hover:bg-surface-hover/50">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-none text-center truncate ${
                      isInc 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                        : 'bg-expense/5 text-expense border border-expense/15'
                    }`}>
                      {isInc ? 'รายรับ' : 'รายจ่าย'}
                    </span>
                    <select 
                      value={item.category} 
                      onChange={e => updateItem(item.id, 'category', e.target.value)}
                      className="text-[11px] font-bold py-1.5 px-1.5 rounded-none border outline-none cursor-pointer w-full bg-surface border-line-strong text-slate-300 focus:border-accent transition-colors"
                    >
                      {allCats.map((c: any) => (
                        <option key={c.id} value={c.name}>
                          {c.icon && !CATEGORY_ICON_MAP[c.icon] ? `${c.icon} ` : ''}{c.name}
                        </option>
                      ))}
                    </select>
                    
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value)} 
                      className={inputCls} 
                    />
                    
                    <input 
                      type="number" 
                      step="any" 
                      value={item.amount} 
                      onChange={e => updateItem(item.id, 'amount', e.target.value)} 
                      className={`${inputCls} text-right font-bold`} 
                    />
                    
                    <button 
                      onClick={() => deleteItem(item.id)} 
                      className="p-1.5 rounded-none text-slate-500 hover:text-danger hover:bg-danger/10 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <button 
              onClick={() => setPreviewPage(p => Math.max(1, p - 1))} 
              disabled={previewPage === 1}
              className="p-1.5 rounded-none border border-line-strong disabled:opacity-30 bg-surface text-slate-300 hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400">หน้า {previewPage}/{totalPages} ({allItems.length} รายการ)</span>
            <button 
              onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} 
              disabled={previewPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-none border border-line-strong disabled:opacity-30 bg-surface text-slate-300 hover:bg-surface-hover transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setImportPreview(null)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-none font-bold text-xs border border-line-strong text-slate-300 hover:bg-surface-hover transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              onClick={confirmImport} 
              disabled={isProcessing || allItems.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-none font-bold text-xs text-on-accent bg-accent hover:bg-accent-active border border-accent transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Zap className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {isProcessing ? 'กำลัง Import...' : `Import ${allItems.length} รายการ`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}