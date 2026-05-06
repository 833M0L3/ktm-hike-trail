import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mountain, TrendingUp, TrendingDown, Clock, Layers, Download, MapPin, Flag, Star } from 'lucide-react';
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

export default function RouteDetail({ route, index, onClose, isMobile, onHeightChange }) {
  const [panelHeight, setPanelHeight] = useState(null);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const panelRef = useRef(null);
  const handleBarRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [showChartDeferred, setShowChartDeferred] = useState(false);

  const defaultHeightVh = isMobile ? 40 : 65;

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
  }, [route?.id]);

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

  if (!route) return null;
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
  const resolvedHeight = panelHeight != null ? panelHeight : window.innerHeight * defaultHeightVh / 100;

  const showStats      = resolvedHeight > (isMobile ? 130 : 160);
  const showMiniStats  = resolvedHeight > (isMobile ? 180 : 220);
  const showChart      = resolvedHeight > (isMobile ? 160 : 200);
  const showDescription = resolvedHeight > (isMobile ? 300 : 340);
  const showDataPoints = resolvedHeight > (isMobile ? 260 : 300);

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
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'Playfair Display, serif', lineHeight: 1.2, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {route.name}
            </h2>
            
            {(route.district || route.highlights) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                background: `${DIFF_COLORS[route.difficulty]}22`,
                color: DIFF_COLORS[route.difficulty],
                border: `1px solid ${DIFF_COLORS[route.difficulty]}44`,
              }}>
                {route.difficulty}
              </span>
              <a
                href={`${process.env.PUBLIC_URL}/kml/${encodeURIComponent(route.fileName)}`}
                download
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, color: '#0ea5e9',
                  padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)',
                  textDecoration: 'none', transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; }}
                title={`Download ${route.fileName}`}
              >
                <Download size={11} /> KML
              </a>
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

        {/* Flex content area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 0 12px' }}>

          {/* Big stats */}
          {showStats && (
            <div style={{ padding: '10px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flexShrink: 0 }}>
              <BigStat icon={<Mountain size={14} />} value={`${route.stats.distance}km`}         label="Distance" color={color} />
              <BigStat icon={<TrendingUp size={14} />} value={`+${route.stats.elevationGain}m`}  label="Gain"     color={color} />
              <BigStat icon={<TrendingDown size={14} />} value={`-${route.stats.elevationLoss}m`} label="Loss"     color="var(--accent-blue)" />
              <BigStat icon={<Clock size={14} />} value={`~${route.stats.estimatedHours}h`}       label="Time"     color="var(--accent-green)" />
            </div>
          )}

          {/* Mini elevation stats */}
          {showMiniStats && (
            <div style={{ padding: '8px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flexShrink: 0 }}>
              <MiniStat label="Start" value={`${route.stats.startElevation}m`} />
              <MiniStat label="Max"   value={`${route.stats.maxElevation}m`}   highlight={color} />
              <MiniStat label="End"   value={`${route.stats.endElevation}m`} />
            </div>
          )}

          {/* Start / End Google Maps links */}
          {showMiniStats && route.waypoints && route.waypoints.length >= 2 && (() => {
            const start = route.waypoints.find(w => w.type === 'start') || route.waypoints[0];
            const end = route.waypoints.find(w => w.type === 'end') || route.waypoints[route.waypoints.length - 1];
            const gmapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
            return (
              <div style={{ padding: '6px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
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

          {/* Elevation chart — fills remaining space */}
          {showChart && (
            <div style={{ flex: 1, minHeight: 60, padding: '8px 20px 0', display: 'flex', flexDirection: 'column' }}>
              <div className="section-label" style={{ marginBottom: 6, flexShrink: 0 }}>Elevation Profile</div>
              <div style={{ flex: 1, minHeight: 0, opacity: showChartDeferred ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                {showChartDeferred && <ElevationChart route={route} color={color} />}
              </div>
            </div>
          )}

          {/* Description */}
          {showDescription && route.description && (
            <div style={{ padding: '6px 20px 0', flexShrink: 0 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>About</div>
              <p style={{
                fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {route.description}
              </p>
            </div>
          )}

          {/* GPS point count */}
          {showDataPoints && (
            <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Layers size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {route.stats.pointCount.toLocaleString()} GPS data points recorded
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BigStat({ icon, value, label, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div style={{
      background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
      border: `1px solid ${highlight ? highlight + '33' : 'var(--border)'}`,
    }}>
      <div className="section-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: highlight || 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  );
}
