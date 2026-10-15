import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
import yfinance as yf

logger = logging.getLogger("market_terminal.market_data")

# Configurable NSE Equities Universe
STOCK_UNIVERSE: List[Dict[str, str]] = [
    # Financial Services
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd.", "sector": "Financial Services"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd.", "sector": "Financial Services"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Financial Services"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Ltd.", "sector": "Financial Services"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd.", "sector": "Financial Services"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd.", "sector": "Financial Services"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv Ltd.", "sector": "Financial Services"},
    # Information Technology
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd.", "sector": "Information Technology"},
    {"symbol": "INFY.NS", "name": "Infosys Ltd.", "sector": "Information Technology"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies Ltd.", "sector": "Information Technology"},
    {"symbol": "WIPRO.NS", "name": "Wipro Ltd.", "sector": "Information Technology"},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra Ltd.", "sector": "Information Technology"},
    {"symbol": "LTIM.NS", "name": "LTIMindtree Ltd.", "sector": "Information Technology"},
    # Energy, Oil & Gas
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd.", "sector": "Energy"},
    {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corp Ltd.", "sector": "Energy"},
    {"symbol": "BPCL.NS", "name": "Bharat Petroleum Corp Ltd.", "sector": "Energy"},
    {"symbol": "COALINDIA.NS", "name": "Coal India Ltd.", "sector": "Energy"},
    {"symbol": "IOC.NS", "name": "Indian Oil Corp Ltd.", "sector": "Energy"},
    # Utilities & Power
    {"symbol": "NTPC.NS", "name": "NTPC Ltd.", "sector": "Utilities"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corp of India Ltd.", "sector": "Utilities"},
    # Automobile
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra Ltd.", "sector": "Automobile"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Ltd.", "sector": "Automobile"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto Ltd.", "sector": "Automobile"},
    {"symbol": "EICHERMOT.NS", "name": "Eicher Motors Ltd.", "sector": "Automobile"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp Ltd.", "sector": "Automobile"},
    {"symbol": "TVSMOTOR.NS", "name": "TVS Motor Company Ltd.", "sector": "Automobile"},
    # FMCG
    {"symbol": "ITC.NS", "name": "ITC Ltd.", "sector": "Consumer Goods"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd.", "sector": "Consumer Goods"},
    {"symbol": "NESTLEIND.NS", "name": "Nestle India Ltd.", "sector": "Consumer Goods"},
    {"symbol": "BRITANNIA.NS", "name": "Britannia Industries Ltd.", "sector": "Consumer Goods"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer Products Ltd.", "sector": "Consumer Goods"},
    {"symbol": "DABUR.NS", "name": "Dabur India Ltd.", "sector": "Consumer Goods"},
    # Healthcare & Pharma
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries Ltd.", "sector": "Healthcare"},
    {"symbol": "CIPLA.NS", "name": "Cipla Ltd.", "sector": "Healthcare"},
    {"symbol": "DRREDDY.NS", "name": "Dr. Reddy's Laboratories Ltd.", "sector": "Healthcare"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals Enterprise Ltd.", "sector": "Healthcare"},
    {"symbol": "DIVISLAB.NS", "name": "Divi's Laboratories Ltd.", "sector": "Healthcare"},
    # Metals & Mining
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel Ltd.", "sector": "Metals & Mining"},
    {"symbol": "JSWSTEEL.NS", "name": "JSW Steel Ltd.", "sector": "Metals & Mining"},
    {"symbol": "HINDALCO.NS", "name": "Hindalco Industries Ltd.", "sector": "Metals & Mining"},
    {"symbol": "VEDL.NS", "name": "Vedanta Ltd.", "sector": "Metals & Mining"},
    # Capital Goods & Infrastructure
    {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd.", "sector": "Capital Goods"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises Ltd.", "sector": "Capital Goods"},
    {"symbol": "ADANIPORTS.NS", "name": "Adani Ports & SEZ Ltd.", "sector": "Capital Goods"},
    {"symbol": "BEL.NS", "name": "Bharat Electronics Ltd.", "sector": "Capital Goods"},
    {"symbol": "HAL.NS", "name": "Hindustan Aeronautics Ltd.", "sector": "Capital Goods"},
    {"symbol": "SIEMENS.NS", "name": "Siemens Ltd.", "sector": "Capital Goods"},
    # Telecommunication
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd.", "sector": "Telecommunication"},
    # Consumer Discretionary & Retail
    {"symbol": "TITAN.NS", "name": "Titan Company Ltd.", "sector": "Consumer Discretionary"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd.", "sector": "Consumer Discretionary"},
    {"symbol": "TRENT.NS", "name": "Trent Ltd.", "sector": "Consumer Discretionary"},
    {"symbol": "ZOMATO.NS", "name": "Zomato Ltd.", "sector": "Consumer Discretionary"},
]

INDEX_UNIVERSE: List[Dict[str, str]] = [
    {"symbol": "^NSEI", "name": "NIFTY 50", "sector": "Benchmark Index"},
    {"symbol": "^NSEBANK", "name": "NIFTY Bank", "sector": "Sectoral Index"},
]

STOCK_MAP = {s["symbol"]: s for s in STOCK_UNIVERSE}
INDEX_MAP = {i["symbol"]: i for i in INDEX_UNIVERSE}

def get_stock_meta(symbol: str) -> Optional[Dict[str, str]]:
    sym = symbol.upper().strip()
    if sym in STOCK_MAP:
        return STOCK_MAP[sym]
    if sym in INDEX_MAP:
        return INDEX_MAP[sym]
    # Check without suffix
    for k, v in STOCK_MAP.items():
        if k.split(".")[0] == sym:
            return v
    return None

class MarketDataService:
    def __init__(self, cache_ttl_seconds: int = 900):
        self.cache_ttl_seconds = cache_ttl_seconds
        self._universe_history_cache: Dict[str, pd.DataFrame] = {}
        self._universe_cache_timestamp: Optional[float] = None
        self._index_history_cache: Dict[str, pd.DataFrame] = {}
        self._index_cache_timestamp: Optional[float] = None
        self._single_stock_cache: Dict[str, Tuple[float, pd.DataFrame]] = {}
        self._last_successful_update: Optional[str] = None
        self._is_fetching: bool = False

    def validate_ohlcv_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Validates OHLCV dataframe integrity:
        - Ensures required columns exist
        - Filters out non-positive prices and negative volumes
        - Ensures High >= Low, High >= Open, High >= Close, Low <= Open, Low <= Close
        - Drops NaN rows
        """
        if df is None or df.empty:
            return pd.DataFrame()

        # Normalize column names
        cols = {c: c.capitalize() for c in df.columns}
        df = df.rename(columns=cols)

        required = ["Open", "High", "Low", "Close", "Volume"]
        for col in required:
            if col not in df.columns:
                return pd.DataFrame()

        df = df[required].copy()
        df = df.dropna()

        if df.empty:
            return pd.DataFrame()

        # Coerce to numeric
        for col in required:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df = df.dropna()

        # Mathematical constraints validation
        valid_mask = (
            (df["Open"] > 0) &
            (df["High"] > 0) &
            (df["Low"] > 0) &
            (df["Close"] > 0) &
            (df["Volume"] >= 0) &
            (df["High"] >= df["Low"]) &
            (df["High"] >= df["Open"] * 0.999) & # Allow tiny floating precision
            (df["High"] >= df["Close"] * 0.999) &
            (df["Low"] <= df["Open"] * 1.001) &
            (df["Low"] <= df["Close"] * 1.001)
        )
        return df[valid_mask].sort_index()

    def get_indices(self, force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
        now = time.time()
        if (not force_refresh and 
            self._index_cache_timestamp is not None and 
            (now - self._index_cache_timestamp) < self.cache_ttl_seconds and
            self._index_history_cache):
            return self._index_history_cache

        symbols = [idx["symbol"] for idx in INDEX_UNIVERSE]
        try:
            downloaded = yf.download(
                symbols,
                period="1mo",
                interval="1d",
                group_by="ticker",
                threads=True,
                progress=False,
                auto_adjust=False
            )
            parsed: Dict[str, pd.DataFrame] = {}
            for sym in symbols:
                try:
                    if len(symbols) == 1:
                        df = downloaded
                    else:
                        df = downloaded[sym]
                    validated = self.validate_ohlcv_dataframe(df)
                    if not validated.empty:
                        parsed[sym] = validated
                except Exception as ex:
                    logger.warning(f"Error parsing index {sym}: {ex}")

            if parsed:
                self._index_history_cache = parsed
                self._index_cache_timestamp = now
        except Exception as e:
            logger.error(f"Failed to download market indices: {e}")

        return self._index_history_cache

    def get_universe_data(self, force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
        """
        Retrieves historical daily data (1mo period) for all stocks in the universe.
        Cached in memory to reduce provider load and respect rate limits.
        """
        now = time.time()
        if (not force_refresh and 
            self._universe_cache_timestamp is not None and 
            (now - self._universe_cache_timestamp) < self.cache_ttl_seconds and
            self._universe_history_cache):
            return self._universe_history_cache

        symbols = [s["symbol"] for s in STOCK_UNIVERSE]
        try:
            logger.info(f"Fetching fresh data for {len(symbols)} universe tickers...")
            # Use yf.download with multi-threading
            downloaded = yf.download(
                symbols,
                period="2mo", # Fetch 2 months to ensure 20+ trading sessions for baseline
                interval="1d",
                group_by="ticker",
                threads=True,
                progress=False,
                auto_adjust=False
            )

            result: Dict[str, pd.DataFrame] = {}
            for s in STOCK_UNIVERSE:
                sym = s["symbol"]
                try:
                    if sym in downloaded.columns.levels[0]:
                        df = downloaded[sym]
                        val = self.validate_ohlcv_dataframe(df)
                        if not val.empty and len(val) >= 2:
                            result[sym] = val
                except Exception as ex:
                    logger.debug(f"Could not parse ticker {sym}: {ex}")

            if result:
                self._universe_history_cache = result
                self._universe_cache_timestamp = now
                self._last_successful_update = datetime.now(timezone.utc).isoformat()
                logger.info(f"Successfully cached data for {len(result)} valid tickers.")
            else:
                logger.warning("Download returned 0 valid tickers. Retaining previous cache if available.")

        except Exception as e:
            logger.error(f"Error downloading universe data from provider: {e}")

        return self._universe_history_cache

    def get_stock_history(
        self,
        symbol: str,
        period: str = "6mo",
        interval: str = "1d",
        force_refresh: bool = False
    ) -> Optional[pd.DataFrame]:
        """
        Fetches historical OHLCV data for an individual stock.
        Supported periods: 1mo, 3mo, 6mo, 1y, 2y.
        """
        cache_key = f"{symbol.upper()}_{period}_{interval}"
        now = time.time()

        if not force_refresh and cache_key in self._single_stock_cache:
            ts, df = self._single_stock_cache[cache_key]
            if (now - ts) < self.cache_ttl_seconds:
                return df

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            validated = self.validate_ohlcv_dataframe(df)
            if not validated.empty:
                self._single_stock_cache[cache_key] = (now, validated)
                return validated
        except Exception as e:
            logger.error(f"Error retrieving history for {symbol} ({period}, {interval}): {e}")

        # Check if we have data in universe cache as fallback
        if symbol.upper() in self._universe_history_cache:
            return self._universe_history_cache[symbol.upper()]

        return None

    def get_last_update_info(self) -> Dict[str, Any]:
        return {
            "last_successful_update": self._last_successful_update or datetime.now(timezone.utc).isoformat(),
            "cached_universe_count": len(self._universe_history_cache),
            "cache_ttl_seconds": self.cache_ttl_seconds,
            "provider": "Yahoo Finance (Historical Daily Data)",
            "data_mode": "Historical / Delayed"
        }

# Singleton instance
market_data_service = MarketDataService()
