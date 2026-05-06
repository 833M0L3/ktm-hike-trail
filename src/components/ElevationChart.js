import { useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MapPin } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={11} /> {label} km
        </div>
        <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{payload[0].value}m elevation</div>
      </div>
    );
  }
  return null;
};

export default function ElevationChart({ route, color = '#f97316' }) {
  if (!route?.elevationProfile?.length) return null;

  // Read CSS vars for Recharts (SVG doesn't support CSS custom properties natively)
  const style = getComputedStyle(document.documentElement);
  const borderColor = style.getPropertyValue('--border').trim() || '#1e2d3d';
  const mutedColor  = style.getPropertyValue('--text-muted').trim() || '#475569';

  const data = route.elevationProfile;
  const minEle = Math.min(...data.map(d => d.elevation));
  const maxEle = Math.max(...data.map(d => d.elevation));
  const domain = [Math.max(0, minEle - 200), maxEle + 200];

  // Dispatch hover coordinate via DOM event (bypasses React for performance)
  const dispatchCoord = (index) => {
    if (index != null && route.sampledCoords && route.sampledCoords[index]) {
      const coord = route.sampledCoords[index];
      window.dispatchEvent(new CustomEvent('chart-hover', { detail: { lat: coord.lat, lng: coord.lng } }));
    }
  };

  const dispatchClear = () => {
    window.dispatchEvent(new CustomEvent('chart-hover', { detail: null }));
  };

  // Desktop: Recharts onMouseMove
  const handleMouseMove = (state) => {
    if (state && state.activeTooltipIndex != null) {
      dispatchCoord(state.activeTooltipIndex);
    }
  };

  return (
    <ChartTouchWrapper data={data} sampledCoords={route.sampledCoords} onClear={dispatchClear}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={dispatchClear}
        >
          <defs>
            <linearGradient id={`grad-${route.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
          <XAxis
            dataKey="distance"
            tick={{ fill: mutedColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}km`}
            interval={Math.ceil(data.length / 5) - 1}
            minTickGap={40}
          />
          <YAxis
            domain={domain}
            tick={{ fill: mutedColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={5000}
            stroke="#60a5fa"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: '5000m', fill: '#60a5fa', fontSize: 9, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${route.id})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: borderColor, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartTouchWrapper>
  );
}

// Transparent overlay that handles touch events manually,
// mapping finger X position → data index → GPS coordinate
function ChartTouchWrapper({ data, sampledCoords, onClear, children }) {
  const containerRef = useRef(null);

  const handleTouch = useCallback((e) => {
    if (!containerRef.current || !sampledCoords || !data?.length) return;
    e.preventDefault(); // prevent scroll

    const touch = e.touches[0];
    if (!touch) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Chart area: account for Recharts margins (left: -20+35=15px, right: 10px)
    const chartLeft = rect.left + 15;
    const chartRight = rect.right - 10;
    const chartWidth = chartRight - chartLeft;

    const x = touch.clientX - chartLeft;
    const ratio = Math.max(0, Math.min(1, x / chartWidth));
    const index = Math.round(ratio * (data.length - 1));

    if (sampledCoords[index]) {
      const coord = sampledCoords[index];
      window.dispatchEvent(new CustomEvent('chart-hover', { detail: { lat: coord.lat, lng: coord.lng } }));
    }
  }, [data, sampledCoords]);

  const handleTouchEnd = useCallback(() => {
    onClear();
  }, [onClear]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', touchAction: 'none' }}
      onTouchMove={handleTouch}
      onTouchStart={handleTouch}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
