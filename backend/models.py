from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True, default="")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(30), nullable=False, index=True)
    added_at = Column(DateTime, default=utc_now)

    watchlist = relationship("Watchlist", back_populates="items")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(30), nullable=False, index=True)
    rule_type = Column(String(50), nullable=False)  # PRICE_CHANGE_PCT_ABOVE, PRICE_CHANGE_PCT_BELOW, REL_VOLUME_ABOVE, VOLATILITY_ABOVE
    threshold = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    last_evaluated_at = Column(DateTime, nullable=True)

    notifications = relationship("AlertNotification", back_populates="rule", cascade="all, delete-orphan")


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(30), nullable=False, index=True)
    rule_type = Column(String(50), nullable=False)
    observed_value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    message = Column(String(500), nullable=False)
    triggered_at = Column(DateTime, default=utc_now)
    is_read = Column(Boolean, default=False)

    rule = relationship("AlertRule", back_populates="notifications")
