import React from 'react';
import { Activity, Sun, Moon, Clock, TrendingUp, DollarSign, Settings, Check, Copy } from 'lucide-react';
import FinancialSnapshot from './FinancialSnapshot';
import BudgetAllocator from './BudgetAllocator';

const Sidebar = ({
  darkMode, toggleDarkMode,
  viewYear, setViewYear,
  currentRecord,
  scenario, handleScenarioChange,
  marketParams, handleMarketChange,
  strategyType, setStrategyType,
  propInputs, handlePropChange,
  handleInvChange,
  copyStatus, handleCopyJson, jsonOutputState,
  formatCurrency
}) => {
  return (
    <div className="w-96 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 overflow-y-auto flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Activity className="w-6 h-6" /> Ottawa Wealth Sim
        </h1>
        <button 
          onClick={toggleDarkMode} 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Time Travel Slider & Financial Snapshot Bundle */}
      <div className="px-6 pt-6 pb-2 bg-slate-50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-700">
          {/* Time Travel Slider Controls */}
          <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time Travel
              </label>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-gray-200">
                Year {Math.floor(viewYear)}M{Math.round((viewYear - Math.floor(viewYear)) * 12)}
              </span>
          </div>
          <input 
              type="range" 
              min="0" 
              max="25" 
              step="0.5" 
              value={viewYear} 
              onChange={(e) => setViewYear(parseFloat(e.target.value))} 
              className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Today</span>
              <span>Year 25</span>
          </div>

          <FinancialSnapshot 
            currentRecord={currentRecord} 
            viewYear={viewYear} 
            scenario={scenario} 
            marketParams={marketParams} 
            formatCurrency={formatCurrency}
          />
      </div>

      <div className="p-6 space-y-8">
        {/* Strategy Section */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Strategy
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">My Strategy</label>
              <select 
                className="w-full p-2 border border-slate-200 dark:border-gray-600 rounded-md bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
              >
                <option>Rent & Invest Forever</option>
                <option>Buy & Hold (1 Property)</option>
                <option>Property Ladder (2 Properties)</option>
              </select>
            </div>

            {strategyType === 'Buy & Hold (1 Property)' && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md space-y-3 border border-indigo-100 dark:border-indigo-900">
                <h3 className="font-medium text-indigo-900 dark:text-indigo-300 text-sm">Target Property</h3>
                <div>
                  <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Price ($)</label>
                  <input type="number" name="p1_price" value={propInputs.p1_price} onChange={handlePropChange} className="w-full p-1 border rounded text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="5000" />
                </div>
                <div>
                  <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Downpayment (%)</label>
                  <input type="range" name="p1_down" value={propInputs.p1_down} onChange={handlePropChange} className="w-full accent-indigo-600" min="5" max="50" step="5" />
                  <div className="text-right text-xs text-indigo-600 dark:text-indigo-400 font-mono">{propInputs.p1_down}%</div>
                </div>
              </div>
            )}

            {strategyType === 'Property Ladder (2 Properties)' && (
              <div className="space-y-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md border border-indigo-100 dark:border-indigo-900 space-y-2">
                  <h3 className="font-medium text-indigo-900 dark:text-indigo-300 text-xs uppercase">1. Starter Home</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                       <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Price</label>
                       <input type="number" name="lad_p1_price" value={propInputs.lad_p1_price} onChange={handlePropChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" />
                    </div>
                    <div>
                       <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Down %</label>
                       <input type="number" name="lad_p1_down" value={propInputs.lad_p1_down} onChange={handlePropChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" />
                    </div>
                  </div>
                </div>
                 <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md border border-indigo-100 dark:border-indigo-900 space-y-2">
                  <h3 className="font-medium text-indigo-900 dark:text-indigo-300 text-xs uppercase">2. Forever Home</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                       <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Price</label>
                       <input type="number" name="lad_p2_price" value={propInputs.lad_p2_price} onChange={handlePropChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" />
                    </div>
                    <div>
                       <label className="text-xs text-indigo-700 dark:text-indigo-400 block">Down %</label>
                       <input type="number" name="lad_p2_down" value={propInputs.lad_p2_down} onChange={handlePropChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Finances Section */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Finances
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-300">Gross Income</label>
              <input type="number" name="gross_annual_income" value={scenario.gross_annual_income} onChange={handleScenarioChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="1000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-300">Initial Cash</label>
              <input type="number" name="initial_cash" value={scenario.initial_cash} onChange={handleScenarioChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="1000" />
            </div>
            
            {/* New Budget Allocator */}
            <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
              <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-4 uppercase">Monthly Allocation</h3>
              
              <BudgetAllocator 
                scenario={scenario}
                handleScenarioChange={handleScenarioChange}
                netMonthlyIncome={currentRecord ? currentRecord["Net Monthly Income"] : 0}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>
        </section>

        {/* Investment Profile */}
        <section>
           <h2 className="text-sm font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Portfolio
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between">
                <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Return (While Renting)</label>
                <span className="text-xs font-mono bg-slate-100 dark:bg-gray-700 px-1 rounded text-slate-900 dark:text-gray-100">{(scenario.investment_profile.pre_buy_roi * 100).toFixed(1)}%</span>
              </div>
              <input type="range" name="pre_buy_roi" value={scenario.investment_profile.pre_buy_roi} onChange={handleInvChange} className="w-full accent-emerald-500" min="0" max="0.15" step="0.005" />
            </div>
            <div>
              <div className="flex justify-between">
                 <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Return (After Buying)</label>
                 <span className="text-xs font-mono bg-slate-100 dark:bg-gray-700 px-1 rounded text-slate-900 dark:text-gray-100">{(scenario.investment_profile.post_buy_roi * 100).toFixed(1)}%</span>
              </div>
              <input type="range" name="post_buy_roi" value={scenario.investment_profile.post_buy_roi} onChange={handleInvChange} className="w-full accent-blue-500" min="0" max="0.15" step="0.005" />
            </div>
            <div>
              <div className="flex justify-between">
                 <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Safe Savings Rate</label>
                 <span className="text-xs font-mono bg-slate-100 dark:bg-gray-700 px-1 rounded text-slate-900 dark:text-gray-100">{(scenario.investment_profile.safe_savings_rate * 100).toFixed(1)}%</span>
              </div>
              <input type="range" name="safe_savings_rate" value={scenario.investment_profile.safe_savings_rate} onChange={handleInvChange} className="w-full accent-slate-400" min="0" max="0.10" step="0.005" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="downpayment_glide_path" checked={scenario.investment_profile.downpayment_glide_path} onChange={handleInvChange} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <label className="text-xs text-slate-600 dark:text-gray-300">Safe Mode (Glide Path)</label>
            </div>
          </div>
        </section>

        {/* Global Params */}
         <section>
           <h2 className="text-sm font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Market
          </h2>
          <div className="grid grid-cols-2 gap-3">
             <div>
              <label className="text-xs text-slate-500 dark:text-gray-400">Inflation (%)</label>
              <input type="number" name="inflation_rate" value={(marketParams.inflation_rate * 100).toFixed(2)} onChange={handleMarketChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="0.01" />
             </div>
             <div>
              <label className="text-xs text-slate-500 dark:text-gray-400">Prop. Growth (%)</label>
              <input type="number" name="property_appreciation_rate" value={(marketParams.property_appreciation_rate * 100).toFixed(2)} onChange={handleMarketChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="0.01" />
             </div>
             <div>
              <label className="text-xs text-slate-500 dark:text-gray-400">Rent Infl. (%)</label>
              <input type="number" name="rent_inflation_rate" value={(marketParams.rent_inflation_rate * 100).toFixed(2)} onChange={handleMarketChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="0.01" />
             </div>
             <div>
              <label className="text-xs text-slate-500 dark:text-gray-400">Mortgage %</label>
              <input type="number" name="mortgage_rate" value={(marketParams.mortgage_rate * 100).toFixed(2)} onChange={handleMarketChange} className="w-full p-1 border rounded text-xs bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 border-slate-200 dark:border-gray-600" step="0.01" />
             </div>
          </div>
        </section>

        {/* Copy JSON Button */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-gray-700">
          <button
            onClick={handleCopyJson}
            className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
          >
            {copyStatus === 'copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copyStatus === 'copied' ? 'Copied!' : 'Copy Debug JSON'}
          </button>
          {jsonOutputState && (
            <textarea
              readOnly
              value={jsonOutputState}
              className="w-full h-32 mt-2 p-2 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono resize-y"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;