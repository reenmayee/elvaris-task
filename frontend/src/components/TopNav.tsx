import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Database, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { MarketBreadth } from '../types';

interface TopNavProps {
  breadth?: MarketBreadth | null;
  lastUpdated?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  breadth,
  lastUpdated,
  onRefresh,
  isRefreshing = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    let sym = searchQuery.trim().toUpperCase();
    if (!sym.endsWith('.NS') && !sym.startsWith('^')) {
      sym = `${sym}.NS`;
    }
    navigate(`/stocks/${encodeURIComponent(sym)}`);
    setSearchQuery('');
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Active';

  return (
    <header style={{
      height: 64,
      backgroundColor: '#0A0E17',
      borderBottom: '1px solid #1C2740',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Search Input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 320 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, color: '#64748B' }} />
        <input
          type="text"
          className="terminal-input"
          placeholder="Search NSE Symbol (e.g. RELIANCE, TCS)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 36, fontSize: 13, height: 38 }}
        />
      </form>

      {/* Market Breadth Quick Summary */}
      {breadth && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
            <TrendingUp size={14} />
            <span>Adv: <strong>{breadth.advances}</strong> ({breadth.advances_pct}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FB7185' }}>
            <TrendingDown size={14} />
            <span>Dec: <strong>{breadth.declines}</strong> ({breadth.declines_pct}%)</span>
          </div>
          <div style={{ color: '#94A3B8' }}>
            A/D: <strong style={{ color: '#F8FAFC' }}>{breadth.advance_decline_ratio ?? '1.0'}</strong>
          </div>
        </div>
      )}

      {/* Market Status & Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
            style={{ padding: '6px 10px', height: 32, fontSize: 12 }}
            title="Refresh market data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#0F1626',
          border: '1px solid #1C2740',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 11
        }}>
          <span className="pulse-dot amber" />
          <span style={{ color: '#FBBF24', fontWeight: 600 }}>HISTORICAL / DELAYED (NSE EOD)</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#64748B',
          fontSize: 11,
          fontFamily: 'var(--font-mono)'
        }}>
          <Clock size={13} />
          <span>{formattedTime}</span>
        </div>
      </div>
    </header>
  );
};
