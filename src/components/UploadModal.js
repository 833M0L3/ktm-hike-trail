import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadTrailSubmission } from '../utils/api';

const DISTRICTS = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Kavrepalanchok',
  'Nuwakot',
  'Makwanpur',
  'Sindhupalchok',
  'Dhading',
  'Other',
];

export default function UploadModal({ isOpen, onClose, onUploadSuccess, currentUser }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('Kathmandu');
  const [province, setProvince] = useState('Bagmati');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    if (acceptedFiles.length === 0) return;
    const selected = acceptedFiles[0];
    const isGPS = /\.(kml|gpx)$/i.test(selected.name);
    if (!isGPS) {
      setError('Please upload a valid GPS track file (.gpx or .kml)');
      return;
    }
    setFile(selected);
    const suggestedName = selected.name
      .replace(/\.(kml|gpx)$/i, '')
      .replace(/^[0-9]+_WNW_[0-9]+\./, '')
      .replace(/[_-]/g, ' ')
      .trim();
    setName(suggestedName);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/gpx+xml': ['.gpx'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
      'application/xml': ['.gpx', '.kml'],
      'text/xml': ['.gpx', '.kml'],
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a .gpx or .kml file');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a trail name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());
      formData.append('district', district);
      formData.append('province', province);
      formData.append('description', description.trim());

      const res = await uploadTrailSubmission(formData);
      setSuccessData(res);
      onUploadSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Failed to submit trail');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setName('');
    setDescription('');
    setDistrict('Kathmandu');
    setProvince('Bagmati');
    setError(null);
    setSuccessData(null);
  };

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
        maxWidth: 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <UploadCloud size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Submit Trail Track</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Share your GPS route (.GPX or .KML) with the hiking community</div>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form or Success State */}
        <div style={{ padding: 20 }}>
          {successData ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(52,211,153,0.15)', color: '#34d399',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Trail Submitted for Review!
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Thank you! Your GPS track has been securely saved to Cloudflare R2 storage and submitted to administrators for review.
              </p>

              {successData.summary && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                  background: 'var(--bg-secondary)', padding: 12, borderRadius: 10,
                  border: '1px solid var(--border)', marginBottom: 20, textAlign: 'left',
                }}>
                  <div>
                    <div className="section-label">Distance</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 2 }}>
                      {successData.summary.distance} km
                    </div>
                  </div>
                  <div>
                    <div className="section-label">Gain</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginTop: 2 }}>
                      +{successData.summary.gain} m
                    </div>
                  </div>
                  <div>
                    <div className="section-label">Difficulty</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>
                      {successData.summary.difficulty}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Upload Another Trail
                </button>
                <button
                  onClick={() => { handleReset(); onClose(); }}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    background: 'var(--accent-primary)', border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Dropzone Area */}
              <div
                {...getRootProps()}
                style={{
                  border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: isDragActive ? 'rgba(249,115,22,0.05)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <FileText size={28} style={{ color: 'var(--accent-primary)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(1)} KB • {file.name.endsWith('.gpx') ? 'GPX Track' : 'KML Track'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={32} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {isDragActive ? 'Drop your GPS file here…' : 'Drag & drop a .GPX or .KML file'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      or click to browse from device (Google Earth, Garmin, Strava, Wikiloc)
                    </div>
                  </div>
                )}
              </div>

              {/* Trail Name Input */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Trail Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tarebhir to Sundarijal Ridge Walk"
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* District and Province */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    District / Region
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'var(--input-bg)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', fontSize: 12, outline: 'none', cursor: 'pointer',
                    }}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Province
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="e.g. Bagmati"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'var(--input-bg)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Trail Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Trail Description & Highlights (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share trail tips, water sources, bus transit points, scenic viewpoints..."
                  rows={3}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 12, outline: 'none', resize: 'vertical',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Moderation Notice */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
                fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Community Moderation:</span> Your submission will be reviewed by an administrator before appearing on the public Kathmandu Valley Hikes map. You can view its progress anytime in <strong>My Uploads</strong>.
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !file}
                style={{
                  marginTop: 6,
                  padding: '12px 20px', borderRadius: 10,
                  background: isSubmitting || !file ? 'var(--border)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: isSubmitting || !file ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isSubmitting || !file ? 'none' : '0 4px 14px rgba(249,115,22,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Processing & Uploading to Cloudflare R2…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Submit Trail for Review</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
