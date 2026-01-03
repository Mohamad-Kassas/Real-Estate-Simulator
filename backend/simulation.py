import pandas as pd
import numpy as np
from dataclasses import dataclass
from models import Scenario, GlobalMarketParams
from financials import (
    calculate_net_monthly_income,
    calculate_closing_costs,
    calculate_cmhc_premium,
    calculate_mortgage_payment,
    calculate_effective_monthly_rate,
    check_stress_test,
    get_qualifying_rate
)

@dataclass
class SimulationState:
    # Asset Buckets
    cash_savings_balance: float
    fhsa_balance: float = 0.0
    tfsa_balance: float = 0.0
    unreg_balance: float = 0.0
    
    # Contribution Limits
    fhsa_room: float = 8000.0
    tfsa_room: float = 7000.0
    fhsa_lifetime_contribution: float = 0.0
    tfsa_withdrawal_this_year: float = 0.0 # Track for re-contribution next year
    
    # Housing Status
    is_owner: bool = False
    home_value: float = 0.0
    mortgage_principal: float = 0.0
    mortgage_payment: float = 0.0
    mortgage_amortization: int = 25 # Track amortization period (25 or 30)
    
    # Current Budget State
    current_rent: float = 0.0
    current_gross_income: float = 0.0
    current_living_expenses: float = 0.0
    
    # Property Ladder Progress
    next_target_idx: int = 0

def run_simulation(scenario: Scenario, market_params: GlobalMarketParams) -> pd.DataFrame:
    months = 300 # 25 years
    records = []
    
    # Initialize State
    state = SimulationState(
        cash_savings_balance=scenario.initial_cash,
        current_rent=scenario.current_rent,
        current_gross_income=scenario.gross_annual_income,
        current_living_expenses=scenario.monthly_living_expenses
    )
    
    targets = [t.model_copy() for t in scenario.property_targets] 
    
    for month in range(months):
        current_year_idx = month // 12

        # 0. Annual Updates (Start of Year Logic)
        # Apply raises and new contribution room in January (Month 0, 12, 24...)
        if month > 0 and month % 12 == 0:
            _apply_annual_updates(state, market_params)

        # 1. Income (Now Indexed to Inflation for Tax Brackets)
        net_monthly_income = calculate_net_monthly_income(
            state.current_gross_income, 
            year_index=current_year_idx, 
            inflation_rate=market_params.inflation_rate
        )
        
        # 2. Housing Cost (Pay Rent or Mortgage)
        housing_cost = _process_housing_costs(state, market_params)
            
        # 3. Buy Trigger Check
        _attempt_purchase(state, targets, market_params, month) 
        
        # 4. Budget & Surplus
        disposable_surplus = net_monthly_income - housing_cost - state.current_living_expenses
        _process_surplus(state, disposable_surplus, scenario, net_monthly_income)

        # 5. Record Data
        # Calculate derived stats for UI
        total_net_worth = state.fhsa_balance + state.tfsa_balance + state.unreg_balance + state.cash_savings_balance + state.home_value - state.mortgage_principal
        liquid_assets = state.fhsa_balance + state.tfsa_balance + state.unreg_balance + state.cash_savings_balance
        
        # Hypothetical GDS for next target
        readiness_stats = _calculate_readiness_stats(state, targets, market_params, current_year_idx)
        
        record = {
            "Month": month,
            "Year": month / 12.0,
            "Net Worth": total_net_worth,
            "Liquid Assets": liquid_assets,
            "Cash Savings": state.cash_savings_balance,
            "Home Equity": state.home_value - state.mortgage_principal if state.is_owner else 0,
            "Home Value": state.home_value if state.is_owner else 0,
            "Mortgage Debt": state.mortgage_principal if state.is_owner else 0,
            "Is Owner": state.is_owner,
            "Current Home": state.next_target_idx, 
            "Next Target Cost": readiness_stats["target_down_total_cash"],
            "Monthly Surplus": max(0, disposable_surplus),
            "Net Monthly Income": net_monthly_income,
            "Gross Monthly Income": state.current_gross_income / 12.0,
            "Housing Expense": housing_cost,
            "Living Expenses": state.current_living_expenses,
            "GDS Ratio": readiness_stats["current_gds_ratio"],
            "Stress Test Passed": readiness_stats["stress_test_passed"],
            "Hypothetical Monthly Housing": readiness_stats["hyp_monthly_housing"],
            "Max Affordable Housing": readiness_stats["max_monthly_housing"],
            # Detailed Stress Stats
            "Stress Qualifying Rate": readiness_stats["qualifying_rate"],
            "Stress Payment": readiness_stats["stress_payment_monthly"],
            "Actual Payment": readiness_stats["actual_payment_monthly"],
            "Hyp Mortgage Debt": readiness_stats["mortgage_amount"]
        }
        records.append(record)

        # 6. Monthly Inflation & Growth (Prepare for Next Month)
        _apply_monthly_growth(state, targets, scenario, market_params)
        
    return pd.DataFrame(records)

# --- Helper Functions ---

def calculate_purchase_requirements(price: float, user_target_percent: float):
    """
    Determines the legal minimum downpayment and resulting mortgage structure.
    Enforces Canadian Rules:
    - 5% on first 500k
    - 10% on portion 500k-1M
    - 20% if price >= 1M (Uninsured)
    
    Returns:
    - required_down_amt: The final downpayment amount in dollars.
    - total_loan_amt: Loan amount including CMHC premium.
    - cmhc_premium: The insurance cost.
    - amortization_years: 25 or 30.
    """
    
    # 1. Calculate Legal Minimum Downpayment
    if price < 500000:
        legal_min = price * 0.05
    elif price < 1000000:
        legal_min = (500000 * 0.05) + ((price - 500000) * 0.10)
    else:
        # Over 1 Million: Must have 20% down, NO insurance allowed.
        legal_min = price * 0.20
        
    # 2. Determine Actual Downpayment Amount
    # User might want to put down MORE than min, but never LESS.
    user_down_amt = price * user_target_percent
    final_down_amt = max(legal_min, user_down_amt)
    
    actual_down_percent = final_down_amt / price
    
    # 3. Calculate CMHC
    # If price >= 1M or down >= 20%, NO CMHC.
    if price >= 1000000 or actual_down_percent >= 0.20:
        cmhc_premium = 0.0
        amortization_years = 30 # Uninsured allows 30 years
    else:
        # Insured
        loan_pre_cmhc = price - final_down_amt
        cmhc_premium = calculate_cmhc_premium(loan_pre_cmhc, actual_down_percent)
        amortization_years = 25 # Insured capped at 25 years
        
    total_loan_amt = (price - final_down_amt) + cmhc_premium
    
    return final_down_amt, total_loan_amt, cmhc_premium, amortization_years


def _apply_annual_updates(state: SimulationState, market_params: GlobalMarketParams):
    """
    Applies annual discrete updates like TFSA Room.
    Triggered at the start of every 12th month (Jan).
    """
    # TFSA Room (New Year = New Room + Re-contribution)
    state.tfsa_room += 7000 + state.tfsa_withdrawal_this_year
    state.tfsa_withdrawal_this_year = 0.0
    
    # FHSA Room
    if state.fhsa_lifetime_contribution < 40000:
        state.fhsa_room += 8000

def _process_housing_costs(state: SimulationState, market_params: GlobalMarketParams) -> float:
    if state.is_owner:
        payment = state.mortgage_payment
        
        # Calculate Effective Monthly Interest Rate directly
        # This fixes the bug where we were using the Total Payment Factor
        monthly_interest_rate = calculate_effective_monthly_rate(market_params.mortgage_rate)
        
        interest_part = state.mortgage_principal * monthly_interest_rate
        principal_part = payment - interest_part
        
        if state.mortgage_principal > 0:
            state.mortgage_principal -= principal_part
            if state.mortgage_principal < 0: state.mortgage_principal = 0
        
        property_tax = (state.home_value * 0.01) / 12.0 
        maintenance = (state.home_value * 0.01) / 12.0 
        
        return payment + property_tax + maintenance
    else:
        return state.current_rent

def _attempt_purchase(state: SimulationState, targets: list, market_params: GlobalMarketParams, month: int):
    if state.next_target_idx >= len(targets):
        return

    target = targets[state.next_target_idx]
    
    # A. Calculate Required Financials (Single Source of Truth)
    req_down_amt, total_new_loan, cmhc_premium, amortization_years = calculate_purchase_requirements(
        target.price, 
        target.min_downpayment_percent
    )
    
    is_first_time_buyer_overall = (state.next_target_idx == 0)
    closing_costs = calculate_closing_costs(target.price, first_time_buyer=is_first_time_buyer_overall)
    required_cash_to_close = req_down_amt + closing_costs

    # B. Assets Available
    liquid_total = state.fhsa_balance + state.tfsa_balance + state.unreg_balance + state.cash_savings_balance
    equity_proceeds = 0.0
    
    if state.is_owner and target.sell_existing:
        # 5% Commission + 13% HST on Commission + Legal Fees
        selling_costs = (state.home_value * 0.05 * 1.13) + 2000 
        equity_raw = state.home_value - state.mortgage_principal
        equity_proceeds = max(0, equity_raw - selling_costs)
        
    total_capital = liquid_total + equity_proceeds
    
    # C. Affordability Checks
    can_afford_cash = total_capital >= required_cash_to_close
    
    # Stress Test
    qual_rate = get_qualifying_rate(market_params.mortgage_rate, market_params.mortgage_stress_rate_floor)
    qual_payment = calculate_mortgage_payment(total_new_loan, qual_rate, amortization_years)
    
    est_tax = target.price * 0.01
    est_heat = 1800.0
    passed_stress = check_stress_test(state.current_gross_income, qual_payment * 12, est_tax, est_heat, 0)
    
    if can_afford_cash and passed_stress:
        # Execute Buy
        cost_remaining = required_cash_to_close
        
        # 1. Use Equity from previous home
        if equity_proceeds > 0:
            used_equity = min(equity_proceeds, cost_remaining)
            equity_proceeds -= used_equity
            cost_remaining -= used_equity
            if equity_proceeds > 0:
                state.unreg_balance += equity_proceeds
        
        # 2. Drain Liquid Accounts
        if cost_remaining > 0:
            taken = min(state.cash_savings_balance, cost_remaining)
            state.cash_savings_balance -= taken
            cost_remaining -= taken
            
        if cost_remaining > 0:
            taken = min(state.fhsa_balance, cost_remaining)
            state.fhsa_balance -= taken
            cost_remaining -= taken
            
        if cost_remaining > 0:
            taken = min(state.tfsa_balance, cost_remaining)
            state.tfsa_balance -= taken
            state.tfsa_withdrawal_this_year += taken 
            cost_remaining -= taken
            
        if cost_remaining > 0:
            taken = min(state.unreg_balance, cost_remaining)
            state.unreg_balance -= taken
            cost_remaining -= taken
        
        # 3. Update State
        state.is_owner = True
        state.home_value = target.price
        state.mortgage_principal = total_new_loan
        state.mortgage_amortization = amortization_years
        state.mortgage_payment = calculate_mortgage_payment(state.mortgage_principal, market_params.mortgage_rate, amortization_years)
        
        state.next_target_idx += 1

def _process_surplus(state: SimulationState, surplus: float, scenario: Scenario, net_monthly_income: float):
    # Targets are relative to TOTAL NET INCOME
    target_invest = net_monthly_income * scenario.investment_percent
    target_save = net_monthly_income * scenario.cash_savings_percent
    
    # We can only allocate what we actually have (the surplus after rent/essentials)
    if surplus > 0:
        # 1. Prioritize Investment
        to_invest = min(surplus, target_invest)
        remaining = surplus - to_invest
        
        # 2. Prioritize Savings
        to_save = min(remaining, target_save)
        remaining = remaining - to_save
        
        # 3. Apply to balances
        state.cash_savings_balance += to_save
        
        # Investment Waterfall
        invest_amount = to_invest
        if not state.is_owner and state.fhsa_room > 0 and state.fhsa_lifetime_contribution < 40000:
            deposit = min(invest_amount, state.fhsa_room, 40000 - state.fhsa_lifetime_contribution)
            state.fhsa_balance += deposit
            state.fhsa_room -= deposit
            state.fhsa_lifetime_contribution += deposit
            invest_amount -= deposit
            
        if invest_amount > 0 and state.tfsa_room > 0:
            deposit = min(invest_amount, state.tfsa_room)
            state.tfsa_balance += deposit
            state.tfsa_room -= deposit
            invest_amount -= deposit
            
        if invest_amount > 0:
            state.unreg_balance += invest_amount
            
        # 4. Lifestyle gets the remainder (implicitly burned/consumed)
        
    else:
        # Deficit Logic
        needed = abs(surplus)
        if state.cash_savings_balance > 0:
            taken = min(state.cash_savings_balance, needed)
            state.cash_savings_balance -= taken
            needed -= taken
        
        if needed > 0 and state.unreg_balance > 0:
            taken = min(state.unreg_balance, needed)
            state.unreg_balance -= taken
            needed -= taken
            
        if needed > 0 and state.tfsa_balance > 0:
            taken = min(state.tfsa_balance, needed)
            state.tfsa_balance -= taken
            state.tfsa_withdrawal_this_year += taken
            needed -= taken
        
        if needed > 0:
            state.unreg_balance -= needed # Debt

def _calculate_readiness_stats(state: SimulationState, targets: list, market_params: GlobalMarketParams, year_idx: int):
    if state.next_target_idx >= len(targets):
        return {
            "target_down_total_cash": 0.0,
            "current_gds_ratio": 0.0,
            "stress_test_passed": False,
            "hyp_monthly_housing": 0.0,
            "max_monthly_housing": 0.0,
            "qualifying_rate": 0.0,
            "stress_payment_monthly": 0.0,
            "actual_payment_monthly": 0.0,
            "mortgage_amount": 0.0,
            "amortization_years": 0,
            "est_tax_monthly": 0.0,
            "est_heat_monthly": 0.0
        }
        
    t = targets[state.next_target_idx]
    
    # Use Single Source of Truth
    req_down_amt, total_new_loan, cmhc_premium, amortization_years = calculate_purchase_requirements(
        t.price, 
        t.min_downpayment_percent
    )
    
    is_first_time = (state.next_target_idx == 0)
    closing_costs = calculate_closing_costs(t.price, first_time_buyer=is_first_time)
    
    target_down_total_cash = req_down_amt + closing_costs

    # Stress Test Metrics
    qual_rate_gds = get_qualifying_rate(market_params.mortgage_rate, market_params.mortgage_stress_rate_floor)
    qual_payment_gds_monthly = calculate_mortgage_payment(total_new_loan, qual_rate_gds, amortization_years)
    
    # Actual Payment Metrics (What user would actually pay)
    actual_payment_monthly = calculate_mortgage_payment(total_new_loan, market_params.mortgage_rate, amortization_years)

    est_tax_annual = t.price * 0.01
    est_heat_annual = 1800.0
    # Note: GDS includes 50% of condo fees. Assuming 0 condo fees for generic targets for now unless added to model.
    # If we add condo fees to PropertyTarget later, update here.
    
    annual_housing_gds = (qual_payment_gds_monthly * 12) + est_tax_annual + est_heat_annual + 0 # + 0.5 * condo_fees
    current_gds_ratio = annual_housing_gds / state.current_gross_income
    stress_test_passed = current_gds_ratio <= 0.39
    
    hyp_monthly = annual_housing_gds / 12.0
    
    # Calculate Max Affordable Housing based on ACTUAL indexed income
    # Note: We use the *current* gross income which has been indexed
    max_monthly = (state.current_gross_income * 0.39) / 12.0
    
    return {
        "target_down_total_cash": target_down_total_cash,
        "current_gds_ratio": current_gds_ratio,
        "stress_test_passed": stress_test_passed,
        "hyp_monthly_housing": hyp_monthly,
        "max_monthly_housing": max_monthly,
        "qualifying_rate": qual_rate_gds,
        "stress_payment_monthly": qual_payment_gds_monthly,
        "actual_payment_monthly": actual_payment_monthly,
        "mortgage_amount": total_new_loan,
        "amortization_years": amortization_years,
        "est_tax_monthly": est_tax_annual / 12.0,
        "est_heat_monthly": est_heat_annual / 12.0
    }

def _apply_monthly_growth(state: SimulationState, targets: list, scenario: Scenario, market_params: GlobalMarketParams):
    # Geometric Monthly Rates
    m_inf_geo = (1 + market_params.inflation_rate) ** (1/12) - 1
    m_rent_inf_geo = (1 + market_params.rent_inflation_rate) ** (1/12) - 1
    m_prop_inf_geo = (1 + market_params.property_appreciation_rate) ** (1/12) - 1
    
    # Monthly Inflation for Expenses, Rent, Property Values, AND Income
    state.current_living_expenses *= (1 + m_inf_geo)
    state.current_gross_income *= (1 + m_inf_geo) # Income now indexed monthly
    
    if not state.is_owner:
        state.current_rent *= (1 + m_rent_inf_geo)
        
    if state.is_owner:
        state.home_value *= (1 + m_prop_inf_geo)
        
    for t in targets:
        t.price *= (1 + m_prop_inf_geo)
        
    # Investment Growth
    roi = scenario.investment_profile.pre_buy_roi
    if state.is_owner and state.next_target_idx == len(targets):
        roi = scenario.investment_profile.post_buy_roi
    elif state.is_owner and state.next_target_idx < len(targets):
        roi = scenario.investment_profile.pre_buy_roi
            
    # Glide Path
    if state.next_target_idx < len(targets) and scenario.investment_profile.downpayment_glide_path:
         target = targets[state.next_target_idx]
         liquid = state.fhsa_balance + state.tfsa_balance + state.unreg_balance + state.cash_savings_balance
         equity = 0
         if state.is_owner:
             equity = max(0, state.home_value - state.mortgage_principal - (state.home_value * 0.05 + 2000))
         
         if (liquid + equity) >= 0.8 * (target.price * target.min_downpayment_percent):
             roi = scenario.investment_profile.safe_savings_rate
    
    m_roi = roi / 12.0
    m_safe = scenario.investment_profile.safe_savings_rate / 12.0
    
    state.fhsa_balance *= (1 + m_roi)
    state.tfsa_balance *= (1 + m_roi)
    state.unreg_balance *= (1 + m_roi)
    state.cash_savings_balance *= (1 + m_safe)
