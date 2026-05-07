import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ROUTE_COLORS = [
  '#f97316', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa',
  '#fb7185', '#22d3ee', '#84cc16', '#e879f9', '#38bdf8',
];

function FitBounds({ route, bottomPadding }) {
  const map = useMap();
  useEffect(() => {
    if (route?.bounds) {
      // Add extra bottom padding so the route renders above the detail card
      const pad = bottomPadding || 0;
      map.fitBounds(route.bounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, pad + 40],
        animate: true,
        duration: 0.8,
      });
    }
  }, [route, bottomPadding, map]);
  return null;
}

function AllRoutesBounds({ routes }) {
  const map = useMap();
  useEffect(() => {
    if (routes.length === 0) return;
    const allLats = routes.flatMap(r => r.bounds.map(b => b[0]));
    const allLngs = routes.flatMap(r => r.bounds.map(b => b[1]));
    const bounds = [[Math.min(...allLats), Math.min(...allLngs)], [Math.max(...allLats), Math.max(...allLngs)]];
    map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.8 });
  }, [routes, map]);
  return null;
}
// Watches for container resize and sidebar-toggle events
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let timer;
    const invalidate = () => {
      map.invalidateSize({ animate: false });
      clearTimeout(timer);
      timer = setTimeout(() => map.invalidateSize({ animate: false }), 400);
    };
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    window.addEventListener('sidebar-toggle', invalidate);
    return () => {
      observer.disconnect();
      window.removeEventListener('sidebar-toggle', invalidate);
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
};

function TileLayerToggle({ theme }) {
  const [mode, setMode] = useState('street');
  const tile = TILE_LAYERS[mode];

  // Toggle data-satellite on <html> so CSS can skip dark-mode filter for satellite
  useEffect(() => {
    if (mode === 'satellite') {
      document.documentElement.setAttribute('data-satellite', '');
    } else {
      document.documentElement.removeAttribute('data-satellite');
    }
  }, [mode]);

  return (
    <>
      <TileLayer key={mode} url={tile.url} attribution={tile.attribution} />
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
      }}>
        <button
          onClick={() => setMode(m => m === 'street' ? 'satellite' : 'street')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'border-color 0.2s, color 0.2s',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          title={mode === 'street' ? 'Switch to Satellite View' : 'Switch to Street View'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mode === 'street' ? (
              /* Globe icon */
              <><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>
            ) : (
              /* Map icon */
              <><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></>
            )}
          </svg>
          {mode === 'street' ? 'Satellite' : 'Map'}
        </button>
      </div>
    </>
  );
}

export default function MapView({ routes, activeRoute, onRouteClick, theme, detailPanelHeight }) {
  const center = [27.7172, 85.3240];

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={true}
    >
      <MapResizer />
      <TileLayerToggle theme={theme} />
      <ZoomControl position="bottomright" />

      {routes.map((route, idx) => {
        if (!route.coordinates || route.coordinates.length === 0) return null;

        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        const isActive = activeRoute?.id === route.id;
        const startPos = [route.coordinates[0].lat, route.coordinates[0].lng];

        if (isActive) {
          const positions = route.coordinates.map(c => [c.lat, c.lng]);
          return (
            <div key={route.id}>
              {/* Shadow/glow line */}
              <Polyline
                positions={positions}
                pathOptions={{ color: color, weight: 10, opacity: 0.15 }}
                eventHandlers={{ click: () => onRouteClick(route) }}
              />
              {/* Main line */}
              <Polyline
                positions={positions}
                pathOptions={{ color: color, weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
                eventHandlers={{ click: () => onRouteClick(route) }}
              >
                <Tooltip sticky>
                  <div style={{ fontSize: 13, fontWeight: 700, margin: '2px 4px' }}>{route.name}</div>
                  <div style={{ fontSize: 10, color: '#666', margin: '0 4px 2px' }}>{route.stats.distance}km • {route.difficulty}</div>
                </Tooltip>
              </Polyline>

              {/* Start marker */}
              <CircleMarker
                center={startPos}
                radius={8}
                pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
                eventHandlers={{ click: () => onRouteClick(route) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{route.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{route.fileName}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: color }}>{route.stats.distance}km</div>
                        <div style={{ fontSize: 10, color: '#475569' }}>Distance</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: color }}>{route.stats.elevationGain}m</div>
                        <div style={{ fontSize: 10, color: '#475569' }}>Gain</div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>

              {/* End marker */}
              <CircleMarker
                center={[route.coordinates[route.coordinates.length - 1].lat, route.coordinates[route.coordinates.length - 1].lng]}
                radius={6}
                pathOptions={{ color: '#fff', weight: 2, fillColor: '#1e293b', fillOpacity: 1 }}
                eventHandlers={{ click: () => onRouteClick(route) }}
              />
            </div>
          );
        } else {
          // For inactive routes, ONLY render a lightweight dot to prevent browser lag
          return (
            <CircleMarker
              key={route.id}
              center={startPos}
              radius={5}
              pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.7 }}
              eventHandlers={{ click: () => onRouteClick(route) }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{route.name}</div>
              </Tooltip>
            </CircleMarker>
          );
        }
      })}

      {activeRoute && <FitBounds route={activeRoute} bottomPadding={detailPanelHeight} />}
      {!activeRoute && routes.length > 0 && <AllRoutesBounds routes={routes} />}

      {/* Imperative hover dot — listens to DOM events, zero React overhead */}
      <HoverDot />
    </MapContainer>
  );
}

// Fully imperative: listens to 'chart-hover' CustomEvent, calls setLatLng() directly
function HoverDot() {
  const map = useMap();
  const glowRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    const glow = L.circleMarker([0, 0], {
      radius: 14, color: 'transparent', fillColor: '#f97316', fillOpacity: 0.25, weight: 0, interactive: false,
    });
    const dot = L.circleMarker([0, 0], {
      radius: 6, color: '#fff', weight: 2.5, fillColor: '#f97316', fillOpacity: 1, interactive: false,
    });
    glowRef.current = glow;
    dotRef.current = dot;

    const handler = (e) => {
      const coord = e.detail;
      if (coord) {
        const latlng = [coord.lat, coord.lng];
        glow.setLatLng(latlng).addTo(map);
        dot.setLatLng(latlng).addTo(map);
      } else {
        glow.remove();
        dot.remove();
      }
    };

    window.addEventListener('chart-hover', handler);
    return () => {
      window.removeEventListener('chart-hover', handler);
      glow.remove();
      dot.remove();
    };
  }, [map]);

  return null;
}
