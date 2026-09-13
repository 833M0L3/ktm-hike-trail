import { useState, useRef, useEffect } from 'react';
import { LogIn, UploadCloud, Shield, List, LogOut, ChevronDown } from 'lucide-react';

export default function UserNav({
  currentUser,
  onOpenAuth,
  onOpenUpload,
  onOpenMyUploads,
  onOpenAdmin,
  onLogout,
  isMobile,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleUploadClick = () => {
    if (!currentUser) {
      onOpenAuth();
    } else {
      onOpenUpload();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }} ref={dropdownRef}>
      {/* Submit Trail Action */}
      <button
        onClick={handleUploadClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: isMobile ? '5px 8px' : '6px 12px',
          borderRadius: 8,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: 'none',
          color: '#fff', fontSize: isMobile ? 11 : 12, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        title="Submit a GPX or KML trail map"
      >
        <UploadCloud size={14} />
        {!isMobile && <span>Submit Trail</span>}
      </button>

      {currentUser ? (
        <>
          {/* User Avatar Button */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 8,
              background: 'var(--bg-card)',
              border: `1px solid ${currentUser.role === 'admin' ? 'var(--accent-primary)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: currentUser.role === 'admin' ? 'var(--accent-primary)' : '#3b82f6',
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
            )}
            {!isMobile && (
              <span style={{ fontSize: 11, fontWeight: 600, maxWidth: 80 }} className="truncate">
                {currentUser.name}
              </span>
            )}
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              width: 220,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              zIndex: 3000,
              overflow: 'hidden',
              animation: 'fadeUp 0.2s ease',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="truncate">
                  {currentUser.email}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: currentUser.role === 'admin' ? 'rgba(249,115,22,0.15)' : 'rgba(52,211,153,0.15)',
                    color: currentUser.role === 'admin' ? 'var(--accent-primary)' : '#34d399',
                    border: `1px solid ${currentUser.role === 'admin' ? 'rgba(249,115,22,0.3)' : 'rgba(52,211,153,0.3)'}`,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {currentUser.role === 'admin' ? 'Administrator' : 'Community Hiker'}
                  </span>
                </div>
              </div>

              <div style={{ padding: 6 }}>
                <button
                  onClick={() => { setDropdownOpen(false); onOpenUpload(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <UploadCloud size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Submit Trail (.GPX / .KML)</span>
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); onOpenMyUploads(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <List size={14} style={{ color: '#60a5fa' }} />
                  <span>My Submissions</span>
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => { setDropdownOpen(false); onOpenAdmin(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 6,
                      background: 'rgba(249,115,22,0.08)', border: 'none',
                      color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      textAlign: 'left', marginTop: 2,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.08)'}
                  >
                    <Shield size={14} />
                    <span>Admin Moderation</span>
                  </button>
                )}

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                <button
                  onClick={() => { setDropdownOpen(false); onLogout(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    background: 'transparent', border: 'none',
                    color: '#ef4444', fontSize: 12, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Sign In Button */
        <button
          onClick={onOpenAuth}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '5px 8px' : '6px 12px',
            borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: isMobile ? 11 : 12, fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <LogIn size={13} style={{ color: 'var(--accent-primary)' }} />
          <span>Sign In</span>
        </button>
      )}
    </div>
  );
}
