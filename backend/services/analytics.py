import math
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
from schemas import (
    StockQuote, OHLCVCandle, MarketBreadth, TopMovers,
    SectorPerformance, HeatmapStock, HeatmapSector, StockAnalyticsResponse
)
from services.market_data import STOCK_MAP, INDEX_MAP

METRIC_EXPLANATIONS = {
    "relative_volume": "Relative Volume (RVOL) compares the latest trading volume against the 20-day historical average volume (excluding the current session). RVOL > 2.0x indicates unusually high institutional participation.",
    "price_gap": "Price Gap % measures the difference between today's market open and the previous session's close. Gaps >= 2% highlight pre-market catalysts and overnight order imbalances.",
    "realized_volatility": "Realized Volatility measures the historical dispersion of daily close-to-close returns over 20 sessions, annualized via the standard sqrt(252) convention. Higher values indicate greater price fluctuations.",
    "unusual_movement": "Unusual Price Movement flags any single-session price change exceeding +/- 3.0%, representing significant momentum or event-driven re-pricing.",
    "advance_decline": "Advance/Decline Ratio (A/D Ratio) divides the number of advancing stocks by declining stocks. An A/D ratio > 1.0 indicates broad positive market breadth."
}

def calculate_stock_quote(symbol: str, df: pd.DataFrame) -> Optional[StockQuote]:
    """
    Computes stock quote and key analytics from validated OHLCV historical dataframe.
    Guarantees division-by-zero protection, robust handling of missing sessions,
    and returns None when data is insufficient.
    """
    if df is None or df.empty or len(df) < 2:
        return None

    meta = STOCK_MAP.get(symbol, INDEX_MAP.get(symbol, {
        "symbol": symbol,
        "name": symbol,
        "sector": "Other"
    }))

    # Sort index chronologically
    df_sorted = df.sort_index()

    latest_row = df_sorted.iloc[-1]
    prev_row = df_sorted.iloc[-2]

    latest_close = float(latest_row["Close"])
    prev_close = float(prev_row["Close"])
    open_price = float(latest_row["Open"])
    day_high = float(latest_row["High"])
    day_low = float(latest_row["Low"])
    volume = int(latest_row["Volume"])

    # 1. Price Change
    change = latest_close - prev_close
    change_pct = (change / prev_close * 100.0) if prev_close > 0 else 0.0

    # 2. Price Gap %: (today open - yesterday close) / yesterday close * 100
    price_gap_pct = ((open_price - prev_close) / prev_close * 100.0) if prev_close > 0 else None

    # 3. Relative Volume (RVOL): volume / mean of previous 20 valid trading sessions (excluding current)
    # Exclude current session
    history_vol = df_sorted.iloc[:-1]["Volume"].dropna()
    baseline_sessions = history_vol.tail(20)

    if len(baseline_sessions) >= 5: # Require at least 5 sessions
        avg_vol_20d = float(baseline_sessions.mean())
        relative_volume = (float(volume) / avg_vol_20d) if avg_vol_20d > 0 else None
    else:
        avg_vol_20d = None
        relative_volume = None

    # 4. Realized Volatility: standard deviation of daily close-to-close returns over trailing sessions
    history_close = df_sorted["Close"].dropna()
    daily_returns = history_close.pct_change().dropna().tail(20)

    if len(daily_returns) >= 5:
        # Sample standard deviation (ddof=1)
        vol_daily = float(daily_returns.std(ddof=1)) * 100.0 # as percentage
        vol_annualized = vol_daily * math.sqrt(252)
    else:
        vol_daily = None
        vol_annualized = None

    # Flags
    is_unusual_vol = bool(relative_volume is not None and relative_volume >= 2.0)
    is_unusual_gap = bool(price_gap_pct is not None and abs(price_gap_pct) >= 2.0)
    is_unusual_move = bool(abs(change_pct) >= 3.0)

    ts = str(df_sorted.index[-1].date()) if hasattr(df_sorted.index[-1], "date") else str(df_sorted.index[-1])

    return StockQuote(
        symbol=symbol,
        company_name=meta["name"],
        sector=meta["sector"],
        latest_close=round(latest_close, 2),
        previous_close=round(prev_close, 2),
        change=round(change, 2),
        change_pct=round(change_pct, 2),
        open_price=round(open_price, 2),
        day_high=round(day_high, 2),
        day_low=round(day_low, 2),
        volume=volume,
        avg_volume_20d=round(avg_vol_20d, 0) if avg_vol_20d is not None else None,
        relative_volume=round(relative_volume, 2) if relative_volume is not None else None,
        realized_volatility_daily=round(vol_daily, 2) if vol_daily is not None else None,
        realized_volatility_annualized=round(vol_annualized, 2) if vol_annualized is not None else None,
        price_gap_pct=round(price_gap_pct, 2) if price_gap_pct is not None else None,
        is_unusual_volume=is_unusual_vol,
        is_unusual_gap=is_unusual_gap,
        is_unusual_movement=is_unusual_move,
        timestamp=ts,
        status="Historical (EOD)"
    )

def calculate_market_breadth(quotes: List[StockQuote]) -> MarketBreadth:
    """
    Computes advancing, declining, unchanged stock counts and advance-decline ratio.
    """
    valid_quotes = [q for q in quotes if q.change_pct is not None]
    total = len(valid_quotes)

    advances = sum(1 for q in valid_quotes if q.change_pct > 0.0)
    declines = sum(1 for q in valid_quotes if q.change_pct < 0.0)
    unchanged = sum(1 for q in valid_quotes if q.change_pct == 0.0)

    ad_ratio = round(advances / declines, 2) if declines > 0 else (float(advances) if advances > 0 else 1.0)
    adv_pct = round((advances / total * 100.0), 1) if total > 0 else 0.0
    dec_pct = round((declines / total * 100.0), 1) if total > 0 else 0.0

    return MarketBreadth(
        advances=advances,
        declines=declines,
        unchanged=unchanged,
        total_analyzed=total,
        advance_decline_ratio=ad_ratio,
        advances_pct=adv_pct,
        declines_pct=dec_pct,
        timestamp=valid_quotes[0].timestamp if valid_quotes else None
    )

def calculate_top_movers(quotes: List[StockQuote], limit: int = 5) -> TopMovers:
    """
    Identifies top gainers, top losers, highest relative-volume stocks,
    and largest absolute percentage movements.
    """
    valid_quotes = [q for q in quotes if q.change_pct is not None]

    gainers = sorted(valid_quotes, key=lambda x: x.change_pct or 0.0, reverse=True)[:limit]
    losers = sorted(valid_quotes, key=lambda x: x.change_pct or 0.0)[:limit]

    with_rvol = [q for q in valid_quotes if q.relative_volume is not None]
    highest_rvol = sorted(with_rvol, key=lambda x: x.relative_volume or 0.0, reverse=True)[:limit]

    largest_move = sorted(valid_quotes, key=lambda x: abs(x.change_pct or 0.0), reverse=True)[:limit]

    return TopMovers(
        top_gainers=gainers,
        top_losers=losers,
        highest_rel_volume=highest_rvol,
        largest_movement=largest_move
    )

def calculate_sector_performance(quotes: List[StockQuote]) -> List[SectorPerformance]:
    """
    Computes equal-weighted average return per sector, constituent counts,
    and identifies best and worst performing stocks per sector.
    """
    sector_groups: Dict[str, List[StockQuote]] = {}
    for q in quotes:
        if q.sector and q.change_pct is not None:
            sector_groups.setdefault(q.sector, []).append(q)

    results: List[SectorPerformance] = []
    for sector, items in sector_groups.items():
        if not items:
            continue
        mean_return = sum(item.change_pct for item in items) / len(items)
        advances = sum(1 for item in items if item.change_pct > 0)
        declines = sum(1 for item in items if item.change_pct < 0)

        sorted_items = sorted(items, key=lambda x: x.change_pct)
        worst = sorted_items[0]
        best = sorted_items[-1]

        results.append(SectorPerformance(
            sector=sector,
            stocks_count=len(items),
            mean_return_pct=round(mean_return, 2),
            advancing_count=advances,
            declining_count=declines,
            top_performer_symbol=best.symbol,
            top_performer_return=best.change_pct,
            worst_performer_symbol=worst.symbol,
            worst_performer_return=worst.change_pct,
            calculation_method="Equal-weighted constituent average"
        ))

    # Sort descending by sector mean return
    results.sort(key=lambda s: s.mean_return_pct, reverse=True)
    return results

def build_heatmap_data(quotes: List[StockQuote]) -> List[HeatmapSector]:
    """
    Constructs sector heatmap structures with individual stock tiles.
    """
    sector_groups: Dict[str, List[StockQuote]] = {}
    for q in quotes:
        if q.sector and q.change_pct is not None and q.latest_close is not None:
            sector_groups.setdefault(q.sector, []).append(q)

    sectors: List[HeatmapSector] = []
    for sector, items in sector_groups.items():
        mean_return = sum(item.change_pct for item in items) / len(items)
        stocks = [
            HeatmapStock(
                symbol=q.symbol,
                company_name=q.company_name,
                sector=q.sector,
                latest_close=q.latest_close,
                change_pct=q.change_pct,
                volume=q.volume or 0,
                relative_volume=q.relative_volume
            )
            for q in sorted(items, key=lambda x: abs(x.change_pct), reverse=True)
        ]
        sectors.append(HeatmapSector(
            sector=sector,
            mean_return_pct=round(mean_return, 2),
            stocks_count=len(stocks),
            stocks=stocks
        ))

    sectors.sort(key=lambda s: s.mean_return_pct, reverse=True)
    return sectors

def calculate_stock_analytics(symbol: str, df: pd.DataFrame) -> Optional[StockAnalyticsResponse]:
    """
    Computes comprehensive analytics for a stock: multi-timeframe returns (1W, 1M, 3M, 6M, 1Y),
    52-week High/Low, relative volume, daily and annualized volatility, and clear metric explanations.
    """
    quote = calculate_stock_quote(symbol, df)
    if not quote or df is None or df.empty:
        return None

    df_sorted = df.sort_index()
    closes = df_sorted["Close"].dropna()

    def get_return(lookback_days: int) -> Optional[float]:
        if len(closes) > lookback_days:
            past_close = float(closes.iloc[-1 - lookback_days])
            latest_close = float(closes.iloc[-1])
            return round(((latest_close - past_close) / past_close * 100.0), 2) if past_close > 0 else None
        return None

    # Multi-period returns based on approximate trading days
    return_1w = get_return(5)
    return_1m = get_return(21)
    return_3m = get_return(63)
    return_6m = get_return(126)
    return_1y = get_return(252)

    # 52-week range
    trailing_252 = df_sorted.tail(252)
    high_52w = round(float(trailing_252["High"].max()), 2) if not trailing_252.empty else None
    low_52w = round(float(trailing_252["Low"].min()), 2) if not trailing_252.empty else None

    flags = {
        "is_unusual_volume": quote.is_unusual_volume,
        "is_unusual_gap": quote.is_unusual_gap,
        "is_unusual_movement": quote.is_unusual_movement
    }

    return StockAnalyticsResponse(
        symbol=symbol,
        company_name=quote.company_name,
        sector=quote.sector,
        latest_price=quote.latest_close,
        daily_change_pct=quote.change_pct,
        price_gap_pct=quote.price_gap_pct,
        relative_volume=quote.relative_volume,
        avg_volume_20d=quote.avg_volume_20d,
        realized_volatility_daily=quote.realized_volatility_daily,
        realized_volatility_annualized=quote.realized_volatility_annualized,
        return_1w=return_1w,
        return_1m=return_1m,
        return_3m=return_3m,
        return_6m=return_6m,
        return_1y=return_1y,
        high_52w=high_52w,
        low_52w=low_52w,
        flags=flags,
        metric_explanations=METRIC_EXPLANATIONS,
        timestamp=quote.timestamp
    )
