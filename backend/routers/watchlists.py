from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Watchlist, WatchlistItem
from schemas import (
    WatchlistCreate, WatchlistUpdate, WatchlistResponse,
    AddWatchlistItemRequest, WatchlistItemResponse
)
from services.market_data import market_data_service, get_stock_meta
from services.analytics import calculate_stock_quote

router = APIRouter(prefix="/api/watchlists", tags=["Watchlists"])

def _populate_item_quote(item: WatchlistItem) -> WatchlistItemResponse:
    sym = item.symbol.upper().strip()
    df = market_data_service.get_universe_data().get(sym)
    if df is None:
        df = market_data_service.get_stock_history(sym, period="1mo", interval="1d")
    quote = calculate_stock_quote(sym, df) if df is not None else None

    return WatchlistItemResponse(
        id=item.id,
        watchlist_id=item.watchlist_id,
        symbol=item.symbol,
        added_at=item.added_at,
        quote=quote
    )

def _build_watchlist_response(wl: Watchlist) -> WatchlistResponse:
    items = [_populate_item_quote(item) for item in wl.items]
    return WatchlistResponse(
        id=wl.id,
        name=wl.name,
        description=wl.description,
        created_at=wl.created_at,
        updated_at=wl.updated_at,
        items=items
    )

@router.get("", response_model=List[WatchlistResponse])
def get_all_watchlists(db: Session = Depends(get_db)):
    """Retrieves all persistent watchlists with current quotes."""
    watchlists = db.query(Watchlist).order_by(Watchlist.created_at.asc()).all()
    # If no watchlists exist, create a default "Core Watchlist" for convenience
    if not watchlists:
        default_wl = Watchlist(name="Primary Focus", description="Key Indian equities under active watch")
        db.add(default_wl)
        db.commit()
        db.refresh(default_wl)

        # Seed with 3 default items
        for sym in ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]:
            item = WatchlistItem(watchlist_id=default_wl.id, symbol=sym)
            db.add(item)
        db.commit()
        db.refresh(default_wl)
        watchlists = [default_wl]

    return [_build_watchlist_response(wl) for wl in watchlists]

@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def create_watchlist(payload: WatchlistCreate, db: Session = Depends(get_db)):
    """Creates a new persistent watchlist."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Watchlist name cannot be empty.")

    wl = Watchlist(name=name, description=payload.description or "")
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return _build_watchlist_response(wl)

@router.get("/{watchlist_id}", response_model=WatchlistResponse)
def get_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")
    return _build_watchlist_response(wl)

@router.patch("/{watchlist_id}", response_model=WatchlistResponse)
def update_watchlist(watchlist_id: int, payload: WatchlistUpdate, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    if payload.name is not None:
        trimmed = payload.name.strip()
        if not trimmed:
            raise HTTPException(status_code=400, detail="Watchlist name cannot be empty.")
        wl.name = trimmed

    if payload.description is not None:
        wl.description = payload.description

    db.commit()
    db.refresh(wl)
    return _build_watchlist_response(wl)

@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")
    db.delete(wl)
    db.commit()
    return None

@router.post("/{watchlist_id}/items", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_item_to_watchlist(
    watchlist_id: int,
    payload: AddWatchlistItemRequest,
    db: Session = Depends(get_db)
):
    wl = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    sym = payload.symbol.upper().strip()
    if not sym.endswith(".NS") and not sym.startswith("^"):
        sym = f"{sym}.NS"

    # Check if duplicate
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.watchlist_id == watchlist_id,
        WatchlistItem.symbol == sym
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Stock '{sym}' is already in this watchlist.")

    # Validate ticker
    meta = get_stock_meta(sym)
    if not meta:
        # Check if provider can retrieve it
        df = market_data_service.get_stock_history(sym, period="5d")
        if df is None or df.empty:
            raise HTTPException(status_code=400, detail=f"Symbol '{sym}' is not a valid recognized NSE ticker.")

    item = WatchlistItem(watchlist_id=watchlist_id, symbol=sym)
    db.add(item)
    db.commit()
    db.refresh(wl)
    return _build_watchlist_response(wl)

@router.delete("/{watchlist_id}/items/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item_from_watchlist(
    watchlist_id: int,
    symbol: str,
    db: Session = Depends(get_db)
):
    sym = symbol.upper().strip()
    item = db.query(WatchlistItem).filter(
        WatchlistItem.watchlist_id == watchlist_id,
        WatchlistItem.symbol == sym
    ).first()
    if not item:
        # Check without suffix
        if not sym.endswith(".NS"):
            item = db.query(WatchlistItem).filter(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.symbol == f"{sym}.NS"
            ).first()

    if not item:
        raise HTTPException(status_code=404, detail=f"Stock '{symbol}' not found in watchlist.")

    db.delete(item)
    db.commit()
    return None
