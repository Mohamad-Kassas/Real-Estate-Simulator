import React, { useState, useEffect } from 'react';
import { Lock, Unlock, TrendingUp, Shield, Coffee, Home, ShoppingCart } from 'lucide-react';

const BudgetAllocator = ({ 
  scenario, 
  handleScenarioChange, 
  netMonthlyIncome, 
  formatCurrency 
}) => {
  // We need local state to handle smooth sliding before committing to the global scenario
  // However, the global scenario splits these values:
  // - Rent: scenario.current_rent ($)
  // - Essentials: scenario.monthly_living_expenses ($)
  // - Lifestyle: scenario.discretionary_spending_percent (%)
  // - Savings: scenario.cash_savings_percent (%)
  // - Invest: Remainder (%)

  // We will manage everything as DOLLAR amounts locally for easier logic, 
  // then convert back to the expected format for the parent on change.

  const [allocations, setAllocations] = useState({
    rent: 0,
    essentials: 0,
    lifestyle: 0,
    savings: 0,
    invest: 0
  });

  // Sync with props when they change (e.g. income updates or parent updates)
  useEffect(() => {
    if (netMonthlyIncome > 0) {
        const rent = parseFloat(scenario.current_rent) || 0;
        const essentials = parseFloat(scenario.monthly_living_expenses) || 0;
        
        // Use Direct Percentages of Income for Invest/Save
        const invest = netMonthlyIncome * scenario.investment_percent;
        const savings = netMonthlyIncome * scenario.cash_savings_percent;
        
        // Lifestyle is whatever is left over (The Buffer)
        const mandatory = rent + essentials;
        const lifestyle = Math.max(0, netMonthlyIncome - mandatory - invest - savings);

        setAllocations({
            rent,
            essentials,
            lifestyle,
            savings,
            invest
        });
    }
  }, [scenario, netMonthlyIncome]);

  // Helper to commit changes back to parent
  const commitChanges = (newAllocations) => {
    const newRent = newAllocations.rent;
    const newEssentials = newAllocations.essentials;

    // Calculate new percentages relative to TOTAL NET INCOME
    let newInvestPct = 0;
    let newSavingsPct = 0;

    if (netMonthlyIncome > 0) {
        newInvestPct = newAllocations.invest / netMonthlyIncome;
        newSavingsPct = newAllocations.savings / netMonthlyIncome;
    }

    // We only update the explicit targets. Lifestyle is implicit in the backend now too.
    handleScenarioChange({ target: { name: 'current_rent', value: newRent } });
    handleScenarioChange({ target: { name: 'monthly_living_expenses', value: newEssentials } });
    handleScenarioChange({ target: { name: 'investment_percent', value: newInvestPct } });
    handleScenarioChange({ target: { name: 'cash_savings_percent', value: newSavingsPct } });
  };

  const updateAllocation = (category, value) => {
    let newVal = parseFloat(value);
    if (isNaN(newVal)) newVal = 0;
    
    // Create a copy to manipulate
    const current = { ...allocations };
    const oldVal = current[category];
    const delta = newVal - oldVal;

    // Logic Rule: Lifestyle is the "Buffer" (The Rest)
    // - If we increase Invest/Savings, we steal from Lifestyle first.
    // - If we decrease Invest/Savings, we give to Lifestyle.

    // --- CASE A: Value Increasing ---
    if (delta > 0) {
        let remainderNeeded = delta;

        const deplete = (targetCat) => {
            if (targetCat === category) return; 
            if (remainderNeeded <= 0) return;

            const available = current[targetCat];
            const taken = Math.min(available, remainderNeeded);
            current[targetCat] -= taken;
            remainderNeeded -= taken;
        };

        // Priority: Steal from Lifestyle first
        if (category === 'invest') {
             deplete('lifestyle');
             deplete('savings');
        } else if (category === 'savings') {
             deplete('lifestyle');
             deplete('invest');
        } else if (category === 'lifestyle') {
             // If forcing lifestyle up, steal from Invest then Savings
             deplete('invest');
             deplete('savings');
        } else {
             // Mandatory costs increasing -> Steal from Lifestyle -> Invest -> Savings
             deplete('lifestyle');
             deplete('invest');
             deplete('savings');
        }

        // If we still need money and couldn't find it, we block the increase.
        if (remainderNeeded > 0.01) {
            newVal = newVal - remainderNeeded;
        }
    } 
    
    // --- CASE B: Value Decreasing ---
    else if (delta < 0) {
        const freedUp = Math.abs(delta);
        
        // If we lower something, the money flows into Lifestyle (The Rest)
        // Unless we are lowering Lifestyle itself, then it goes to Invest
        if (category === 'lifestyle') {
            current.invest += freedUp;
        } else {
            current.lifestyle += freedUp;
        }
    }

    current[category] = newVal;
    
    setAllocations(current);
    commitChanges(current);
  };

  const [focusedInput, setFocusedInput] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  const handlePctFocus = (key, currentPct) => {
      setFocusedInput(key);
      setTempInputValue(currentPct.toFixed(1));
  };

  const handlePctBlur = () => {
      setFocusedInput(null);
      setTempInputValue("");
  };

  const handlePctChange = (key, val) => {
      setTempInputValue(val); // Keep the UI responsive to typing
      updateAllocationPct(key, val); // Commit logic
  };

    const updateAllocationPct = (category, pctVal) => {
      let pct = parseFloat(pctVal);
      if (isNaN(pct)) pct = 0;
      // Clamp to 0-100 to avoid wild inputs
      pct = Math.min(100, Math.max(0, pct));
      const dollarVal = (pct / 100) * netMonthlyIncome;
      updateAllocation(category, dollarVal);
    };

    const renderRow = (key, label, icon, textClass, accentClass, isFixed) => {
    const val = allocations[key];
    const pct = netMonthlyIncome > 0 ? (val / netMonthlyIncome) * 100 : 0;
    
    // Use temp value if focused, otherwise calculated
    const displayValue = (focusedInput === key) ? tempInputValue : pct.toFixed(1);

    return (
        <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="relative group">
                        <input
                            type="number"
                            value={displayValue}
                            onFocus={() => handlePctFocus(key, pct)}
                            onBlur={handlePctBlur}
                            onChange={(e) => handlePctChange(key, e.target.value)}
                            className="w-16 p-1 text-right text-xs font-mono border-b border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent outline-none text-slate-500 dark:text-gray-400"
                        />
                        <span className="absolute right-0 top-1 text-xs text-slate-400 pointer-events-none opacity-50">%</span>
                    </div>
                    <input
                        type="number"
                        value={Math.round(val)}
                        onChange={(e) => updateAllocation(key, e.target.value)}
                        className={`w-20 p-1 text-right text-sm font-bold border rounded bg-slate-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500 ${textClass}`}
                    />
                </div>
            </div>
            
            {/* Standard Native Slider - Matches Sidebar.jsx style */}
            <input 
                type="range"
                min="0"
                max={netMonthlyIncome}
                step="50"
                value={val}
                onChange={(e) => updateAllocation(key, e.target.value)}
                className={`w-full cursor-pointer ${accentClass}`}
            />
        </div>
    );
  };

  return (
    <div className="space-y-6">
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900 text-center">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Net Monthly Income</h3>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {formatCurrency(netMonthlyIncome)}
            </div>
        </div>

        <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-3 h-3" /> Mandatory
            </h4>
            {renderRow('rent', 'Rent / Mortgage', <Home className="w-4 h-4 text-slate-400"/>, 'text-slate-600 dark:text-slate-400', 'accent-slate-400', true)}
            {renderRow('essentials', 'Essentials', <ShoppingCart className="w-4 h-4 text-slate-400"/>, 'text-slate-600 dark:text-slate-400', 'accent-slate-400', true)}
        </div>

        <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Allocation Strategy
            </h4>
            {renderRow('invest', 'Investments', <TrendingUp className="w-4 h-4 text-emerald-500"/>, 'text-emerald-600 dark:text-emerald-400', 'accent-emerald-500', false)}
            {renderRow('savings', 'Cash Savings', <Shield className="w-4 h-4 text-blue-500"/>, 'text-blue-600 dark:text-blue-400', 'accent-blue-400', false)}
            {renderRow('lifestyle', 'Lifestyle', <Coffee className="w-4 h-4 text-pink-500"/>, 'text-pink-600 dark:text-pink-400', 'accent-pink-500', false)}
        </div>

        {/* Visual Summary Bar */}
        <div className="h-4 w-full flex rounded-full overflow-hidden border border-slate-200 dark:border-gray-600 mt-2">
            <div className="bg-slate-400 h-full" style={{ width: `${(allocations.rent / netMonthlyIncome) * 100}%` }} title="Rent"></div>
            <div className="bg-slate-300 h-full" style={{ width: `${(allocations.essentials / netMonthlyIncome) * 100}%` }} title="Essentials"></div>
            <div className="bg-emerald-500 h-full" style={{ width: `${(allocations.invest / netMonthlyIncome) * 100}%` }} title="Invest"></div>
            <div className="bg-blue-500 h-full" style={{ width: `${(allocations.savings / netMonthlyIncome) * 100}%` }} title="Savings"></div>
            <div className="bg-pink-500 h-full" style={{ width: `${(allocations.lifestyle / netMonthlyIncome) * 100}%` }} title="Lifestyle"></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
            <span>Mandatory</span>
            <span>Discretionary</span>
        </div>

    </div>
  );
};

export default BudgetAllocator;