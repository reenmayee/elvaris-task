import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid3X3,
  SlidersHorizontal,
  LineChart,
  Bookmark,
  Bell,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface SidebarProps {
  cachedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ cachedCount = 52 }) => {
  const navItems = [
    { to: '/', label: 'Market Overview', icon: LayoutDashboard },
    { to: '/heatmap', label: 'Market Heatmap', icon: Grid3X3 },
    { to: '/scanner', label: 'Stock Scanner', icon: SlidersHorizontal },
    { to: '/stocks/RELIANCE.NS', label: 'Stock Details', icon: LineChart },
    { to: '/watchlists', label: 'Watchlists', icon: Bookmark },
    { to: '/alerts', label: 'Alerts Center', icon: Bell },
  ];

  return (
    <aside style={{
      width: 260,
      backgroundColor: '#0A0E17',
      borderRight: '1px solid #1C2740',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid #1C2740',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: 16,
          boxShadow: '0 0 12px rgba(37, 99, 235, 0.4)'
        }}>
          E
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', color: '#F8FAFC' }}>
            ELVARIS CAPITAL
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#38BDF8', letterSpacing: '0.08em' }}>
            MARKET TERMINAL
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', padding: '0 12px 8px' }}>
          CORE INTELLIGENCE
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#38BDF8' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              })}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Terminal Engine Status Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1C2740',
        backgroundColor: '#070A11',
        fontSize: 11,
        color: '#64748B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot green" />
            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>TERMINAL ONLINE</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 600 }}>v1.0 MVP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Activity size={12} style={{ color: '#0EA5E9' }} />
          <span>NSE Universe: <strong style={{ color: '#CBD5E1' }}>{cachedCount} Equities</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={12} style={{ color: '#10B981' }} />
          <span>Persistence: <strong style={{ color: '#CBD5E1' }}>SQLite Database</strong></span>
        </div>
      </div>
    </aside>
  );
};
