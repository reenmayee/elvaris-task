import pytest
import pandas as pd
import numpy as np
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.analytics import (
    calculate_stock_quote,
    calculate_market_breadth,
    calculate_top_movers,
    calculate_sector_performance,
    build_heatmap_data,
    calculate_stock_analytics
)
from schemas import StockQuote

def create_synthetic_df(prices, volumes, opens=None, highs=None, lows=None):
    n = len(prices)
    if opens is None:
        opens = [p * 0.99 for p in prices]
    if highs is None:
        highs = [p * 1.02 for p in prices]
    if lows is None:
        lows = [p * 0.98 for p in prices]
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    return pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": prices,
        "Volume": volumes
    }, index=dates)

class TestAnalyticsCalculations:
    def test_stock_quote_returns_positive_and_negative(self):
        # 25 sessions of data
        # Positive change session
        df_up = create_synthetic_df(
            prices=[100.0 + i for i in range(25)],
            volumes=[1000] * 25
        )
        quote_up = calculate_stock_quote("RELIANCE.NS", df_up)
        assert quote_up is not None
        assert quote_up.change > 0
        assert quote_up.change_pct > 0
        assert quote_up.latest_close == 124.0
        assert quote_up.previous_close == 123.0

        # Negative change session
        df_down = create_synthetic_df(
            prices=[100.0 - i for i in range(25)],
            volumes=[1000] * 25
        )
        quote_down = calculate_stock_quote("TCS.NS", df_down)
        assert quote_down is not None
        assert quote_down.change < 0
        assert quote_down.change_pct < 0

    def test_relative_volume_calculation(self):
        # 20 historical sessions with volume 1000, latest session volume 2500
        # RVOL should be 2500 / 1000 = 2.5 (unusual volume flagged)
        volumes = [1000] * 20 + [2500]
        prices = [100.0] * 21
        df = create_synthetic_df(prices, volumes)

        quote = calculate_stock_quote("INFY.NS", df)
        assert quote is not None
        assert quote.relative_volume == 2.5
        assert quote.is_unusual_volume is True
        assert quote.avg_volume_20d == 1000.0

    def test_price_gap_calculation(self):
        # Previous close 100, today open 105 -> gap is +5.0%
        prices = [100.0] * 21
        volumes = [1000] * 21
        opens = [100.0] * 20 + [105.0]
        highs = [102.0] * 20 + [106.0]
        lows = [98.0] * 20 + [104.0]
        df = create_synthetic_df(prices, volumes, opens=opens, highs=highs, lows=lows)

        quote = calculate_stock_quote("HDFCBANK.NS", df)
        assert quote is not None
        assert quote.price_gap_pct == 5.0
        assert quote.is_unusual_gap is True

    def test_realized_volatility_annualized(self):
        prices = [100.0, 102.0, 101.0, 103.0, 102.0, 104.0] * 4 # 24 sessions
        volumes = [1000] * len(prices)
        df = create_synthetic_df(prices, volumes)

        quote = calculate_stock_quote("SBIN.NS", df)
        assert quote is not None
        assert quote.realized_volatility_daily is not None
        assert quote.realized_volatility_annualized is not None
        # Annualized volatility must equal daily_vol * sqrt(252)
        expected_annualized = round(quote.realized_volatility_daily * np.sqrt(252), 2)
        assert abs(quote.realized_volatility_annualized - expected_annualized) < 0.05

    def test_division_by_zero_and_missing_data_protection(self):
        # Empty df
        assert calculate_stock_quote("RELIANCE.NS", pd.DataFrame()) is None
        # None df
        assert calculate_stock_quote("RELIANCE.NS", None) is None
        # Single row df (insufficient for day-over-day return)
        df_single = create_synthetic_df([100.0], [1000])
        assert calculate_stock_quote("RELIANCE.NS", df_single) is None

        # Zero previous volume: relative volume should safely return None or not crash
        df_zero_vol = create_synthetic_df([100.0] * 21, [0] * 20 + [500])
        quote_zero_vol = calculate_stock_quote("RELIANCE.NS", df_zero_vol)
        assert quote_zero_vol is not None
        assert quote_zero_vol.relative_volume is None

    def test_market_breadth_classification(self):
        quotes = [
            StockQuote(symbol="S1", company_name="C1", sector="IT", latest_close=100.0, change_pct=1.5),
            StockQuote(symbol="S2", company_name="C2", sector="IT", latest_close=200.0, change_pct=2.0),
            StockQuote(symbol="S3", company_name="C3", sector="Finance", latest_close=50.0, change_pct=-1.2),
            StockQuote(symbol="S4", company_name="C4", sector="Finance", latest_close=60.0, change_pct=0.0),
        ]
        breadth = calculate_market_breadth(quotes)
        assert breadth.advances == 2
        assert breadth.declines == 1
        assert breadth.unchanged == 1
        assert breadth.total_analyzed == 4
        assert breadth.advance_decline_ratio == 2.0
        assert breadth.advances_pct == 50.0
        assert breadth.declines_pct == 25.0

    def test_sector_performance_aggregation(self):
        quotes = [
            StockQuote(symbol="S1", company_name="C1", sector="IT", latest_close=100.0, change_pct=4.0),
            StockQuote(symbol="S2", company_name="C2", sector="IT", latest_close=200.0, change_pct=2.0),
            StockQuote(symbol="S3", company_name="C3", sector="Energy", latest_close=50.0, change_pct=-2.0),
        ]
        sectors = calculate_sector_performance(quotes)
        assert len(sectors) == 2
        # IT mean return: (4.0 + 2.0) / 2 = 3.0
        it_sec = next(s for s in sectors if s.sector == "IT")
        assert it_sec.mean_return_pct == 3.0
        assert it_sec.stocks_count == 2
        assert it_sec.top_performer_symbol == "S1"
        assert it_sec.worst_performer_symbol == "S2"

        # Energy mean return: -2.0
        energy_sec = next(s for s in sectors if s.sector == "Energy")
        assert energy_sec.mean_return_pct == -2.0
        assert energy_sec.stocks_count == 1
