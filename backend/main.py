from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import List, Optional

# Import our existing modules
# We need to ensure imports work relative to this file
from models import Scenario, GlobalMarketParams
from simulation import run_simulation

app = FastAPI(title="Ottawa Wealth Simulator API")

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationRequest(BaseModel):
    scenario: Scenario
    market_params: GlobalMarketParams

@app.get("/")
def read_root():
    return {"message": "Ottawa Wealth Simulator API is running"}

@app.post("/simulate")
def simulate_scenario(request: SimulationRequest):
    try:
        # Debug Log
        print(f"DEBUG: Expenses={request.scenario.monthly_living_expenses}, Spend={request.scenario.discretionary_spending_percent}, Save={request.scenario.cash_savings_percent}")
        
        # Run the existing simulation logic
        df = run_simulation(request.scenario, request.market_params)
        
        # Convert DataFrame to list of dicts for JSON response
        # We replace NaN with None for valid JSON
        records = df.where(pd.notnull(df), None).to_dict(orient="records")
        
        return {
            "status": "success",
            "results": records,
            "final_net_worth": records[-1]["Net Worth"] if records else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
