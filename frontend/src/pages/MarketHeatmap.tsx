import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { HeatmapResponse, HeatmapSector, HeatmapStock } from '../types';

export const MarketHeatmap: React.FC = () => {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadHeatmap = async (tf = timeframe) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.getHeatmap(tf);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load heatmap data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeatmap(timeframe);
  }, [timeframe]);

  const getTileBackground = (changePct: number): string => {
    // Dynamic emerald green or ruby red shading based on return magnitude
    if (changePct >= 4.0) return 'rgba(16, 185, 129, 0.45)';
    if (changePct >= 2.0) return 'rgba(16, 185, 129, 0.32)';
    if (changePct >= 0.5) return 'rgba(16, 185, 129, 0.20)';
    if (changePct > 0.0) return 'rgba(16, 185, 129, 0.12)';
    if (changePct === 0.0) return 'rgba(148, 163, 184, 0.1)';
    if (changePct >= -0.5) return 'rgba(244, 63, 94, 0.12)';
    if (changePct >= -2.0) return 'rgba(244, 63, 94, 0.22)';
    if (changePct >= -4.0) return 'rgba(244, 63, 94, 0.35)';

    return 'rgba(244, 63, 94, 0.50)';
  };

  const getTileBorder = (changePct: number): string => {
    if (changePct > 0) return 'rgba(16, 185, 129, 0.4)';
    if (changePct < 0) return 'rgba(244, 63, 94, 0.4)';

    return 'rgba(148, 163, 184, 0.2)';
  };

  return (
    <div
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Grid3X3 size={24} style={{ color: '#38BDF8' }} />
            Sector Performance Heatmap
          </h1>

          <p
            style={{
              fontSize: 13,
              color: '#94A3B8',
              marginTop: 4,
            }}
          >
            Equal-weighted constituent performance matrix grouped by industry sector
          </p>
        </div>

        {/* Timeframe Selector & Refresh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 4,
              backgroundColor: '#0A0E17',
              padding: 3,
              borderRadius: 6,
              border: '1px solid #1C2740',
            }}
          >
            {['1D', '5D', '1M'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  backgroundColor:
                    timeframe === tf ? '#1E293B' : 'transparent',
                  color: timeframe === tf ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadHeatmap(timeframe)}
            disabled={loading}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              height: 34,
              fontSize: 12,
            }}
          >
            <RefreshCw
              size={13}
              className={loading ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: '#94A3B8',
          }}
        >
          <div
            className="pulse-dot green"
            style={{
              width: 14,
              height: 14,
              marginBottom: 12,
            }}
          />
          <div>Computing Sector Performance Heatmap...</div>
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div
          className="terminal-card"
          style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 24,
            textAlign: 'center',
            borderColor: '#EF4444',
          }}
        >
          <AlertCircle
            size={32}
            style={{
              color: '#EF4444',
              margin: '0 auto 12px',
            }}
          />

          <h3
            style={{
              fontSize: 16,
              color: '#F8FAFC',
              marginBottom: 8,
            }}
          >
            Heatmap Unavailable
          </h3>

          <p
            style={{
              fontSize: 13,
              color: '#94A3B8',
              marginBottom: 16,
            }}
          >
            {error}
          </p>

          <button
            onClick={() => loadHeatmap(timeframe)}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* Heatmap Data */}
      {data && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Sector Groups Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 20,
            }}
          >
            {data.sectors.map((sectorGroup: HeatmapSector) => {
              const isGroupUp = sectorGroup.mean_return_pct >= 0;

              return (
                <div
                  key={sectorGroup.sector}
                  className="terminal-card"
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Sector Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: '1px solid #1C2740',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Layers
                        size={14}
                        style={{ color: '#38BDF8' }}
                      />

                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#F8FAFC',
                        }}
                      >
                        {sectorGroup.sector}
                      </span>

                      <span
                        style={{
                          fontSize: 11,
                          color: '#64748B',
                        }}
                      >
                        ({sectorGroup.stocks_count} stocks)
                      </span>
                    </div>

                    <span
                      className={isGroupUp ? 'badge-gain' : 'badge-loss'}
                      style={{ fontSize: 12 }}
                    >
                      {isGroupUp ? '+' : ''}
                      {sectorGroup.mean_return_pct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Stock Tiles Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(105px, 1fr))',
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    {sectorGroup.stocks.map((stock: HeatmapStock) => {
                      const isUp = stock.change_pct >= 0;

                      return (
                        <div
                          key={stock.symbol}
                          className="heatmap-tile"
                          onClick={() =>
                            navigate(
                              `/stocks/${encodeURIComponent(stock.symbol)}`
                            )
                          }
                          style={{
                            backgroundColor: getTileBackground(
                              stock.change_pct
                            ),
                            border: `1px solid ${getTileBorder(
                              stock.change_pct
                            )}`,
                            minHeight: 74,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 12,
                                color: '#F8FAFC',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {stock.symbol.split('.')[0]}
                            </span>

                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                color: '#94A3B8',
                              }}
                            >
                              ₹{stock.latest_close.toFixed(0)}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginTop: 8,
                            }}
                          >
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: isUp ? '#34D399' : '#FB7185',
                              }}
                            >
                              {isUp ? '+' : ''}
                              {stock.change_pct.toFixed(2)}%
                            </span>

                            {stock.relative_volume &&
                              stock.relative_volume >= 2.0 && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: '#FBBF24',
                                    fontWeight: 700,
                                  }}
                                >
                                  {stock.relative_volume.toFixed(1)}x
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Scale Legend */}
          <div
            className="terminal-card"
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#64748B',
              }}
            >
              Color Scale represents{' '}
              {timeframe === '1D'
                ? 'daily'
                : timeframe === '5D'
                  ? '5-trading-day'
                  : '1-month (21-trading-day)'}{' '}
              percentage return intensity:
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ color: '#FB7185' }}>-4.0%</span>

              <div
                style={{
                  width: 140,
                  height: 10,
                  borderRadius: 4,
                  background:
                    'linear-gradient(to right, rgba(244,63,94,0.6), rgba(148,163,184,0.2), rgba(16,185,129,0.6))',
                }}
              />

              <span style={{ color: '#34D399' }}>+4.0%</span>
            </div>

            <div
              style={{
                fontSize: 11,
                color: '#64748B',
              }}
            >
              Click any tile to open individual technical analytics & candlestick chart
            </div>
          </div>
        </div>
      )}
    </div>
  );
};