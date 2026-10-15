# Elvaris Capital — Market Intelligence Terminal

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy_2.0-003B57.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey.svg)]()

Institutional-grade quantitative market intelligence terminal focused on National Stock Exchange of India (NSE) listed equities.

## Live Dashboard

You can view the interactive stock analytics dashboard here: **[View Live Dashboard](https://elvaris-task.vercel.app/)**

---

## 1. Executive Summary & Objective

**Elvaris Capital Market Intelligence Terminal** is a high-performance web application designed for financial market surveillance and quantitative equity analysis. It provides institutional analysts and investors with deep market transparency across a curated universe of ~50 liquid NSE-listed equities and benchmark indices (`NIFTY 50` and `NIFTY Bank`).

### Core Capabilities:
- **Macro Market Surveillance**: Real-time snapshot of benchmark index changes, day high/lows, and market breadth.
- **Market Breadth Matrix**: Advance/Decline ratio, percentage of advancing vs. declining stocks, and breadth momentum.
- **Equal-Weighted Sector Heatmap**: Visual matrix of constituent performance grouped by sector with dynamic return-scaled color intensity.
- **Multi-Factor Stock Scanner**: Searchable and sortable screener filtering by sector, price range, daily return, trading volume, 20-day relative volume (RVOL), and annualized realized volatility.
- **Technical Equity Analysis**: Dedicated stock views featuring TradingView Lightweight Candlestick and volume histogram charts, 1W to 1Y multi-period return statistics, and 52-week price range channels.
- **Persistent Database Watchlists**: SQLite-backed portfolios supporting watchlist creation, renaming, ticker management, and live holdings valuation.
- **Parametric Surveillance Alerts**: Configurable surveillance rules for price breakouts, volume spikes, and volatility expansion, complete with deterministic evaluation and a deduplicated notification audit log.

*Disclaimer: This platform is strictly an analytics and intelligence terminal. It does NOT generate automated trading recommendations or promise future returns.*

---

## 2. Architecture & Technology Stack

```
                          ┌────────────────────────────────┐
                          │     React + TypeScript UI      │
                          │ (Vite 5, Lightweight Charts)   │
                          └──────────────┬─────────────────┘
                                         │ REST API / JSON
                                         ▼
                          ┌────────────────────────────────┐
                          │       FastAPI REST Engine      │
                          │   (Pydantic, Uvicorn, Pandas)  │
                          └───────┬────────────────┬───────┘
                                  │                │
            In-Memory / TTL Cache │                │ SQLAlchemy 2.0 ORM
                                  ▼                ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │  Yahoo Finance   │    │  SQLite Database │
                     │  Market Adapter  │    │  (Watchlists &   │
                     │  (yfinance NSE)  │    │   Alert Rules)   │
                     └──────────────────┘    └──────────────────┘
```

### Frontend:
- **Framework**: React 19, TypeScript
- **Bundler**: Vite 5
- **Styling**: Vanilla CSS Design System with dark institutional palette, glassmorphism, tabular monospace typography, and responsive grid layouts
- **Charts**: TradingView Lightweight Charts (Candlestick & Volume Histograms)
- **Icons**: Lucide React
- **Routing**: React Router v7

### Backend:
- **Framework**: FastAPI (Python 3.12)
- **ASGI Server**: Uvicorn
- **Data Engine**: Pandas & NumPy for mathematical and quantitative computations
- **Data Adapter**: `yfinance` adapter for NSE historical OHLCV data
- **ORM & Database**: SQLAlchemy 2.0 with SQLite (`market_terminal.db`)
- **Validation**: Pydantic v2 request/response schemas

---

## 3. Project Directory Structure

```
elvaris-market-terminal/
├── backend/
│   ├── main.py                     # FastAPI server initialization, CORS, lifespan pre-warming
│   ├── database.py                 # SQLite engine & SQLAlchemy session factory
│   ├── models.py                   # Watchlist, WatchlistItem, AlertRule, AlertNotification ORM models
│   ├── schemas.py                  # Pydantic v2 schemas for all API payloads
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Backend configuration template
│   ├── services/
│   │   ├── market_data.py          # Stock universe definition, yfinance adapter, OHLCV validation & cache
│   │   ├── analytics.py           # Quantitative metrics: RVOL, Volatility, Gap, Breadth, Sector means
│   │   ├── scanner.py             # Multi-factor filtering, sorting, and pagination engine
│   │   └── alerts.py              # Surveillance rule evaluation & notification deduplication
│   ├── routers/
│   │   ├── market.py              # Overview, indices, breadth, heatmap, sectors endpoints
│   │   ├── stocks.py              # Scanner, stock quote, OHLCV history, analytics endpoints
│   │   ├── watchlists.py          # Persistent watchlist CRUD endpoints
│   │   └── alerts.py              # Alert rules & evaluation endpoints
│   └── tests/
│       ├── test_analytics.py       # Unit tests for quantitative financial calculations
│       ├── test_api.py             # Integration tests for FastAPI endpoints
│       └── verify_e2e.py           # End-to-end HTTP verification script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Fixed navigation sidebar with terminal engine status
│   │   │   ├── TopNav.tsx          # Symbol search, breadth ticker, status indicator
│   │   │   ├── CandlestickChart.tsx# TradingView Lightweight Charts integration
│   │   │   └── MetricTooltip.tsx   # Plain-English definition tooltips for financial metrics
│   │   ├── pages/
│   │   │   ├── MarketOverview.tsx  # Benchmark index cards, breadth meter, movers, sectors
│   │   │   ├── MarketHeatmap.tsx   # Sector performance matrix with return-scaled tiles
│   │   │   ├── StockScanner.tsx    # Multi-field filter console, presets, sortable table
│   │   │   ├── StockDetails.tsx    # Candlestick chart, timeframe picker, quantitative signals
│   │   │   ├── Watchlists.tsx      # Persistent watchlist manager (create, rename, add, delete)
│   │   │   └── AlertsCenter.tsx    # Surveillance rules, evaluate action, audit notification log
│   │   ├── services/
│   │   │   └── api.ts              # Centralized typed API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx                 # Root router and global state layout
│   │   ├── main.tsx                # React DOM mount point
│   │   └── index.css               # Terminal design system & color tokens
│   ├── package.json
│   ├── vite.config.ts              # Vite configuration with backend API proxy
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 4. Quickstart: Installation & Execution

### Prerequisites:
- Python 3.10+ (Tested on Python 3.12.6)
- Node.js 18+ (Tested on Node.js v20.17.0)
- npm 9+

### Step 1: Clone or Navigate to Directory
```bash
cd d:\Downloads\mvp
```

### Step 2: Set Up & Start Backend
```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend automatically initializes `market_terminal.db` and pre-warms the universe cache on boot.*

### Step 3: Set Up & Start Frontend
Open a second terminal window:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite dev server on port 5173
npm run dev -- --host 127.0.0.1 --port 5173
```

### Step 4: Open in Browser
- **Terminal Web Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **FastAPI Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **FastAPI Health Endpoint**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 5. Quantitative Analytics & Formulas

All mathematical definitions are documented and implemented with division-by-zero guards:

| Metric | Mathematical Definition | Financial Interpretation |
|---|---|---|
| **Daily Return (%)** | $\frac{\text{Close}_t - \text{Close}_{t-1}}{\text{Close}_{t-1}} \times 100$ | Single-session price change versus prior trading session. |
| **Price Gap (%)** | $\frac{\text{Open}_t - \text{Close}_{t-1}}{\text{Close}_{t-1}} \times 100$ | Measures pre-market overnight order imbalance. Flagged when $\ge 2.0\%$. |
| **Relative Volume (RVOL)** | $\frac{\text{Volume}_t}{\frac{1}{20}\sum_{i=1}^{20} \text{Volume}_{t-i}}$ | Current session volume relative to 20-day historical baseline (current day excluded). $\text{RVOL} \ge 2.0\text{x}$ signals unusual institutional accumulation/distribution. |
| **Realized Volatility (Daily)** | $\sqrt{\frac{1}{N-1}\sum_{i=1}^{N}(r_i - \bar{r})^2} \times 100$ | Sample standard deviation of daily close-to-close returns over 20 trailing sessions. |
| **Realized Volatility (Annualized)** | $\text{Daily Volatility} \times \sqrt{252}$ | Annualized price volatility scaled by standard 252 Indian equity trading sessions per year. |
| **Advance / Decline Ratio** | $\frac{\text{Count}(\text{Advances})}{\text{Count}(\text{Declines})}$ | Broad market breadth participation. Values $> 1.0$ indicate broad bullish breadth. |
| **Sector Return Aggregation** | $\frac{1}{K}\sum_{k=1}^{K} r_k$ | Unweighted arithmetic mean of mapped constituent returns. (Clearly labeled as non-exchange constituent average). |

---

## 6. Real Market Data Provider & Limitations

- **Provider**: Historical and end-of-day daily market data is sourced via `yfinance` from public NSE equity listings.
- **Cache Architecture**: The server caches batch downloads in-memory with a configurable TTL (default: 900 seconds / 15 minutes). This prevents provider rate-limiting and ensures sub-millisecond response times for frontend users.
- **Data Delay**: Data corresponds to official exchange daily close and end-of-day candles. It is explicitly labeled throughout the application as **`HISTORICAL / DELAYED (NSE EOD)`**.
- **Delisted / Inactive Handling**: Symbols undergoing corporate restructuring or corporate name changes are filtered gracefully; individual ticker fetch errors never crash the universe cache or overview dashboards.

---

## 7. Automated Testing Suite

The repository includes comprehensive automated tests covering calculations, REST endpoints, and database operations.

### Run Backend Unit & Integration Tests:
```bash
pytest backend/tests/ -v
```
**Results**:
- `test_analytics.py`: 7 passed (Positive/negative returns, RVOL baseline, Price gap, Annualized volatility, Division-by-zero protection, Breadth calculation, Sector aggregation).
- `test_api.py`: 4 passed (Health check, 404 handling, Watchlist CRUD lifecycle, Alert creation & surveillance evaluation).
- **Total**: 11 passed (100% pass rate).

### Run End-to-End Live System Verification:
```bash
python backend/tests/verify_e2e.py
```
**Results**: 100% of frontend HTTP endpoints, backend REST routers, SQLite persistence, and alert surveillance evaluations verified.

### Run Frontend Production Build:
```bash
cd frontend
npm run build
```
**Results**: TypeScript compilation and Vite minified bundling completed with 0 errors.
