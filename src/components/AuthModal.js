import { useState, useEffect, useRef } from 'react';
import { X, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { loginWithGoogle, getAuthConfig } from '../utils/api';

const DEFAULT_GOOGLE_CLIENT_ID = '683129579615-d2uh6g9humvfb6bg4obut88lfakjc0es.apps.googleusercontent.com';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    const setupGoogleSignIn = async () => {
      try {
        const config = await getAuthConfig();
        const activeClientId = config.googleClientId || DEFAULT_GOOGLE_CLIENT_ID;

        if (!isSubscribed) return;

        const initGsi = () => {
          if (!isSubscribed) return;
          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: activeClientId,
              callback: async (response) => {
                if (response?.credential) {
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await loginWithGoogle(response.credential);
                    if (res.user) {
                      onLoginSuccess(res.user);
                      onClose();
                    }
                  } catch (err) {
                    setError(err.message || 'Google sign-in verification failed');
                  } finally {
                    setLoading(false);
                  }
                }
              },
            });

            if (googleBtnRef.current) {
              googleBtnRef.current.innerHTML = '';
              window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'filled_black',
                size: 'large',
                width: 360,
                text: 'continue_with',
                shape: 'rectangular',
              });
            }
          } else {
            // Script still loading from CDN, retry shortly
            setTimeout(initGsi, 200);
          }
        };

        initGsi();
      } catch (err) {
        console.warn('Could not initialize Google Sign-in:', err);
      }
    };

    setupGoogleSignIn();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, onLoginSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff'
            }}>
              <LogIn size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Account Sign In</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sign in to upload GPX/KML trails & track submissions</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px 20px' }}>
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '10px 0 16px', color: 'var(--accent-primary)', fontSize: 12 }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              Verifying Google Account…
            </div>
          )}

          {/* Official Google Button Render Container */}
          <div style={{ margin: '8px 0 16px', display: 'flex', justifyContent: 'center', minHeight: 44 }}>
            <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            <Sparkles size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#f59e0b' }} />
            Powered by Cloudflare Workers & Google Identity Services
          </div>
        </div>
      </div>
    </div>
  );
}
