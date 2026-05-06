import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mountain, TrendingUp, TrendingDown, Clock, Layers } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const panelRef = useRef(null);

  const defaultHeightVh = isMobile ? 40 : 65;

  // Report height to parent whenever it changes
  useEffect(() => {
    const h = panelHeight != null ? panelHeight : window.innerHeight * defaultHeightVh / 100;
    onHeightChange?.(h);
  }, [panelHeight, defaultHeightVh, onHeightChange]);

  useEffect(() => {
    setPanelHeight(null);
  }, [route?.id]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY || e.touches?.[0]?.clientY || 0;
    const currentH = panelRef.current?.offsetHeight || (window.innerHeight * defaultHeightVh / 100);
    dragStartHeight.current = currentH;
  }, [defaultHeightVh]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const delta = dragStartY.current - clientY;
      const maxH = window.innerHeight * MAX_HEIGHT_VH / 100;
      setPanelHeight(Math.min(maxH, Math.max(MIN_HEIGHT, dragStartHeight.current + delta)));
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

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
          transition: isDragging ? 'none' : 'height 0.25s ease',
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
          <div style={{
            width: isDragging ? 56 : (isHandleHovered ? 48 : 36),
            height: 4,
            background: isDragging ? 'var(--accent-primary)' : (isHandleHovered ? 'var(--text-secondary)' : 'var(--border)'),
            borderRadius: 2,
            transition: 'all 0.2s ease',
          }} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                background: `${DIFF_COLORS[route.difficulty]}22`,
                color: DIFF_COLORS[route.difficulty],
                border: `1px solid ${DIFF_COLORS[route.difficulty]}44`,
              }}>
                {route.difficulty}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{route.fileName}</span>
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

          {/* Elevation chart — fills remaining space */}
          {showChart && (
            <div style={{ flex: 1, minHeight: 60, padding: '8px 20px 0', display: 'flex', flexDirection: 'column' }}>
              <div className="section-label" style={{ marginBottom: 6, flexShrink: 0 }}>Elevation Profile</div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ElevationChart route={route} color={color} />
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
