import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import StressTestWidget from './StressTestWidget';

const Dashboard = ({
  scenario,
  finalNetWorth,
  formatCurrency,
  activeTab,
  setActiveTab,
  results,
  darkMode,
  viewYear,
  buyEvents
}) => {
  // Define Tailwind CSS utility classes for colors
  const themeColors = {
    netWorth: 'var(--color-net-worth, #4f46e5)', // Indigo 600
    liquidAssets: 'var(--color-liquid-assets, #10b981)', // Emerald 500
    homeEquity: 'var(--color-home-equity, #f59e0b)', // Amber 500
    requiredToBuy: 'var(--color-required-to-buy, #ef4444)', // Red 500
    timeTravelRef: 'var(--color-time-travel-ref, #6366f1)', // Indigo 500
    buyEventRef: 'var(--color-buy-event-ref, #f59e0b)', // Amber 500
    gridStroke: darkMode ? '#4b5563' : '#f1f5f9',
    axisStroke: darkMode ? '#9ca3af' : '#94a3b8',
    tickFill: darkMode ? '#e5e7eb' : '#475569',
    tooltipBg: darkMode ? '#1f2937' : '#fff',
    tooltipBorder: darkMode ? '#4b5563' : '#e2e8f0',
    tooltipColor: darkMode ? '#e5e7eb' : '#1f2937',
  };

  // Determine which data point to show in widgets
  // Default to the last month of the selected viewYear, or the very last record if not specified
  const targetYearIndex = viewYear !== undefined ? Math.min(Math.floor(viewYear * 12), results.length - 1) : results.length - 1;
  const currentData = results.length > 0 ? results[targetYearIndex] : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 p-6 flex justify-between items-center shadow-sm">
         <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{scenario.name}</h2>
           <p className="text-slate-500 dark:text-gray-400 text-sm">25 Year Projection</p>
         </div>
         <div className="text-right">
           <div className="text-sm text-slate-500 dark:text-gray-400 uppercase tracking-wider">Final Net Worth</div>
           <div className="text-3xl font-bold text-emerald-600">{formatCurrency(finalNetWorth)}</div>
         </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-gray-700">
          <button 
            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'netWorth' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('netWorth')}
          >
            Net Worth Evolution
          </button>
          <button 
            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'gap' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('gap')}
          >
            Buying Power Gap
          </button>
        </div>

        {/* Chart Area */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-96">
           <ResponsiveContainer width="100%" height="100%">
             {activeTab === 'netWorth' ? (
               <LineChart data={results} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridStroke} />
                  <XAxis dataKey="Year" type="number" domain={[0, 25]} stroke={themeColors.axisStroke} tick={{ fill: themeColors.tickFill }} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} stroke={themeColors.axisStroke} tick={{ fill: themeColors.tickFill }} />
                  <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: themeColors.tooltipBg, borderColor: themeColors.tooltipBorder, color: themeColors.tooltipColor }} />
                  <Legend />
                  <Line type="monotone" dataKey="Net Worth" stroke={themeColors.netWorth} strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Liquid Assets" stroke={themeColors.liquidAssets} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Home Equity" stroke={themeColors.homeEquity} strokeWidth={2} dot={false} />
                  
                  {/* Time Travel Reference Line */}
                  <ReferenceLine x={viewYear} stroke={themeColors.timeTravelRef} strokeDasharray="3 3" />

                  {buyEvents.map((buyEvent, idx) => (
                     <ReferenceLine key={idx} x={buyEvent.year} stroke={themeColors.buyEventRef} strokeDasharray="3 3" strokeWidth={2} label={`BUY #${buyEvent.homeIndex}`} />
                  ))}
               </LineChart>
             ) : (
                <LineChart data={results} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.gridStroke} />
                  <XAxis dataKey="Year" type="number" domain={[0, 25]} stroke={themeColors.axisStroke} tick={{ fill: themeColors.tickFill }} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} stroke={themeColors.axisStroke} tick={{ fill: themeColors.tickFill }} />
                  <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: themeColors.tooltipBg, borderColor: themeColors.tooltipBorder, color: themeColors.tooltipColor }} />
                  <Legend />
                  <Line type="monotone" dataKey="Liquid Assets" name="My Cash" stroke={themeColors.liquidAssets} strokeWidth={3} dot={false} />
                  {/* Only show target cost if it's > 0 */}
                  <Line type="stepAfter" dataKey="Next Target Cost" name="Required to Buy" stroke={themeColors.requiredToBuy} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                  
                  {/* Time Travel Reference Line */}
                  <ReferenceLine x={viewYear} stroke={themeColors.timeTravelRef} strokeDasharray="3 3" />

                  {buyEvents.map((buyEvent, idx) => (
                     <ReferenceLine key={idx} x={buyEvent.year} stroke={themeColors.buyEventRef} strokeDasharray="3 3" strokeWidth={2} label={`BUY #${buyEvent.homeIndex}`} />
                  ))}
               </LineChart>
             )}
           </ResponsiveContainer>
        </div>

        {/* Bottom Section: Split into Stats Grid and Stress Test Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Left Col: Key Stats (Spans 2 columns on large screens) */}
           <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 h-full">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Liquid Assets</h3>
                    <div className="text-xl font-bold text-slate-800 dark:text-gray-100">
                    {formatCurrency(currentData ? currentData["Liquid Assets"] : 0)}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Home Equity</h3>
                    <div className="text-xl font-bold text-slate-800 dark:text-gray-100">
                    {formatCurrency(currentData ? currentData["Home Equity"] : 0)}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Mortgage Debt</h3>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(currentData ? currentData["Mortgage Debt"] : 0)}
                    </div>
                </div>
                {/* Row 2 */}
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Total Investments</h3>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(currentData ? (currentData["Liquid Assets"] - currentData["Cash Savings"]) : 0)}
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Total Savings</h3>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(currentData ? currentData["Cash Savings"] : 0)}
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase mb-2">Monthly Housing Payment</h3>
                    <div className="text-xl font-bold text-slate-800 dark:text-gray-100">
                    {formatCurrency(currentData ? currentData["Housing Expense"] : 0)}
                    </div>
                </div>
           </div>

           {/* Right Col: Stress Test Widget */}
           <div className="lg:col-span-1 h-full">
               <StressTestWidget currentData={currentData} formatCurrency={formatCurrency} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;