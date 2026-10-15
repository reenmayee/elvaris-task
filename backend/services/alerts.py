import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session

from models import AlertRule, AlertNotification
from schemas import StockQuote

logger = logging.getLogger("market_terminal.alerts")

class AlertEvaluationService:
    @staticmethod
    def evaluate_rules(
        db: Session,
        quotes_dict: Dict[str, StockQuote]
    ) -> Tuple[int, List[AlertNotification]]:
        """
        Evaluates all active alert rules against current quotes.
        Creates persistent AlertNotification records when conditions trigger,
        while deduplicating triggers within a 6-hour window.
        """
        active_rules = db.query(AlertRule).filter(AlertRule.is_active == True).all()
        now = datetime.now(timezone.utc)
        recent_threshold_time = now - timedelta(hours=6)

        new_notifications: List[AlertNotification] = []

        for rule in active_rules:
            sym = rule.symbol.upper().strip()
            quote = quotes_dict.get(sym)
            if not quote:
                continue

            rule.last_evaluated_at = now
            triggered = False
            observed = 0.0
            message = ""

            if rule.rule_type == "PRICE_CHANGE_PCT_ABOVE":
                if quote.change_pct is not None and quote.change_pct >= rule.threshold:
                    triggered = True
                    observed = quote.change_pct
                    message = f"{sym} surged by +{quote.change_pct:.2f}%, surpassing the threshold of +{rule.threshold:.2f}%."

            elif rule.rule_type == "PRICE_CHANGE_PCT_BELOW":
                if quote.change_pct is not None and quote.change_pct <= rule.threshold:
                    triggered = True
                    observed = quote.change_pct
                    message = f"{sym} dropped by {quote.change_pct:.2f}%, breaching the lower threshold of {rule.threshold:.2f}%."

            elif rule.rule_type == "REL_VOLUME_ABOVE":
                if quote.relative_volume is not None and quote.relative_volume >= rule.threshold:
                    triggered = True
                    observed = quote.relative_volume
                    message = f"{sym} relative volume reached {quote.relative_volume:.2f}x (20D baseline), exceeding threshold of {rule.threshold:.2f}x."

            elif rule.rule_type == "VOLATILITY_ABOVE":
                if quote.realized_volatility_annualized is not None and quote.realized_volatility_annualized >= rule.threshold:
                    triggered = True
                    observed = quote.realized_volatility_annualized
                    message = f"{sym} annualized realized volatility jumped to {quote.realized_volatility_annualized:.2f}%, exceeding threshold of {rule.threshold:.2f}%."

            if triggered:
                # Check for recent duplicate notification to prevent spamming
                existing = db.query(AlertNotification).filter(
                    AlertNotification.alert_id == rule.id,
                    AlertNotification.triggered_at >= recent_threshold_time
                ).first()

                if not existing:
                    notif = AlertNotification(
                        alert_id=rule.id,
                        symbol=sym,
                        rule_type=rule.rule_type,
                        observed_value=round(observed, 2),
                        threshold=round(rule.threshold, 2),
                        message=message,
                        triggered_at=now,
                        is_read=False
                    )
                    db.add(notif)
                    new_notifications.append(notif)

        db.commit()
        for n in new_notifications:
            db.refresh(n)

        return len(active_rules), new_notifications

alert_service = AlertEvaluationService()
