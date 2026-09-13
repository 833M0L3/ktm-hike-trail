import { useState, useEffect } from 'react';
import { X, Edit3, Save, Trash2, AlertCircle, Check, Mountain } from 'lucide-react';
import { adminUpdateRoute, deleteRoutePermanently } from '../utils/api';

const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Extreme'];
const STATUSES = [
  { value: 'approved', label: 'Approved (Published Live)' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'rejected', label: 'Rejected / Archived' },
];

export default function EditTrailModal({ isOpen, route, onClose, onSaveSuccess, onDeleteSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    difficulty: 'Moderate',
    status: 'approved',
    district: '',
    province: '',
    distance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    estimatedHours: 0,
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (route) {
      setFormData({
        name: route.name || '',
        difficulty: route.difficulty || 'Moderate',
        status: route.status || 'approved',
        district: route.district || '',
        province: route.province || '',
        distance: route.stats?.distance ?? 0,
        elevationGain: route.stats?.elevationGain ?? 0,
        elevationLoss: route.stats?.elevationLoss ?? 0,
        estimatedHours: route.stats?.estimatedHours ?? 0,
        description: route.description || '',
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [route]);

  if (!isOpen || !route) return null;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      setError('Trail name cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await adminUpdateRoute(route.id, {
        name: formData.name.trim(),
        difficulty: formData.difficulty,
        status: formData.status,
        district: formData.district.trim(),
        province: formData.province.trim(),
        distance: parseFloat(formData.distance) || 0,
        elevationGain: parseInt(formData.elevationGain, 10) || 0,
        elevationLoss: parseInt(formData.elevationLoss, 10) || 0,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        description: formData.description.trim(),
      });

      const updated = res.route || {
        ...route,
        name: formData.name.trim(),
        difficulty: formData.difficulty,
        status: formData.status,
        district: formData.district.trim(),
        province: formData.province.trim(),
        description: formData.description.trim(),
        stats: {
          ...route.stats,
          distance: parseFloat(formData.distance) || 0,
          elevationGain: parseInt(formData.elevationGain, 10) || 0,
          elevationLoss: parseInt(formData.elevationLoss, 10) || 0,
          estimatedHours: parseFloat(formData.estimatedHours) || 0,
        },
      };

      setSuccessMsg('Trail updated successfully!');
      setTimeout(() => {
        onSaveSuccess?.(updated);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to update trail data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Permanently delete "${route.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteRoutePermanently(route.id);
      onDeleteSuccess?.(route.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete trail');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 580,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        animation: 'fadeUp 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff'
            }}>
              <Edit3 size={17} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Trail Data</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin control for trail info and metrics</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: '#22c55e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Trail Name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Trail Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {/* Difficulty & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={e => handleChange('difficulty', e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Publish Status
              </label>
              <select
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* District & Province */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                District
              </label>
              <input
                type="text"
                placeholder="e.g. Kathmandu, Lalitpur"
                value={formData.district}
                onChange={e => handleChange('district', e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Province
              </label>
              <input
                type="text"
                placeholder="e.g. Bagmati"
                value={formData.province}
                onChange={e => handleChange('province', e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 12
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mountain size={12} /> Trail Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.distance}
                  onChange={e => handleChange('distance', e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', borderRadius: 6,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Gain (m)
                </label>
                <input
                  type="number"
                  value={formData.elevationGain}
                  onChange={e => handleChange('elevationGain', e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', borderRadius: 6,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Loss (m)
                </label>
                <input
                  type="number"
                  value={formData.elevationLoss}
                  onChange={e => handleChange('elevationLoss', e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', borderRadius: 6,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Est. Time (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={e => handleChange('estimatedHours', e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', borderRadius: 6,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Description & Highlights
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Trail terrain details, scenic viewpoints, drinking water sources, temples..."
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.5,
                outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          {/* Submitter info reminder */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Original submitter: <strong style={{ color: 'var(--text-secondary)' }}>{route.submitter?.name || 'WalkNepalWalk Community'}</strong>
            {route.fileName && ` • File: ${route.fileName}`}
          </div>
        </form>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete Trail'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(249,115,22,0.3)'
              }}
            >
              <Save size={14} />
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
