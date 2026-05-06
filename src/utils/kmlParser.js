// KML Parser utility - converts KML to usable route data
export function parseKML(kmlText, fileName) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'application/xml');

  const nameEl = xmlDoc.querySelector('Document > name, Placemark > name');
  const name = nameEl?.textContent?.trim() || fileName.replace('.kml', '').replace(/_/g, ' ');

  const descEl = xmlDoc.querySelector('description');
  const description = descEl?.textContent?.trim() || '';

  let coordinates = [];

  const lineStringEl = xmlDoc.querySelector('LineString coordinates');
  if (lineStringEl) coordinates = parseCoordinateString(lineStringEl.textContent);

  if (coordinates.length === 0) {
    const trackCoords = xmlDoc.querySelectorAll('gx\\:coord, coord');
    if (trackCoords.length > 0) {
      coordinates = Array.from(trackCoords).map(el => {
        const parts = el.textContent.trim().split(' ');
        return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]), ele: parseFloat(parts[2]) || 0 };
      });
    }
  }

  if (coordinates.length === 0) {
    const allCoords = xmlDoc.querySelectorAll('coordinates');
    allCoords.forEach(el => {
      const parsed = parseCoordinateString(el.textContent);
      if (parsed.length > coordinates.length) coordinates = parsed;
    });
  }

  if (coordinates.length === 0) return null;

  const stats = calculateStats(coordinates);
  const difficulty = getDifficulty(stats);

  const sampled = sampleArray(coordinates, 300);
  const elevationProfile = sampled.map((c, i, arr) => ({
    distance: parseFloat(cumulativeDistance(arr, i).toFixed(2)),
    elevation: Math.round(c.ele),
    index: i,  // keep index for hover sync
  }));
  const sampledCoords = sampled; // GPS coords aligned 1:1 with elevationProfile

  const waypoints = [
    { lat: coordinates[0].lat, lng: coordinates[0].lng, label: 'Start', type: 'start' },
    { lat: coordinates[Math.floor(coordinates.length / 2)].lat, lng: coordinates[Math.floor(coordinates.length / 2)].lng, label: 'Midpoint', type: 'mid' },
    { lat: coordinates[coordinates.length - 1].lat, lng: coordinates[coordinates.length - 1].lng, label: 'End', type: 'end' },
  ];

  // Bounding box
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];

  return {
    id: generateId(),
    name,
    description,
    coordinates,
    stats,
    difficulty,
    elevationProfile,
    sampledCoords,
    waypoints,
    bounds,
    fileName,
    uploadedAt: new Date().toISOString(),
  };
}

function parseCoordinateString(str) {
  return str.trim().split(/\s+/)
    .map(coord => {
      const parts = coord.split(',');
      if (parts.length < 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const ele = parts[2] ? parseFloat(parts[2]) : 0;
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng, ele };
    })
    .filter(Boolean);
}

function haversineDistance(p1, p2) {
  const R = 6371000;
  const φ1 = p1.lat * Math.PI / 180;
  const φ2 = p2.lat * Math.PI / 180;
  const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
  const Δλ = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cumulativeDistance(arr, idx) {
  let dist = 0;
  for (let i = 1; i <= idx; i++) dist += haversineDistance(arr[i - 1], arr[i]) / 1000;
  return dist;
}

function calculateStats(coords) {
  let totalDist = 0, gain = 0, loss = 0;
  let minEle = Infinity, maxEle = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    if (coords[i].ele < minEle) minEle = coords[i].ele;
    if (coords[i].ele > maxEle) maxEle = coords[i].ele;
  }

  for (let i = 1; i < coords.length; i++) {
    totalDist += haversineDistance(coords[i - 1], coords[i]);
    const eleDiff = coords[i].ele - coords[i - 1].ele;
    if (eleDiff > 0) gain += eleDiff;
    else loss += Math.abs(eleDiff);
  }

  const distKm = totalDist / 1000;
  const estimatedHours = (distKm / 5) + (gain / 600);

  return {
    distance: parseFloat(distKm.toFixed(2)),
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
    minElevation: Math.round(minEle === Infinity ? 0 : minEle),
    maxElevation: Math.round(maxEle === -Infinity ? 0 : maxEle),
    startElevation: Math.round(coords[0].ele),
    endElevation: Math.round(coords[coords.length - 1].ele),
    estimatedHours: parseFloat(estimatedHours.toFixed(1)),
    pointCount: coords.length,
  };
}

function getDifficulty(stats) {
  const score = (stats.distance * 0.5) + (stats.elevationGain / 100);
  if (score < 8) return 'Easy';
  if (score < 20) return 'Moderate';
  if (score < 40) return 'Hard';
  return 'Extreme';
}

function sampleArray(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)]);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
