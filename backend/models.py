from pydantic import BaseModel, Field
from typing import Optional

class GlobalMarketParams(BaseModel):
    inflation_rate: float = Field(0.025, description="Annual inflation rate")
    property_appreciation_rate: float = Field(0.035, description="Annual property appreciation rate")
    rent_inflation_rate: float = Field(0.025, description="Annual rent inflation rate")
    mortgage_stress_rate_floor: float = Field(0.0525, description="Minimum qualifying rate for mortgage stress test")
    mortgage_rate: float = Field(0.045, description="Contract mortgage rate")

class InvestmentProfile(BaseModel):
    pre_buy_roi: float = Field(0.10, description="Annual ROI before buying property")
    post_buy_roi: float = Field(0.07, description="Annual ROI after buying property")
    safe_savings_rate: float = Field(0.04, description="Annual ROI for safe savings (HISA/GIC)")
    downpayment_glide_path: bool = Field(True, description="Shift downpayment cash to safe savings as buy target approaches")

class Scenario(BaseModel):
    id: str
    name: str
    initial_cash: float
    gross_annual_income: float
    current_rent: float
    
    # Budget Config
    monthly_living_expenses: float = Field(2000.0, description="Baseline monthly living expenses (excluding housing)")
    discretionary_spending_percent: float = Field(0.30, description="Percentage of surplus spent on lifestyle")
    cash_savings_percent: float = Field(0.20, description="Percentage of surplus kept as cash savings")

    # Strategy Config
    property_targets: list["PropertyTarget"] = Field(default_factory=list, description="Ordered list of properties to buy")
    force_buy_date: Optional[int] = Field(None, description="Month index to force a buy, if affordable")
    
    # Investment Config
    investment_profile: InvestmentProfile

class PropertyTarget(BaseModel):
    name: str = Field(..., description="Label for the property (e.g., 'Starter Condo')")
    price: float = Field(..., description="Target purchase price")
    min_downpayment_percent: float = Field(0.05, description="Minimum downpayment percentage")
    sell_existing: bool = Field(True, description="If True, sell current home to fund this one. If False, keep as rental (Not Implemented yet)")
