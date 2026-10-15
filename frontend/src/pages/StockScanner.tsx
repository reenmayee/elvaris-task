import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Flame,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { StockQuote, ScannerResponse } from '../types';
import { MetricTooltip } from '../components/MetricTooltip';

const SECTOR_OPTIONS = [
  'All',
  'Financial Services',
  'Information Technology',
  'Energy',
  'Utilities',
  'Automobile',
  'Consumer Goods',
  'Healthcare',
  'Metals & Mining',
  'Capital Goods',
  'Telecommunication',
  'Consumer Discretionary'
];

export const StockScanner: React.FC = () => {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [sector, setSector] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minChange, setMinChange] = useState<string>('');
  const [maxChange, setMaxChange] = useState<string>('');
  const [minVolume, setMinVolume] = useState<string>('');
  const [minRvol, setMinRvol] = useState<string>('');
  const [maxRvol, setMaxRvol] = useState<string>('');
  const [minVolatility, setMinVolatility] = useState<string>('');
  const [maxVolatility, setMaxVolatility] = useState<string>('');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<string>('change_pct');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const navigate = useNavigate();

  const fetchScan = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = {
        search: search.trim() || undefined,
        sector: sector !== 'All' ? sector : undefined,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        min_change_pct: minChange ? parseFloat(minChange) : undefined,
        max_change_pct: maxChange ? parseFloat(maxChange) : undefined,
        min_volume: minVolume ? parseInt(minVolume, 10) : undefined,
        min_relative_volume: minRvol ? parseFloat(minRvol) : undefined,
        max_relative_volume: maxRvol ? parseFloat(maxRvol) : undefined,
        min_volatility: minVolatility ? parseFloat(minVolatility) : undefined,
        max_volatility: maxVolatility ? parseFloat(maxVolatility) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize
      };

      const res = await api.scanStocks(params);
      setStocks(res.stocks);
      setTotalMatches(res.total_matches);
    } catch (err: any) {
      setError(err?.message || 'Failed to scan stocks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [sector, sortBy, sortOrder, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchScan();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSector('All');
    setMinPrice('');
    setMaxPrice('');
    setMinChange('');
    setMaxChange('');
    setMinVolume('');
    setMinRvol('');
    setMaxRvol('');
    setMinVolatility('');
    setMaxVolatility('');
    setSortBy('change_pct');
    setSortOrder('desc');
    setPage(1);
  };

  const applyPreset = (preset: 'gainers' | 'rvol' | 'volatility' | 'gaps') => {
    handleClearFilters();
    if (preset === 'gainers') {
      setMinChange('1.5');
      setSortBy('change_pct');
      setSortOrder('desc');
    } else if (preset === 'rvol') {
      setMinRvol('2.0');
      setSortBy('relative_volume');
      setSortOrder('desc');
    } else if (preset === 'volatility') {
      setMinVolatility('25');
      setSortBy('realized_volatility_annualized');
      setSortOrder('desc');
    } else if (preset === 'gaps') {
      setSortBy('price_gap_pct');
      setSortOrder('desc');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title & Presets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <SlidersHorizontal size={24} style={{ color: '#38BDF8' }} />
            Stock Scanner & Screener
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Multi-factor filtering across price action, 20-day baseline relative volume, and realized volatility
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>PRESETS:</span>
          <button onClick={() => applyPreset('gainers')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>
            <TrendingUp size={12} style={{ color: '#34D399' }} />
            <span>Top Gainers</span>
          </button>
          <button onClick={() => applyPreset('rvol')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>
            <Flame size={12} style={{ color: '#FBBF24' }} />
            <span>RVOL &gt; 2.0x</span>
          </button>
          <button onClick={() => applyPreset('volatility')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>
            <Zap size={12} style={{ color: '#A78BFA' }} />
            <span>High Volatility (&gt;25%)</span>
          </button>
          <button onClick={() => applyPreset('gaps')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>
            <Sparkles size={12} style={{ color: '#38BDF8' }} />
            <span>Price Gaps</span>
          </button>
        </div>
      </div>

      {/* Filter Control Console */}
      <div className="terminal-card" style={{ padding: 20 }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Search */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Search Symbol / Name
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#64748B' }} />
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="e.g. INFY, Tata"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Industry Sector
              </label>
              <select
                className="terminal-select"
                value={sector}
                onChange={(e) => { setSector(e.target.value); setPage(1); }}
              >
                {SECTOR_OPTIONS.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Price Range (₹)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  className="terminal-input"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  className="terminal-input"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Change % Range */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Change % (Min / Max)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  step="0.1"
                  className="terminal-input"
                  placeholder="Min %"
                  value={minChange}
                  onChange={(e) => setMinChange(e.target.value)}
                />
                <input
                  type="number"
                  step="0.1"
                  className="terminal-input"
                  placeholder="Max %"
                  value={maxChange}
                  onChange={(e) => setMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Relative Volume */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Relative Volume (RVOL)
                <MetricTooltip
                  title="Relative Volume (RVOL)"
                  explanation="Current session volume divided by 20-day historical baseline. RVOL >= 2.0x flags unusual volume."
                />
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  step="0.1"
                  className="terminal-input"
                  placeholder="Min (e.g. 1.5)"
                  value={minRvol}
                  onChange={(e) => setMinRvol(e.target.value)}
                />
                <input
                  type="number"
                  step="0.1"
                  className="terminal-input"
                  placeholder="Max"
                  value={maxRvol}
                  onChange={(e) => setMaxRvol(e.target.value)}
                />
              </div>
            </div>

            {/* Realized Volatility */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Annualized Volatility (%)
                <MetricTooltip
                  title="Realized Volatility"
                  explanation="Sample standard deviation of daily close-to-close returns over trailing 20 sessions, annualized with sqrt(252)."
                />
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  step="1"
                  className="terminal-input"
                  placeholder="Min %"
                  value={minVolatility}
                  onChange={(e) => setMinVolatility(e.target.value)}
                />
                <input
                  type="number"
                  step="1"
                  className="terminal-input"
                  placeholder="Max %"
                  value={maxVolatility}
                  onChange={(e) => setMaxVolatility(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTop: '1px solid #1C2740', paddingTop: 14 }}>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ fontSize: 12 }}
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: 12 }}
            >
              <Search size={13} />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Table */}
      <div className="terminal-card">
        {/* Table Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1C2740',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
              Filtered Equities
            </span>
            <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
              ({totalMatches} matched criteria)
            </span>
          </div>

          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
            Sorted by: <strong style={{ color: '#38BDF8' }}>{sortBy} ({sortOrder})</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div className="pulse-dot green" style={{ width: 14, height: 14, marginBottom: 12 }} />
            <div>Scanning NSE Universe...</div>
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle size={28} style={{ color: '#EF4444', margin: '0 auto 8px' }} />
            <div style={{ color: '#F8FAFC', fontWeight: 600 }}>Error loading scan results</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{error}</div>
          </div>
        ) : stocks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
            <AlertTriangle size={32} style={{ color: '#F59E0B', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC' }}>No Equities Match Active Criteria</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Try broadening your price, change percentage, or volume filter thresholds.
            </div>
            <button onClick={handleClearFilters} className="btn-secondary" style={{ marginTop: 16 }}>
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="terminal-table-container">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('symbol')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Symbol</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Company Name</th>
                  <th>Sector</th>
                  <th onClick={() => toggleSort('latest_close')} style={{ textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span>Close (₹)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('change_pct')} style={{ textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span>Change %</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('volume')} style={{ textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span>Volume</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('relative_volume')} style={{ textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span>RVOL (20D)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('realized_volatility_annualized')} style={{ textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <span>Vol (Ann.)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Activity Flags</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => {
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
                      <td style={{ color: '#CBD5E1', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stock.company_name}
                      </td>
                      <td style={{ color: '#94A3B8' }}>{stock.sector}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{stock.latest_close?.toFixed(2) ?? '—'}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {stock.change_pct !== null ? (
                          <span className={isUp ? 'badge-gain' : 'badge-loss'}>
                            {isUp ? '+' : ''}{stock.change_pct.toFixed(2)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right', color: '#94A3B8' }}>
                        {stock.volume ? stock.volume.toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {stock.relative_volume ? (
                          <span style={{
                            fontWeight: 700,
                            color: stock.relative_volume >= 2.0 ? '#FBBF24' : '#CBD5E1'
                          }}>
                            {stock.relative_volume.toFixed(2)}x
                          </span>
                        ) : '—'}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right', color: '#94A3B8' }}>
                        {stock.realized_volatility_annualized ? `${stock.realized_volatility_annualized.toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {stock.is_unusual_volume && (
                            <span className="badge-anomaly">UNUSUAL VOL</span>
                          )}
                          {stock.is_unusual_gap && (
                            <span className="badge-anomaly" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.3)' }}>
                              GAP {stock.price_gap_pct && stock.price_gap_pct > 0 ? '+' : ''}{stock.price_gap_pct?.toFixed(1)}%
                            </span>
                          )}
                          {stock.is_unusual_movement && (
                            <span className="badge-anomaly" style={{ color: '#F43F5E', borderColor: 'rgba(244,63,94,0.3)' }}>
                              EXTREME MOVE
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalMatches > pageSize && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #1C2740',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12
          }}>
            <span style={{ color: '#64748B' }}>
              Showing {stocks.length} of {totalMatches} stocks
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                Page {page} of {Math.ceil(totalMatches / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(totalMatches / pageSize)}
                onClick={() => setPage(page + 1)}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
