import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { MarketOverviewResponse, StockQuote } from '../types';
import { MetricTooltip } from '../components/MetricTooltip';

export const MarketOverview: React.FC = () => {
  const [data, setData] = useState<MarketOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMoverTab, setActiveMoverTab] = useState<'gainers' | 'losers' | 'volume' | 'movers'>('gainers');
  const navigate = useNavigate();

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMarketOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch market overview data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
        <div className="pulse-dot green" style={{ width: 16, height: 16, marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F8FAFC' }}>Loading Market Intelligence...</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
          Retrieving real OHLCV data for benchmark indices and NSE equity universe
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div className="terminal-card" style={{ maxWidth: 500, margin: '0 auto', padding: 24, borderColor: '#EF4444' }}>
          <AlertCircle size={32} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, color: '#F8FAFC', marginBottom: 8 }}>Market Data Unavailable</h3>
          <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{error}</p>
          <button onClick={loadOverview} className="btn-primary">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { indices, breadth, top_movers, sector_summary, last_successful_update } = data!;

  const getMoversList = (): StockQuote[] => {
    switch (activeMoverTab) {
      case 'gainers':
        return top_movers.top_gainers;
      case 'losers':
        return top_movers.top_losers;
      case 'volume':
        return top_movers.highest_rel_volume;
      case 'movers':
        return top_movers.largest_movement;
      default:
        return top_movers.top_gainers;
    }
  };

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Title & Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            Market Intelligence Overview
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Quantitative analytics, breadth indicators, and relative performance across NSE-listed equities
          </p>
        </div>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
          <div>PROVIDER: <strong>YAHOO FINANCE (NSE EOD)</strong></div>
          <div>LAST SYNC: <strong>{last_successful_update ? new Date(last_successful_update).toLocaleString() : 'N/A'}</strong></div>
        </div>
      </div>

      {/* SECTION A: Benchmark Index Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {indices.map((idx) => {
          const isUp = (idx.change_pct ?? 0) >= 0;
          return (
            <div key={idx.symbol} className="terminal-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>{idx.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748B', marginLeft: 8 }}>
                    {idx.symbol}
                  </span>
                </div>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: '#FBBF24',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  {idx.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC' }}>
                  {idx.latest_price !== null ? idx.latest_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                </span>
                {idx.change_pct !== null && (
                  <span className={isUp ? 'badge-gain' : 'badge-loss'} style={{ fontSize: 13 }}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{isUp ? '+' : ''}{idx.change?.toFixed(2)} ({isUp ? '+' : ''}{idx.change_pct?.toFixed(2)}%)</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                <span>Prev Close: <strong style={{ color: '#94A3B8' }}>{idx.previous_close?.toFixed(2) ?? '—'}</strong></span>
                <span>Day High: <strong style={{ color: '#94A3B8' }}>{idx.high_price?.toFixed(2) ?? '—'}</strong></span>
                <span>Day Low: <strong style={{ color: '#94A3B8' }}>{idx.low_price?.toFixed(2) ?? '—'}</strong></span>
              </div>
            </div>
          );
        })}

        {/* SECTION B: Market Breadth Summary Card */}
        <div className="terminal-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} style={{ color: '#38BDF8' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Market Breadth</span>
              <MetricTooltip
                title="Advance / Decline Ratio"
                explanation="Calculates the ratio of advancing stocks to declining stocks across analyzed NSE universe. Ratio > 1.0 indicates broad-based bullish market participation."
              />
            </div>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Coverage: <strong style={{ color: '#CBD5E1' }}>{breadth.total_analyzed} Equities</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748B' }}>A/D RATIO</div>
              <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: (breadth.advance_decline_ratio ?? 1) >= 1 ? '#34D399' : '#FB7185' }}>
                {breadth.advance_decline_ratio?.toFixed(2) ?? '1.00'}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', borderLeft: '1px solid #1C2740', paddingLeft: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>ADVANCES</div>
                <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                  {breadth.advances} <span style={{ fontSize: 11, color: '#64748B' }}>({breadth.advances_pct}%)</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#FB7185', fontWeight: 600 }}>DECLINES</div>
                <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                  {breadth.declines} <span style={{ fontSize: 11, color: '#64748B' }}>({breadth.declines_pct}%)</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>UNCHANGED</div>
                <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                  {breadth.unchanged}
                </div>
              </div>
            </div>
          </div>

          {/* Breadth Bar Visual */}
          <div style={{ height: 8, width: '100%', backgroundColor: '#1C2740', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${breadth.advances_pct}%`, backgroundColor: '#10B981', transition: 'width 0.3s' }} />
            <div style={{ width: `${breadth.declines_pct}%`, backgroundColor: '#F43F5E', transition: 'width 0.3s' }} />
            <div style={{ flex: 1, backgroundColor: '#64748B' }} />
          </div>
        </div>
      </div>

      {/* SECTION C & D: Top Movers & Sector Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 20 }}>
        {/* Top Movers Widget */}
        <div className="terminal-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
              Market Movers
            </h2>
            <div style={{ display: 'flex', gap: 4, backgroundColor: '#0A0E17', padding: 3, borderRadius: 6, border: '1px solid #1C2740' }}>
              {(['gainers', 'losers', 'volume', 'movers'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMoverTab(tab)}
                  style={{
                    backgroundColor: activeMoverTab === tab ? '#1E293B' : 'transparent',
                    color: activeMoverTab === tab ? '#38BDF8' : '#94A3B8',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'volume' ? 'Unusual Vol' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="terminal-table-container">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th style={{ textAlign: 'right' }}>Close (₹)</th>
                  <th style={{ textAlign: 'right' }}>Change %</th>
                  <th style={{ textAlign: 'right' }}>Rel Vol</th>
                </tr>
              </thead>
              <tbody>
                {getMoversList().map((stock) => {
                  const isUp = (stock.change_pct ?? 0) >= 0;
                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol)}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontWeight: 700, color: '#38BDF8' }}>{stock.symbol}</span>
                      </td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: '#CBD5E1' }}>
                        {stock.company_name}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        ₹{stock.latest_close?.toFixed(2)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        <span className={isUp ? 'badge-gain' : 'badge-loss'}>
                          {isUp ? '+' : ''}{stock.change_pct?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {stock.relative_volume ? `${stock.relative_volume.toFixed(2)}x` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector Performance Widget */}
        <div className="terminal-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} style={{ color: '#38BDF8' }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
                Sector Performance Ranking
              </h2>
            </div>
            <span style={{ fontSize: 10, color: '#64748B' }}>Equal-Weighted Mean</span>
          </div>

          <div className="terminal-table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Constituents</th>
                  <th style={{ textAlign: 'right' }}>Mean Return</th>
                  <th>Top Performer</th>
                </tr>
              </thead>
              <tbody>
                {sector_summary.map((sec) => {
                  const isUp = sec.mean_return_pct >= 0;
                  return (
                    <tr key={sec.sector}>
                      <td style={{ fontWeight: 600, color: '#F8FAFC' }}>{sec.sector}</td>
                      <td style={{ color: '#94A3B8' }}>{sec.stocks_count} stocks</td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        <span className={isUp ? 'badge-gain' : 'badge-loss'}>
                          {isUp ? '+' : ''}{sec.mean_return_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {sec.top_performer_symbol && (
                          <span
                            onClick={() => navigate(`/stocks/${encodeURIComponent(sec.top_performer_symbol!)}`)}
                            style={{ color: '#38BDF8', cursor: 'pointer', fontWeight: 600 }}
                          >
                            {sec.top_performer_symbol} ({sec.top_performer_return !== null && sec.top_performer_return > 0 ? '+' : ''}{sec.top_performer_return?.toFixed(2)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
            * Note: Sector returns are calculated as the unweighted arithmetic mean of mapped constituent stocks. Not an official sectoral exchange index.
          </div>
        </div>
      </div>
    </div>
  );
};
