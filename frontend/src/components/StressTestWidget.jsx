import React from 'react';

const StressTestWidget = ({ currentData, formatCurrency }) => {
  // If no data or not currently looking at a purchase target (Next Target Cost <= 0 usually implies no active target or already bought all)
  // However, the logic in simulation sets Next Target Cost even if not ready. 
  // Let's rely on "Hypothetical Monthly Housing" being present and > 0 to show this widget meaningfuly.
  if (!currentData || !currentData["Hypothetical Monthly Housing"] || currentData["Hypothetical Monthly Housing"] <= 0) {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col items-center justify-center text-center space-y-2">
            <div className="text-3xl">🏠</div>
            <div className="text-slate-400 dark:text-gray-500 text-sm font-medium">
                No Active Purchase Target
            </div>
            <p className="text-slate-400 dark:text-gray-500 text-xs px-8">
                The stress test will appear here when you are analyzing a specific property purchase.
            </p>
        </div>
      );
  }

  const gdsRatio = currentData["GDS Ratio"];
  const passed = currentData["Stress Test Passed"];
  const qualRate = currentData["Stress Qualifying Rate"];
  const stressPayment = currentData["Stress Payment"];
  const actualPayment = currentData["Actual Payment"];
  const maxHousing = currentData["Max Affordable Housing"];
  const hypHousing = currentData["Hypothetical Monthly Housing"];
  
  // Calculate contract rate roughly (Qual - 2% or floor reverse check, but easier to just use Qual - 2% for display if > 5.25)
  // Actually, we passed qualRate. We can display it directly.
  
  // Visual Scaling: 39% is the limit. Let's make the bar span 0 to 60% for good resolution.
  const maxScale = 0.60;
  const barPercent = Math.min(gdsRatio, maxScale) / maxScale * 100;
  const limitPercent = 0.39 / maxScale * 100;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
                B-20 Stress Test
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">Can you afford the bank's "What If"?</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${passed ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'}`}>
            {passed ? 'Passed' : 'Failed'}
        </div>
      </div>

      {/* The Split View */}
      <div className="grid grid-cols-2 gap-8 mb-8 relative">
           {/* Divider */}
           <div className="absolute left-1/2 top-2 bottom-2 w-px bg-slate-200 dark:bg-gray-700 transform -translate-x-1/2"></div>

          {/* Reality */}
          <div className="space-y-1">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-gray-500 uppercase">Actual Payment</div>
              <div className="text-2xl font-bold text-slate-700 dark:text-gray-200">{formatCurrency(actualPayment)}<span className="text-sm font-normal text-slate-400 dark:text-gray-500">/mo</span></div>
              <div className="text-xs text-slate-500 dark:text-gray-400">@ Contract Rate</div>
          </div>

          {/* Stress Test */}
          <div className="space-y-1 pl-4">
              <div className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 ${passed ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                Stress Test
              </div>
              <div className={`text-2xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(stressPayment)}
                <span className={`text-sm font-normal ${passed ? 'text-emerald-300 dark:text-emerald-500' : 'text-red-300 dark:text-red-500'}`}>/mo</span>
              </div>
              <div className={`text-xs ${passed ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                @ <span className="font-bold">{(qualRate * 100).toFixed(2)}%</span> (Qualifying)
              </div>
          </div>
      </div>

      {/* GDS Bar Meter */}
      <div className="mb-auto">
        <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-gray-400 mb-2">
            <span>GDS Ratio</span>
            <span className={passed ? 'text-emerald-600' : 'text-red-600'}>{(gdsRatio * 100).toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden relative border border-slate-200 dark:border-gray-600">
            {/* The Bar */}
            <div 
                className={`h-full transition-all duration-500 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} 
                style={{ width: `${barPercent}%` }}
            ></div>
            
            {/* The Limit Line (39%) */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-white opacity-80 z-10 dashed" style={{ left: `${limitPercent}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-500 mt-1 relative">
            <span>0%</span>
            <span className="absolute transform -translate-x-1/2 font-medium text-slate-800 dark:text-gray-300" style={{ left: `${limitPercent}%` }}>Limit: 39%</span>
            <span>60%+</span>
        </div>
      </div>

      {/* Actionable Gap Analysis */}
      {!passed && (
         <div className="mt-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-md p-4">
             <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 mb-2 uppercase tracking-wide">Gap Analysis</h4>
             <div className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                You are over the limit. To pass, your monthly housing costs must be below <strong className="text-orange-900 dark:text-orange-200">{formatCurrency(maxHousing)}</strong>.
                <div className="mt-2 text-[10px] opacity-80">
                    Currently: {formatCurrency(hypHousing)}
                </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default StressTestWidget;