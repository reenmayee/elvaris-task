from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import AlertRule, AlertNotification
from schemas import (
    AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse,
    AlertNotificationResponse, AlertEvaluationResult
)
from services.market_data import market_data_service, get_stock_meta
from services.analytics import calculate_stock_quote
from services.alerts import alert_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts Center"])

VALID_RULE_TYPES = {
    "PRICE_CHANGE_PCT_ABOVE",
    "PRICE_CHANGE_PCT_BELOW",
    "REL_VOLUME_ABOVE",
    "VOLATILITY_ABOVE"
}

@router.get("", response_model=List[AlertRuleResponse])
def get_alerts(db: Session = Depends(get_db)):
    """Retrieves all configured alert rules and recent notifications."""
    rules = db.query(AlertRule).order_by(AlertRule.created_at.desc()).all()
    # Seed default alerts if empty
    if not rules:
        seeds = [
            AlertRule(symbol="RELIANCE.NS", rule_type="REL_VOLUME_ABOVE", threshold=2.0, is_active=True),
            AlertRule(symbol="TCS.NS", rule_type="PRICE_CHANGE_PCT_ABOVE", threshold=2.5, is_active=True),
            AlertRule(symbol="HDFCBANK.NS", rule_type="VOLATILITY_ABOVE", threshold=25.0, is_active=True),
        ]
        db.add_all(seeds)
        db.commit()
        rules = db.query(AlertRule).order_by(AlertRule.created_at.desc()).all()

    results = []
    for r in rules:
        notifs = db.query(AlertNotification).filter(
            AlertNotification.alert_id == r.id
        ).order_by(AlertNotification.triggered_at.desc()).limit(5).all()
        
        results.append(AlertRuleResponse(
            id=r.id,
            symbol=r.symbol,
            rule_type=r.rule_type,
            threshold=r.threshold,
            is_active=r.is_active,
            created_at=r.created_at,
            last_evaluated_at=r.last_evaluated_at,
            recent_notifications=[AlertNotificationResponse.model_validate(n) for n in notifs]
        ))
    return results

@router.post("", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
def create_alert(payload: AlertRuleCreate, db: Session = Depends(get_db)):
    """Creates a new rule for price change, volume anomaly, or volatility surge."""
    sym = payload.symbol.upper().strip()
    if not sym.endswith(".NS") and not sym.startswith("^"):
        sym = f"{sym}.NS"

    if payload.rule_type not in VALID_RULE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid rule_type '{payload.rule_type}'. Supported: {', '.join(sorted(VALID_RULE_TYPES))}"
        )

    # Validate ticker
    meta = get_stock_meta(sym)
    if not meta:
        df = market_data_service.get_stock_history(sym, period="5d")
        if df is None or df.empty:
            raise HTTPException(status_code=400, detail=f"Stock symbol '{sym}' is not recognized.")

    rule = AlertRule(
        symbol=sym,
        rule_type=payload.rule_type,
        threshold=payload.threshold,
        is_active=payload.is_active
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return AlertRuleResponse(
        id=rule.id,
        symbol=rule.symbol,
        rule_type=rule.rule_type,
        threshold=rule.threshold,
        is_active=rule.is_active,
        created_at=rule.created_at,
        last_evaluated_at=rule.last_evaluated_at,
        recent_notifications=[]
    )

@router.patch("/{alert_id}", response_model=AlertRuleResponse)
def update_alert(alert_id: int, payload: AlertRuleUpdate, db: Session = Depends(get_db)):
    """Enables/disables or updates threshold for an alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.id == alert_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found.")

    if payload.is_active is not None:
        rule.is_active = payload.is_active
    if payload.threshold is not None:
        rule.threshold = payload.threshold

    db.commit()
    db.refresh(rule)

    notifs = db.query(AlertNotification).filter(
        AlertNotification.alert_id == rule.id
    ).order_by(AlertNotification.triggered_at.desc()).limit(5).all()

    return AlertRuleResponse(
        id=rule.id,
        symbol=rule.symbol,
        rule_type=rule.rule_type,
        threshold=rule.threshold,
        is_active=rule.is_active,
        created_at=rule.created_at,
        last_evaluated_at=rule.last_evaluated_at,
        recent_notifications=[AlertNotificationResponse.model_validate(n) for n in notifs]
    )

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    rule = db.query(AlertRule).filter(AlertRule.id == alert_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found.")
    db.delete(rule)
    db.commit()
    return None

@router.get("/notifications", response_model=List[AlertNotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Retrieves all triggered alert notifications in reverse chronological order."""
    notifs = db.query(AlertNotification).order_by(AlertNotification.triggered_at.desc()).limit(100).all()
    return [AlertNotificationResponse.model_validate(n) for n in notifs]

@router.post("/evaluate", response_model=AlertEvaluationResult)
def evaluate_alerts(db: Session = Depends(get_db)):
    """
    Evaluates all active alert rules against latest validated market data.
    Triggered alerts generate persistent notification records.
    """
    dfs = market_data_service.get_universe_data()
    quotes_dict = {}
    for sym, df in dfs.items():
        q = calculate_stock_quote(sym, df)
        if q:
            quotes_dict[sym] = q

    evaluated_count, new_notifs = alert_service.evaluate_rules(db, quotes_dict)

    return AlertEvaluationResult(
        evaluated_rules_count=evaluated_count,
        triggered_count=len(new_notifs),
        new_notifications=[AlertNotificationResponse.model_validate(n) for n in new_notifs],
        evaluation_timestamp=datetime.now(timezone.utc).isoformat()
    )
