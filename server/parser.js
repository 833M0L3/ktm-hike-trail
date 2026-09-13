import { DOMParser } from '@xmldom/xmldom';

/**
 * Calculates Haversine distance in meters between two lat/lng points.
 */
export function haversineDistance(p1, p2) {
  const R = 6371000;
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoordinateString(str) {
  if (!str) return [];
  const cleaned = str.replace(/\s*,\s*/g, ',');
  return cleaned
    .trim()
    .split(/\s+/)
    .map((coord) => {
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

function parseTrackCoordinateString(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  const ele = parts[2] ? parseFloat(parts[2]) : 0;
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng, ele: isNaN(ele) ? 0 : ele };
}

/**
 * Extracts line segments from KML XML document.
 */
function extractKMLSegments(xmlDoc) {
  const segments = [];

  const lineStrings = xmlDoc.getElementsByTagName('LineString');
  for (let i = 0; i < lineStrings.length; i++) {
    const coordEls = lineStrings[i].getElementsByTagName('coordinates');
    for (let j = 0; j < coordEls.length; j++) {
      const parsed = parseCoordinateString(coordEls[j].textContent || '');
      if (parsed.length > 0) segments.push(parsed);
    }
  }

  if (segments.length === 0) {
    const trackEls = [
      ...Array.from(xmlDoc.getElementsByTagName('gx:Track') || []),
      ...Array.from(xmlDoc.getElementsByTagName('Track') || []),
    ];

    trackEls.forEach((trackEl) => {
      const trackCoords = [
        ...Array.from(trackEl.getElementsByTagName('gx:coord') || []),
        ...Array.from(trackEl.getElementsByTagName('coord') || []),
      ];

      const parsed = trackCoords
        .map((el) => parseTrackCoordinateString(el.textContent || ''))
        .filter(Boolean);

      if (parsed.length > 0) segments.push(parsed);
    });
  }

  if (segments.length === 0) {
    const allCoords = xmlDoc.getElementsByTagName('coordinates');
    let longest = [];
    for (let i = 0; i < allCoords.length; i++) {
      const parsed = parseCoordinateString(allCoords[i].textContent || '');
      if (parsed.length > longest.length) longest = parsed;
    }
    if (longest.length > 0) segments.push(longest);
  }

  return segments;
}

/**
 * Extracts track segments from GPX XML document.
 */
function extractGPXSegments(xmlDoc) {
  const segments = [];

  const getPtCoords = (pt) => {
    const latStr = pt.getAttribute('lat') || pt.getAttribute('LAT');
    const lngStr =
      pt.getAttribute('lon') ||
      pt.getAttribute('lng') ||
      pt.getAttribute('LON') ||
      pt.getAttribute('LNG');
    if (!latStr || !lngStr) return null;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    let ele = 0;
    const eleEl =
      pt.getElementsByTagName('ele')[0] || pt.getElementsByTagName('ELE')[0];
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
  const trksegs = xmlDoc.getElementsByTagName('trkseg');
  for (let i = 0; i < trksegs.length; i++) {
    const trkpts = trksegs[i].getElementsByTagName('trkpt');
    const segment = [];
    for (let j = 0; j < trkpts.length; j++) {
      const pt = getPtCoords(trkpts[j]);
      if (pt) segment.push(pt);
    }
    if (segment.length > 0) segments.push(segment);
  }

  // 2. If no trkseg, look for route points <rte><rtept>
  if (segments.length === 0) {
    const rtes = xmlDoc.getElementsByTagName('rte');
    for (let i = 0; i < rtes.length; i++) {
      const rtepts = rtes[i].getElementsByTagName('rtept');
      const segment = [];
      for (let j = 0; j < rtepts.length; j++) {
        const pt = getPtCoords(rtepts[j]);
        if (pt) segment.push(pt);
      }
      if (segment.length > 0) segments.push(segment);
    }
  }

  // 3. Fallback: all trkpts directly
  if (segments.length === 0) {
    const allTrkpts = xmlDoc.getElementsByTagName('trkpt');
    const segment = [];
    for (let i = 0; i < allTrkpts.length; i++) {
      const pt = getPtCoords(allTrkpts[i]);
      if (pt) segment.push(pt);
    }
    if (segment.length > 0) segments.push(segment);
  }

  return segments;
}

function calculateStats(segments) {
  const coords = segments.flat();
  let totalDist = 0;
  let gain = 0;
  let loss = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    if (coords[i].ele < minEle) minEle = coords[i].ele;
    if (coords[i].ele > maxEle) maxEle = coords[i].ele;
  }

  segments.forEach((segment) => {
    for (let i = 1; i < segment.length; i++) {
      totalDist += haversineDistance(segment[i - 1], segment[i]);
      const eleDiff = segment[i].ele - segment[i - 1].ele;
      if (eleDiff > 0) gain += eleDiff;
      else loss += Math.abs(eleDiff);
    }
  });

  const distKm = totalDist / 1000;
  const estimatedHours = distKm / 5 + gain / 600;

  return {
    distance: parseFloat(distKm.toFixed(2)),
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
    minElevation: Math.round(minEle === Infinity ? 0 : minEle),
    maxElevation: Math.round(maxEle === -Infinity ? 0 : maxEle),
    estimatedHours: parseFloat(estimatedHours.toFixed(1)),
    startElevation: coords.length > 0 ? Math.round(coords[0].ele) : 0,
    endElevation: coords.length > 0 ? Math.round(coords[coords.length - 1].ele) : 0,
  };
}

function getDifficulty(stats) {
  const score = stats.distance * 0.5 + stats.elevationGain / 100;
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

function simplifyLineSegments(segments, maxTotalPoints = 1500) {
  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);
  if (totalPoints <= maxTotalPoints) return segments;

  const ratio = maxTotalPoints / totalPoints;
  return segments.map((segment) => {
    if (segment.length <= 2) return segment;
    const targetCount = Math.max(2, Math.floor(segment.length * ratio));
    return sampleSegmentPreserveEnds(segment, targetCount);
  });
}

function buildElevationProfile(segments, maxPoints = 250) {
  const pointsWithDistance = [];
  let runningDistanceKm = 0;

  segments.forEach((segment) => {
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
    sampledCoords: sampled.map((p) => ({
      lat: p.coord.lat,
      lng: p.coord.lng,
      ele: Math.round(p.coord.ele || 0),
    })),
  };
}

/**
 * Main GPS parser function supporting both KML and GPX.
 */
export function parseGPSContent(fileText, fileName, formatHint = null) {
  const isGPX =
    formatHint === 'gpx' ||
    fileName.toLowerCase().endsWith('.gpx') ||
    fileText.includes('<gpx');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(fileText, 'application/xml');

  let name = '';
  let description = '';
  let lineSegments = [];

  if (isGPX) {
    const nameEl = xmlDoc.getElementsByTagName('name')[0];
    if (nameEl && nameEl.textContent) name = nameEl.textContent.trim();

    const descEl = xmlDoc.getElementsByTagName('desc')[0];
    if (descEl && descEl.textContent) description = descEl.textContent.trim();

    lineSegments = extractGPXSegments(xmlDoc);
  } else {
    // KML
    const nameEl = xmlDoc.getElementsByTagName('name')[0];
    if (nameEl && nameEl.textContent) name = nameEl.textContent.trim();

    const descEl = xmlDoc.getElementsByTagName('description')[0];
    if (descEl && descEl.textContent) {
      description = descEl.textContent.replace(/<[^>]*>?/gm, '').trim();
    }

    lineSegments = extractKMLSegments(xmlDoc);
  }

  const coordinates = lineSegments.flat();
  if (coordinates.length === 0) {
    throw new Error(`Could not find valid track coordinates in ${fileName}`);
  }

  if (!name) {
    name = fileName
      .replace(/\.(kml|gpx)$/i, '')
      .replace(/^[0-9]+_WNW_[0-9]+\./, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  const stats = calculateStats(lineSegments);
  const difficulty = getDifficulty(stats);
  const { elevationProfile, sampledCoords } = buildElevationProfile(lineSegments, 250);

  const simplifiedSegments = simplifyLineSegments(lineSegments, 1500);
  const simplifiedCoordinates = simplifiedSegments.flat().map((c) => ({
    lat: c.lat,
    lng: c.lng,
    ele: c.ele || 0,
  }));

  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const c = coordinates[i];
    if (c.lat < minLat) minLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng > maxLng) maxLng = c.lng;
  }

  const bounds = [
    [minLat, minLng],
    [maxLat, maxLng],
  ];

  const startPos = { lat: coordinates[0].lat, lng: coordinates[0].lng };
  const endPos = {
    lat: coordinates[coordinates.length - 1].lat,
    lng: coordinates[coordinates.length - 1].lng,
  };

  const waypoints = [
    { lat: startPos.lat, lng: startPos.lng, label: 'Start', type: 'start' },
    {
      lat: coordinates[Math.floor(coordinates.length / 2)].lat,
      lng: coordinates[Math.floor(coordinates.length / 2)].lng,
      label: 'Midpoint',
      type: 'mid',
    },
    { lat: endPos.lat, lng: endPos.lng, label: 'End', type: 'end' },
  ];

  return {
    name,
    description,
    format: isGPX ? 'gpx' : 'kml',
    stats,
    difficulty,
    bounds,
    startPos,
    waypoints,
    elevationProfile,
    sampledCoords,
    coordinates: simplifiedCoordinates,
    lineSegments: simplifiedSegments,
    lineSegmentsCount: lineSegments.length,
    pointCount: coordinates.length,
  };
}
