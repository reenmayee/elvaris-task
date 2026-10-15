from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Base Models
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    data_provider: str
    cached_stocks_count: int

# Market Indices
class IndexQuote(BaseModel):
    symbol: str
    name: str
    latest_price: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    previous_close: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    timestamp: Optional[str] = None
    status: str = "Historical / Delayed"

# Stock Quote / Summary
class StockQuote(BaseModel):
    symbol: str
    company_name: str
    sector: str
    latest_close: Optional[float] = None
    previous_close: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    open_price: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    volume: Optional[int] = None
    avg_volume_20d: Optional[float] = None
    relative_volume: Optional[float] = None
    realized_volatility_daily: Optional[float] = None
    realized_volatility_annualized: Optional[float] = None
    price_gap_pct: Optional[float] = None
    is_unusual_volume: bool = False
    is_unusual_gap: bool = False
    is_unusual_movement: bool = False
    timestamp: Optional[str] = None
    status: str = "Historical"

# Stock Historical Candle
class OHLCVCandle(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class StockHistoryResponse(BaseModel):
    symbol: str
    company_name: str
    sector: str
    period: str
    interval: str
    candles: List[OHLCVCandle]
    status: str
    last_updated: Optional[str] = None

# Stock Analytics
class StockAnalyticsResponse(BaseModel):
    symbol: str
    company_name: str
    sector: str
    latest_price: Optional[float] = None
    daily_change_pct: Optional[float] = None
    price_gap_pct: Optional[float] = None
    relative_volume: Optional[float] = None
    avg_volume_20d: Optional[float] = None
    realized_volatility_daily: Optional[float] = None
    realized_volatility_annualized: Optional[float] = None
    return_1w: Optional[float] = None
    return_1m: Optional[float] = None
    return_3m: Optional[float] = None
    return_6m: Optional[float] = None
    return_1y: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    flags: Dict[str, bool] = Field(default_factory=dict)
    metric_explanations: Dict[str, str] = Field(default_factory=dict)
    timestamp: Optional[str] = None

# Market Breadth
class MarketBreadth(BaseModel):
    advances: int
    declines: int
    unchanged: int
    total_analyzed: int
    advance_decline_ratio: Optional[float] = None
    advances_pct: float
    declines_pct: float
    timestamp: Optional[str] = None

# Top Movers
class TopMovers(BaseModel):
    top_gainers: List[StockQuote]
    top_losers: List[StockQuote]
    highest_rel_volume: List[StockQuote]
    largest_movement: List[StockQuote]

# Sector Performance
class SectorPerformance(BaseModel):
    sector: str
    stocks_count: int
    mean_return_pct: float
    advancing_count: int
    declining_count: int
    top_performer_symbol: Optional[str] = None
    top_performer_return: Optional[float] = None
    worst_performer_symbol: Optional[str] = None
    worst_performer_return: Optional[float] = None
    calculation_method: str = "Equal-weighted constituent average"

# Heatmap Item
class HeatmapStock(BaseModel):
    symbol: str
    company_name: str
    sector: str
    latest_close: float
    change_pct: float
    volume: int
    relative_volume: Optional[float] = None

class HeatmapSector(BaseModel):
    sector: str
    mean_return_pct: float
    stocks_count: int
    stocks: List[HeatmapStock]

class HeatmapResponse(BaseModel):
    timeframe: str
    sectors: List[HeatmapSector]
    timestamp: Optional[str] = None

# Overview Response
class MarketOverviewResponse(BaseModel):
    indices: List[IndexQuote]
    breadth: MarketBreadth
    top_movers: TopMovers
    sector_summary: List[SectorPerformance]
    timestamp: str
    data_provider: str = "Yahoo Finance (Historical/Delayed)"
    last_successful_update: Optional[str] = None

# Scanner Response
class ScannerResponse(BaseModel):
    total_matches: int
    page: int
    page_size: int
    stocks: List[StockQuote]
    timestamp: str

# Watchlists
class WatchlistItemResponse(BaseModel):
    id: int
    watchlist_id: int
    symbol: str
    added_at: datetime
    quote: Optional[StockQuote] = None
    model_config = ConfigDict(from_attributes=True)

class WatchlistBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=255)

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class WatchlistResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[WatchlistItemResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class AddWatchlistItemRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=30)

# Alerts
class AlertRuleBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=30)
    rule_type: str = Field(..., description="PRICE_CHANGE_PCT_ABOVE, PRICE_CHANGE_PCT_BELOW, REL_VOLUME_ABOVE, VOLATILITY_ABOVE")
    threshold: float
    is_active: bool = True

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleUpdate(BaseModel):
    is_active: Optional[bool] = None
    threshold: Optional[float] = None

class AlertNotificationResponse(BaseModel):
    id: int
    alert_id: int
    symbol: str
    rule_type: str
    observed_value: float
    threshold: float
    message: str
    triggered_at: datetime
    is_read: bool
    model_config = ConfigDict(from_attributes=True)

class AlertRuleResponse(BaseModel):
    id: int
    symbol: str
    rule_type: str
    threshold: float
    is_active: bool
    created_at: datetime
    last_evaluated_at: Optional[datetime] = None
    recent_notifications: List[AlertNotificationResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class AlertEvaluationResult(BaseModel):
    evaluated_rules_count: int
    triggered_count: int
    new_notifications: List[AlertNotificationResponse]
    evaluation_timestamp: str
