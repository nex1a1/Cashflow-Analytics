// src/components/DashboardView.jsx
import React from 'react';
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2';
import {
  Wallet, Coins, PiggyBank, Flame, Home, Scale,
  CalendarClock, TrendingUp, PieChart, FileSpreadsheet,
  Filter, AlertCircle, Inbox, Activity, UtensilsCrossed,
} from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import Sparkline from './ui/Sparkline';
import { formatMoney } from '../utils/formatters';
import { getThaiMonth } from '../utils/formatters';
export default function DashboardView({
  transactions, categories, filterPeriod, getFilterLabel,
  hideFixedExpenses, setHideFixedExpenses, analytics,
  dayTypeConfig, isDarkMode, dayTypes,allTransactions,
}) {
  const datesInPeriod = analytics.datesInPeriod || [];
    if (transactions.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-2xl border-2 border-dashed ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <Inbox className="w-20 h-20 mb-6 text-slate-300 animate-bounce" style={{animationDuration: '2s'}} />
              <p className="text-xl font-medium text-slate-600">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* 3 การ์ดบนสุด */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. รายรับ */}
                <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <p className={`font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}><Coins className="w-5 h-5"/> รายรับสุทธิ (Income)</p>
                        <Sparkline data={analytics.sparklineIncome} color="#059669" />
                    </div>
                    <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}><AnimatedNumber value={analytics.totalIncome} /> <span className="text-xl font-medium">฿</span></h3>
                </div>
                
                {/* 2. รายจ่าย */}
                <div className={`border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <p className={`font-bold flex items-center gap-2 group-hover:scale-105 transition-transform origin-left ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}><Wallet className="w-5 h-5"/> รายจ่ายสุทธิ (Expenses)</p>
                        <Sparkline data={analytics.sparklineExpense} color="#DC2626" />
                    </div>
                    <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}><AnimatedNumber value={analytics.totalExpense} /> <span className="text-xl font-medium">฿</span></h3>
                </div>
                
                {/* 3. คงเหลือ */}
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

            {/* แถวที่ 2: อัตราเผาผลาญ / ค่ากิน / หอพัก / โครงสร้าง / วันทำงาน vs วันหยุด */}
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
                        <span className={`font-bold px-2 py-1 rounded border transition-colors ${analytics.rentPercentage > 30 ? (isDarkMode ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100') : (isDarkMode ? 'text-blue-400 bg-blue-900/30 border-blue-800' : 'text-blue-600 bg-blue-50 border-blue-100')}`}>
                            {analytics.rentPercentage > 30 ? 'เกิน 30% ของรายจ่าย' : 'สัดส่วนกำลังดี'}
                        </span>
                    </div>
                </div>

                {/* Food Card */}
                <div className={`border-l-[5px] border-orange-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-orange-500"><UtensilsCrossed className="w-32 h-32"/></div>
                    <div>
                        <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><UtensilsCrossed className="w-4 h-4 text-orange-500"/> ค่ากินเฉลี่ย/วัน</p>
                        <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}><AnimatedNumber value={analytics.foodDailyAvg} /> <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>฿/วัน</span></h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รวมเดือนนี้</span>
                        <span className={`font-bold px-2 py-1 rounded border ${analytics.foodPercentage > 35 ? (isDarkMode ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-red-600 bg-red-50 border-red-100') : (isDarkMode ? 'text-orange-400 bg-orange-900/30 border-orange-800' : 'text-orange-600 bg-orange-50 border-orange-100')}`}>
                            {analytics.foodPercentage}% ของรายจ่าย
                        </span>
                    </div>
                </div>

                {/* Variable Card */}
                <div className={`border-l-[5px] border-pink-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-pink-500"><TrendingUp className="w-32 h-32"/></div>
                    <div>
                        <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4 text-pink-500"/> รายจ่ายผันแปร/วัน</p>
                        <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            <AnimatedNumber value={analytics.variableTotal / (analytics.uniqueDays || 1)} />
                            <span className={`text-lg font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}> ฿/วัน</span>
                        </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รวมเดือนนี้</span>
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
                {/* <div className={`border-l-[5px] border-emerald-500 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500"><Activity className="w-32 h-32"/></div>
                    <div>
                        <p className={`text-sm font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Activity className="w-4 h-4 text-emerald-500"/> วันทำงาน vs วันหยุด</p>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>📅 วันทำงาน</span>
                                <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatMoney(analytics.weekdayTotal)} ฿</span>
                            </div>
                            <div className={`w-full rounded-full h-2 overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <div className="bg-emerald-500 h-2 transition-all duration-1000 ease-out" style={{width: `${analytics.weekdayTotal + analytics.weekendTotal > 0 ? ((analytics.weekdayTotal / (analytics.weekdayTotal + analytics.weekendTotal)) * 100).toFixed(0) : 0}%`}}></div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>🏖️ วันหยุด</span>
                                <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatMoney(analytics.weekendTotal)} ฿</span>
                            </div>
                            <div className={`w-full rounded-full h-2 overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <div className="bg-orange-400 h-2 transition-all duration-1000 ease-out" style={{width: `${analytics.weekdayTotal + analytics.weekendTotal > 0 ? ((analytics.weekendTotal / (analytics.weekdayTotal + analytics.weekendTotal)) * 100).toFixed(0) : 0}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div> */}
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
                            <div className="flex flex-wrap gap-[4px] justify-start">
                                {datesInPeriod.map((dateStr, idx) => {
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

                                    const isFirstOfMonth = d === '01';
                                    const isFirstOfYear  = d === '01' && m === '01';

                                    return (
                                        <React.Fragment key={dateStr}>
                                          {/* separator | เดือน หรือ || ปี */}
                                          {idx > 0 && isFirstOfMonth && (
                                            <div className="flex flex-col items-center justify-start" style={{width: isFirstOfYear ? '8px' : '4px', marginLeft: '1px', marginRight: '1px'}}>
                                              <div className="flex gap-[3px]" style={{height: '14px'}}>
                                                <div className={`w-px h-full rounded-full ${isFirstOfYear ? (isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500') : (isDarkMode ? 'bg-slate-500' : 'bg-slate-300')}`}/>
                                                {isFirstOfYear && <div className={`w-px h-full rounded-full ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'}`}/>}
                                              </div>
                                              <span className={`text-[6px] font-bold leading-none mt-px whitespace-nowrap ${isFirstOfYear ? (isDarkMode ? 'text-yellow-400' : 'text-yellow-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                                {isFirstOfYear ? y.slice(2) : shortMonths[parseInt(m)-1]}
                                              </span>
                                            </div>
                                          )}
                                          <div className="group relative">
                                            <div 
                                                className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all duration-200 ${isToday ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10 shadow-md' : 'hover:scale-125 hover:z-10 hover:shadow-sm opacity-90 hover:opacity-100'}`}
                                                style={{ backgroundColor: typeConfig.color }}
                                            ></div>
                                            {/* Tooltip */}
                                            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[90px] bg-slate-800 text-white text-center rounded-md py-1.5 px-2 z-50 text-[11px] font-medium shadow-lg transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 pointer-events-none">
                                                <span className="text-slate-300 font-normal">{displayDate}</span><br/>
                                                <span style={{ color: typeConfig.color }}>{typeConfig.label}</span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                            </div>
                                          </div>
                                        </React.Fragment>
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
              <div className={`rounded-xl shadow-md border overflow-hidden hover:shadow-lg transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400"/> ตารางสรุปกระแสเงินสด (Cashflow Statement)</h3>
                      <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">รูปแบบคล้าย Excel</span>
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
                                      {/* คอลัมน์ช่วงเวลา */}
                                      <td className={`px-4 py-2.5 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 group-hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-700 group-hover:bg-slate-50'}`}>
                                          {getThaiMonth(row.monthStr)}
                                      </td>
                                      
                                      {/* คอลัมน์เงินเดือน (เขียว) */}
                                      <td className={`px-4 py-2.5 font-bold transition-colors ${isDarkMode ? 'text-emerald-400 bg-emerald-900/20 group-hover:bg-emerald-900/40' : 'text-emerald-700 bg-emerald-50/60 group-hover:bg-emerald-100/60'}`}>
                                          {row.salary > 0 ? formatMoney(row.salary) : '-'}
                                      </td>
                                      
                                      {/* คอลัมน์เงินพิเศษ (เขียวอ่อนกว่า) */}
                                      <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-emerald-400/80 bg-emerald-900/10 group-hover:bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50/30 group-hover:bg-emerald-100/40'}`}>
                                          {row.bonus > 0 ? formatMoney(row.bonus) : '-'}
                                      </td>
                                      
                                      {/* คอลัมน์ค่าใช้จ่ายทั่วไป (เทา) */}
                                      <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-slate-300 bg-slate-900/20 group-hover:bg-slate-800' : 'text-slate-600 bg-transparent group-hover:bg-slate-50'}`}>
                                          {row.rent > 0 ? formatMoney(row.rent) : '-'}
                                      </td>
                                      
                                      {/* คอลัมน์หนี้/รายเดือน (ม่วง) */}
                                      <td className={`px-4 py-2.5 font-medium transition-colors ${isDarkMode ? 'text-purple-400 bg-purple-900/20 group-hover:bg-purple-900/40' : 'text-purple-700 bg-purple-50/60 group-hover:bg-purple-100/60'}`}>
                                          {row.subs > 0 ? formatMoney(row.subs) : '-'}
                                      </td>
                                      
                                      {/* คอลัมน์ค่าใช้จ่ายทั่วไป (เทา) */}
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
                                      
                                      {/* คอลัมน์ยอดใช้จ่ายสุทธิ (แดง) */}
                                      <td className={`px-4 py-2.5 font-bold border-l-2 transition-colors ${isDarkMode ? 'text-red-400 bg-red-900/20 border-slate-700 group-hover:bg-red-900/40' : 'text-red-700 bg-red-50/60 border-slate-200 group-hover:bg-red-100/60'}`}>
                                          {formatMoney(row.totalExp)}
                                      </td>
                                      
                                      {/* คอลัมน์เงินคงเหลือ (น้ำเงิน) */}
                                      <td className={`px-4 py-2.5 font-black transition-colors ${isDarkMode ? 'text-blue-400 bg-blue-900/30 group-hover:bg-blue-900/50' : 'text-[#00509E] bg-blue-50/80 group-hover:bg-blue-100/80'}`}>
                                          {formatMoney(row.income - row.totalExp)}
                                      </td>
                                      {/* MoM % เปลี่ยนแปลง */}
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
                    {/* ปรับสีพื้นหลังการ์ดให้รองรับ Dark Mode */}
                    <div className={`rounded-xl shadow-sm border p-6 flex flex-col flex-grow h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> 
                              {analytics.mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสดและรายจ่าย' : analytics.mainChartType === 'bar' ? 'เทรนด์รายจ่ายไลฟ์สไตล์เปรียบเทียบ' : `กราฟรายจ่ายรายวันในงวดที่เลือก`}
                          </h3>
                          <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                              <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                                  <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ease-in-out ${hideFixedExpenses ? 'bg-[#D81A21]' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${hideFixedExpenses ? 'transform translate-x-4' : ''}`}></div>
                              </div>
                              <span className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  <Filter className="w-3 h-3"/> ซ่อนยอดภาระคงที่
                              </span>
                          </label>
                        </div>
                        <div className="relative w-full flex-grow min-h-[320px]">
                            {/* บังคับส่งค่าสีเส้นและตัวอักษรเข้าไปใน Options ของ Chart ให้เปลี่ยนตาม isDarkMode ทันที */}
                            {analytics.mainChartType === 'combo' ? (
                              <Chart type="bar" data={analytics.mainChartData} options={{
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      color: isDarkMode ? '#cbd5e1' : '#475569',
                                      padding: 16,
                                      usePointStyle: true,
                                      pointStyle: 'circle',
                                      font: { size: 12, weight: 'bold' },
                                    }
                                  },
                                  tooltip: {
                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                    titleColor: isDarkMode ? '#f1f5f9' : '#1e293b',
                                    bodyColor: isDarkMode ? '#94a3b8' : '#475569',
                                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                    borderWidth: 1,
                                    padding: 12,
                                    cornerRadius: 10,
                                    callbacks: {
                                      label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
                                    }
                                  }
                                },
                                animation: { duration: 800, easing: 'easeInOutQuart' },
                                scales: {
                                  x: {
                                    ticks: { color: isDarkMode ? '#94a3b8' : '#64748b', font: { size: 11 } },
                                    grid: { display: false },
                                    border: { display: false },
                                  },
                                  y: {
                                    ticks: {
                                      color: isDarkMode ? '#94a3b8' : '#64748b',
                                      font: { size: 11 },
                                      callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v,
                                    },
                                    grid: { color: isDarkMode ? '#1e293b' : '#f1f5f9', lineWidth: 1 },
                                    border: { dash: [4, 4], display: false },
                                  }
                                }
                              }} />
                            ) : analytics.mainChartType === 'bar' ? (
                              <Bar data={analytics.mainChartData} options={{
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                    titleColor: isDarkMode ? '#f1f5f9' : '#1e293b',
                                    bodyColor: isDarkMode ? '#94a3b8' : '#475569',
                                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                    borderWidth: 1,
                                    padding: 12,
                                    cornerRadius: 10,
                                    callbacks: {
                                      label: (ctx) => ` ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
                                    }
                                  }
                                },
                                animation: { duration: 800, easing: 'easeInOutQuart' },
                                scales: {
                                  x: {
                                    ticks: { color: isDarkMode ? '#94a3b8' : '#64748b', font: { size: 11 } },
                                    grid: { display: false },
                                    border: { display: false },
                                  },
                                  y: {
                                    ticks: {
                                      color: isDarkMode ? '#94a3b8' : '#64748b',
                                      font: { size: 11 },
                                      callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v,
                                    },
                                    grid: { color: isDarkMode ? '#1e293b' : '#f1f5f9' },
                                    border: { dash: [4, 4], display: false },
                                  }
                                }
                              }} />
                            ) : (
                              <Line data={analytics.mainChartData} options={{
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                    titleColor: isDarkMode ? '#f1f5f9' : '#1e293b',
                                    bodyColor: isDarkMode ? '#94a3b8' : '#475569',
                                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                    borderWidth: 1,
                                    padding: 12,
                                    cornerRadius: 10,
                                    callbacks: {
                                      label: (ctx) => ` ${ctx.parsed.y?.toLocaleString('th-TH')} ฿`,
                                    }
                                  }
                                },
                                animation: { duration: 800, easing: 'easeInOutQuart' },
                                scales: {
                                  x: {
                                    ticks: { color: isDarkMode ? '#94a3b8' : '#64748b', font: { size: 11 } },
                                    grid: { display: false },
                                    border: { display: false },
                                  },
                                  y: {
                                    beginAtZero: true,
                                    ticks: {
                                      color: isDarkMode ? '#94a3b8' : '#64748b',
                                      font: { size: 11 },
                                      callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v,
                                    },
                                    grid: { color: isDarkMode ? '#1e293b' : '#f1f5f9' },
                                    border: { dash: [4, 4], display: false },
                                  }
                                }
                              }} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    <div className={`rounded-xl shadow-sm border p-6 flex flex-col flex-grow h-full hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-100'}`}>
                            <PieChart className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> สัดส่วนรายจ่าย (ในกราฟ)
                        </h3>
                        <div className="w-full h-[220px] flex-shrink-0 flex justify-center relative mb-4">
                            <Doughnut data={analytics.catChartData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } }, animation: { animateScale: true, animateRotate: true, duration: 1000 } }}/>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ยอดรวม</span>
                                <span className={`text-base font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>{formatMoney(analytics.chartTotal)}</span>
                            </div>
                        </div>
                        <div className="w-full overflow-y-auto pr-2 custom-scrollbar flex-grow" style={{maxHeight: "300px"}}>
                            <table className="w-full text-sm text-left">
                                <thead className={`sticky top-0 shadow-sm ${isDarkMode ? 'bg-slate-800/90' : 'bg-slate-50'}`}>
                                    <tr>
                                        <th className={`px-2 py-2 font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>หมวดหมู่</th>
                                        <th className={`px-2 py-2 font-semibold text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>ยอดรวม</th>
                                        {analytics.numMonths > 1 && <th className={`px-2 py-2 font-semibold text-right ${isDarkMode ? 'text-slate-400 bg-blue-900/20' : 'text-slate-500 bg-blue-50/50'}`}>เฉลี่ย/ด.</th>}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                    {analytics.sortedCats.map((cat, idx) => {
                                        const catDef = categories.find(c => c.name === cat.name);
                                        return (
                                          <tr key={idx} className={`group transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                              <td className="px-2 py-2.5 flex items-center gap-1.5 truncate max-w-[120px]" title={cat.name}>
                                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style={{backgroundColor: analytics.catChartData.datasets[0].backgroundColor[idx]}}></div>
                                                  <span className={`truncate text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{catDef?.icon} {cat.name}</span>
                                              </td>
                                              <td className={`px-2 py-2.5 text-right font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatMoney(cat.amount)}</td>
                                              {analytics.numMonths > 1 && <td className={`px-2 py-2.5 text-right font-bold text-xs transition-colors ${isDarkMode ? 'text-blue-400 bg-blue-900/10' : 'text-[#00509E] bg-blue-50/30'}`}>{formatMoney(cat.avgPerMonth)}</td>}
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
                <div className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 border-b pb-3 ${isDarkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}>
                        <AlertCircle className="w-5 h-5 text-[#D81A21]" /> TOP 7 รายการที่จ่ายแพงที่สุด (ในกราฟ)
                    </h3>
                    <div className="space-y-3">
                        {analytics.top7Transactions.map((tx, idx) => {
                            const catDef = categories.find(c => c.name === tx.category);
                            return (
                              <div key={tx.id} className={`flex justify-between items-start p-3 transition-colors rounded-lg border hover:shadow-sm ${isDarkMode ? "bg-slate-900/40 hover:bg-slate-700 border-slate-700" : "bg-slate-50 hover:bg-slate-100 border-slate-100"}`}>
                                  <div className="overflow-hidden pr-2 flex items-center gap-3">
                                      <div className="text-lg font-black text-slate-300 w-6 text-center">{idx + 1}</div>
                                      <div>
                                          <p className={`text-sm font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`} title={tx.description}>{tx.description}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span 
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-white" 
                                                style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}
                                                title={tx.category}
                                            >
                                              {catDef?.icon} {tx.category}
                                            </span>
                                            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{tx.date}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <span className="font-black text-[#D81A21] whitespace-nowrap">{formatMoney(tx.amount)} ฿</span>
                              </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 border-b pb-3 ${isDarkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}>
                        <PieChart className="w-5 h-5 text-[#00509E]" /> 7 หมวดหมู่ที่ละลายทรัพย์สุด
                    </h3>
                    <div className="space-y-5 mt-4">
                        {analytics.sortedCats.slice(0, 7).map((cat, idx) => {
                            const catDef = categories.find(c => c.name === cat.name);
                            const pColor = catDef?.color || '#D81A21';
                            return (
                              <div key={idx}>
                                  <div className="flex justify-between text-sm font-medium mb-1.5">
                                      <span className={`truncate pr-2 font-bold flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`} title={cat.name}>
                                          <span className="text-slate-400">{idx+1}.</span> {catDef ? catDef.icon : '📌'} {cat.name}
                                      </span>
                                      <span className={`font-black whitespace-nowrap ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{formatMoney(cat.amount)} ฿</span>
                                  </div>
                                  <div className={`w-full rounded-full h-2 overflow-hidden ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                                      <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{width: `${cat.percentage}%`, backgroundColor: pColor, opacity: 1 - (idx * 0.1)}}></div>
                                  </div>
                                  <div className="flex justify-between mt-1">
                                      <p className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>เฉลี่ย {formatMoney(cat.avgPerMonth)}/เดือน</p>
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