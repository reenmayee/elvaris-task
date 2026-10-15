from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, Path

from schemas import (
    StockQuote, StockHistoryResponse, OHLCVCandle,
    StockAnalyticsResponse, ScannerResponse
)
from services.market_data import market_data_service, get_stock_meta
from services.analytics import calculate_stock_quote, calculate_stock_analytics
from services.scanner import scanner_service

router = APIRouter(prefix="/api/stocks", tags=["Stock Intelligence"])

def _get_all_quotes() -> List[StockQuote]:
    dfs = market_data_service.get_universe_data()
    quotes = []
    for sym, df in dfs.items():
        q = calculate_stock_quote(sym, df)
        if q:
            quotes.append(q)
    return quotes

@router.get("", response_model=ScannerResponse)
def list_and_scan_stocks(
    search: Optional[str] = Query(None, description="Search ticker or company name"),
    sector: Optional[str] = Query(None, description="Filter by sector name"),
    min_price: Optional[float] = Query(None, description="Minimum close price"),
    max_price: Optional[float] = Query(None, description="Maximum close price"),
    min_change_pct: Optional[float] = Query(None, description="Minimum daily percentage change"),
    max_change_pct: Optional[float] = Query(None, description="Maximum daily percentage change"),
    min_volume: Optional[int] = Query(None, description="Minimum trading volume"),
    min_relative_volume: Optional[float] = Query(None, description="Minimum relative volume (20D baseline)"),
    max_relative_volume: Optional[float] = Query(None, description="Maximum relative volume"),
    min_volatility: Optional[float] = Query(None, description="Minimum annualized realized volatility %"),
    max_volatility: Optional[float] = Query(None, description="Maximum annualized realized volatility %"),
    sort_by: str = Query("change_pct", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page")
):
    """
    Searchable, sortable, filterable stock scanner utilizing validated market data.
    """
    all_quotes = _get_all_quotes()
    paginated, total = scanner_service.filter_and_sort_stocks(
        stocks=all_quotes,
        search=search,
        sector=sector,
        min_price=min_price,
        max_price=max_price,
        min_change_pct=min_change_pct,
        max_change_pct=max_change_pct,
        min_volume=min_volume,
        min_relative_volume=min_relative_volume,
        max_relative_volume=max_relative_volume,
        min_volatility=min_volatility,
        max_volatility=max_volatility,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

    info = market_data_service.get_last_update_info()

    return ScannerResponse(
        total_matches=total,
        page=page,
        page_size=page_size,
        stocks=paginated,
        timestamp=info["last_successful_update"]
    )

@router.get("/{symbol}", response_model=StockQuote)
def get_stock(symbol: str = Path(..., description="NSE Ticker symbol, e.g. RELIANCE.NS")):
    """
    Retrieves latest quote and analytical indicators for a specific stock.
    """
    sym = symbol.upper().strip()
    df = market_data_service.get_stock_history(sym, period="2mo", interval="1d")
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Stock '{sym}' not found or no historical data returned by provider."
        )

    quote = calculate_stock_quote(sym, df)
    if not quote:
        raise HTTPException(
            status_code=404,
            detail=f"Insufficient historical data available to compute metrics for '{sym}'."
        )

    return quote

@router.get("/{symbol}/history", response_model=StockHistoryResponse)
def get_stock_history(
    symbol: str = Path(..., description="NSE Ticker symbol, e.g. RELIANCE.NS"),
    period: str = Query("6mo", pattern="^(1mo|3mo|6mo|1y|2y)$"),
    interval: str = Query("1d", pattern="^(1d|1wk)$")
):
    """
    Retrieves validated historical OHLCV candles for charting across supported timeframes.
    """
    sym = symbol.upper().strip()
    df = market_data_service.get_stock_history(sym, period=period, interval=interval)
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Historical data unavailable for symbol '{sym}' (period: {period}, interval: {interval})."
        )

    meta = get_stock_meta(sym) or {"name": sym, "sector": "Other"}

    candles: List[OHLCVCandle] = []
    df_sorted = df.sort_index()

    for idx, row in df_sorted.iterrows():
        date_str = str(idx.date()) if hasattr(idx, "date") else str(idx).split(" ")[0]
        candles.append(OHLCVCandle(
            date=date_str,
            open=round(float(row["Open"]), 2),
            high=round(float(row["High"]), 2),
            low=round(float(row["Low"]), 2),
            close=round(float(row["Close"]), 2),
            volume=int(row["Volume"])
        ))

    info = market_data_service.get_last_update_info()

    return StockHistoryResponse(
        symbol=sym,
        company_name=meta["name"],
        sector=meta["sector"],
        period=period,
        interval=interval,
        candles=candles,
        status="Historical (EOD)",
        last_updated=info["last_successful_update"]
    )

@router.get("/{symbol}/analytics", response_model=StockAnalyticsResponse)
def get_stock_analytics(symbol: str = Path(..., description="NSE Ticker symbol, e.g. RELIANCE.NS")):
    """
    Retrieves multi-period returns, volatility, 52W range, and educational explanations.
    """
    sym = symbol.upper().strip()
    # Fetch 1y of data to compute 52w range and multi-period returns
    df = market_data_service.get_stock_history(sym, period="1y", interval="1d")
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Analytics unavailable for symbol '{sym}' due to missing provider data."
        )

    analytics = calculate_stock_analytics(sym, df)
    if not analytics:
        raise HTTPException(
            status_code=404,
            detail=f"Insufficient history to compute quantitative analytics for '{sym}'."
        )

    return analytics
