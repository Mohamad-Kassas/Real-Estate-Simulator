import unittest
from financials import (
    calculate_net_monthly_income,
    calculate_land_transfer_tax,
    calculate_cmhc_premium,
    calculate_mortgage_payment,
    check_stress_test,
    get_qualifying_rate
)

class TestFinancials(unittest.TestCase):

    def test_net_monthly_income(self):
        # Test Case: $100,000 Gross Annual
        # Target: ~$74,023 Net Annual (from 2025 calculator)
        # Target Monthly: ~$6,168
        gross = 100000
        net_monthly = calculate_net_monthly_income(gross)
        self.assertTrue(6100 < net_monthly < 6300, f"Net monthly income {net_monthly} for 100k gross seems off (expected ~6168)")

    def test_ltt_first_time_buyer(self):
        # Test Case: $500,000 Home, First Time Buyer
        # Calculation:
        # 0-55k (0.5%): 275
        # 55-250k (1.0%): 1950
        # 250-400k (1.5%): 2250
        # 400-500k (2.0%): 2000
        # Total Raw: 6475
        # Rebate: -4000
        # Final: 2475
        price = 500000
        ltt = calculate_land_transfer_tax(price, first_time_buyer=True)
        self.assertAlmostEqual(ltt, 2475.0, places=2)

    def test_ltt_repeat_buyer(self):
        # Same as above but no rebate -> 6475
        price = 500000
        ltt = calculate_land_transfer_tax(price, first_time_buyer=False)
        self.assertAlmostEqual(ltt, 6475.0, places=2)

    def test_cmhc_premium_high_ratio(self):
        # 5% Down -> 4.0% Premium
        loan = 400000
        down_pct = 0.05
        premium = calculate_cmhc_premium(loan, down_pct)
        self.assertAlmostEqual(premium, 16000.0, places=2) # 4% of 400k

    def test_cmhc_premium_conventional(self):
        # 20% Down -> 0% Premium
        loan = 400000
        down_pct = 0.20
        premium = calculate_cmhc_premium(loan, down_pct)
        self.assertEqual(premium, 0.0)

    def test_mortgage_payment(self):
        # $100,000 Principal, 5% Rate, 25 Years
        # Canadian Semi-Annual Compounding
        # Effective Monthly Rate = (1.025)^(1/6) - 1 ~= 0.0041239
        # Expected ~581.60
        principal = 100000
        rate = 0.05
        payment = calculate_mortgage_payment(principal, rate, 25)
        self.assertAlmostEqual(payment, 581.60, places=2)

    def test_stress_test_pass(self):
        # Income 100k
        # Expenses 30k -> Ratio 0.30 -> Pass (<0.39)
        passed = check_stress_test(100000, 30000, 0, 0, 0)
        self.assertTrue(passed)

    def test_stress_test_fail(self):
        # Income 100k
        # Expenses 40k -> Ratio 0.40 -> Fail (>0.39)
        passed = check_stress_test(100000, 40000, 0, 0, 0)
        self.assertFalse(passed)

    def test_qualifying_rate(self):
        # Contract 4.0% -> Stress Test 6.0% (4+2)
        q1 = get_qualifying_rate(0.04, stress_floor=0.0525)
        self.assertAlmostEqual(q1, 0.06)

        # Contract 2.0% -> Stress Test 5.25% (Floor) because 4.0 < 5.25
        q2 = get_qualifying_rate(0.02, stress_floor=0.0525)
        self.assertAlmostEqual(q2, 0.0525)

if __name__ == '__main__':
    unittest.main()
