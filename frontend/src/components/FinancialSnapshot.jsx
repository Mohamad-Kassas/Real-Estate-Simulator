import React from 'react';
import { Activity, Info, Home } from 'lucide-react';

const FinancialSnapshot = ({ currentRecord, viewYear, scenario, marketParams, formatCurrency }) => {
  if (!currentRecord) return null;

  return (
    <div className="mt-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md p-0 shadow-sm overflow-hidden">
      
      {/* 1. Header */}
      <div className="bg-slate-50 dark:bg-gray-700/50 p-3 border-b border-slate-100 dark:border-gray-600">
        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex justify-between items-center">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> Financial Snapshot</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded-full">Year {Math.floor(viewYear)}M{Math.round((viewYear - Math.floor(viewYear)) * 12)}</span>
        </h4>
      </div>

      <div className="p-3 space-y-4">
        
        {/* 2. Top Section: Monthly Cash Flow */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Net Pay</span>
            <span>{formatCurrency(currentRecord["Net Monthly Income"])}</span>
          </div>

          <div className="pl-2 border-l-2 border-slate-200 dark:border-gray-600 space-y-1">
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>- Housing</span>
              <span>{formatCurrency(currentRecord["Housing Expense"] || 0)}</span>
            </div>
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>- Expenses</span>
              <span>{formatCurrency(currentRecord["Living Expenses"])}</span> {/* Changed to use currentRecord */}
            </div>
          </div>

          <div className="flex justify-between border-t border-slate-100 dark:border-gray-700 pt-1 font-semibold text-slate-700 dark:text-gray-300">
            <span>= Surplus</span>
            <span>{formatCurrency(currentRecord["Monthly Surplus"])}</span>
          </div>

          <div className="pl-2 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-1 pt-1">
            <div className="flex justify-between text-pink-500">
              <span>- Lifestyle</span>
              <span>{formatCurrency(currentRecord["Monthly Surplus"] * scenario.discretionary_spending_percent)}</span>
            </div>
            <div className="flex justify-between text-emerald-500">
              <span>- Cash Save</span>
              <span>{formatCurrency(currentRecord["Monthly Surplus"] * scenario.cash_savings_percent)}</span>
            </div>
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 p-1 rounded">
              <span>= Invest</span>
              <span>{formatCurrency(currentRecord["Monthly Surplus"] * (1 - scenario.discretionary_spending_percent - scenario.cash_savings_percent))}</span>
            </div>
          </div>
        </div>

        {/* 3. Divider */}
        <div className="border-t border-slate-100 dark:border-gray-700"></div>

        {/* 4. Bottom Section: Housing Feasibility */}
        {(() => {
          const nextTargetCost = currentRecord["Next Target Cost"];
          const liquid = currentRecord["Liquid Assets"];
          const gdsRatio = currentRecord["GDS Ratio"];
          const stressPassed = currentRecord["Stress Test Passed"];
          
          const hypotheticalMonthlyHousingCost = currentRecord["Hypothetical Monthly Housing"] || 0;
          const maxAffordableHousingMonthly = currentRecord["Max Affordable Housing"] || 0;
          const isOwner = currentRecord["Is Owner"];
          
          let statusTitle = "No Active Target";
          let statusColor = "text-slate-500 dark:text-slate-400";
          let statusDesc = "Select a strategy.";

          if (scenario.property_targets.length > 0) {
            if (isOwner) {
                if (currentRecord["Current Home"] >= scenario.property_targets.length) {
                   statusTitle = "Goal Achieved!";
                   statusColor = "text-emerald-600 dark:text-emerald-400";
                   statusDesc = "All properties purchased.";
                } else {
                   statusTitle = "Saving for Next Property";
                   statusColor = "text-indigo-600 dark:text-indigo-400";
                   statusDesc = "One down, one to go.";
                }
            } else if (nextTargetCost > 0) {
                if (liquid < nextTargetCost) {
                   statusTitle = "Savings Limited";
                   statusColor = "text-amber-600 dark:text-amber-400";
                   statusDesc = `Need ${formatCurrency(nextTargetCost - liquid)} more.`;
                } else if (!stressPassed) { 
                   statusTitle = "Income Limited";
                   statusColor = "text-red-600 dark:text-red-400";
                   statusDesc = "Stress Test Failed (GDS > 39%).";
                } else { 
                   statusTitle = "Ready to Buy!";
                   statusColor = "text-emerald-600 dark:text-emerald-400";
                   statusDesc = "Purchase imminent.";
                }
            }
          }

          return (
            <div className="text-xs">
               <div className={`font-bold mb-1 ${statusColor} flex items-center gap-1`}>
                 {statusTitle === "Savings Limited" ? <Info className="w-3 h-3"/> : <Home className="w-3 h-3"/>}
                 {statusTitle}
               </div>
               <p className="opacity-80 mb-2">{statusDesc}</p>

               {nextTargetCost > 0 && !isOwner && (
                 <div className="bg-slate-50 dark:bg-gray-700/50 p-2 rounded border border-slate-100 dark:border-gray-600 space-y-1 font-mono text-[10px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-gray-400">Gross Income</span>
                                    <span className="font-bold text-slate-700 dark:text-gray-200">{formatCurrency(currentRecord["Gross Monthly Income"])} <span className="opacity-60">(100%)</span></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-gray-400">Est. Payment</span>
                                    <span className="font-bold text-slate-700 dark:text-gray-200">{formatCurrency(hypotheticalMonthlyHousingCost)} <span className="opacity-60">({(gdsRatio * 100).toFixed(1)}%)</span></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-gray-400">Max Allowed</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(maxAffordableHousingMonthly)} <span className="opacity-60">(39.0%)</span></span>
                                </div>
                             </div>
                           )}
                        </div>
                      );
                    })()}

                  </div>
                </div>
              );
            };

export default FinancialSnapshot;