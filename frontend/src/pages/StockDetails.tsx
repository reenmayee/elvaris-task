import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Bookmark,
  Calendar,
  Layers,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Flame,
  Zap,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, StockHistoryResponse, StockAnalyticsResponse, Watchlist } from '../types';
import { CandlestickChart } from '../components/CandlestickChart';
import { MetricTooltip } from '../components/MetricTooltip';

export const StockDetails: React.FC = () => {
  const { symbol = 'RELIANCE.NS' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<StockHistoryResponse | null>(null);
  const [analytics, setAnalytics] = useState<StockAnalyticsResponse | null>(null);
  const [timeframe, setTimeframe] = useState<string>('6mo');

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [watchlistFeedback, setWatchlistFeedback] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStockData = async (sym: string) => {
    try {
      setLoading(true);
      setError(null);

      const [qRes, aRes, wlRes] = await Promise.all([
        api.getStock(sym),
        api.getStockAnalytics(sym).catch(() => null),
        api.getWatchlists().catch(() => [])
      ]);

      setQuote(qRes);
      setAnalytics(aRes);
      setWatchlists(wlRes);
      if (wlRes.length > 0) {
        setSelectedWatchlistId(wlRes[0].id);
      }
    } catch (err: any) {
      setError(err?.message || `Unable to load market data for ticker "${sym}".`);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async (sym: string, tf: string) => {
    try {
      setChartLoading(true);
      const hRes = await api.getStockHistory(sym, tf, '1d');
      setHistory(hRes);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      loadStockData(symbol);
      loadHistoryData(symbol, timeframe);
    }
  }, [symbol]);

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    if (symbol) {
      loadHistoryData(symbol, tf);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedWatchlistId || !symbol) return;
    try {
      await api.addWatchlistItem(selectedWatchlistId, symbol);
      setWatchlistFeedback('Added to watchlist!');
      setTimeout(() => setWatchlistFeedback(null), 3000);
    } catch (err: any) {
      setWatchlistFeedback(err?.message || 'Failed to add to watchlist');
      setTimeout(() => setWatchlistFeedback(null), 3000);
    }
  };

  if (loading && !quote) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
        <div className="pulse-dot green" style={{ width: 16, height: 16, marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F8FAFC' }}>Loading Stock Analytics for {symbol}...</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
          Retrieving real OHLCV bars and computing volatility metrics
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div style={{ padding: 40, maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
        <div className="terminal-card" style={{ padding: 32, borderColor: '#EF4444' }}>
          <ShieldAlert size={40} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, color: '#F8FAFC', marginBottom: 8 }}>Ticker Data Unavailable</h2>
          <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/scanner')} className="btn-secondary">
              <ArrowLeft size={14} />
              <span>Back to Scanner</span>
            </button>
            <button onClick={() => navigate('/stocks/RELIANCE.NS')} className="btn-primary">
              View Reliance (RELIANCE.NS)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isUp = (quote?.change_pct ?? 0) >= 0;

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stock Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary"
              style={{ padding: '4px 8px', height: 28 }}
              title="Go back"
            >
              <ArrowLeft size={14} />
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {quote?.company_name}
            </h1>
            <span style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: '#0F172A',
              border: '1px solid #1C2740',
              color: '#38BDF8',
              padding: '2px 8px',
              borderRadius: 4
            }}>
              {quote?.symbol}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 12, color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={13} style={{ color: '#38BDF8' }} />
              {quote?.sector}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} />
              EOD Session: {quote?.timestamp}
            </span>
            <span>•</span>
            <span style={{ color: '#FBBF24' }}>NSE Equities</span>
          </div>
        </div>

        {/* Add to Watchlist Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {watchlists.length > 0 && (
            <select
              className="terminal-select"
              value={selectedWatchlistId ?? ''}
              onChange={(e) => setSelectedWatchlistId(parseInt(e.target.value, 10))}
              style={{ width: 160, fontSize: 12 }}
            >
              {watchlists.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleAddToWatchlist}
            className="btn-secondary"
            style={{ fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <Bookmark size={13} style={{ color: '#FBBF24' }} />
            <span>Add to Watchlist</span>
          </button>

          {watchlistFeedback && (
            <span style={{ fontSize: 12, color: watchlistFeedback.includes('Added') ? '#34D399' : '#FB7185', fontWeight: 600 }}>
              {watchlistFeedback}
            </span>
          )}
        </div>
      </div>

      {/* Primary Price & OHLCV Metric Banner */}
      <div className="terminal-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span className="tabular-nums" style={{ fontSize: 32, fontWeight: 800, color: '#F8FAFC' }}>
              ₹{quote?.latest_close?.toFixed(2)}
            </span>
            {quote?.change_pct !== null && (
              <span className={isUp ? 'badge-gain' : 'badge-loss'} style={{ fontSize: 15, padding: '4px 10px' }}>
                {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{isUp ? '+' : ''}{quote?.change?.toFixed(2)} ({isUp ? '+' : ''}{quote?.change_pct?.toFixed(2)}%)</span>
              </span>
            )}
          </div>

          {/* Daily OHLCV Grid */}
          <div style={{ display: 'flex', gap: 24, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <div>
              <div style={{ color: '#64748B' }}>OPEN</div>
              <div style={{ color: '#F8FAFC', fontWeight: 600 }}>₹{quote?.open_price?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>HIGH</div>
              <div style={{ color: '#34D399', fontWeight: 600 }}>₹{quote?.day_high?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>LOW</div>
              <div style={{ color: '#FB7185', fontWeight: 600 }}>₹{quote?.day_low?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>PREV CLOSE</div>
              <div style={{ color: '#94A3B8', fontWeight: 600 }}>₹{quote?.previous_close?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#64748B' }}>VOLUME</div>
              <div style={{ color: '#38BDF8', fontWeight: 600 }}>{quote?.volume?.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Candlestick Chart with Timeframe Selector */}
      <div className="terminal-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: '#38BDF8' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
              Historical Price Action & Volume
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 4, backgroundColor: '#0A0E17', padding: 3, borderRadius: 6, border: '1px solid #1C2740' }}>
            {['1mo', '3mo', '6mo', '1y', '2y'].map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                style={{
                  backgroundColor: timeframe === tf ? '#1E293B' : 'transparent',
                  color: timeframe === tf ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            <div className="pulse-dot green" style={{ width: 12, height: 12, marginRight: 8 }} />
            <span>Fetching historical candles for timeframe ({timeframe})...</span>
          </div>
        ) : (
          <CandlestickChart
            candles={history?.candles ?? []}
            symbol={quote?.symbol ?? symbol}
          />
        )}
      </div>

      {/* Quantitative Indicators & Return Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Quantitative Indicator Cards */}
        <div className="terminal-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
            Quantitative Signal Analytics
          </h2>

          {/* RVOL Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#090D16', borderRadius: 6, border: '1px solid #1C2740' }}>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                Relative Volume (RVOL)
                <MetricTooltip
                  title="Relative Volume"
                  explanation="Current session volume compared to the 20-day historical average. Value of 2.0x indicates volume is twice the historical norm."
                />
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Baseline: 20 Trading Days</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tabular-nums" style={{ fontSize: 17, fontWeight: 700, color: (quote?.relative_volume ?? 1) >= 2.0 ? '#FBBF24' : '#F8FAFC' }}>
                {quote?.relative_volume ? `${quote.relative_volume.toFixed(2)}x` : '—'}
              </div>
              {quote?.is_unusual_volume && (
                <span className="badge-anomaly">UNUSUAL VOL</span>
              )}
            </div>
          </div>

          {/* Realized Volatility Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#090D16', borderRadius: 6, border: '1px solid #1C2740' }}>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                Annualized Realized Volatility
                <MetricTooltip
                  title="Annualized Volatility"
                  explanation="Sample standard deviation of daily close-to-close returns over trailing 20 sessions, scaled by sqrt(252). Distinct from daily volatility."
                />
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Daily: {quote?.realized_volatility_daily?.toFixed(2)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tabular-nums" style={{ fontSize: 17, fontWeight: 700, color: '#A78BFA' }}>
                {quote?.realized_volatility_annualized ? `${quote.realized_volatility_annualized.toFixed(2)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Price Gap Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#090D16', borderRadius: 6, border: '1px solid #1C2740' }}>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                Session Price Gap
                <MetricTooltip
                  title="Price Gap %"
                  explanation="Difference between today's market open and previous session's close. Gaps >= 2% flag overnight order imbalance."
                />
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Threshold: +/- 2.0%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tabular-nums" style={{
                fontSize: 17,
                fontWeight: 700,
                color: (quote?.price_gap_pct ?? 0) >= 0 ? '#34D399' : '#FB7185'
              }}>
                {quote?.price_gap_pct ? `${quote.price_gap_pct > 0 ? '+' : ''}${quote.price_gap_pct.toFixed(2)}%` : '0.00%'}
              </div>
              {quote?.is_unusual_gap && (
                <span className="badge-anomaly">GAP ANOMALY</span>
              )}
            </div>
          </div>
        </div>

        {/* Historical Return Statistics & 52-Week Range */}
        <div className="terminal-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
            Historical Performance & Range
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: '1 Week', val: analytics?.return_1w },
              { label: '1 Month', val: analytics?.return_1m },
              { label: '3 Months', val: analytics?.return_3m },
              { label: '6 Months', val: analytics?.return_6m },
              { label: '1 Year', val: analytics?.return_1y },
            ].map(item => {
              const retUp = (item.val ?? 0) >= 0;
              return (
                <div key={item.label} style={{
                  padding: 10,
                  backgroundColor: '#090D16',
                  borderRadius: 6,
                  border: '1px solid #1C2740',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
                  <div className="tabular-nums" style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 4,
                    color: item.val !== null && item.val !== undefined ? (retUp ? '#34D399' : '#FB7185') : '#64748B'
                  }}>
                    {item.val !== null && item.val !== undefined ? `${retUp ? '+' : ''}${item.val.toFixed(2)}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 52-Week Range Bar */}
          <div style={{ marginTop: 8, padding: 12, backgroundColor: '#090D16', borderRadius: 6, border: '1px solid #1C2740' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 8 }}>
              <span>52W LOW: <strong style={{ color: '#F8FAFC' }}>₹{analytics?.low_52w ?? '—'}</strong></span>
              <span style={{ fontWeight: 600, color: '#38BDF8' }}>52-WEEK RANGE</span>
              <span>52W HIGH: <strong style={{ color: '#F8FAFC' }}>₹{analytics?.high_52w ?? '—'}</strong></span>
            </div>

            {analytics?.high_52w && analytics?.low_52w && quote?.latest_close && (
              <div style={{ height: 6, backgroundColor: '#1C2740', borderRadius: 3, position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.max(0, Math.min(100, ((quote.latest_close - analytics.low_52w) / (analytics.high_52w - analytics.low_52w)) * 100))}%`,
                    top: -4,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#38BDF8',
                    border: '2px solid #0F172A',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
