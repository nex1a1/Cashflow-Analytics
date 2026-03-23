// src/views/DashboardView.jsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2';
import {
  Wallet, Coins, PiggyBank, Flame, Home, Scale,
  CalendarClock, TrendingUp, PieChart, FileSpreadsheet,
  Filter, AlertCircle, Inbox, Activity, UtensilsCrossed
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Sparkline from '../components/ui/Sparkline';
import { formatMoney, getThaiMonth } from '../utils/formatters';
import PropTypes from 'prop-types';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
  getDoughnutChartOptions,
} from '../utils/chartOptions';

export default function DashboardView({
  transactions, categories, filterPeriod, getFilterLabel,
  hideFixedExpenses, setHideFixedExpenses, dashboardCategory, setDashboardCategory,
  chartGroupBy, setChartGroupBy,
  analytics, dayTypeConfig, isDarkMode, dayTypes, topXLimit, setTopXLimit
}) {

  // 🌟 1. State สำหรับ Tooltip ลอยตัว (null = ซ่อน)
  const [activityTooltip, setActivityTooltip] = useState(null);

  const datesInPeriod = analytics.datesInPeriod || [];

  // 🌟 2. ฟังก์ชัน handlers — ใช้ e.currentTarget เพื่อให้ได้ตำแหน่งของ wrapper div เสมอ
  const handleTooltipEnter = (e, displayDate, typeConfig) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActivityTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      date: displayDate,
      label: typeConfig?.label || '',
      color: typeConfig?.color || '#cbd5e1',
    });
  };

  const handleTooltipLeave = () => setActivityTooltip(null);

  if (transactions.length === 0) {
      return (
          <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-2xl border-2 border-dashed ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <Inbox className="w-20 h-20 mb-6 text-slate-300 animate-bounce" style={{animationDuration: '2s'}} />
            <p className="text-xl font-medium text-slate-600">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
          </div>
      );
  }

  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative">
          
          {/* 3 การ์ดบนสุด */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex justify-between items-start mb-1">
                      <p className={`font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}><Coins className="w-5 h-5"/> รายรับสุทธิ (Income)</p>
                      <Sparkline data={analytics.sparklineIncome} color="#059669" />
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}><AnimatedNumber value={analytics.totalIncome} /> <span className="text-xl font-medium">฿</span></h3>
              </div>
              
              <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-start mb-1">
                      <p className={`font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}><Wallet className="w-5 h-5"/> รายจ่ายสุทธิ (Expenses)</p>
                      <Sparkline data={analytics.sparklineExpense} color="#DC2626" />
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}><AnimatedNumber value={analytics.totalExpense} /> <span className="text-xl font-medium">฿</span></h3>
              </div>
              
              <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : (analytics.netCashflow >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')}`}>
                  <div className="flex justify-between items-start mb-1">
                      <div>
                          <p className={`font-bold mb-1 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${isDarkMode ? (analytics.netCashflow >= 0 ? 'text-blue-400' : 'text-orange-400') : (analytics.netCashflow >= 0 ? 'text-[#00509E]' : 'text-orange-700')}`}><PiggyBank className="w-5 h-5"/> เงินคงเหลือ (Cashflow)</p>
                          {analytics.totalIncome > 0 && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block transition-colors ${isDarkMode ? 'bg-slate-700 text-blue-300' : (analytics.netCashflow >= 0 ? 'bg-blue-100 text-[#00509E]' : 'bg-orange-100 text-orange-700')}`}>
                                  ออมได้ <AnimatedNumber value={analytics.savingsRate} />%
                              </span>
                          )}
                      </div>
                      <Sparkline data={analytics.sparklineNet} color={analytics.netCashflow >= 0 ? "#3B82F6" : "#EA580C"} />
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? (analytics.netCashflow >= 0 ? 'text-blue-300' : 'text-orange-400') : (analytics.netCashflow >= 0 ? 'text-[#00509E]' : 'text-orange-600')}`}><AnimatedNumber value={analytics.netCashflow} /> <span className="text-xl font-medium">฿</span></h3>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              <div className={`border-l-[5px] border-[#F4B800] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-[#F4B800]"><Flame className="w-32 h-32"/></div>
                  <div>
                      <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Flame className="w-4 h-4 text-[#F4B800]"/> อัตราเผาผลาญรายจ่าย</p>
                      <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}><AnimatedNumber value={analytics.dailyAvg} /> <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>฿/วัน</span></h3>
                  </div>
              </div>

              <div className={`border-l-[5px] border-blue-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500"><Home className="w-32 h-32"/></div>
                  <div>
                      <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Home className="w-4 h-4 text-blue-500"/> ค่าที่พัก/ค่าหอ</p>
                      <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}><AnimatedNumber value={analytics.rentTotal} /> <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>฿</span></h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {analytics.rentPercentage > 30 ? '⚠️ เกินเกณฑ์ 30%' :''}
                      </span>
                      <span className={`font-bold px-2 py-1 rounded border transition-colors ${analytics.rentPercentage > 30 ? (isDarkMode ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100') : (isDarkMode ? 'text-blue-400 bg-blue-900/30 border-blue-800' : 'text-blue-600 bg-blue-50 border-blue-100')}`}>
                          {analytics.rentPercentage}% ของรายรับ
                        </span>
                  </div>
              </div>

              <div className={`border-l-[5px] border-orange-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-orange-500"><UtensilsCrossed className="w-32 h-32"/></div>
                  <div>
                      <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><UtensilsCrossed className="w-4 h-4 text-orange-500"/> ค่ากินเฉลี่ย/วัน</p>
                      <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}><AnimatedNumber value={analytics.foodDailyAvg} /> <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>฿/วัน</span></h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>สัดส่วนรวม</span>
                      <span className={`font-bold px-2 py-1 rounded border ${analytics.foodPercentage > 35 ? (isDarkMode ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100') : (isDarkMode ? 'text-orange-400 bg-orange-900/30 border-orange-800' : 'text-orange-600 bg-orange-50 border-orange-100')}`}>
                          {analytics.foodPercentage}% ของรายจ่าย
                      </span>
                  </div>
              </div>

              <div className={`border-l-[5px] border-pink-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-pink-500"><TrendingUp className="w-32 h-32"/></div>
                  <div>
                      <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4 text-pink-500"/> รายจ่ายผันแปร/วัน</p>
                      <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          <AnimatedNumber value={analytics.variableTotal / (analytics.datesInPeriod?.length || 1)} />
                          <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> ฿/วัน</span>
                      </h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>สัดส่วนรวม</span>
                      <span className={`font-bold px-2 py-1 rounded border ${isDarkMode ? 'text-pink-400 bg-pink-900/30 border-pink-800' : 'text-pink-600 bg-pink-50 border-pink-100'}`}>
                          {analytics.variablePercentage}% ของรายจ่าย
                      </span>
                  </div>
              </div>

              <div className={`border-l-[5px] border-purple-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-purple-500"><Scale className="w-32 h-32"/></div>
                  <div>
                      <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Scale className="w-4 h-4 text-purple-500"/> โครงสร้างรายจ่าย</p>
                      <div className={`w-full rounded-full h-3 mt-3 mb-2 flex overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <div className="bg-purple-500 h-3 transition-all duration-1000 ease-out" style={{width: `${analytics.fixedPercentage}%`}}></div>
                          <div className="bg-pink-400 h-3 transition-all duration-1000 ease-out" style={{width: `${analytics.variablePercentage}%`}}></div>
                      </div>
                      <div className="flex justify-between text-xs font-bold mt-2">
                          <span className={isDarkMode ? 'text-purple-400' : 'text-purple-600'}>ภาระคงที่ ({analytics.fixedPercentage}%)</span>
                          <span className={isDarkMode ? 'text-pink-400' : 'text-pink-600'}>ผันแปร ({analytics.variablePercentage}%)</span>
                      </div>
                  </div>
              </div>
          </div>
                  
          {/* Activity Timeline (GitHub Style Contribution Graph) */}
          {Object.keys(analytics.dayTypeCounts).length > 0 && (
              <div className={`rounded-xl shadow-sm border p-4 md:p-6 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b pb-3 gap-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          <CalendarClock className="w-5 h-5 text-[#00509E]" />
                          ไทม์ไลน์กิจกรรม (Activity Graph)
                      </h3>
                      <span className={`text-sm font-medium px-3 py-1 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          {getFilterLabel(filterPeriod)}
                      </span>
                  </div>
                  
                  {/* กล่องแสดงกราฟ */}
                  <div className={`border rounded-xl mb-6 transition-colors overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      {datesInPeriod.length === 0 ? (
                          <div className="text-center text-slate-400 py-4 text-sm font-medium">กรุณาเลือกช่วงเวลาที่มีข้อมูลเพื่อแสดงไทม์ไลน์</div>
                      ) : (
                          <div className="w-full overflow-x-auto custom-scrollbar pb-6 pt-3 px-4">
                              <div className="flex w-max mx-auto gap-x-[3.5px] md:gap-x-[4px] relative">
                                  
                                  {/* แกน Y (วัน อา. - ส.) */}
                                  <div 
                                    className="flex flex-col gap-[3.5px] md:gap-[4px] shrink-0 sticky left-0 z-20 pr-2 border-r" 
                                    style={{ 
                                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                      borderColor: isDarkMode ? '#334155' : '#e2e8f0'
                                    }}
                                  >
                                      <div className="h-5"></div>
                                      {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => (
                                          <div key={day} className={`h-3.5 md:h-4 flex items-center justify-end text-[9px] sm:text-[10px] font-bold ${idx === 0 || idx === 6 ? (isDarkMode ? 'text-red-400' : 'text-red-500') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                              {day}
                                          </div>
                                      ))}
                                  </div>

                                  {/* ตารางข้อมูล */}
                                  {(() => {
                                      const weeks = [];
                                      let currentWeek = Array(7).fill(null);
                                      let currentMonthLabel = null;
                                      const shortMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

                                      datesInPeriod.forEach((dateStr, i) => {
                                          const [d, m, y] = dateStr.split('/');
                                          const dateObj = new Date(y, parseInt(m)-1, d);
                                          const dow = dateObj.getDay();

                                          if (d === '01' || i === 0) {
                                              currentMonthLabel = `${shortMonths[parseInt(m)-1]} ${y.slice(2)}`;
                                          }

                                          currentWeek[dow] = dateStr;

                                          if (dow === 6 || i === datesInPeriod.length - 1) {
                                              weeks.push({
                                                  days: [...currentWeek],
                                                  monthLabel: currentMonthLabel
                                              });
                                              currentWeek = Array(7).fill(null);
                                              currentMonthLabel = null;
                                          }
                                      });

                                      return weeks.map((week, wIdx) => (
                                          <div key={wIdx} className="flex flex-col gap-[3.5px] md:gap-[4px] shrink-0">
                                              
                                              {/* แถบชื่อเดือน */}
                                              <div className="h-5 relative flex items-end pb-1">
                                                  {week.monthLabel && (
                                                      <div className="absolute left-0 bottom-1 flex items-end">
                                                          <div className={`w-[2px] h-3.5 mr-1 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                                          <span className={`text-[10px] font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                                                              {week.monthLabel}
                                                          </span>
                                                      </div>
                                                  )}
                                              </div>

                                              {/* กล่องสี่เหลี่ยม 7 วันในสัปดาห์ */}
                                              {week.days.map((dateStr, dIdx) => {
                                                  if (!dateStr) return <div key={`empty-${wIdx}-${dIdx}`} className="w-3.5 h-3.5 md:w-4 md:h-4 bg-transparent" />;

                                                  const [d, m, y] = dateStr.split('/');
                                                  const dateObj = new Date(y, parseInt(m)-1, d);
                                                  const dow = dateObj.getDay();
                                                  const defaultType = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                                                  const currentType = dayTypes[dateStr] || defaultType;
                                                  const typeConfig = dayTypeConfig.find(dt => dt.id === currentType) || dayTypeConfig[0];
                                                  
                                                  const shortMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
                                                  // แสดงชื่อวันด้วย
                                                  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                                                  const displayDate = `${dayNames[dow]} ${parseInt(d)} ${shortMonths[parseInt(m)-1]} ${y.slice(2)}`;

                                                  const today = new Date();
                                                  const isToday = parseInt(d) === today.getDate() && parseInt(m)-1 === today.getMonth() && parseInt(y) === today.getFullYear();
                                                  
                                                  const renderColor = typeConfig?.color || '#cbd5e1';

                                                  return (
                                                      // 🌟 onMouseEnter/Leave อยู่บน wrapper div — ใช้ e.currentTarget เพื่อ rect ที่ถูกต้อง
                                                      <div
                                                          key={dateStr}
                                                          className="relative"
                                                          onMouseEnter={(e) => handleTooltipEnter(e, displayDate, typeConfig)}
                                                          onMouseLeave={handleTooltipLeave}
                                                      >
                                                          <div
                                                              className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[3px] cursor-pointer transition-all duration-200 ${isToday ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10 shadow-md' : 'hover:scale-125 hover:z-10 hover:shadow-sm opacity-90 hover:opacity-100'}`}
                                                              style={{ backgroundColor: renderColor }}
                                                          />
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      ));
                                  })()}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-5 text-xs font-bold justify-center">
                      {dayTypeConfig.map(dt => {
                          const count = analytics.dayTypeCounts[dt.id] || 0;
                          return (
                              <div key={dt.id} className="flex items-center gap-1.5">
                                  <div className="w-3.5 h-3.5 rounded shadow-sm" style={{ backgroundColor: dt.color }}/>
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
            <div className={`rounded-xl shadow-md border overflow-hidden hover:shadow-lg transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400"/> ตารางสรุปกระแสเงินสด (Cashflow Statement)</h3>
                    <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">รูปแบบ Excel</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 border-b-2 border-slate-300">
                            <tr>
                                <th className={`px-4 py-3 font-bold text-center sticky left-0 z-10 ${isDarkMode ? "text-slate-200 bg-slate-900" : "text-slate-800 bg-slate-200"}`}>ช่วงเวลา</th>
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
                                <th className="px-4 py-3 font-bold text-slate-500 bg-slate-50">MoM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {analytics.sortedCashflow.map(row => (
                                <tr key={row.monthStr} className="group transition-colors">
                                    <td className={`px-4 py-2.5 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 group-hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-700 group-hover:bg-slate-50'}`}>
                                        {getThaiMonth(row.monthStr)}
                                    </td>
                                    <td className={`px-4 py-2.5 font-bold transition-colors ${isDarkMode ? 'text-emerald-400 bg-emerald-900/20 group-hover:bg-emerald-900/40' : 'text-emerald-700 bg-emerald-50/60 group-hover:bg-emerald-100/60'}`}>
                                        {row.salary > 0 ? formatMoney(row.salary) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-emerald-400/80 bg-emerald-900/10 group-hover:bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50/30 group-hover:bg-emerald-100/40'}`}>
                                        {row.bonus > 0 ? formatMoney(row.bonus) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                        {row.rent > 0 ? formatMoney(row.rent) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-purple-400 bg-purple-900/20 group-hover:bg-purple-900/40' : 'text-purple-700 bg-purple-50/60 group-hover:bg-purple-100/60'}`}>
                                        {row.subs > 0 ? formatMoney(row.subs) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                        {row.food > 0 ? formatMoney(row.food) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                        {row.variable > 0 ? formatMoney(row.variable) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                        {row.invest > 0 ? formatMoney(row.invest) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                        {row.it > 0 ? formatMoney(row.it) : '-'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-bold border-l-2 transition-colors ${isDarkMode ? 'text-red-400 bg-red-900/20 border-slate-700 group-hover:bg-red-900/40' : 'text-red-700 bg-red-50/60 border-slate-200 group-hover:bg-red-100/60'}`}>
                                        {formatMoney(row.totalExp)}
                                    </td>
                                    <td className={`px-4 py-2.5 font-black transition-colors ${isDarkMode ? 'text-blue-400 bg-blue-900/30 group-hover:bg-blue-900/50' : 'text-[#00509E] bg-blue-50/80 group-hover:bg-blue-100/80'}`}>
                                        {formatMoney(row.income - row.totalExp)}
                                    </td>
                                    {(() => {
                                        const idx = analytics.sortedCashflow.indexOf(row);
                                        const prev = analytics.sortedCashflow[idx - 1];
                                        if (!prev || prev.totalExp === 0) return <td className={`px-3 py-2.5 text-center text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>—</td>;
                                        const pct = (((row.totalExp - prev.totalExp) / prev.totalExp) * 100).toFixed(1);
                                        const isUp = parseFloat(pct) > 0;
                                        const isFlat = parseFloat(pct) === 0;
                                        return (
                                            <td className={`px-3 py-2.5 text-center text-xs font-bold transition-colors ${isFlat ? (isDarkMode ? 'text-slate-500' : 'text-slate-400') : isUp ? (isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50/60') : (isDarkMode ? 'text-emerald-400 bg-emerald-900/20' : 'text-emerald-600 bg-emerald-50/60')}`}>
                                                {isFlat ? '—' : isUp ? `▲ ${pct}%` : `▼ ${Math.abs(pct)}%`}
                                            </td>
                                        );
                                    })()}
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
                                <td className="px-4 py-3 text-slate-500">—</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2 flex flex-col h-full">
                  <div className={`rounded-xl shadow-sm border p-6 flex flex-col flex-grow h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> 
                            {analytics.mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสดและรายจ่าย' : analytics.mainChartType === 'bar' ? 'เทรนด์รายจ่ายเปรียบเทียบ' : `กราฟรายจ่ายรายวันในงวดที่เลือก`}
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            {!filterPeriod.match(/^\d{4}-\d{2}$/) && (
                                <div className={`flex p-1 rounded-lg border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                    <button onClick={() => setChartGroupBy('monthly')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartGroupBy === 'monthly' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายเดือน</button>
                                    <button onClick={() => setChartGroupBy('daily')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartGroupBy === 'daily' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายวัน</button>
                                </div>
                            )}
                            <select value={dashboardCategory} onChange={(e) => setDashboardCategory(e.target.value)} className={`px-3 py-1.5 border rounded-lg shadow-sm transition-colors text-sm font-semibold outline-none cursor-pointer appearance-none pl-3 pr-8 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 focus:border-[#00509E]'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' }}>
                                <option value="ALL">📊 รวมทุกหมวดหมู่</option>
                                {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                            </select>
                            <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border shadow-sm transition-colors ${dashboardCategory !== 'ALL' ? 'opacity-40 pointer-events-none' : ''} ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                <div className="relative flex items-center">
                                    <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                                    <div className={`block w-8 h-4.5 rounded-full transition-colors duration-300 ease-in-out ${hideFixedExpenses ? 'bg-[#D81A21]' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')}`} style={{ height: '1.125rem' }}></div>
                                    <div className={`dot absolute left-[2px] top-[2px] bg-white w-3.5 h-3.5 rounded-full transition-transform duration-300 ease-in-out ${hideFixedExpenses ? 'transform translate-x-3.5' : ''}`}></div>
                                </div>
                                <span className={`text-sm font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Filter className="w-3.5 h-3.5"/> ซ่อนยอดภาระคงที่</span>
                            </label>
                        </div>
                      </div>
                      <div className="relative w-full flex-grow min-h-[320px]">
                          {analytics.mainChartType === 'combo' ? (
                            <Chart type="bar" data={analytics.mainChartData} options={getComboChartOptions(isDarkMode)} />
                          ) : analytics.mainChartType === 'bar' ? (
                            <Bar data={analytics.mainChartData} options={getBarChartOptions(isDarkMode)} />
                          ) : (
                            <Line data={analytics.mainChartData} options={getLineChartOptions(isDarkMode)} />
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex flex-col h-full">
                  <div className={`rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              <PieChart className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> สัดส่วนรายจ่าย
                          </h3>
                          <div className="text-right">
                              <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยอดรวมในกราฟ</span>
                              <div className={`text-sm font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>{formatMoney(analytics.chartTotal)} ฿</div>
                          </div>
                      </div>
                      <div className="w-full flex-grow flex justify-center items-center relative min-h-[250px] lg:min-h-[350px]">
                          <Doughnut data={analytics.catChartData} options={getDoughnutChartOptions(isDarkMode)} />
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 items-stretch">
              <div className={`rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <div className={`flex items-center justify-between mb-4 border-b pb-3 shrink-0 ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>
                      <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}><AlertCircle className="w-5 h-5 text-[#D81A21]" /> TOP <select value={topXLimit} onChange={(e) => setTopXLimit(Number(e.target.value))} className={`mx-0.5 px-1 py-0.5 text-sm font-black rounded border outline-none cursor-pointer transition-colors text-center appearance-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-slate-100 border-slate-300 text-[#D81A21] hover:bg-slate-200'}`}><option value={5}>5</option><option value={7}>7</option><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option><option value={50}>50</option></select> รายการที่จ่ายแพงสุด</h3>
                  </div>
                  <div className="space-y-2 flex-grow">
                      {analytics.topTransactions.map((tx, idx) => {
                          const catDef = categories.find(c => c.name === tx.category);
                          return (
                            <div key={tx.id} className={`flex justify-between items-center px-3 py-2 transition-colors rounded-lg border hover:shadow-sm ${isDarkMode ? "bg-slate-900/40 hover:bg-slate-700 border-slate-700" : "bg-slate-50 hover:bg-slate-100 border-slate-100"}`}>
                                <div className="overflow-hidden pr-2 flex items-center gap-2.5"><div className="text-base font-black text-slate-300 w-5 text-center shrink-0">{idx + 1}</div><div className="overflow-hidden"><p className={`text-sm font-bold truncate leading-tight mb-0.5 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`} title={tx.description}>{tx.description}</p><div className="flex items-center gap-1.5"><span className="text-[11px] font-bold px-1.5 py-[1px] rounded border text-white truncate max-w-[180px] shrink-0" style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}>{catDef?.icon} {tx.category}</span><span className={`text-[10px] font-medium shrink-0 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{tx.date}</span></div></div></div>
                                <span className="text-sm font-black text-[#D81A21] whitespace-nowrap shrink-0">{formatMoney(tx.amount)} ฿</span>
                            </div>
                          );
                      })}
                  </div>
              </div>
              <div className={`rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <h3 className={`font-bold mb-4 flex items-center gap-2 border-b pb-3 shrink-0 ${isDarkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}><PieChart className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> สรุปยอดรายจ่ายแยกตามหมวดหมู่</h3>
                  <div className="flex flex-col gap-4 mt-4 flex-grow">
                      {analytics.sortedCats.map((cat, idx) => {
                          const catDef = categories.find(c => c.name === cat.name);
                          const pColor = catDef?.color || '#D81A21';
                          return (
                            <div key={idx} className="flex flex-col group">
                                <div className="flex justify-between items-end mb-1.5"><span className={`truncate pr-2 text-sm font-bold flex items-center gap-2 transition-colors ${isDarkMode ? "text-slate-300 group-hover:text-slate-100" : "text-slate-700 group-hover:text-slate-900"}`} title={cat.name}>{catDef ? catDef.icon : '📌'} {cat.name}</span><div className="flex items-baseline gap-2 shrink-0"><span className="text-xs font-bold opacity-90 w-12 text-right tracking-wide" style={{color: pColor}}>{cat.percentage}%</span><span className={`text-sm font-black whitespace-nowrap w-24 text-right transition-colors ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{formatMoney(cat.amount)} ฿</span></div></div>
                                <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}><div className="h-1.5 rounded-full transition-all duration-1000 ease-out relative" style={{width: `${cat.percentage}%`, backgroundColor: pColor, opacity: Math.max(0.5, 1 - (idx * 0.05))}}><div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div></div></div>
                            </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* 🌟 Tooltip — Portal ออกไปที่ document.body เพื่อหลุดพ้น overflow:hidden ทุกชั้น */}
          {activityTooltip && typeof window !== 'undefined' && ReactDOM.createPortal(
            <div
              style={{
                position: 'fixed',
                left: activityTooltip.x,
                top: activityTooltip.y,
                transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
                zIndex: 99999,
                pointerEvents: 'none',
              }}
              className="bg-slate-800 text-white text-center rounded-md py-1.5 px-3 text-[11px] font-medium shadow-xl w-max min-w-[90px]"
            >
              <div className="text-slate-400 font-normal text-[10px]">{activityTooltip.date}</div>
              <div className="font-bold mt-0.5" style={{ color: activityTooltip.color }}>{activityTooltip.label}</div>
              {/* หางลูกศร */}
              <div
                style={{ borderTopColor: '#1e293b' }}
                className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent"
              />
            </div>,
            document.body
          )}

      </div>
  );
};

DashboardView.propTypes = {
  transactions:         PropTypes.array.isRequired,
  categories:           PropTypes.array.isRequired,
  filterPeriod:         PropTypes.string.isRequired,
  getFilterLabel:       PropTypes.func.isRequired,
  hideFixedExpenses:    PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  dashboardCategory:    PropTypes.string.isRequired,
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