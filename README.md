# Real Estate Simulator (Ottawa Wealth Simulator 2025)

A comprehensive, deterministic financial modeling engine designed to project personal net worth over a 25-year horizon. This simulator specifically targets the **Canadian real estate market**, strictly adhering to federal banking regulations (B-20 Stress Test), tax laws (CRA brackets), and Canadian mortgage mathematics.

Unlike simple mortgage calculators, this system simulates a user's entire financial life month-by-month—handling salary inflation, living expenses, investment compounding, and complex real estate transactions like buying, selling, and upgrading properties.

## 🚀 Key Features

*   **25-Year Projection:** Simulates 300 months of financial activity.
*   **Canadian Financial Logic:**
    *   **Mortgages:** Uses semi-annual compounding (Canadian standard).
    *   **Stress Test:** Applies the B-20 GDS (Gross Debt Service) ratio check.
    *   **Taxes:** Simulates progressive tax brackets and inflation indexing.
    *   **Downpayments:** Enforces minimums (5%, 10%, 20% rules) and CMHC insurance premiums.
*   **Property Ladder:** Simulates buying your first home, building equity, and upgrading to future targets.
*   **Investment strategies:** Manages TFSA, FHSA, and Unregistered accounts with configurable contribution logic.
*   **Interactive Dashboard:**
    *   Real-time "Time Travel" slider to inspect any future month.
    *   Visualizations for Net Worth, Buying Power, and Cash Flow.
    *   Traffic-light system for housing readiness.

## 🛠 Tech Stack

### Backend
*   **Language:** Python 3.11+
*   **Framework:** FastAPI
*   **Data/Math:** Pandas, NumPy (High-precision financial math)
*   **Validation:** Pydantic Models

### Frontend
*   **Framework:** React 18 (Vite)
*   **Styling:** Tailwind CSS
*   **Charts:** Recharts
*   **Icons:** Lucide-React

## 📋 Prerequisites

*   **Node.js** (v18 or higher)
*   **Python** (v3.11 or higher)
*   **Git**

## ⚡️ Getting Started

Follow these steps to set up the project locally.

### 1. Clone the Repository
```bash
git clone https://github.com/Mohamad-Kassas/Real-Estate-Simulator.git
cd Real-Estate-Simulator
```

### 2. Backend Setup
The backend runs on port `8000`.

```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

### 3. Frontend Setup
The frontend runs on port `5173` (by default). Open a new terminal window.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Usage
Once both servers are running, open your browser and navigate to:
**http://localhost:5173**

You can now adjust your financial parameters (Income, Savings, Property Targets) and see the simulation update in real-time.

## 📂 Project Structure

```text
/
├── backend/                # Python FastAPI Backend
│   ├── main.py             # API Entry Point
│   ├── simulation.py       # Core Simulation Engine
│   ├── financials.py       # Financial Math & Tax Logic
│   └── models.py           # Data Schemas
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # Dashboard & UI Components
│   │   ├── api.js          # API Client
│   │   └── App.jsx         # Main Logic
│   └── tailwind.config.js  # Styling Config
└── PROJECT_DOCUMENTATION.md # Detailed Technical Reference
```
