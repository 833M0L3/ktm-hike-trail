import { useEffect, useRef } from 'react';
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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />

      {routes.map((route, idx) => {
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
