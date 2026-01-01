import { useState, useEffect } from 'react';
import { runSimulation } from './api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

function App() {
  // --- State ---
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('netWorth');
  const [darkMode, setDarkMode] = useState(true); 
  const [copyStatus, setCopyStatus] = useState('idle'); 
  const [jsonOutputState, setJsonOutputState] = useState(''); 
  const [viewYear, setViewYear] = useState(0); // Time Travel State

  // Global Market Params
  const [marketParams, setMarketParams] = useState({
    inflation_rate: 0.025,
    property_appreciation_rate: 0.035,
    rent_inflation_rate: 0.025,
    mortgage_stress_rate_floor: 0.0525,
    mortgage_rate: 0.045
  });

  // Strategy Type
  const [strategyType, setStrategyType] = useState('Buy & Hold (1 Property)');

  // Scenario Config
  const [scenario, setScenario] = useState({
    id: 'sc_1',
    name: 'Buy $500k',
    initial_cash: 60000,
    gross_annual_income: 95000,
    current_rent: 2100,
    monthly_living_expenses: 2000,
    discretionary_spending_percent: 0.30,
    cash_savings_percent: 0.20,
    property_targets: [],
    investment_profile: {
      pre_buy_roi: 0.10,
      post_buy_roi: 0.07,
      safe_savings_rate: 0.04,
      downpayment_glide_path: true
    }
  });

  // Property Inputs State
  const [propInputs, setPropInputs] = useState({
    p1_price: 500000,
    p1_down: 20,
    lad_p1_price: 400000,
    lad_p1_down: 5,
    lad_p2_price: 900000,
    lad_p2_down: 20
  });

  // --- Effects ---

  // Re-build property_targets when strategy or inputs change
  useEffect(() => {
    let newTargets = [];
    let newName = strategyType;

    if (strategyType === 'Rent & Invest Forever') {
      newName = "Rent & Invest Forever";
    } else if (strategyType === 'Buy & Hold (1 Property)') {
      newTargets = [{
        name: "Home",
        price: propInputs.p1_price,
        min_downpayment_percent: propInputs.p1_down / 100.0,
        sell_existing: true
      }];
      newName = `Buy $${(propInputs.p1_price/1000).toFixed(0)}k`;
    } else if (strategyType === 'Property Ladder (2 Properties)') {
      newTargets = [
        {
          name: "Starter Condo",
          price: propInputs.lad_p1_price,
          min_downpayment_percent: propInputs.lad_p1_down / 100.0,
          sell_existing: true
        },
        {
          name: "Dream House",
          price: propInputs.lad_p2_price,
          min_downpayment_percent: propInputs.lad_p2_down / 100.0,
          sell_existing: true
        }
      ];
      newName = `Ladder: $${(propInputs.lad_p1_price/1000).toFixed(0)}k -> $${(propInputs.lad_p2_price/1000).toFixed(0)}k`;
    }

    setScenario(prev => ({
      ...prev,
      name: newName,
      property_targets: newTargets
    }));
  }, [strategyType, propInputs]);

  // Run Simulation when Scenario or Market Params change
  useEffect(() => {
    const fetchSimulation = async () => {
      setLoading(true);
      try {
        const data = await runSimulation(scenario, marketParams);
        if (data && data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSimulation();
    }, 250); 

    return () => clearTimeout(timer);
  }, [scenario, marketParams]);

  // --- Handlers ---
  const handleMarketChange = (e) => {
    const { name, value } = e.target;
    setMarketParams(prev => ({ ...prev, [name]: parseFloat(value) / 100 }));
  };

  const handleScenarioChange = (e) => {
    const { name, value } = e.target;
    let newValue = parseFloat(value);

    if (name === 'discretionary_spending_percent') {
      const currentSave = scenario.cash_savings_percent;
      if (newValue + currentSave > 1.0) {
        const newSave = Math.max(0, 1.0 - newValue);
        setScenario(prev => ({
          ...prev,
          [name]: newValue,
          cash_savings_percent: parseFloat(newSave.toFixed(2))
        }));
        return;
      }
    } else if (name === 'cash_savings_percent') {
      const currentSpend = scenario.discretionary_spending_percent;
      if (newValue + currentSpend > 1.0) {
        const newSpend = Math.max(0, 1.0 - newValue);
        setScenario(prev => ({
          ...prev,
          [name]: newValue,
          discretionary_spending_percent: parseFloat(newSpend.toFixed(2))
        }));
        return;
      }
    }

    setScenario(prev => ({ ...prev, [name]: newValue }));
  };

  const handleInvChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScenario(prev => ({
      ...prev,
      investment_profile: {
        ...prev.investment_profile,
        [name]: type === 'checkbox' ? checked : parseFloat(value)
      }
    }));
  };

  const handlePropChange = (e) => {
    const { name, value } = e.target;
    setPropInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const handleCopyJson = () => {
    const dataToCopy = {
      scenario: {
        ...scenario,
        property_targets: scenario.property_targets.map(target => ({
          ...target,
          min_downpayment_percent: target.min_downpayment_percent 
        }))
      },
      marketParams: marketParams,
      propInputs: propInputs 
    };
    setJsonOutputState(JSON.stringify(dataToCopy, null, 2));
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000); 
  };

  // --- Helpers ---
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const finalNetWorth = results.length > 0 ? results[results.length - 1]["Net Worth"] : 0;
  
  // Determine the "Current Record" based on the Slider (View Year)
  const currentRecordIndex = results.length > 0 ? Math.min(results.length - 1, Math.floor(viewYear * 12)) : 0;
  const currentRecord = results.length > 0 ? results[currentRecordIndex] : null;

  // Find buy events for chart
  const buyEvents = [];
  if (results.length > 0) {
      let prevHome = 0;
      results.forEach(r => {
          if (r["Current Home"] > prevHome) {
              buyEvents.push({ year: r["Year"], homeIndex: r["Current Home"] });
              prevHome = r["Current Home"];
          }
      });
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-slate-50 text-slate-900'} font-sans overflow-hidden`}>
      
      <Sidebar 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode}
        viewYear={viewYear} 
        setViewYear={setViewYear}
        currentRecord={currentRecord}
        scenario={scenario} 
        handleScenarioChange={handleScenarioChange}
        marketParams={marketParams} 
        handleMarketChange={handleMarketChange}
        strategyType={strategyType} 
        setStrategyType={setStrategyType}
        propInputs={propInputs} 
        handlePropChange={handlePropChange}
        handleInvChange={handleInvChange}
        copyStatus={copyStatus} 
        handleCopyJson={handleCopyJson} 
        jsonOutputState={jsonOutputState}
        formatCurrency={formatCurrency}
      />

      <Dashboard 
        scenario={scenario}
        finalNetWorth={finalNetWorth}
        formatCurrency={formatCurrency}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        results={results}
        darkMode={darkMode}
        viewYear={viewYear}
        buyEvents={buyEvents}
      />
      
    </div>
  );
}

export default App;