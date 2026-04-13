// src/views/Dashboard/index.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';

// Components
import SummaryCards from './components/SummaryCards';
import ExpenseProportion from './components/ExpenseProportion';
import MainChart from './components/MainChart';
import TopTransactions from './components/TopTransactions';
import ActivityTimeline from './components/ActivityTimeline';
import CashflowTable from './components/CashflowTable';

export default function DashboardView({
  transactions, categories, filterPeriod, getFilterLabel,
  hideFixedExpenses, setHideFixedExpenses, dashboardCategory, setDashboardCategory,
  chartGroupBy, setChartGroupBy,cashflowGroups,
  analytics, dayTypeConfig, isDarkMode: dm, dayTypes, topXLimit, setTopXLimit,
}) {
  
  // Empty State (ยังไม่มีข้อมูล)
  if (transactions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-sm border-2 border-dashed ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <Inbox className="w-16 h-16 mb-4 text-slate-300 animate-bounce" style={{ animationDuration: '2s' }} />
        <p className="text-lg font-bold text-slate-500">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto w-full pb-10 flex flex-col gap-4">

      {/* ══════════════════════════════════════════════════════════
          ROW 1 — SUMMARY COMMAND CENTER + EXPENSE PROPORTION
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_600px] gap-4 items-stretch">
        <SummaryCards analytics={analytics} isDarkMode={dm} />
        <ExpenseProportion analytics={analytics} categories={categories} isDarkMode={dm} />
      </div>
      {/* ══════════════════════════════════════════════════════════
          ROW 2 — MAIN CHART (wide) + TOP X (narrow sidebar)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-stretch">
        <MainChart 
          analytics={analytics} 
          categories={categories} 
          filterPeriod={filterPeriod}
          hideFixedExpenses={hideFixedExpenses} 
          setHideFixedExpenses={setHideFixedExpenses}
          dashboardCategory={dashboardCategory} 
          setDashboardCategory={setDashboardCategory}
          chartGroupBy={chartGroupBy} 
          setChartGroupBy={setChartGroupBy}
          isDarkMode={dm} 
        />
        <TopTransactions 
          transactions={transactions}
          filterPeriod={filterPeriod}
          dashboardCategory={dashboardCategory}
          hideFixedExpenses={hideFixedExpenses}
          analytics={analytics} 
          categories={categories} 
          topXLimit={topXLimit} 
          setTopXLimit={setTopXLimit} 
          isDarkMode={dm} 
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 3 — ACTIVITY TIMELINE
      ══════════════════════════════════════════════════════════ */}
      <ActivityTimeline 
        analytics={analytics} 
        dayTypeConfig={dayTypeConfig} 
        dayTypes={dayTypes} 
        isDarkMode={dm} 
      />

      {/* ══════════════════════════════════════════════════════════
          ROW 4 — CASHFLOW TABLE
      ══════════════════════════════════════════════════════════ */}
      <CashflowTable 
        analytics={analytics} 
        cashflowGroups={cashflowGroups}
        isDarkMode={dm} 
      />

    </div>
  );
}

DashboardView.propTypes = {
  transactions:         PropTypes.array.isRequired,
  categories:           PropTypes.array.isRequired,
  filterPeriod:         PropTypes.string.isRequired,
  getFilterLabel:       PropTypes.func.isRequired,
  hideFixedExpenses:    PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  dashboardCategory:    PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  setDashboardCategory: PropTypes.func.isRequired,
  chartGroupBy:         PropTypes.string.isRequired,
  setChartGroupBy:      PropTypes.func.isRequired,
  topXLimit:            PropTypes.number.isRequired,
  setTopXLimit:         PropTypes.func.isRequired,
  analytics:            PropTypes.object.isRequired,
  dayTypeConfig:        PropTypes.array.isRequired,
  dayTypes:             PropTypes.object.isRequired,
  isDarkMode:           PropTypes.bool.isRequired,
};