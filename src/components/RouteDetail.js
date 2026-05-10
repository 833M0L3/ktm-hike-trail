import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mountain, TrendingUp, TrendingDown, Clock, Download, MapPin, Flag, Star, Share2, Check } from 'lucide-react';
import ElevationChart from './ElevationChart';

const ROUTE_COLORS = [
  '#f97316', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa',
  '#fb7185', '#22d3ee', '#84cc16', '#e879f9', '#38bdf8',
];

const DIFF_COLORS = {
  Easy: '#34d399', Moderate: '#fbbf24', Hard: '#f97316', Extreme: '#ef4444'
};

const MIN_HEIGHT = 80;
const MAX_HEIGHT_VH = 85;

function formatEstimatedTime(hours) {
  if (typeof hours !== 'number' || Number.isNaN(hours)) return '-';
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

function buildAboutParagraphs(text) {
  if (!text) return [];
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]?/g) || [text.trim()];

  const paragraphs = [];
  for (let i = 0; i < sentences.length && paragraphs.length < 3; i += 2) {
    paragraphs.push(`${(sentences[i] || '').trim()} ${(sentences[i + 1] || '').trim()}`.trim());
  }
  return paragraphs.filter(Boolean);
}

function getHighlights(route) {
  const chips = [];
  const difficulty = String(route?.difficulty || '').toLowerCase();
  const text = `${route?.description || ''} ${route?.highlights || ''}`.toLowerCase();

  if (difficulty === 'easy' || difficulty === 'moderate') chips.push('Beginner Friendly');
  if (text.includes('family') || text.includes('kids')) chips.push('Family Friendly');
  if (text.includes('transport') || text.includes('bus') || text.includes('jeep') || text.includes('crowd')) {
    chips.push('Transport wait at end');
  }
  if (chips.length === 0 && (route?.stats?.distance || 0) <= 15) chips.push('Great for Half-day Hike');

  return chips.slice(0, 3);
}

export default function RouteDetail({ route, index, onClose, isMobile, onHeightChange }) {
  const [panelHeight, setPanelHeight] = useState(null);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const isDraggingRef = useRef(false);
  const swipeStartXRef = useRef(null);
  const swipeStartYRef = useRef(null);
  const mouseSwipeStartXRef = useRef(null);
  const mouseSwipeStartYRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const panelRef = useRef(null);
  const handleBarRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [showChartDeferred, setShowChartDeferred] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const defaultHeightVh = currentPage === 0
    ? (isMobile ? 38 : 34)
    : (isMobile ? 40 : 65);

  useEffect(() => {
    // Trigger entrance animation on mount
    requestAnimationFrame(() => {
      setIsMounted(true);
      // Defer heavy chart rendering to avoid jank during entrance
      setTimeout(() => setShowChartDeferred(true), 150);
      // Remove transform after animation completes to fix blurry text
      setTimeout(() => setAnimationDone(true), 400);
    });
  }, []);

  // Report height to parent whenever committed height changes
  useEffect(() => {
    const h = panelHeight != null ? panelHeight : window.innerHeight * defaultHeightVh / 100;
    onHeightChange?.(h);
  }, [panelHeight, defaultHeightVh, onHeightChange]);

  useEffect(() => {
    setPanelHeight(null);
    setCurrentPage(0);
  }, [route?.id]);

  const goToPage = useCallback((page) => {
    const clamped = Math.max(0, Math.min(2, page));
    // Switching pages should always return to the page's default panel height.
    setPanelHeight(null);
    setCurrentPage(clamped);
  }, []);

  const handleSwipeStart = useCallback((e) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeStartXRef.current = t.clientX;
    swipeStartYRef.current = t.clientY;
  }, []);

  const handleSwipeEnd = useCallback((e) => {
    const t = e.changedTouches?.[0];
    if (!t || swipeStartXRef.current == null || swipeStartYRef.current == null) return;

    const dx = t.clientX - swipeStartXRef.current;
    const dy = t.clientY - swipeStartYRef.current;

    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    // Only horizontal swipe should trigger page change.
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleMouseSwipeStart = useCallback((e) => {
    // Ignore interactions that start on actionable controls.
    if (e.target instanceof Element && e.target.closest('button, a, input, select, textarea, summary')) return;
    mouseSwipeStartXRef.current = e.clientX;
    mouseSwipeStartYRef.current = e.clientY;
  }, []);

  const handleMouseSwipeEnd = useCallback((e) => {
    if (mouseSwipeStartXRef.current == null || mouseSwipeStartYRef.current == null) return;

    const dx = e.clientX - mouseSwipeStartXRef.current;
    const dy = e.clientY - mouseSwipeStartYRef.current;

    mouseSwipeStartXRef.current = null;
    mouseSwipeStartYRef.current = null;

    if (Math.abs(dx) < 70 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const clearMouseSwipe = useCallback(() => {
    mouseSwipeStartXRef.current = null;
    mouseSwipeStartYRef.current = null;
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartY.current = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    dragStartHeight.current = panelRef.current?.offsetHeight ?? (window.innerHeight * defaultHeightVh / 100);

    // Style handle imperatively
    if (handleBarRef.current) {
      handleBarRef.current.style.width = '56px';
      handleBarRef.current.style.background = 'var(--accent-primary)';
    }
    // Disable CSS transition during drag so it doesn't fight direct DOM changes
    if (panelRef.current) panelRef.current.style.transition = 'none';
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (ev) => {
      if (!isDraggingRef.current || !panelRef.current) return;
      const clientY = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
      const delta = dragStartY.current - clientY;
      const maxH = window.innerHeight * MAX_HEIGHT_VH / 100;
      const newH = Math.min(maxH, Math.max(MIN_HEIGHT, dragStartHeight.current + delta));
      // Direct DOM mutation — zero React re-renders during drag
      panelRef.current.style.height = `${newH}px`;
    };

    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      // Commit final height to React state (1 re-render total)
      const finalH = panelRef.current ? parseFloat(panelRef.current.style.height) || null : null;
      setPanelHeight(finalH);
      // Re-enable CSS transition after committing
      if (panelRef.current) panelRef.current.style.transition = '';
      if (handleBarRef.current) {
        handleBarRef.current.style.width = '';
        handleBarRef.current.style.background = '';
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);
  }, [defaultHeightVh]);

  const handleShare = useCallback(async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?route=${encodeURIComponent(route?.fileName || '')}`;
    const shareData = {
      title: route?.name || 'Hiking Route',
      text: `Check out this hike: ${route?.name} — ${route?.stats?.distance}km, +${route?.stats?.elevationGain}m gain`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2200);
      }
    } catch (err) {
      // User cancelled share dialog, or clipboard failed — try fallback
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareToast(true);
          setTimeout(() => setShareToast(false), 2200);
        } catch {
          // Last resort: prompt
          window.prompt('Copy this link to share:', shareUrl);
        }
      }
    }
  }, [route]);

  if (!route) return null;
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
  const segmentCount = route.lineSegments?.length || 0;
  const aboutParagraphs = buildAboutParagraphs(route.description);
  const highlightChips = getHighlights(route);

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <div
        ref={panelRef}
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          height: panelHeight != null ? `${panelHeight}px` : `${defaultHeightVh}vh`,
          width: isMobile ? '100%' : 'min(100%, 540px)',
          margin: '0 auto',
          overflow: 'hidden',
          transform: animationDone ? 'none' : (isMounted ? 'translateY(0)' : 'translateY(100%)'),
          transition: animationDone ? 'height 0.25s ease' : 'height 0.25s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'auto',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '10px 0 6px',
            cursor: 'ns-resize',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: 0,
          }}
          title="Drag to resize"
        >
          <div
            ref={handleBarRef}
            style={{
              width: isHandleHovered ? 48 : 36,
              height: 4,
              background: isHandleHovered ? 'var(--text-secondary)' : 'var(--border)',
              borderRadius: 2,
              transition: 'width 0.2s ease, background 0.2s ease',
            }}
          />
        </div>

        {/* Header — always visible */}
        <div style={{ padding: '4px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="section-label" style={{ marginBottom: 2 }}>Active Route</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                  fontFamily: 'Playfair Display, serif', lineHeight: 1.2, marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {route.name}
                </h2>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: `${DIFF_COLORS[route.difficulty]}22`,
                  color: DIFF_COLORS[route.difficulty],
                }}>
                  {route.difficulty}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <a
                  href={`${process.env.PUBLIC_URL}/kml/${encodeURIComponent(route.fileName)}`}
                  download
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, color: '#0ea5e9',
                    padding: '6px 10px', borderRadius: 10,
                    background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)',
                    textDecoration: 'none', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; }}
                  title={`Export GPS (${route.fileName})`}
                >
                  <Download size={12} /> Export GPS
                </a>
                <button
                  onClick={handleShare}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600,
                    color: shareToast ? '#34d399' : '#a78bfa',
                    padding: '6px 10px', borderRadius: 10,
                    background: shareToast ? 'rgba(52,211,153,0.1)' : 'rgba(167,139,250,0.1)',
                    border: `1px solid ${shareToast ? 'rgba(52,211,153,0.3)' : 'rgba(167,139,250,0.3)'}`,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={e => { if (!shareToast) e.currentTarget.style.background = 'rgba(167,139,250,0.2)'; }}
                  onMouseLeave={e => { if (!shareToast) e.currentTarget.style.background = 'rgba(167,139,250,0.1)'; }}
                  title="Share this route"
                >
                  {shareToast ? <Check size={12} /> : <Share2 size={12} />}
                  {shareToast ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>
            
            {(route.district || route.highlights) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, marginBottom: 8 }}>
                {route.district && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11 }}>
                    <MapPin size={11} />
                    <span className="truncate">{route.district}{route.province ? `, ${route.province}` : ''}</span>
                  </div>
                )}
                {route.highlights && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11 }}>
                    <Star size={11} />
                    <span className="truncate">{route.highlights}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 22 }}>
              {segmentCount > 1 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(14,165,233,0.1)',
                  color: '#0ea5e9',
                  border: '1px solid rgba(14,165,233,0.3)',
                }}>
                  {segmentCount} segments
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: 12, flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Clickable page titles */}
        <div style={{ padding: '6px 20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {['Summary', 'Profile', 'More'].map((label, idx) => (
            <button
              key={label}
              onClick={() => goToPage(idx)}
              style={{
                border: 'none',
                background: 'transparent',
                color: currentPage === idx ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: currentPage === idx ? 700 : 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '2px 0',
                borderBottom: currentPage === idx ? '2px solid var(--accent-primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
              aria-label={`Go to ${label} page`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Swipeable pages */}
        <div
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: currentPage === 0 ? '0 0 6px' : '0 0 12px' }}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          onMouseDown={handleMouseSwipeStart}
          onMouseUp={handleMouseSwipeEnd}
          onMouseLeave={clearMouseSwipe}
        >
          <div
            style={{
              display: 'flex',
              width: '300%',
              height: '100%',
              transform: `translateX(-${currentPage * 33.3333}%)`,
              transition: 'transform 0.28s ease',
            }}
          >
            {/* Page 1: Summary */}
            <div style={{ width: '33.3333%', minWidth: 0, padding: '6px 20px 0' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                <BigStat
                  icon={<Mountain size={14} />}
                  value={`${route.stats.distance}km`}
                  label="Distance"
                  color={color}
                  compact={isMobile}
                  showRightDivider
                />
                <BigStat
                  icon={<TrendingUp size={14} />}
                  value={`+${route.stats.elevationGain}m`}
                  label="Gain"
                  color={color}
                  compact={isMobile}
                  showBottomDivider={isMobile}
                />
                <BigStat
                  icon={<TrendingDown size={14} />}
                  value={`-${route.stats.elevationLoss}m`}
                  label="Loss"
                  color="var(--accent-blue)"
                  compact={isMobile}
                  showRightDivider={isMobile}
                />
                <BigStat
                  icon={<Clock size={14} />}
                  value={formatEstimatedTime(route.stats.estimatedHours)}
                  label="Time"
                  color="var(--accent-green)"
                  compact={isMobile}
                />
              </div>
            </div>

            {/* Page 2: Elevation profile */}
            <div style={{ width: '33.3333%', minWidth: 0, padding: '8px 20px 0', display: 'flex', flexDirection: 'column' }}>
              <div className="section-label" style={{ marginBottom: 6, flexShrink: 0 }}>Elevation Profile</div>
              <div style={{ flex: 1, minHeight: 80, opacity: showChartDeferred ? 1 : 0, transition: 'opacity 0.3s ease', position: 'relative' }}>
                {route.loadError ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', textAlign: 'center', padding: '0 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Failed to load route details</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{route.loadError}</span>
                  </div>
                ) : !route.isLazyLoaded ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ width:24, height:24, border:`2px solid var(--accent-primary)`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', marginBottom: 8 }} />
                    <span style={{ fontSize: 11 }}>Loading route details...</span>
                  </div>
                ) : (
                  showChartDeferred && <ElevationChart route={route} color={color} />
                )}
              </div>
              {route.stats?.maxElevation != null && (
                <div style={{ marginTop: 4, fontSize: 10, color: color, fontWeight: 600 }}>
                  Peak: {route.stats.maxElevation}m
                </div>
              )}
            </div>

            {/* Page 3: Extra information */}
            <div style={{ width: '33.3333%', minWidth: 0, padding: '8px 20px 0' }}>
              <StartEndBar
                startValue={route.stats.startElevation != null ? `${route.stats.startElevation}m` : '-'}
                endValue={route.stats.endElevation != null ? `${route.stats.endElevation}m` : '-'}
              />

              {route.isLazyLoaded && route.waypoints && route.waypoints.length >= 2 && (() => {
                const start = route.waypoints.find(w => w.type === 'start') || route.waypoints[0];
                const end = route.waypoints.find(w => w.type === 'end') || route.waypoints[route.waypoints.length - 1];
                const gmapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
                return (
                  <div style={{ paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <a
                      href={gmapsUrl(start.lat, start.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
                        textDecoration: 'none', transition: 'background 0.2s',
                        fontSize: 11, color: '#34d399', fontWeight: 600,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}
                      title={`Open start point in Google Maps (${start.lat.toFixed(4)}, ${start.lng.toFixed(4)})`}
                    >
                      <MapPin size={13} /> Start Point
                    </a>
                    <a
                      href={gmapsUrl(end.lat, end.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        textDecoration: 'none', transition: 'background 0.2s',
                        fontSize: 11, color: '#ef4444', fontWeight: 600,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                      title={`Open end point in Google Maps (${end.lat.toFixed(4)}, ${end.lng.toFixed(4)})`}
                    >
                      <Flag size={13} /> End Point
                    </a>
                  </div>
                );
              })()}

              {route.description && (
                <div style={{ paddingTop: 8 }}>
                  <div className="section-label" style={{ marginBottom: 4 }}>About</div>
                  {highlightChips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      {highlightChips.map(chip => (
                        <span
                          key={chip}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            borderRadius: 999,
                            padding: '3px 8px',
                          }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                  {(aboutParagraphs.length ? aboutParagraphs : [route.description]).map((paragraph, i) => (
                    <p
                      key={`about-${i}`}
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        margin: i === 0 ? '0 0 6px' : '0',
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {route.isLazyLoaded && route.stats.pointCount && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {route.stats.pointCount.toLocaleString()} GPS points
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ icon, value, label, color, compact = false, showRightDivider = false, showBottomDivider = false }) {
  return (
    <div style={{
      padding: compact ? '7px 8px' : '10px 12px',
      minHeight: compact ? 52 : 68,
      borderRight: showRightDivider ? '1px solid var(--border)' : 'none',
      borderBottom: showBottomDivider ? '1px solid var(--border)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', minWidth: 0 }}>
        <span style={{ display: 'flex', flexShrink: 0, opacity: 0.9 }}>{icon}</span>
        <span style={{ fontSize: compact ? 10 : 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ marginTop: compact ? 2 : 4, fontSize: compact ? 15 : 20, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function StartEndBar({ startValue, endValue }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: 10,
      padding: '10px 14px',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    }}>
      <div>
        <div className="section-label" style={{ marginBottom: 2 }}>Start</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{startValue}</div>
      </div>
      <div>
        <div className="section-label" style={{ marginBottom: 2, textAlign: 'right' }}>End</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>{endValue}</div>
      </div>
    </div>
  );
}
