// frontend/src/components/modals/ExportModal/ExportBackupView.tsx
import React, { useMemo } from 'react';
import { Database, FolderTree, Calendar, Receipt, FileJson, CheckCircle2 } from 'lucide-react';
import { Category, CashflowGroup, DayType, TransactionDisplay } from '../../../types';
import { buildSystemBackupJson } from './exportUtils';

export interface ExportBackupViewProps {
  localTransactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
}

export default function ExportBackupView({
  localTransactions,
  categories,
  cashflowGroups = [],
  dayTypes,
  dayTypeConfig,
}: ExportBackupViewProps) {
  const jsonPreview = useMemo(() => {
    const raw = buildSystemBackupJson({
      transactions: localTransactions.slice(0, 3),
      categories: categories.slice(0, 3),
      cashflowGroups,
      dayTypes,
      dayTypeConfig,
    });
    return raw;
  }, [localTransactions, categories, cashflowGroups, dayTypes, dayTypeConfig]);

  const cards = [
    {
      title: 'ประวัติธุรกรรม (Transactions)',
      subtitle: 'TRANSACTIONS MASTER TABLE',
      count: localTransactions.length,
      unit: 'รายการ',
      icon: Receipt,
      accent: 'border-[#da291c]/30 text-[#da291c]',
    },
    {
      title: 'หมวดหมู่การเงิน (Categories)',
      subtitle: 'CATEGORIES TAXONOMY',
      count: categories.length,
      unit: 'หมวดหมู่',
      icon: FolderTree,
      accent: 'border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'กลุ่มกระแสเงินสด (Cashflow Groups)',
      subtitle: 'GROUP CLASSIFICATIONS',
      count: cashflowGroups.length,
      unit: 'กลุ่ม',
      icon: Database,
      accent: 'border-cyan-500/30 text-cyan-400',
    },
    {
      title: 'ปฏิทินวันทำงาน (Calendar Days)',
      subtitle: 'CALENDAR MAPPING DICTIONARY',
      count: Object.keys(dayTypes).length,
      unit: 'วันที่บันทึก',
      icon: Calendar,
      accent: 'border-amber-500/30 text-amber-400',
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-200 flex items-center gap-2">
          <FileJson className="w-4 h-4 text-[#da291c]" />
          โครงสร้างชุดข้อมูลสำรองระบบ (System Backup Schema)
        </h4>
        <p className="text-[11px] text-neutral-400 mt-1 leading-normal">
          ไฟล์ JSON นี้จะรวบรวมข้อมูลสถานะระบบทั้งหมดไว้อย่างครบถ้วน 100% สำหรับการกู้คืน (Restore) หรือย้ายฐานข้อมูล
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.subtitle}
              className="p-3.5 bg-[#121212] border border-[#2e2e2e] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 border bg-black/40 ${c.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-neutral-200">{c.title}</h5>
                  <p className="text-[9px] font-mono text-neutral-500">{c.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-white tabular-nums">
                  {c.count.toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-500 block font-mono">{c.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON Payload Sample Inspector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
            ตัวอย่างโครงสร้าง JSON (JSON Payload Preview)
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Schema V2.0 Validated
          </span>
        </div>
        <pre className="p-4 bg-[#0d0d0d] border border-[#2a2a2a] text-[10px] font-mono text-neutral-300 leading-relaxed overflow-x-auto max-h-[220px] custom-scrollbar select-all">
          {jsonPreview}
        </pre>
      </div>
    </div>
  );
}
