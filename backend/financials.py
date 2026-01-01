import numpy as np

def calculate_effective_monthly_rate(annual_rate: float) -> float:
    """
    Calculates the effective monthly interest rate based on Canadian 
    semi-annual compounding.
    """
    semi_annual_rate = annual_rate / 2
    return (1 + semi_annual_rate) ** (1/6) - 1

def calculate_net_monthly_income(annual_gross: float, year_index: int = 0, inflation_rate: float = 0.0) -> float:
    """
    Calculates approximate net monthly income based on 2025 Federal + Ontario tax brackets.
    Includes CPP (Base + Enhanced) and EI deductions.
    
    Adjusts tax brackets and deduction limits for inflation based on year_index.
    """
    
    # Inflation Factor for Indexing
    index_factor = (1 + inflation_rate) ** year_index
    
    # --- 1. CPP & EI (Indexed) ---
    ympe = 71300.0 * index_factor
    yampe = 81100.0 * index_factor
    ei_cap = 65700.0 * index_factor
    
    cpp_base = min(annual_gross, ympe) * 0.0595
    cpp_enhanced = 0.0
    if annual_gross > ympe:
        cpp_enhanced = min(annual_gross - ympe, yampe - ympe) * 0.04
        
    ei_prem = min(annual_gross, ei_cap) * 0.0164
    
    total_deductions_source = cpp_base + cpp_enhanced + ei_prem
    
    # --- 2. Federal Tax (Indexed Brackets) ---
    # 2025 Brackets
    fed_brackets = [
        (57375 * index_factor, 0.1450),
        (114750 * index_factor, 0.2050),
        (177882 * index_factor, 0.2600),
        (253414 * index_factor, 0.2900),
        (float('inf'), 0.3300)
    ]
    
    fed_tax_raw = 0.0
    prev_limit = 0.0
    for limit, rate in fed_brackets:
        if annual_gross > prev_limit:
            taxable = min(annual_gross, limit) - prev_limit
            fed_tax_raw += taxable * rate
            prev_limit = limit
        else:
            break
            
    # Federal Credits (Indexed)
    fed_bpa_credit = (16000.0 * index_factor) * 0.15
    fed_cpp_ei_credit = (cpp_base + ei_prem) * 0.15
    fed_emp_credit = (1400.0 * index_factor) * 0.15
    
    fed_tax_final = max(0, fed_tax_raw - fed_bpa_credit - fed_cpp_ei_credit - fed_emp_credit)

    # --- 3. Ontario Tax (Indexed Brackets) ---
    ont_brackets = [
        (52886 * index_factor, 0.0505),
        (105775 * index_factor, 0.0915),
        (150000 * index_factor, 0.1116),
        (220000 * index_factor, 0.1216),
        (float('inf'), 0.1316)
    ]
    
    ont_tax_raw = 0.0
    prev_limit = 0.0
    for limit, rate in ont_brackets:
        if annual_gross > prev_limit:
            taxable = min(annual_gross, limit) - prev_limit
            ont_tax_raw += taxable * rate
            prev_limit = limit
        else:
            break
            
    # Ontario Credits (Indexed)
    ont_bpa_credit = (12500.0 * index_factor) * 0.0505
    ont_cpp_ei_credit = (cpp_base + ei_prem) * 0.0505
    
    ont_tax_basic = max(0, ont_tax_raw - ont_bpa_credit - ont_cpp_ei_credit)
    
    # Ontario Surtax (Thresholds Indexed)
    ont_surtax = 0.0
    thresh_1 = 5400 * index_factor
    thresh_2 = 6900 * index_factor
    
    if ont_tax_basic > thresh_1:
        ont_surtax += (ont_tax_basic - thresh_1) * 0.20
    if ont_tax_basic > thresh_2:
        ont_surtax += (ont_tax_basic - thresh_2) * 0.36
        
    # Ontario Health Premium (OHP)
    # Thresholds Indexed
    ohp = 0.0
    if annual_gross <= (20000 * index_factor):
        ohp = 0
    elif annual_gross <= (25000 * index_factor):
        ohp = 300
    elif annual_gross <= (38500 * index_factor):
        ohp = 450
    elif annual_gross <= (48600 * index_factor):
        ohp = 600
    elif annual_gross <= (72600 * index_factor):
        ohp = 750
    else: 
        # Cap logic roughly indexed
        base_ohp = 750
        excess = annual_gross - (72600 * index_factor)
        ohp = min(900, base_ohp + excess * 0.06) 
    
    ont_tax_final = ont_tax_basic + ont_surtax + ohp
    
    # --- Final Calc ---
    total_tax_liability = fed_tax_final + ont_tax_final + total_deductions_source
    
    net_annual = annual_gross - total_tax_liability
    
    return net_annual / 12.0

def calculate_land_transfer_tax(price: float, first_time_buyer: bool = True) -> float:
    """
    Calculates Ontario Land Transfer Tax.
    """
    ltt = 0.0
    
    # Brackets
    # First $55k: 0.5%
    if price > 0:
        ltt += min(price, 55000) * 0.005
    
    # $55k-$250k: 1.0%
    if price > 55000:
        ltt += (min(price, 250000) - 55000) * 0.010
        
    # $250k-$400k: 1.5%
    if price > 250000:
        ltt += (min(price, 400000) - 250000) * 0.015
        
    # Over $400k: 2.0%
    if price > 400000:
        ltt += (price - 400000) * 0.020
        
    # Rebate
    if first_time_buyer:
        ltt = max(0, ltt - 4000)
        
    return ltt

def calculate_closing_costs(price: float, first_time_buyer: bool = True) -> float:
    """
    Estimates closing costs including Legal, Inspection, and LTT.
    """
    legal_fee = 2000.0
    inspection_fee = 500.0
    ltt = calculate_land_transfer_tax(price, first_time_buyer)
    
    return legal_fee + inspection_fee + ltt

def calculate_cmhc_premium(loan_amount: float, downpayment_percent: float) -> float:
    """
    Calculates CMHC Insurance Premium.
    """
    if downpayment_percent >= 0.20:
        return 0.0
    elif downpayment_percent >= 0.15:
        return loan_amount * 0.028
    elif downpayment_percent >= 0.10:
        return loan_amount * 0.031
    elif downpayment_percent >= 0.05:
        return loan_amount * 0.040
    else:
        return 0.0 # Should not happen if rules enforced

def calculate_mortgage_payment(principal: float, annual_rate: float, amortization_years: int = 25) -> float:
    """
    Calculates monthly mortgage payment using Canadian Semi-Annual Compounding.
    """
    if principal <= 0:
        return 0.0
    
    monthly_rate = calculate_effective_monthly_rate(annual_rate)
    num_payments = amortization_years * 12
    
    if monthly_rate == 0:
        return principal / num_payments
        
    payment = (principal * monthly_rate) / (1 - (1 + monthly_rate) ** -num_payments)
    return payment

def check_stress_test(
    gross_annual_income: float,
    mortgage_payment_annual: float,
    property_tax_annual: float,
    heating_cost_annual: float,
    condo_fees_annual: float
) -> bool:
    """
    Checks GDS Ratio. Limit 0.39.
    GDS = (Mortgage + Tax + Heat + CondoFees) / GrossIncome
    """
    gds_expenses = mortgage_payment_annual + property_tax_annual + heating_cost_annual + condo_fees_annual
    gds_ratio = gds_expenses / gross_annual_income
    return gds_ratio <= 0.39

def get_qualifying_rate(contract_rate: float, stress_floor: float = 0.0525) -> float:
    """
    Returns the higher of contract_rate + 2% or the floor (5.25%).
    """
    return max(contract_rate + 0.02, stress_floor)