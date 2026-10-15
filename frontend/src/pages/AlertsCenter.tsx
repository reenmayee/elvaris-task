import React, { useEffect, useState } from 'react';
import {
  Bell,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  X,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { api } from '../services/api';
import { AlertRule, AlertNotification, AlertEvaluationResult } from '../types';
import { MetricTooltip } from '../components/MetricTooltip';

const RULE_DESCRIPTIONS: Record<string, string> = {
  PRICE_CHANGE_PCT_ABOVE: 'Daily Price Change Surges Above (+%)',
  PRICE_CHANGE_PCT_BELOW: 'Daily Price Change Drops Below (-%)',
  REL_VOLUME_ABOVE: 'Relative Volume (20D Baseline) Rises Above (x)',
  VOLATILITY_ABOVE: 'Annualized Realized Volatility Exceeds (%)',
};

export const AlertsCenter: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<AlertEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create Alert Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newRuleType, setNewRuleType] = useState<string>('PRICE_CHANGE_PCT_ABOVE');
  const [newThreshold, setNewThreshold] = useState<string>('2.5');
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAlertsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rRes, nRes] = await Promise.all([
        api.getAlerts(),
        api.getAlertNotifications()
      ]);
      setRules(rRes);
      setNotifications(nRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load alert rules and notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertsData();
  }, []);

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      setEvalResult(null);
      const res = await api.evaluateAlerts();
      setEvalResult(res);
      // Reload notifications
      const notifs = await api.getAlertNotifications();
      setNotifications(notifs);
    } catch (err: any) {
      setError(err?.message || 'Alert evaluation encountered an issue.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      await api.updateAlert(rule.id, { is_active: !rule.is_active });
      await loadAlertsData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update rule status.');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm('Delete this alert rule?')) return;
    try {
      await api.deleteAlert(id);
      await loadAlertsData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete alert rule.');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newThreshold) return;
    try {
      setCreateLoading(true);
      setCreateError(null);
      let sym = newSymbol.trim().toUpperCase();
      if (!sym.endsWith('.NS') && !sym.startsWith('^')) {
        sym = `${sym}.NS`;
      }
      await api.createAlert({
        symbol: sym,
        rule_type: newRuleType,
        threshold: parseFloat(newThreshold),
        is_active: true
      });
      setShowCreateModal(false);
      setNewSymbol('');
      setNewThreshold('2.5');
      await loadAlertsData();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create alert rule.');
    } finally {
      setCreateLoading(false);
    }
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'PRICE_CHANGE_PCT_ABOVE':
        return <TrendingUp size={14} style={{ color: '#34D399' }} />;
      case 'PRICE_CHANGE_PCT_BELOW':
        return <TrendingDown size={14} style={{ color: '#FB7185' }} />;
      case 'REL_VOLUME_ABOVE':
        return <Flame size={14} style={{ color: '#FBBF24' }} />;
      case 'VOLATILITY_ABOVE':
        return <Zap size={14} style={{ color: '#A78BFA' }} />;
      default:
        return <Bell size={14} />;
    }
  };

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} style={{ color: '#38BDF8' }} />
            Alerts & Anomaly Center
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Configure parametric surveillance rules for price anomalies, volume surges, and volatility breakouts
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="btn-secondary"
            style={{ fontSize: 13, borderColor: '#38BDF8' }}
          >
            <Play size={14} style={{ color: '#38BDF8' }} />
            <span>{evaluating ? 'Evaluating Against Market...' : 'Evaluate Rules Now'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            <Plus size={15} />
            <span>Create Alert Rule</span>
          </button>
        </div>
      </div>

      {evalResult && (
        <div className="terminal-card" style={{ padding: 16, backgroundColor: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#F8FAFC' }}>
              <strong>Surveillance Scan Complete:</strong> Evaluated <strong>{evalResult.evaluated_rules_count}</strong> active rules. Triggered <strong>{evalResult.triggered_count}</strong> new alerts.
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
              {new Date(evalResult.evaluation_timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Grid: Configured Rules & Triggered Notifications Log */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
        {/* Rules Table */}
        <div className="terminal-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
                Configured Surveillance Rules
              </h2>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Evaluated deterministically against market data
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 600 }}>
              {rules.length} Rules Active/Paused
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading Rules...</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
              No rules configured yet. Click "Create Alert Rule" to configure surveillance.
            </div>
          ) : (
            <div className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Rule Condition</th>
                    <th style={{ textAlign: 'right' }}>Threshold</th>
                    <th style={{ textAlign: 'center' }}>Active</th>
                    <th style={{ textAlign: 'center' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule: AlertRule) => (
                    <tr key={rule.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#38BDF8' }}>{rule.symbol}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getRuleIcon(rule.rule_type)}
                          <span>{RULE_DESCRIPTIONS[rule.rule_type] || rule.rule_type}</span>
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {rule.threshold}
                        {rule.rule_type.includes('PCT') || rule.rule_type.includes('VOLATILITY') ? '%' : 'x'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleActive(rule)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: rule.is_active ? '#34D399' : '#64748B'
                          }}
                          title={rule.is_active ? 'Click to pause rule' : 'Click to activate rule'}
                        >
                          {rule.is_active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171' }}
                          title="Delete rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Triggered Notifications Log */}
        <div className="terminal-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
                Triggered Surveillance Notifications
              </h2>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Persisted historical audit log of breached conditions
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#FBBF24', fontWeight: 600 }}>
              {notifications.length} Events
            </span>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
              <Clock size={32} style={{ color: '#475569', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>No Triggered Notifications</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                When market metrics cross your defined rule thresholds during evaluation, events will log here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
              {notifications.map((notif: AlertNotification) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#090D16',
                    border: '1px solid #1C2740',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: 13 }}>
                        {notif.symbol}
                      </span>
                      <span className="badge-anomaly">
                        {notif.rule_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748B' }}>
                      {new Date(notif.triggered_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>

                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                    Observed: <strong style={{ color: '#FBBF24' }}>{notif.observed_value}</strong> | Target Threshold: <strong>{notif.threshold}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Educational Surveillance Disclaimer Note */}
      <div className="terminal-card" style={{ padding: '14px 20px', borderLeft: '4px solid #38BDF8' }}>
        <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
          <strong style={{ color: '#F8FAFC' }}>Surveillance Architecture Note:</strong> Alert conditions are evaluated deterministically against newly retrieved and validated market data snapshots. Click "Evaluate Rules Now" to run rule evaluation against latest market quotes. Duplicate alerts are automatically suppressed within a 6-hour evaluation window to prevent alert fatigue.
        </div>
      </div>

      {/* Create Alert Rule Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                Create New Surveillance Rule
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                  NSE Ticker Symbol *
                </label>
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="e.g. RELIANCE, TCS, INFY"
                  value={newSymbol}
                  onChange={(e) => { setNewSymbol(e.target.value); setCreateError(null); }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                  Rule Condition *
                </label>
                <select
                  className="terminal-select"
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value)}
                >
                  <option value="PRICE_CHANGE_PCT_ABOVE">Price Change Surges Above (+%)</option>
                  <option value="PRICE_CHANGE_PCT_BELOW">Price Change Drops Below (-%)</option>
                  <option value="REL_VOLUME_ABOVE">Relative Volume (RVOL) Exceeds (x)</option>
                  <option value="VOLATILITY_ABOVE">Annualized Realized Volatility Exceeds (%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                  Numerical Threshold *
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="terminal-input"
                  placeholder="e.g. 2.0"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  required
                />
              </div>

              {createError && (
                <div style={{ color: '#F87171', fontSize: 12, backgroundColor: 'rgba(239,68,68,0.1)', padding: '8px 10px', borderRadius: 4 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newSymbol.trim()}
                  className="btn-primary"
                >
                  {createLoading ? 'Configuring...' : 'Save Alert Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
