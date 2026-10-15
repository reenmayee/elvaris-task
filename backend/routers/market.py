from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

from schemas import (
    MarketOverviewResponse, IndexQuote, MarketBreadth,
    HeatmapResponse, SectorPerformance
)
from services.market_data import market_data_service, INDEX_UNIVERSE
from services.analytics import (
    calculate_stock_quote, calculate_market_breadth,
    calculate_top_movers, calculate_sector_performance,
    build_heatmap_data
)

router = APIRouter(prefix="/api/market", tags=["Market Intelligence"])

def _get_all_quotes():
    dfs = market_data_service.get_universe_data()
    quotes = []
    for sym, df in dfs.items():
        q = calculate_stock_quote(sym, df)
        if q:
            quotes.append(q)
    return quotes

def _get_index_quotes() -> List[IndexQuote]:
    dfs = market_data_service.get_indices()
    results = []
    for meta in INDEX_UNIVERSE:
        sym = meta["symbol"]
        df = dfs.get(sym)
        if df is not None and len(df) >= 2:
            latest = df.iloc[-1]
            prev = df.iloc[-2]
            p_close = float(prev["Close"])
            l_close = float(latest["Close"])
            change = l_close - p_close
            change_pct = (change / p_close * 100.0) if p_close > 0 else 0.0
            ts = str(df.index[-1].date()) if hasattr(df.index[-1], "date") else str(df.index[-1])

            results.append(IndexQuote(
                symbol=sym,
                name=meta["name"],
                latest_price=round(l_close, 2),
                change=round(change, 2),
                change_pct=round(change_pct, 2),
                previous_close=round(p_close, 2),
                open_price=round(float(latest["Open"]), 2),
                high_price=round(float(latest["High"]), 2),
                low_price=round(float(latest["Low"]), 2),
                timestamp=ts,
                status="Historical / Delayed"
            ))
        else:
            results.append(IndexQuote(
                symbol=sym,
                name=meta["name"],
                status="Data Unavailable"
            ))
    return results

@router.get("/overview", response_model=MarketOverviewResponse)
def get_market_overview():
    """
    Returns high-level institutional market overview including benchmark indices,
    calculated market breadth, top gainers/losers/volume leaders, and sector rankings.
    """
    quotes = _get_all_quotes()
    indices = _get_index_quotes()
    breadth = calculate_market_breadth(quotes)
    top_movers = calculate_top_movers(quotes, limit=5)
    sector_summary = calculate_sector_performance(quotes)
    info = market_data_service.get_last_update_info()

    return MarketOverviewResponse(
        indices=indices,
        breadth=breadth,
        top_movers=top_movers,
        sector_summary=sector_summary,
        timestamp=datetime.now(timezone.utc).isoformat(),
        data_provider="Yahoo Finance (NSE EOD / Delayed Historical)",
        last_successful_update=info["last_successful_update"]
    )

@router.get("/indices", response_model=List[IndexQuote])
def get_indices():
    """Returns validated index quotes for NIFTY 50 and NIFTY Bank."""
    return _get_index_quotes()

@router.get("/breadth", response_model=MarketBreadth)
def get_market_breadth():
    """Returns calculated market breadth metrics across the analyzed stock universe."""
    quotes = _get_all_quotes()
    return calculate_market_breadth(quotes)

@router.get("/heatmap", response_model=HeatmapResponse)
def get_market_heatmap(timeframe: str = Query("1D", pattern="^(1D|5D|1M)$")):
    """
    Returns calculated sector heatmap tiles grouped by sector with constituent stock returns.
    """
    quotes = _get_all_quotes()
    sectors = build_heatmap_data(quotes)
    return HeatmapResponse(
        timeframe=timeframe,
        sectors=sectors,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@router.get("/sectors", response_model=List[SectorPerformance])
def get_sector_performance():
    """Returns equal-weighted sector returns and rankings."""
    quotes = _get_all_quotes()
    return calculate_sector_performance(quotes)
