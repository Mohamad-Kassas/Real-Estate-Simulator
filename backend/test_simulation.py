import unittest
from simulation import run_simulation
from models import Scenario, GlobalMarketParams, InvestmentProfile, PropertyTarget

class TestSimulationBudget(unittest.TestCase):

    def setUp(self):
        self.market = GlobalMarketParams(
            inflation_rate=0.0, # Zero inflation for easier math
            property_appreciation_rate=0.0,
            rent_inflation_rate=0.0,
            mortgage_stress_rate_floor=0.05,
            mortgage_rate=0.05
        )
        self.profile = InvestmentProfile(
            pre_buy_roi=0.10, # 10% return
            post_buy_roi=0.10,
            safe_savings_rate=0.0,
            downpayment_glide_path=False
        )

    def test_high_expenses_reduce_wealth(self):
        """Test that higher living expenses reduce final net worth."""
        
        # Scenario A: Low Expenses ($1,000/mo)
        sc_low = Scenario(
            id="low", name="Low",
            initial_cash=0,
            gross_annual_income=120000, # ~10k/mo gross -> ~7k net
            current_rent=2000,
            monthly_living_expenses=1000, # Surplus ~4k
            investment_percent=0.40, # Invest ~2.8k (High Savings)
            cash_savings_percent=0.0,
            property_targets=[],
            investment_profile=self.profile
        )
        
        # Scenario B: High Expenses ($4,000/mo)
        sc_high = Scenario(
            id="high", name="High",
            initial_cash=0,
            gross_annual_income=120000, 
            current_rent=2000,
            monthly_living_expenses=4000, # Surplus ~1k
            investment_percent=0.10, # Invest ~0.7k (Limited by surplus anyway)
            cash_savings_percent=0.0,
            property_targets=[],
            investment_profile=self.profile
        )
        
        df_low = run_simulation(sc_low, self.market)
        df_high = run_simulation(sc_high, self.market)
        
        nw_low = df_low.iloc[-1]["Net Worth"]
        nw_high = df_high.iloc[-1]["Net Worth"]
        
        print(f"Low Exp NW: ${nw_low:,.2f}")
        print(f"High Exp NW: ${nw_high:,.2f}")
        
        self.assertGreater(nw_low, nw_high, "Lower expenses should lead to higher net worth")
        # Diff should be substantial (3000/mo * 300 months + growth)
        self.assertGreater(nw_low - nw_high, 900000)

    def test_spending_impact(self):
        """Test that lifestyle spending reduces net worth."""
        # Baseline surplus ~4k/mo
        # Saver: Invests heavily
        sc_saver = Scenario(
            id="saver", name="Saver",
            initial_cash=0, gross_annual_income=120000, current_rent=2000,
            monthly_living_expenses=1000,
            investment_percent=0.50, # Invest 50% of Income (~3.5k)
            cash_savings_percent=0.0,
            property_targets=[], investment_profile=self.profile
        )
        
        # Spender: Invests little, lifestyle absorbs the rest
        sc_spender = Scenario(
            id="spender", name="Spender",
            initial_cash=0, gross_annual_income=120000, current_rent=2000,
            monthly_living_expenses=1000,
            investment_percent=0.10, # Invest 10% of Income (~0.7k) -> Rest is blown on Lifestyle
            cash_savings_percent=0.0,
            property_targets=[], investment_profile=self.profile
        )
        
        nw_saver = run_simulation(sc_saver, self.market).iloc[-1]["Net Worth"]
        nw_spender = run_simulation(sc_spender, self.market).iloc[-1]["Net Worth"]
        
        print(f"Saver NW: ${nw_saver:,.2f}")
        print(f"Spender NW: ${nw_spender:,.2f}")
        
        self.assertGreater(nw_saver, nw_spender)

if __name__ == '__main__':
    unittest.main()
