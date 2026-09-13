import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, Mountain, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { fetchMySubmittedRoutes } from '../utils/api';

export default function MyUploadsModal({ isOpen, onClose, onOpenUpload, onSelectRoute }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMySubmittedRoutes();
      setRoutes(data);
    } catch (err) {
      setError(err.message || 'Failed to load your submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoutes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        width: '100%',
        maxWidth: 580,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.3s ease',
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
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>My Trail Submissions</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Track status and review history of your uploaded GPS maps</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={loadRoutes}
              title="Refresh"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div style={{
          padding: '10px 20px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {routes.length} {routes.length === 1 ? 'submission' : 'submissions'} found
          </span>
          <button
            onClick={() => { onClose(); onOpenUpload(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--accent-primary)', border: 'none',
              color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Submit New Trail
          </button>
        </div>

        {/* Content List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{
                width: 24, height: 24, border: '2px solid var(--accent-primary)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
              }} />
              <div style={{ fontSize: 12 }}>Loading your submissions…</div>
            </div>
          ) : error ? (
            <div style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, textAlign: 'center',
            }}>
              {error}
            </div>
          ) : routes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Mountain size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                No trails submitted yet
              </div>
              <div style={{ fontSize: 12, maxWidth: 320, margin: '0 auto 16px' }}>
                Have you explored a route in Kathmandu Valley? Upload your GPX or KML track to share it with other hikers!
              </div>
              <button
                onClick={() => { onClose(); onOpenUpload(); }}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: 'var(--accent-primary)', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Upload Your First Trail
              </button>
            </div>
          ) : (
            routes.map((r) => {
              const isApproved = r.status === 'approved';
              const isPending = r.status === 'pending';
              const isRejected = r.status === 'rejected';

              return (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">
                          {r.name}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', textTransform: 'uppercase',
                        }}>
                          {r.fileFormat}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {r.district ? `${r.district}, ` : ''}{r.province || 'Nepal'} • Submitted {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      {isPending && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                          <Clock size={12} /> Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: 'rgba(52,211,153,0.12)', color: '#34d399',
                          border: '1px solid rgba(52,211,153,0.3)',
                        }}>
                          <CheckCircle size={12} /> Live & Public
                        </span>
                      )}
                      {isRejected && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}>
                          <AlertCircle size={12} /> Needs Revision
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mountain size={12} style={{ color: 'var(--accent-primary)' }} />
                      <span>{r.stats?.distance} km</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingUp size={12} style={{ color: '#34d399' }} />
                      <span>+{r.stats?.elevationGain} m</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} style={{ color: '#60a5fa' }} />
                      <span>{r.stats?.estimatedHours} h</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                      }}>
                        {r.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Admin feedback note */}
                  {r.adminNote && (
                    <div style={{
                      marginTop: 4, padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                      fontSize: 11, color: 'var(--text-secondary)',
                    }}>
                      <strong style={{ color: '#ef4444' }}>Admin Note:</strong> {r.adminNote}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
