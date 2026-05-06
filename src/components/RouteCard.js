import { Mountain, Clock, TrendingUp, ChevronRight, Trash2, Download } from 'lucide-react';

const ROUTE_COLORS = [
  '#f97316', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa',
  '#fb7185', '#22d3ee', '#84cc16', '#e879f9', '#38bdf8',
];

const DIFFICULTY_CLASS = {
  Easy: 'badge-easy',
  Moderate: 'badge-moderate',
  Hard: 'badge-hard',
  Extreme: 'badge-extreme',
};

export default function RouteCard({ route, index, isActive, onClick, onDelete }) {
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

  return (
    <div
      className={`route-card rounded-xl p-4 cursor-pointer relative group ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Accent color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
        background: color, borderRadius: '0 2px 2px 0',
        opacity: isActive ? 1 : 0.5,
        transition: 'opacity 0.2s',
      }} />

      <div style={{ paddingLeft: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="truncate"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}
            >
              {route.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={DIFFICULTY_CLASS[route.difficulty]}
                style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}
              >
                {route.difficulty}
              </span>
              <a
                href={`/kml/${encodeURIComponent(route.fileName)}`}
                download
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600, color: '#0ea5e9',
                  padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)',
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; }}
                title="Download KML"
              >
                <Download size={10} /> KML
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(route.id); }}
              style={{
                opacity: 0,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#ef4444',
                transition: 'opacity 0.2s', display: 'flex', alignItems: 'center',
              }}
              title="Delete Route"
              className="group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </button>
            <ChevronRight size={14} style={{ color: isActive ? color : 'var(--text-muted)', transition: 'color 0.2s' }} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <StatItem icon={<Mountain size={10} />} value={`${route.stats.distance}km`} label="Distance" color={color} />
          <StatItem icon={<TrendingUp size={10} />} value={`+${route.stats.elevationGain}m`} label="Gain" color={color} />
          <StatItem icon={<Clock size={10} />} value={`${route.stats.estimatedHours}h`} label="Est. Time" color={color} />
        </div>

        {/* Elevation range bar */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: `${Math.max(0, ((route.stats.minElevation - 500) / 8500) * 100)}%`,
              width: `${Math.min(100, ((route.stats.maxElevation - route.stats.minElevation) / 8500) * 100)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {route.stats.minElevation}m – {route.stats.maxElevation}m
          </span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, value, label, color }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 8px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
