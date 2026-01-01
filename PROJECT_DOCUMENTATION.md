# Ottawa Wealth Simulator 2025 - Comprehensive Technical Reference

**Version:** 2.0 (Refactored)
**Date:** December 8, 2025

## 1. Introduction
The **Ottawa Wealth Simulator 2025** is a deterministic financial modeling engine designed to project personal net worth over a 25-year horizon. It specifically targets the Canadian real estate market, rigorously applying federal banking regulations (B-20 Stress Test), tax laws (CRA 2025 brackets indexed for inflation), and mortgage mathematics (semi-annual compounding).

Unlike generic calculators, this system simulates the **entire financial life** of a user month-by-month, handling salary raises, living expense inflation, investment compounding, property appreciation, and complex real estate transactions (buying, selling, upgrading).

---

## 2. Technical Architecture

### 2.1 Technology Stack
*   **Frontend:** React 18 (Vite)
    *   **Styling:** Tailwind CSS (Dark Mode enabled).
    *   **Visualization:** Recharts (Responsive SVG charts).
    *   **Icons:** Lucide-React.
    *   **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`).
*   **Backend:** Python 3.11+ (FastAPI)
    *   **Data Structures:** Pydantic Models (Strict typing), Dataclasses (Mutable state).
    *   **Computation:** NumPy (High-precision math), Pandas (DataFrame serialization).
    *   **Server:** Uvicorn.

### 2.2 Directory Structure (Refactored)
```text
/
├── backend/
│   ├── main.py             # API Entry Point & Routing
│   ├── models.py           # Pydantic Schemas (Input Validation)
│   ├── financials.py       # Pure functions for Math/Tax/Loans
│   └── simulation.py       # The Core Engine (State Machine & Logic)
└── frontend/
    └── src/
        ├── api.js          # Axios HTTP client
        ├── App.jsx         # Main Controller (State & Layout)
        └── components/     # UI Components
            ├── Dashboard.jsx         # Charts & KPI Cards
            ├── Sidebar.jsx           # Input Forms & Strategy Selectors
            └── FinancialSnapshot.jsx # Detailed Monthly Budget View
```

---

## 3. Simulation Engine Logic (`backend/simulation.py`)

The simulation runs a **300-month (25-year)** loop. It uses a **State Machine** pattern, where a `SimulationState` object is mutated step-by-step through time.

### 3.1 The Simulation State Object
The system tracks the following variables at every time step:
*   **Liquid Assets:** `cash_savings_balance`, `fhsa_balance`, `tfsa_balance`, `unreg_balance`.
*   **Contribution Room:** `fhsa_room` (Lifetime cap $40k), `tfsa_room` (Annual + Withdrawals).
*   **Real Estate:** `is_owner` (Bool), `home_value`, `mortgage_principal`, `mortgage_payment`, `mortgage_amortization` (25 or 30).
*   **Cash Flow:** `current_gross_income`, `current_rent`, `current_living_expenses`.
*   **Logic Tracks:** `next_target_idx` (Progress through property ladder), `tfsa_withdrawal_this_year`.

### 3.2 The Time Loop Algorithm
For each month `m` from 0 to 299:

1.  **Annual Updates (January Protocol):**
    *   *Condition:* If `m > 0` and `m % 12 == 0`.
    *   **Action:** 
        *   Apply Inflation to Salary (`current_gross_income *= (1 + inflation)`).
        *   Add new TFSA Room ($7,000 + `tfsa_withdrawal_this_year`). Reset withdrawal tracker.
        *   Add FHSA Room ($8,000) if under lifetime cap.

2.  **Income Calculation:**
    *   Calculate **Net Monthly Income** using tax brackets indexed to the current year's inflation level.

3.  **Housing Cost deduction:**
    *   If **Renting:** Deduct `current_rent`.
    *   If **Owner:** Deduct `mortgage_payment` + `property_tax` + `maintenance`.
    *   *Note:* Mortgage principal is paid down using the **effective monthly interest rate**.

4.  **Purchase Trigger Check (`_attempt_purchase`):**
    *   Evaluates if the user can afford the `next_target_property`.
    *   **Logic:** Checks Liquid Assets vs. Required Cash (Downpayment + Closing Costs) AND Stress Test (GDS Ratio).
    *   **Execution:** If passed, liquidates assets (Cash -> FHSA -> TFSA -> Unreg), updates ownership state, sets up new mortgage.

5.  **Budget Waterfall (`_process_surplus`):**
    *   `Surplus = Net_Income - Housing - Expenses`.
    *   **If Surplus > 0:**
        1.  Deduct **Lifestyle Spending** (Vanishes).
        2.  Allocated **Safe Savings** (To Cash Bucket).
        3.  Invest remainder: Fill FHSA -> Fill TFSA -> Dump into Unregistered.
    *   **If Deficit < 0:**
        1.  Drain Cash Savings.
        2.  Drain Unregistered.
        3.  Drain TFSA (Record withdrawal for next year).
        4.  Accumulate Debt (Negative Unregistered Balance).

6.  **Monthly Inflation (End of Month):**
    *   Inflate `current_living_expenses`.
    *   Inflate `current_rent` (if renting).
    *   Appreciate `home_value` (if owning) and all future `property_targets`.
    *   Compound Investment Returns (Pre-buy ROI vs Post-buy ROI vs Safe Rate).

---

## 4. Financial Mathematics & Formulas (`backend/financials.py`)

This simulator strictly adheres to **Canadian** financial rules.

### 4.1 Mortgage Compounding (The "Canadian" Method)
Unlike US mortgages (monthly compounding), Canadian fixed-rate mortgages use **Semi-Annual Compounding**.
*   **Formula:** `Monthly_Rate = (1 + Annual_Rate / 2)^(1/6) - 1`
*   *Impact:* A 5% annual rate results in an effective monthly rate of ~0.412%, not 0.416%. This precision is critical for exact amortization schedules.

### 4.2 Minimum Downpayment & The "$1M Cliff"
The system enforces the federal minimum downpayment rules:
1.  **Price < $500k:** 5% flat.
2.  **Price $500k - $999,999:** 5% on first $500k + 10% on remainder.
3.  **Price ≥ $1,000,000:** **20% flat**.
    *   *Constraint:* CMHC insurance is strictly forbidden for homes over $1M. The simulator **will not allow a purchase** of a $1.2M home with 10% down, forcing the user to save until 20%.

### 4.3 CMHC Insurance Premiums
If downpayment < 20% (and Price < $1M), insurance is mandatory and added to the mortgage principal.
*   **10% - 14.99% Down:** 3.10% premium.
*   **15% - 19.99% Down:** 2.80% premium.
*   **5% - 9.99% Down:** 4.00% premium.

### 4.4 Amortization Rules
The simulator dynamically selects the amortization period based on the downpayment:
*   **Insured (< 20% down):** **25 Years** max.
*   **Uninsured (≥ 20% down):** **30 Years**.
    *   *Impact:* Moving up to a 30-year amortization lowers monthly payments and helps pass the Stress Test for expensive properties.

### 4.5 The Stress Test (GDS Ratio)
To qualify for a mortgage, the user must pass the **Gross Debt Service (GDS)** ratio.
*   **Formula:** `(Qualifying_Payment + Property_Tax + Heat) / Gross_Monthly_Income ≤ 0.39`
*   **Qualifying Rate:** `Max(Contract_Rate + 2.00%, 5.25%)`.
*   *Note:* The qualifying payment is calculated using the Qualifying Rate but the *actual* amortization (25 or 30 years).

### 4.6 Income Tax Indexing
Tax brackets are not static. They inflate to prevent "bracket creep."
*   **Logic:** Every year, the threshold for each federal and provincial bracket is multiplied by `(1 + inflation_rate)^year_index`.
*   **Credits:** Basic Personal Amount (BPA) and CPP/EI deduction limits are similarly indexed.

### 4.7 Closing Costs
*   **Land Transfer Tax (LTT):** Calculated using Ontario marginal brackets (0.5% to 2.0%).
*   **Rebate:** First-time buyers (buying the *first* target in the list) receive the full $4,000 LTT rebate.
*   **Legal/Inspection:** Fixed estimate ($2,500).

---

## 5. API Reference

**Endpoint:** `POST /simulate`

### 5.1 Request Schema (`SimulationRequest`)
*   **scenario:** (`Scenario` Object)
    *   `initial_cash`: Starting liquid capital.
    *   `gross_annual_income`: T4 income.
    *   `property_targets`: List of `PropertyTarget` objects (Price, Min Down %).
    *   `investment_profile`: ROI rates (Pre-buy, Post-buy, Safe) and Glide Path toggle.
*   **market_params:** (`GlobalMarketParams` Object)
    *   `inflation_rate`: CPI estimate (e.g., 0.025).
    *   `mortgage_rate`: Contract rate (e.g., 0.045).
    *   `property_appreciation_rate`: Housing market growth.

### 5.2 Response Schema (`JSON`)
Returns a list of `Record` objects, one for each of the 300 months.
*   **Key Fields:** `Net Worth`, `Liquid Assets`, `Home Equity`, `GDS Ratio`, `Stress Test Passed`, `Next Target Cost`, `Housing Expense`.

---

## 6. Frontend Component Breakdown

### 6.1 `App.jsx` (Controller)
*   Holds the global state (`scenario`, `marketParams`, `results`).
*   Manages the debounce timer (250ms) for API calls.
*   Passes state down to children.

### 6.2 `Sidebar.jsx` (Input & Control)
*   Contains the "Time Travel" slider.
*   Renders form inputs for Finances, Strategy, and Market.
*   Includes the `FinancialSnapshot` component (bundled visually).

### 6.3 `FinancialSnapshot.jsx` (Detail View)
*   A purely presentational component.
*   Reads the *exact* record from the simulation array corresponding to the `viewYear`.
*   Displays the "Month's Reality": Net Pay vs. Expenses vs. Savings vs. Investments.
*   Displays "Housing Readiness": Traffic light system (Red/Amber/Green) based on Cash and GDS status.

### 6.4 `Dashboard.jsx` (Visualization)
*   **Net Worth Chart:** A stacked/line chart showing wealth accumulation. Includes vertical reference lines for "Buy Events."
*   **Buying Power Chart:** A dual-line chart comparing "My Cash" (Green) vs "Required Cash" (Red). The Red line steps up dynamically as targets change or inflation pushes prices over the $1M mark.

---

## 7. Future Roadmap (To-Do)
1.  **Partner Mode:** Logic to support dual incomes (doubling tax returns and borrowing power).
2.  **Variable Rate Mortgages:** Simulating interest rate fluctuation shocks.
3.  **Closing Cost Customization:** Allowing users to input custom selling fees (e.g., 1% for private sale vs 5% for realtor).
