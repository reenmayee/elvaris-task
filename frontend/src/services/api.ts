import {
  HealthResponse,
  MarketOverviewResponse,
  IndexQuote,
  MarketBreadth,
  HeatmapResponse,
  SectorPerformance,
  ScannerResponse,
  StockQuote,
  StockHistoryResponse,
  StockAnalyticsResponse,
  Watchlist,
  AlertRule,
  AlertNotification,
  AlertEvaluationResult
} from '../types';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'https://elvaris-task.onrender.com').replace(/\/+$/, '')}/api`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // System Health
  getHealth: () => request<HealthResponse>('/health'),

  // Market Intelligence
  getMarketOverview: () => request<MarketOverviewResponse>('/market/overview'),
  getIndices: () => request<IndexQuote[]>('/market/indices'),
  getBreadth: () => request<MarketBreadth>('/market/breadth'),
  getHeatmap: (timeframe = '1D') => request<HeatmapResponse>(`/market/heatmap?timeframe=${encodeURIComponent(timeframe)}`),
  getSectors: () => request<SectorPerformance[]>('/market/sectors'),

  // Stocks & Scanner
  scanStocks: (params: Record<string, any> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return request<ScannerResponse>(`/stocks${qs ? `?${qs}` : ''}`);
  },
  getStock: (symbol: string) => request<StockQuote>(`/stocks/${encodeURIComponent(symbol)}`),
  getStockHistory: (symbol: string, period = '6mo', interval = '1d') =>
    request<StockHistoryResponse>(`/stocks/${encodeURIComponent(symbol)}/history?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`),
  getStockAnalytics: (symbol: string) =>
    request<StockAnalyticsResponse>(`/stocks/${encodeURIComponent(symbol)}/analytics`),

  // Watchlists
  getWatchlists: () => request<Watchlist[]>('/watchlists'),
  createWatchlist: (name: string, description = '') =>
    request<Watchlist>('/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
  updateWatchlist: (watchlistId: number, data: { name?: string; description?: string }) =>
    request<Watchlist>(`/watchlists/${watchlistId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteWatchlist: (watchlistId: number) =>
    request<void>(`/watchlists/${watchlistId}`, { method: 'DELETE' }),
  addWatchlistItem: (watchlistId: number, symbol: string) =>
    request<Watchlist>(`/watchlists/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ symbol })
    }),
  removeWatchlistItem: (watchlistId: number, symbol: string) =>
    request<void>(`/watchlists/${watchlistId}/items/${encodeURIComponent(symbol)}`, {
      method: 'DELETE'
    }),

  // Alerts
  getAlerts: () => request<AlertRule[]>('/alerts'),
  createAlert: (data: { symbol: string; rule_type: string; threshold: number; is_active?: boolean }) =>
    request<AlertRule>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAlert: (alertId: number, data: { is_active?: boolean; threshold?: number }) =>
    request<AlertRule>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteAlert: (alertId: number) =>
    request<void>(`/alerts/${alertId}`, { method: 'DELETE' }),
  getAlertNotifications: () => request<AlertNotification[]>('/alerts/notifications'),
  evaluateAlerts: () => request<AlertEvaluationResult>('/alerts/evaluate', { method: 'POST' }),
};
