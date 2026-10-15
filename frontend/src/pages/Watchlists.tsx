import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Watchlist, WatchlistItem } from '../types';

export const Watchlists: React.FC = () => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Watchlist Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newWlName, setNewWlName] = useState<string>('');
  const [newWlDesc, setNewWlDesc] = useState<string>('');
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // Rename State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');

  // Add Item State
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [addItemLoading, setAddItemLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getWatchlists();
      setWatchlists(res);
      if (res.length > 0) {
        if (!activeWatchlistId || !res.find(w => w.id === activeWatchlistId)) {
          setActiveWatchlistId(res[0].id);
        }
      } else {
        setActiveWatchlistId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load watchlists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || null;

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWlName.trim()) return;
    try {
      setCreateLoading(true);
      const created = await api.createWatchlist(newWlName.trim(), newWlDesc.trim());
      setShowCreateModal(false);
      setNewWlName('');
      setNewWlDesc('');
      await loadWatchlists();
      setActiveWatchlistId(created.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to create watchlist.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRenameWatchlist = async () => {
    if (!activeWatchlist || !editName.trim()) return;
    try {
      await api.updateWatchlist(activeWatchlist.id, { name: editName.trim() });
      setIsEditingName(false);
      await loadWatchlists();
    } catch (err: any) {
      setError(err?.message || 'Failed to rename watchlist.');
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this watchlist?')) return;
    try {
      await api.deleteWatchlist(id);
      await loadWatchlists();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete watchlist.');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWatchlist || !newSymbol.trim()) return;
    try {
      setAddItemLoading(true);
      setAddItemError(null);
      let sym = newSymbol.trim().toUpperCase();
      if (!sym.endsWith('.NS') && !sym.startsWith('^')) {
        sym = `${sym}.NS`;
      }
      await api.addWatchlistItem(activeWatchlist.id, sym);
      setNewSymbol('');
      await loadWatchlists();
    } catch (err: any) {
      setAddItemError(err?.message || 'Failed to add symbol to watchlist.');
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleRemoveItem = async (symbol: string) => {
    if (!activeWatchlist) return;
    try {
      await api.removeWatchlistItem(activeWatchlist.id, symbol);
      await loadWatchlists();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove symbol from watchlist.');
    }
  };

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bookmark size={24} style={{ color: '#FBBF24' }} />
            Persistent Watchlists
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Organize target equities into customized portfolios persisted in SQLite database
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          style={{ fontSize: 13 }}
        >
          <Plus size={15} />
          <span>New Watchlist</span>
        </button>
      </div>

      {loading && !activeWatchlist && (
        <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          <div className="pulse-dot green" style={{ width: 14, height: 14, marginBottom: 12 }} />
          <div>Loading Persistent Watchlists...</div>
        </div>
      )}

      {error && (
        <div className="terminal-card" style={{ padding: 14, borderColor: '#EF4444', color: '#FCA5A5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Watchlist Tabs & Current View */}
      {watchlists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Watchlist Tab Bar */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {watchlists.map(w => (
              <button
                key={w.id}
                onClick={() => { setActiveWatchlistId(w.id); setIsEditingName(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  backgroundColor: w.id === activeWatchlistId ? '#1E293B' : '#0F1626',
                  color: w.id === activeWatchlistId ? '#38BDF8' : '#94A3B8',
                  border: `1px solid ${w.id === activeWatchlistId ? '#38BDF8' : '#1C2740'}`,
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{w.name}</span>
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  ({w.items.length})
                </span>
              </button>
            ))}
          </div>

          {/* Active Watchlist Container */}
          {activeWatchlist && (
            <div className="terminal-card" style={{ padding: 20 }}>
              {/* Watchlist Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                paddingBottom: 16,
                borderBottom: '1px solid #1C2740'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text"
                        className="terminal-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ height: 32, fontSize: 13, width: 200 }}
                        autoFocus
                      />
                      <button onClick={handleRenameWatchlist} className="btn-primary" style={{ padding: '4px 8px' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="btn-secondary" style={{ padding: '4px 8px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                        {activeWatchlist.name}
                      </h2>
                      <button
                        onClick={() => { setEditName(activeWatchlist.name); setIsEditingName(true); }}
                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }}
                        title="Rename watchlist"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}

                  {activeWatchlist.description && (
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      — {activeWatchlist.description}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Add Symbol Input */}
                  <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="terminal-input"
                      placeholder="Add NSE Symbol (e.g. INFY)..."
                      value={newSymbol}
                      onChange={(e) => { setNewSymbol(e.target.value); setAddItemError(null); }}
                      style={{ width: 220, height: 32, fontSize: 12 }}
                    />
                    <button
                      type="submit"
                      disabled={addItemLoading || !newSymbol.trim()}
                      className="btn-primary"
                      style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                    >
                      <Plus size={14} />
                      <span>{addItemLoading ? 'Adding...' : 'Add'}</span>
                    </button>
                  </form>

                  {/* Delete Watchlist Button */}
                  <button
                    onClick={() => handleDeleteWatchlist(activeWatchlist.id)}
                    className="btn-danger"
                    style={{ height: 32 }}
                    title="Delete watchlist"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {addItemError && (
                <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: 12, borderRadius: 4, marginTop: 12 }}>
                  {addItemError}
                </div>
              )}

              {/* Holdings Table */}
              {activeWatchlist.items.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                  <Bookmark size={32} style={{ color: '#475569', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC' }}>Watchlist is Currently Empty</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Use the input above to add stocks like <strong>TCS.NS</strong> or <strong>HDFCBANK.NS</strong>.
                  </div>
                </div>
              ) : (
                <div className="terminal-table-container" style={{ marginTop: 12 }}>
                  <table className="terminal-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Company Name</th>
                        <th style={{ textAlign: 'right' }}>Latest Close (₹)</th>
                        <th style={{ textAlign: 'right' }}>Daily Change</th>
                        <th style={{ textAlign: 'right' }}>Rel Vol (20D)</th>
                        <th style={{ textAlign: 'right' }}>Volume</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWatchlist.items.map((item: WatchlistItem) => {
                        const q = item.quote;
                        const isUp = (q?.change_pct ?? 0) >= 0;
                        return (
                          <tr key={item.id}>
                            <td>
                              <span
                                onClick={() => navigate(`/stocks/${encodeURIComponent(item.symbol)}`)}
                                style={{ fontWeight: 700, color: '#38BDF8', cursor: 'pointer' }}
                              >
                                {item.symbol}
                              </span>
                            </td>
                            <td style={{ color: '#CBD5E1' }}>
                              {q?.company_name ?? '—'}
                            </td>
                            <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>
                              {q?.latest_close ? `₹${q.latest_close.toFixed(2)}` : '—'}
                            </td>
                            <td className="tabular-nums" style={{ textAlign: 'right' }}>
                              {q?.change_pct !== null && q?.change_pct !== undefined ? (
                                <span className={isUp ? 'badge-gain' : 'badge-loss'}>
                                  {isUp ? '+' : ''}{q.change_pct.toFixed(2)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="tabular-nums" style={{ textAlign: 'right' }}>
                              {q?.relative_volume ? (
                                <span style={{ fontWeight: 600, color: q.relative_volume >= 2.0 ? '#FBBF24' : '#CBD5E1' }}>
                                  {q.relative_volume.toFixed(2)}x
                                </span>
                              ) : '—'}
                            </td>
                            <td className="tabular-nums" style={{ textAlign: 'right', color: '#94A3B8' }}>
                              {q?.volume ? q.volume.toLocaleString('en-IN') : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleRemoveItem(item.symbol)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  padding: 4
                                }}
                                title="Remove from watchlist"
                              >
                                <Trash2 size={13} style={{ color: '#F87171' }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                Create New Watchlist
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                  Watchlist Name *
                </label>
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="e.g. High Volatility Tech"
                  value={newWlName}
                  onChange={(e) => setNewWlName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="e.g. Mid-cap growth candidates under observation"
                  value={newWlDesc}
                  onChange={(e) => setNewWlDesc(e.target.value)}
                />
              </div>

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
                  disabled={createLoading || !newWlName.trim()}
                  className="btn-primary"
                >
                  {createLoading ? 'Creating...' : 'Create Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
