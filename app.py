import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from models import Scenario, GlobalMarketParams, InvestmentProfile, PropertyTarget
from simulation import run_simulation

# --- Page Config ---
st.set_page_config(page_title="Ottawa Wealth Simulator 2025", layout="wide")

# --- Session State Initialization ---
if "scenarios" not in st.session_state:
    # Add a default scenario
    default_profile = InvestmentProfile(
        pre_buy_roi=0.10,
        post_buy_roi=0.07,
        safe_savings_rate=0.04,
        downpayment_glide_path=True
    )
    # Default: Buy Once
    default_scenario = Scenario(
        id="default_1",
        name="Buy $450k Condo",
        initial_cash=50000,
        gross_annual_income=90000,
        current_rent=2000,
        property_targets=[
            PropertyTarget(name="Starter Condo", price=450000, min_downpayment_percent=0.20, sell_existing=True)
        ],
        investment_profile=default_profile
    )
    st.session_state.scenarios = [default_scenario]

# --- Sidebar: The Laboratory ---
st.sidebar.header("🔬 The Laboratory")

st.sidebar.subheader("Global Market Parameters")
inflation_rate = st.sidebar.slider("Inflation Rate (%)", 0.0, 10.0, 2.5, 0.1) / 100.0
property_appreciation = st.sidebar.slider("Property Appreciation (%)", -5.0, 15.0, 3.5, 0.1) / 100.0
rent_inflation = st.sidebar.slider("Rent Inflation (%)", 0.0, 10.0, 2.5, 0.1) / 100.0
mortgage_rate = st.sidebar.slider("Mortgage Rate (%)", 0.0, 10.0, 4.5, 0.1) / 100.0

market_params = GlobalMarketParams(
    inflation_rate=inflation_rate,
    property_appreciation_rate=property_appreciation,
    rent_inflation_rate=rent_inflation,
    mortgage_rate=mortgage_rate
)

st.sidebar.markdown("---")
st.sidebar.subheader("Create New Scenario")

# Strategy Selection (Outside Form for dynamic updates)
st.markdown("### Strategy Type")
strat_type = st.sidebar.selectbox("Choose Strategy", ["Rent & Invest Forever", "Buy & Hold (1 Property)", "Property Ladder (2 Properties)"])

with st.sidebar.form("scenario_form"):
    # sc_name = st.text_input("Scenario Name", "Property Ladder Strategy") # Removed per user request
    sc_income = st.number_input("Gross Annual Income ($)", value=95000, step=1000)
    sc_cash = st.number_input("Initial Cash ($)", value=60000, step=1000)
    sc_rent = st.number_input("Current Rent ($)", value=2100, step=50)
    
    # strat_type is now defined above
    
    targets = []
    auto_name = strat_type
    
    if strat_type == "Buy & Hold (1 Property)":
        st.markdown("#### Target Property")
        p1_price = st.number_input("Home Price ($)", value=500000, step=5000, key="p1_price")
        p1_down = st.slider("Downpayment (%)", 5, 50, 20, 5, key="p1_down") / 100.0
        targets.append(PropertyTarget(name="Home", price=p1_price, min_downpayment_percent=p1_down, sell_existing=True))
        auto_name = f"Buy ${p1_price/1000:.0f}k"
        
    elif strat_type == "Property Ladder (2 Properties)":
        st.markdown("#### 1. Starter Property")
        p1_price = st.number_input("Condo Price ($)", value=400000, step=5000, key="lad_p1_price")
        p1_down = st.slider("Condo Down (%)", 5, 50, 5, 5, key="lad_p1_down") / 100.0
        
        st.markdown("#### 2. Upgrade Property")
        p2_price = st.number_input("Forever Home Price ($)", value=900000, step=5000, key="lad_p2_price")
        p2_down = st.slider("House Down (%)", 5, 50, 20, 5, key="lad_p2_down") / 100.0
        
        targets.append(PropertyTarget(name="Starter Condo", price=p1_price, min_downpayment_percent=p1_down, sell_existing=True))
        targets.append(PropertyTarget(name="Dream House", price=p2_price, min_downpayment_percent=p2_down, sell_existing=True))
        auto_name = f"Ladder: ${p1_price/1000:.0f}k -> ${p2_price/1000:.0f}k"
    
    st.markdown("### Investment Profile")
    st.caption("Define how your stock/ETF portfolio performs.")
    sc_pre_roi = st.slider("Return (While Renting) %", 0.0, 15.0, 10.0, 0.5, help="Annual growth of your investments BEFORE you buy a home.") / 100.0
    sc_post_roi = st.slider("Return (After Buying) %", 0.0, 15.0, 7.0, 0.5, help="Annual growth of your investments AFTER you buy (often lower if you become more conservative).") / 100.0
    sc_glide = st.checkbox("Safe Mode for Downpayment", value=True, help="If checked, the simulator automatically moves your downpayment cash into a safe account (4% return) when you are close to buying, protecting it from market crashes.")
    
    submitted = st.form_submit_button("Add Scenario")
    
    if submitted:
        new_profile = InvestmentProfile(
            pre_buy_roi=sc_pre_roi,
            post_buy_roi=sc_post_roi,
            safe_savings_rate=0.04,
            downpayment_glide_path=sc_glide
        )
        new_scenario = Scenario(
            id=f"sc_{len(st.session_state.scenarios)+1}",
            name=auto_name,
            initial_cash=sc_cash,
            gross_annual_income=sc_income,
            current_rent=sc_rent,
            property_targets=targets,
            investment_profile=new_profile
        )
        st.session_state.scenarios.append(new_scenario)
        st.success(f"Added {auto_name}!")

# --- Main View: The Showdown ---
st.title("Ottawa Wealth Simulator 2025 🇨🇦")
st.markdown("Compare **Rent**, **Buy & Hold**, and **Property Ladder** strategies.")

# Section: Active Scenarios
if st.session_state.scenarios:
    st.subheader("Active Scenarios")
    cols = st.columns(len(st.session_state.scenarios))
    for idx, sc in enumerate(st.session_state.scenarios):
        with cols[idx]:
            target_desc = "Rent Forever"
            if sc.property_targets:
                target_desc = " -> ".join([f"${t.price/1000:.0f}k {t.name}" for t in sc.property_targets])
            
            st.info(f"**{sc.name}**\n\nPath: {target_desc}\n\nIncome: ${sc.gross_annual_income:,.0f}")
            if st.button(f"Remove {idx}", key=f"rm_{idx}"):
                st.session_state.scenarios.pop(idx)
                st.rerun()

# Run Simulation
if st.session_state.scenarios:
    st.markdown("---")
    
    results = {}
    final_metrics = []
    
    for sc in st.session_state.scenarios:
        df = run_simulation(sc, market_params)
        results[sc.name] = df
        final_nw = df.iloc[-1]["Net Worth"]
        final_metrics.append((sc.name, final_nw))
        
    # Metric Cards
    st.subheader("🏆 25-Year Outcomes")
    m_cols = st.columns(len(final_metrics))
    best_nw = max([m[1] for m in final_metrics])
    
    for idx, (name, nw) in enumerate(final_metrics):
        delta = None
        if nw == best_nw:
            delta = "Winner"
        else:
            delta = f"-${best_nw - nw:,.0f}"
            
        m_cols[idx].metric(label=name, value=f"${nw:,.0f}", delta=delta)

    # Chart 1: Net Worth
    st.subheader("📈 Net Worth Evolution")
    fig_nw = go.Figure()
    for name, df in results.items():
        fig_nw.add_trace(go.Scatter(x=df["Year"], y=df["Net Worth"], mode='lines', name=name))
    
    fig_nw.update_layout(xaxis_title="Years", yaxis_title="Net Worth ($)", hovermode="x unified")
    st.plotly_chart(fig_nw, use_container_width=True)
    
    # Chart 2: The Gap (Buying Power)
    st.subheader("🏠 The Buying Gap (Liquidity vs Requirement)")
    st.markdown("Only showing scenarios with purchase targets.")
    
    gap_scenarios = [sc for sc in st.session_state.scenarios if sc.property_targets]
    
    if gap_scenarios:
        tabs = st.tabs([sc.name for sc in gap_scenarios])
        
        for idx, sc in enumerate(gap_scenarios):
            with tabs[idx]:
                df = results[sc.name]
                fig_gap = go.Figure()
                
                # Liquid Assets
                fig_gap.add_trace(go.Scatter(
                    x=df["Year"], y=df["Liquid Assets"], 
                    mode='lines', name='Liquid Assets',
                    line=dict(color='green', width=2)
                ))
                
                # Target Downpayment
                # In new sim, we have 'Next Target Cost' column.
                # It is > 0 only when there is a valid next target.
                # However, after buying last home, it might be 0 or undefined logic.
                # Let's plot it where it's > 0.
                
                target_df = df[df["Next Target Cost"] > 0]
                if not target_df.empty:
                     fig_gap.add_trace(go.Scatter(
                        x=target_df["Year"], y=target_df["Next Target Cost"], 
                        mode='lines', name='Required Cash for Next Step',
                        line=dict(color='red', dash='dash')
                    ))
                
                # Mark Purchase Points
                # We can find where "Is Owner" changes or "Current Home" increments.
                # Helper: Detect changes in 'Current Home' column
                # But simplest is to just check Is Owner transitions for first buy?
                # For Ladder, we need multiple events.
                
                # Detect changes in 'Current Home' index
                df['prev_home'] = df['Current Home'].shift(1).fillna(0)
                buy_events = df[df['Current Home'] > df['prev_home']]
                
                for _, row in buy_events.iterrows():
                    fig_gap.add_vline(x=row["Year"], line_width=2, line_dash="dash", line_color="gold", annotation_text=f"BUY #{int(row['Current Home'])}")
                
                fig_gap.update_layout(xaxis_title="Years", yaxis_title="Amount ($)", hovermode="x unified")
                st.plotly_chart(fig_gap, use_container_width=True)

else:
    st.warning("Add a scenario to start the simulation.")
