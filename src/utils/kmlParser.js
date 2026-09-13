// Universal GPS Parser utility - converts KML and GPX to usable route data
export function parseKML(text, fileName = 'track.kml') {
  return parseGPS(text, fileName);
}

export function parseGPS(text, fileName = 'track.kml') {
  const isGPX = fileName.toLowerCase().endsWith('.gpx') || text.includes('<gpx');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');

  let name = '';
  let description = '';
  let lineSegments = [];

  if (isGPX) {
    const nameEl = xmlDoc.querySelector('trk > name, name');
    name = nameEl?.textContent?.trim() || fileName.replace(/\.gpx$/i, '').replace(/_/g, ' ');
    const descEl = xmlDoc.querySelector('trk > desc, desc');
    description = descEl?.textContent?.trim() || '';
    lineSegments = extractGPXSegments(xmlDoc);
  } else {
    const nameEl = xmlDoc.querySelector('Document > name, Placemark > name');
    name = nameEl?.textContent?.trim() || fileName.replace(/\.kml$/i, '').replace(/_/g, ' ');
    const descEl = xmlDoc.querySelector('description');
    description = descEl?.textContent?.trim() || '';
    lineSegments = extractLineSegments(xmlDoc);
  }

  const coordinates = lineSegments.flat();
  if (coordinates.length === 0) return null;

  const stats = calculateStats(lineSegments);
  const difficulty = getDifficulty(stats);

  const { elevationProfile, sampledCoords } = buildElevationProfile(lineSegments, 300);
  const displayLineSegments = simplifyLineSegments(lineSegments, 12000);

  const waypoints = [
    { lat: coordinates[0].lat, lng: coordinates[0].lng, label: 'Start', type: 'start' },
    { lat: coordinates[Math.floor(coordinates.length / 2)].lat, lng: coordinates[Math.floor(coordinates.length / 2)].lng, label: 'Midpoint', type: 'mid' },
    { lat: coordinates[coordinates.length - 1].lat, lng: coordinates[coordinates.length - 1].lng, label: 'End', type: 'end' },
  ];

  const bounds = calculateBounds(coordinates);

  return {
    id: generateId(),
    name,
    description,
    coordinates,
    lineSegments,
    displayLineSegments,
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
  if (!str) return [];
  const cleaned = str.replace(/\s*,\s*/g, ',');
  return cleaned.trim().split(/\s+/)
    .map(coord => {
      const parts = coord.split(',');
      if (parts.length < 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const ele = parts[2] ? parseFloat(parts[2]) : 0;
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng, ele: isNaN(ele) ? 0 : ele };
    })
    .filter(Boolean);
}

function extractGPXSegments(xmlDoc) {
  const segments = [];

  const getPtCoords = (pt) => {
    const latStr = pt.getAttribute('lat') || pt.getAttribute('LAT');
    const lngStr = pt.getAttribute('lon') || pt.getAttribute('lng') || pt.getAttribute('LON') || pt.getAttribute('LNG');
    if (!latStr || !lngStr) return null;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    let ele = 0;
    const eleEl = pt.querySelector('ele, ELE');
    if (eleEl && eleEl.textContent) {
      const parsedEle = parseFloat(eleEl.textContent);
      if (!isNaN(parsedEle)) ele = parsedEle;
    }
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, ele };
    }
    return null;
  };

  // 1. Try track segments <trk><trkseg><trkpt>
  const trksegs = xmlDoc.querySelectorAll('trkseg');
  trksegs.forEach(trkseg => {
    const trkpts = trkseg.querySelectorAll('trkpt');
    const segment = [];
    trkpts.forEach(pt => {
      const coords = getPtCoords(pt);
      if (coords) segment.push(coords);
    });
    if (segment.length > 0) segments.push(segment);
  });

  // 2. If no trkseg, look for route points <rte><rtept>
  if (segments.length === 0) {
    const rtes = xmlDoc.querySelectorAll('rte');
    rtes.forEach(rte => {
      const rtepts = rte.querySelectorAll('rtept');
      const segment = [];
      rtepts.forEach(pt => {
        const coords = getPtCoords(pt);
        if (coords) segment.push(coords);
      });
      if (segment.length > 0) segments.push(segment);
    });
  }

  // 3. Fallback: all trkpts directly
  if (segments.length === 0) {
    const allTrkpts = xmlDoc.querySelectorAll('trkpt');
    const segment = [];
    allTrkpts.forEach(pt => {
      const coords = getPtCoords(pt);
      if (coords) segment.push(coords);
    });
    if (segment.length > 0) segments.push(segment);
  }

  return segments;
}

function extractLineSegments(xmlDoc) {
  const segments = [];

  const lineStringCoords = xmlDoc.querySelectorAll('LineString > coordinates, LineString coordinates');
  lineStringCoords.forEach(el => {
    const parsed = parseCoordinateString(el.textContent || '');
    if (parsed.length > 0) segments.push(parsed);
  });

  if (segments.length === 0) {
    const trackEls = xmlDoc.querySelectorAll('gx\\:Track, Track');
    trackEls.forEach(trackEl => {
      const trackCoords = trackEl.querySelectorAll('gx\\:coord, coord');
      const parsed = Array.from(trackCoords)
        .map(el => {
          const parts = (el.textContent || '').trim().split(' ');
          if (parts.length < 2) return null;
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const ele = parts[2] ? parseFloat(parts[2]) : 0;
          if (isNaN(lat) || isNaN(lng)) return null;
          return { lat, lng, ele: isNaN(ele) ? 0 : ele };
        })
        .filter(Boolean);

      if (parsed.length > 0) segments.push(parsed);
    });
  }

  if (segments.length === 0) {
    // Fallback for unusual KMLs: keep previous behavior by selecting the longest coordinate set.
    const allCoords = xmlDoc.querySelectorAll('coordinates');
    let longest = [];
    allCoords.forEach(el => {
      const parsed = parseCoordinateString(el.textContent || '');
      if (parsed.length > longest.length) longest = parsed;
    });
    if (longest.length > 0) segments.push(longest);
  }

  return segments;
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

function calculateStats(segments) {
  const coords = segments.flat();
  let totalDist = 0, gain = 0, loss = 0;
  let minEle = Infinity, maxEle = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    if (coords[i].ele < minEle) minEle = coords[i].ele;
    if (coords[i].ele > maxEle) maxEle = coords[i].ele;
  }

  segments.forEach(segment => {
    for (let i = 1; i < segment.length; i++) {
      totalDist += haversineDistance(segment[i - 1], segment[i]);
      const eleDiff = segment[i].ele - segment[i - 1].ele;
      if (eleDiff > 0) gain += eleDiff;
      else loss += Math.abs(eleDiff);
    }
  });

  const distKm = totalDist / 1000;
  const estimatedHours = (distKm / 5) + (gain / 600);

  return {
    distance: parseFloat(distKm.toFixed(2)),
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
    minElevation: Math.round(minEle === Infinity ? 0 : minEle),
    maxElevation: Math.round(maxEle === -Infinity ? 0 : maxEle),
    startElevation: coords.length > 0 ? Math.round(coords[0].ele) : 0,
    endElevation: coords.length > 0 ? Math.round(coords[coords.length - 1].ele) : 0,
    estimatedHours: parseFloat(estimatedHours.toFixed(1)),
    pointCount: coords.length,
  };
}

function buildElevationProfile(segments, maxPoints) {
  const pointsWithDistance = [];
  let runningDistanceKm = 0;

  segments.forEach(segment => {
    if (!segment.length) return;
    pointsWithDistance.push({ coord: segment[0], distance: runningDistanceKm });
    for (let i = 1; i < segment.length; i++) {
      runningDistanceKm += haversineDistance(segment[i - 1], segment[i]) / 1000;
      pointsWithDistance.push({ coord: segment[i], distance: runningDistanceKm });
    }
  });

  const sampled = sampleArray(pointsWithDistance, maxPoints);
  return {
    elevationProfile: sampled.map((p, i) => ({
      distance: parseFloat(p.distance.toFixed(2)),
      elevation: Math.round(p.coord.ele || 0),
      lat: p.coord.lat,
      lng: p.coord.lng,
      index: i,
    })),
    sampledCoords: sampled.map(p => ({
      lat: p.coord.lat,
      lng: p.coord.lng,
      ele: Math.round(p.coord.ele || 0),
    })),
  };
}

function simplifyLineSegments(segments, maxTotalPoints) {
  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);
  if (totalPoints <= maxTotalPoints) return segments;

  const ratio = maxTotalPoints / totalPoints;
  return segments.map(segment => {
    if (segment.length <= 2) return segment;
    const targetCount = Math.max(2, Math.floor(segment.length * ratio));
    return sampleSegmentPreserveEnds(segment, targetCount);
  });
}

function sampleSegmentPreserveEnds(segment, targetCount) {
  if (segment.length <= targetCount) return segment;
  if (targetCount <= 2) return [segment[0], segment[segment.length - 1]];

  const sampled = [segment[0]];
  const interiorCount = targetCount - 2;
  const interiorLength = segment.length - 2;
  const step = interiorLength / interiorCount;

  for (let i = 0; i < interiorCount; i++) {
    const idx = 1 + Math.floor(i * step);
    sampled.push(segment[idx]);
  }

  sampled.push(segment[segment.length - 1]);
  return sampled;
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

function calculateBounds(coords) {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (c.lat < minLat) minLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng > maxLng) maxLng = c.lng;
  }

  return [[minLat, minLng], [maxLat, maxLng]];
}
