
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
} from 'lightweight-charts';
import { OHLCVCandle } from '../types';

interface CandlestickChartProps {
  candles: OHLCVCandle[];
  symbol: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  symbol,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !candles || candles.length === 0) return;

    const sortedCandles = Array.from(
      new Map(candles.map(c => [c.date, c])).values()
    ).sort((a, b) => a.date.localeCompare(b.date));

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: '#0E1424' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(28, 39, 64, 0.4)' },
        horzLines: { color: 'rgba(28, 39, 64, 0.4)' },
      },
      rightPriceScale: {
        borderColor: '#1C2740',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#1C2740',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
    });

    candleSeries.setData(
      sortedCandles.map(c => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });

    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      sortedCandles.map(c => ({
        time: c.date,
        value: c.volume,
        color:
          c.close >= c.open
            ? 'rgba(16, 185, 129, 0.35)'
            : 'rgba(244, 63, 94, 0.35)',
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (container && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: container.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [candles, symbol]);

  if (!candles || candles.length === 0) {
    return (
      <div
        style={{
          height: 420,
          backgroundColor: '#0E1424',
          borderRadius: 8,
          border: '1px solid #1C2740',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          fontSize: 13,
        }}
      >
        No valid historical candlestick data available to display for {symbol}.
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1C2740',
      }}
    >
      <div ref={chartContainerRef} style={{ width: '100%', height: 420 }} />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(14, 20, 36, 0.85)',
          backdropFilter: 'blur(4px)',
          padding: '4px 10px',
          borderRadius: 4,
          border: '1px solid #1C2740',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: '#94A3B8',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{symbol}</span>
        <span>•</span>
        <span>Historical Daily OHLCV</span>
        <span>•</span>
        <span style={{ color: '#38BDF8' }}>TradingView Engine</span>
      </div>
    </div>
  );
};
