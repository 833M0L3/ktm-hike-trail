#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

const kmlDir = path.join(__dirname, 'public', 'kml');
const metadataPath = path.join(kmlDir, 'routes-metadata.json');

// --- Calculation Utilities (Ported from frontend kmlParser.js) ---
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
    estimatedHours: parseFloat(estimatedHours.toFixed(1))
  };
}

function getDifficulty(stats) {
  const score = (stats.distance * 0.5) + (stats.elevationGain / 100);
  if (score < 8) return 'Easy';
  if (score < 20) return 'Moderate';
  if (score < 40) return 'Hard';
  return 'Extreme';
}

function parseKMLFile(filePath, fileName) {
  const kmlText = fs.readFileSync(filePath, 'utf8');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'application/xml');

  const nameEl = xmlDoc.getElementsByTagName('name')[0];
  const name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : fileName.replace('.kml', '').replace(/_/g, ' ');

  const descEl = xmlDoc.getElementsByTagName('description')[0];
  const description = descEl && descEl.textContent ? descEl.textContent.replace(/<[^>]*>?/gm, '').trim() : '';

  let coordinates = [];

  // Find LineString coordinates
  const lineStrings = xmlDoc.getElementsByTagName('LineString');
  for (let i = 0; i < lineStrings.length; i++) {
    const coordEls = lineStrings[i].getElementsByTagName('coordinates');
    if (coordEls.length > 0) {
      const parsed = parseCoordinateString(coordEls[0].textContent);
      if (parsed.length > coordinates.length) coordinates = parsed;
    }
  }

  if (coordinates.length === 0) {
    const allCoords = xmlDoc.getElementsByTagName('coordinates');
    for (let i = 0; i < allCoords.length; i++) {
      const parsed = parseCoordinateString(allCoords[i].textContent);
      if (parsed.length > coordinates.length) coordinates = parsed;
    }
  }

  if (coordinates.length === 0) return null;

  const stats = calculateStats(coordinates);
  const difficulty = getDifficulty(stats);
  
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
  const startPos = { lat: coordinates[0].lat, lng: coordinates[0].lng };

  return { name, description, stats, difficulty, bounds, startPos };
}

// --- Main Script ---
let existingMetadata = {};
if (fs.existsSync(metadataPath)) {
  try { existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')); } 
  catch(e) { console.error("Warning: Could not parse routes-metadata.json"); }
}

const files = fs.readdirSync(kmlDir).filter(f => f.toLowerCase().endsWith('.kml')).sort();
const updatedMetadata = {};
let parsedCount = 0;

console.log('Calculating route statistics, please wait...');

files.forEach(file => {
  const filePath = path.join(kmlDir, file);
  const existing = existingMetadata[file];
  
  // We ALWAYS re-parse the KML to calculate stats/bounds.
  const parsedData = parseKMLFile(filePath, file);
  if (!parsedData) {
    console.error(`Skipping ${file} - Could not find valid coordinates.`);
    return;
  }
  
  parsedCount++;

  // Merge with existing user overrides if they exist
  updatedMetadata[file] = {
    name: existing?.name || parsedData.name,
    description: existing?.description !== undefined ? existing.description : parsedData.description,
    difficultyOverride: existing?.difficultyOverride || "Auto",
    hoursOverride: existing?.hoursOverride || "Auto",
    // Computed values
    calculatedDifficulty: parsedData.difficulty,
    stats: parsedData.stats,
    bounds: parsedData.bounds,
    startPos: parsedData.startPos
  };
});

fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2) + '\n', 'utf8');

console.log(`✅  routes-metadata.json updated! Successfully pre-calculated ${parsedCount} routes.`);
console.log(`📝  User overrides are preserved.`);
