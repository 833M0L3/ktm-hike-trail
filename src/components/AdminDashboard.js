import { useState, useEffect, useCallback } from 'react';
import { X, Shield, Check, Ban, Trash2, RefreshCw, Edit3, Search, Filter, Mountain } from 'lucide-react';
import { fetchPendingSubmissions, reviewSubmission, deleteRoutePermanently, adminFetchAllRoutes } from '../utils/api';

export default function AdminDashboard({ isOpen, onClose, onActionSuccess, onEditRoute }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'catalog'
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  // Catalog tab filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'pending') {
        const routes = await fetchPendingSubmissions();
        setPendingRoutes(routes);
      } else {
        const routes = await adminFetchAllRoutes({ status: catalogStatus, search: catalogSearch });
        setAllRoutes(routes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data from Cloudflare D1');
    } finally {
      setLoading(false);
    }
  }, [activeTab, catalogStatus, catalogSearch]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleReview = async (routeId, action) => {
    setActionInProgress(routeId);
    try {
      const note = reviewNotes[routeId] || '';
      await reviewSubmission(routeId, { action, adminNote: note });
      setPendingRoutes((prev) => prev.filter((r) => r.id !== routeId));
      onActionSuccess?.();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (route) => {
    const routeId = route.id;
    const name = route.name || 'this route';
    if (!window.confirm(`Permanently delete "${name}" from Cloudflare D1 & R2?`)) return;
    setActionInProgress(routeId);
    try {
      await deleteRoutePermanently(routeId);
      setPendingRoutes((prev) => prev.filter((r) => r.id !== routeId));
      setAllRoutes((prev) => prev.filter((r) => r.id !== routeId));
      onActionSuccess?.();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        width: '100%',
        maxWidth: 780,
        height: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <Shield size={19} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Trail Control Center</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Review community submissions, edit trail data & delete routes</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={loadData}
              title="Refresh Data"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 5 }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 5 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-primary)', flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
              background: activeTab === 'pending' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: activeTab === 'pending' ? 700 : 500,
              borderBottom: activeTab === 'pending' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span>Pending Submissions</span>
            {pendingRoutes.length > 0 && (
              <span style={{
                background: 'var(--accent-primary)', color: '#fff',
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10
              }}>
                {pendingRoutes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
              background: activeTab === 'catalog' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'catalog' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: activeTab === 'catalog' ? 700 : 500,
              borderBottom: activeTab === 'catalog' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span>All Trails Catalog</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              (Edit & Remove)
            </span>
          </button>
        </div>

        {/* Tab 2 Filter Bar */}
        {activeTab === 'catalog' && (
          <div style={{
            padding: '10px 16px', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search trails by name, district, or description..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={13} style={{ color: 'var(--text-muted)' }} />
              <select
                value={catalogStatus}
                onChange={e => setCatalogStatus(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{
                width: 24, height: 24, border: '2px solid var(--accent-primary)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
              }} />
              <div style={{ fontSize: 12 }}>Loading from Cloudflare Edge…</div>
            </div>
          ) : error ? (
            <div style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, textAlign: 'center',
            }}>
              {error}
            </div>
          ) : activeTab === 'pending' ? (
            /* Pending tab content */
            pendingRoutes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Check size={44} style={{ margin: '0 auto 12px', color: '#34d399', opacity: 0.8 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  All Caught Up!
                </div>
                <div style={{ fontSize: 12, maxWidth: 320, margin: '0 auto' }}>
                  There are no pending trail submissions waiting for review right now.
                </div>
              </div>
            ) : (
              pendingRoutes.map((route) => {
                const note = reviewNotes[route.id] || '';
                const isProcessing = actionInProgress === route.id;

                return (
                  <div
                    key={route.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 14, padding: 16,
                      display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {route.name}
                          </h4>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(249,115,22,0.15)', color: 'var(--accent-primary)',
                            textTransform: 'uppercase',
                          }}>
                            {route.fileFormat}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                          }}>
                            {route.difficulty}
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Submitted by <strong style={{ color: 'var(--text-secondary)' }}>{route.submitter?.name}</strong> ({route.submitter?.email}) • {new Date(route.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => onEditRoute?.(route)}
                          title="Edit trail data before approval"
                          style={{
                            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                            color: '#f59e0b', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(route)}
                          title="Delete track file"
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                      background: 'var(--bg-primary)', padding: 10, borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div className="section-label">Distance</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 2 }}>
                          {route.stats?.distance} km
                        </div>
                      </div>
                      <div>
                        <div className="section-label">Gain</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', marginTop: 2 }}>
                          +{route.stats?.elevationGain} m
                        </div>
                      </div>
                      <div>
                        <div className="section-label">Loss</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>
                          -{route.stats?.elevationLoss} m
                        </div>
                      </div>
                      <div>
                        <div className="section-label">Est. Time</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          {route.stats?.estimatedHours} h
                        </div>
                      </div>
                    </div>

                    {route.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 8 }}>
                        {route.description}
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        placeholder="Optional feedback or rejection reason for the hiker..."
                        value={note}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [route.id]: e.target.value }))}
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 8,
                          background: 'var(--input-bg)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', fontSize: 11, outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        onClick={() => handleReview(route.id, 'reject')}
                        disabled={isProcessing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Ban size={13} /> Reject
                      </button>
                      <button
                        onClick={() => handleReview(route.id, 'approve')}
                        disabled={isProcessing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 16px', borderRadius: 8,
                          background: '#16a34a', border: '1px solid #15803d',
                          color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Check size={13} /> Approve & Publish Live
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Catalog tab content: All trails */
            allRoutes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Mountain size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No trails found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search query or filter</div>
              </div>
            ) : (
              allRoutes.map((route) => (
                <div
                  key={route.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, padding: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">
                        {route.name}
                      </h4>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: route.status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                        color: route.status === 'approved' ? '#22c55e' : '#f97316',
                        textTransform: 'uppercase'
                      }}>
                        {route.status}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {route.difficulty}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>{route.stats?.distance} km</span>
                      <span>+{route.stats?.elevationGain} m</span>
                      <span>~{route.stats?.estimatedHours} h</span>
                      {route.district && <span>• {route.district}</span>}
                      <span>• By {route.submitter?.name || 'Community'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => onEditRoute?.(route)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                        color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(route)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
