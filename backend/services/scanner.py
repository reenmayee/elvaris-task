from typing import List, Optional, Tuple
from schemas import StockQuote

class ScannerService:
    @staticmethod
    def filter_and_sort_stocks(
        stocks: List[StockQuote],
        search: Optional[str] = None,
        sector: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_change_pct: Optional[float] = None,
        max_change_pct: Optional[float] = None,
        min_volume: Optional[int] = None,
        min_relative_volume: Optional[float] = None,
        max_relative_volume: Optional[float] = None,
        min_volatility: Optional[float] = None,
        max_volatility: Optional[float] = None,
        sort_by: str = "change_pct",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 25
    ) -> Tuple[List[StockQuote], int]:
        """
        Filters and sorts stock quotes dynamically with pagination.
        All filters apply conjunctively (AND).
        """
        filtered = stocks

        # 1. Text search on symbol or company name
        if search:
            q = search.lower().strip()
            filtered = [
                s for s in filtered
                if q in s.symbol.lower() or q in s.company_name.lower()
            ]

        # 2. Sector filter
        if sector and sector.lower() != "all":
            filtered = [s for s in filtered if s.sector.lower() == sector.lower()]

        # 3. Price range
        if min_price is not None:
            filtered = [s for s in filtered if s.latest_close is not None and s.latest_close >= min_price]
        if max_price is not None:
            filtered = [s for s in filtered if s.latest_close is not None and s.latest_close <= max_price]

        # 4. Change % range
        if min_change_pct is not None:
            filtered = [s for s in filtered if s.change_pct is not None and s.change_pct >= min_change_pct]
        if max_change_pct is not None:
            filtered = [s for s in filtered if s.change_pct is not None and s.change_pct <= max_change_pct]

        # 5. Volume minimum
        if min_volume is not None:
            filtered = [s for s in filtered if s.volume is not None and s.volume >= min_volume]

        # 6. Relative Volume range
        if min_relative_volume is not None:
            filtered = [s for s in filtered if s.relative_volume is not None and s.relative_volume >= min_relative_volume]
        if max_relative_volume is not None:
            filtered = [s for s in filtered if s.relative_volume is not None and s.relative_volume <= max_relative_volume]

        # 7. Volatility range (Annualized)
        if min_volatility is not None:
            filtered = [s for s in filtered if s.realized_volatility_annualized is not None and s.realized_volatility_annualized >= min_volatility]
        if max_volatility is not None:
            filtered = [s for s in filtered if s.realized_volatility_annualized is not None and s.realized_volatility_annualized <= max_volatility]

        # Sort
        reverse = (sort_order.lower() == "desc")
        
        def sort_key(item: StockQuote):
            val = getattr(item, sort_by, None)
            if val is None:
                return float("-inf") if reverse else float("inf")
            return val

        try:
            filtered.sort(key=sort_key, reverse=reverse)
        except Exception:
            # Fallback sort by symbol
            filtered.sort(key=lambda s: s.symbol)

        total_matches = len(filtered)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        paginated = filtered[start_idx:end_idx]
        return paginated, total_matches

scanner_service = ScannerService()
