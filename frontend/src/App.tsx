import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { MarketOverview } from './pages/MarketOverview';
import { MarketHeatmap } from './pages/MarketHeatmap';
import { StockScanner } from './pages/StockScanner';
import { StockDetails } from './pages/StockDetails';
import { Watchlists } from './pages/Watchlists';
import { AlertsCenter } from './pages/AlertsCenter';
import { api } from './services/api';
import { MarketBreadth, HealthResponse } from './types';

export function App() {
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchGlobalState = async () => {
    try {
      setIsRefreshing(true);
      const [bRes, hRes] = await Promise.all([
        api.getBreadth().catch(() => null),
        api.getHealth().catch(() => null)
      ]);
      if (bRes) setBreadth(bRes);
      if (hRes) setHealth(hRes);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalState();
  }, []);

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090D16' }}>
        {/* Sidebar */}
        <Sidebar cachedCount={health?.cached_stocks_count ?? 52} />

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopNav
            breadth={breadth}
            lastUpdated={health?.timestamp}
            onRefresh={fetchGlobalState}
            isRefreshing={isRefreshing}
          />

          <main style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<MarketOverview />} />
              <Route path="/heatmap" element={<MarketHeatmap />} />
              <Route path="/scanner" element={<StockScanner />} />
              <Route path="/stocks/:symbol" element={<StockDetails />} />
              <Route path="/watchlists" element={<Watchlists />} />
              <Route path="/alerts" element={<AlertsCenter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
