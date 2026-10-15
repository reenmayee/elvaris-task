export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  data_provider: string;
  cached_stocks_count: number;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  latest_price: number | null;
  change: number | null;
  change_pct: number | null;
  previous_close: number | null;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  timestamp: string | null;
  status: string;
}

export interface StockQuote {
  symbol: string;
  company_name: string;
  sector: string;
  latest_close: number | null;
  previous_close: number | null;
  change: number | null;
  change_pct: number | null;
  open_price: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  avg_volume_20d: number | null;
  relative_volume: number | null;
  realized_volatility_daily: number | null;
  realized_volatility_annualized: number | null;
  price_gap_pct: number | null;
  is_unusual_volume: boolean;
  is_unusual_gap: boolean;
  is_unusual_movement: boolean;
  timestamp: string | null;
  status: string;
}

export interface OHLCVCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryResponse {
  symbol: string;
  company_name: string;
  sector: string;
  period: string;
  interval: string;
  candles: OHLCVCandle[];
  status: string;
  last_updated: string | null;
}

export interface StockAnalyticsResponse {
  symbol: string;
  company_name: string;
  sector: string;
  latest_price: number | null;
  daily_change_pct: number | null;
  price_gap_pct: number | null;
  relative_volume: number | null;
  avg_volume_20d: number | null;
  realized_volatility_daily: number | null;
  realized_volatility_annualized: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  high_52w: number | null;
  low_52w: number | null;
  flags: {
    is_unusual_volume?: boolean;
    is_unusual_gap?: boolean;
    is_unusual_movement?: boolean;
  };
  metric_explanations: Record<string, string>;
  timestamp: string | null;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  total_analyzed: number;
  advance_decline_ratio: number | null;
  advances_pct: number;
  declines_pct: number;
  timestamp: string | null;
}

export interface TopMovers {
  top_gainers: StockQuote[];
  top_losers: StockQuote[];
  highest_rel_volume: StockQuote[];
  largest_movement: StockQuote[];
}

export interface SectorPerformance {
  sector: string;
  stocks_count: number;
  mean_return_pct: number;
  advancing_count: number;
  declining_count: number;
  top_performer_symbol: string | null;
  top_performer_return: number | null;
  worst_performer_symbol: string | null;
  worst_performer_return: number | null;
  calculation_method: string;
}

export interface HeatmapStock {
  symbol: string;
  company_name: string;
  sector: string;
  latest_close: number;
  change_pct: number;
  volume: number;
  relative_volume: number | null;
}

export interface HeatmapSector {
  sector: string;
  mean_return_pct: number;
  stocks_count: number;
  stocks: HeatmapStock[];
}

export interface HeatmapResponse {
  timeframe: string;
  sectors: HeatmapSector[];
  timestamp: string | null;
}

export interface MarketOverviewResponse {
  indices: IndexQuote[];
  breadth: MarketBreadth;
  top_movers: TopMovers;
  sector_summary: SectorPerformance[];
  timestamp: string;
  data_provider: string;
  last_successful_update: string | null;
}

export interface ScannerResponse {
  total_matches: number;
  page: number;
  page_size: number;
  stocks: StockQuote[];
  timestamp: string;
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  symbol: string;
  added_at: string;
  quote?: StockQuote | null;
}

export interface Watchlist {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  items: WatchlistItem[];
}

export interface AlertNotification {
  id: number;
  alert_id: number;
  symbol: string;
  rule_type: string;
  observed_value: number;
  threshold: number;
  message: string;
  triggered_at: string;
  is_read: boolean;
}

export interface AlertRule {
  id: number;
  symbol: string;
  rule_type: string;
  threshold: number;
  is_active: boolean;
  created_at: string;
  last_evaluated_at: string | null;
  recent_notifications: AlertNotification[];
}

export interface AlertEvaluationResult {
  evaluated_rules_count: number;
  triggered_count: number;
  new_notifications: AlertNotification[];
  evaluation_timestamp: string;
}
