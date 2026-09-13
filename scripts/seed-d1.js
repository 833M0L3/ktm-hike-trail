#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const kmlDir = path.join(projectRoot, 'public', 'kml');
const metadataPath = path.join(kmlDir, 'routes-metadata.json');
const outputSqlPath = path.join(projectRoot, 'seed.sql');

if (!fs.existsSync(metadataPath)) {
  console.error('routes-metadata.json not found in public/kml/');
  process.exit(1);
}

const metadataMap = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const files = Object.keys(metadataMap);

console.log(`Generating seed SQL for ${files.length} existing trails...`);

function escapeSql(str) {
  if (str === null || str === undefined) return "''";
  return `'${String(str).replace(/'/g, "''")}'`;
}

const sqlLines = [];

sqlLines.push('-- System User Seed');
const systemUserId = 'system-walknepalwalk-user';
sqlLines.push(`
INSERT OR IGNORE INTO users (id, google_id, email, name, avatar_url, role)
VALUES (
  '${systemUserId}',
  'system_walknepalwalk',
  'community@walknepalwalk.com.np',
  'WalkNepalWalk Community',
  'https://www.walknepalwalk.com.np/favicon.ico',
  'admin'
);
`);

sqlLines.push('-- Trails Seed (Approved Routes)');

let count = 0;
for (const fileName of files) {
  const meta = metadataMap[fileName];
  if (!meta) continue;

  const routeId = `seed-${Math.random().toString(36).substring(2, 10)}`;
  const name = meta.name || fileName.replace('.kml', '').replace(/_/g, ' ');
  const description = meta.description || '';
  const district = meta.district || '';
  const province = meta.province || '';
  const difficulty = meta.difficultyOverride !== 'Auto' ? meta.difficultyOverride : (meta.calculatedDifficulty || 'Moderate');
  const distance = meta.stats?.distance || 0;
  const gain = meta.stats?.elevationGain || 0;
  const loss = meta.stats?.elevationLoss || 0;
  const minEle = meta.stats?.minElevation || 0;
  const maxEle = meta.stats?.maxElevation || 0;
  const hours = meta.hoursOverride !== 'Auto' ? meta.hoursOverride : (meta.stats?.estimatedHours || 0);

  const boundsJson = JSON.stringify(meta.bounds || []);
  const startPosJson = JSON.stringify(meta.startPos || { lat: 27.7, lng: 85.3 });
  const r2Key = `tracks/system/${fileName}`;

  sqlLines.push(`
INSERT OR REPLACE INTO routes (
  id, user_id, name, description, district, province,
  file_name, file_format, r2_key, file_size, status,
  difficulty, distance_km, elevation_gain_m, elevation_loss_m,
  min_elevation_m, max_elevation_m, estimated_hours,
  bounds_json, start_pos_json, waypoints_json, elevation_profile_json,
  reviewed_by, reviewed_at
) VALUES (
  ${escapeSql(routeId)},
  '${systemUserId}',
  ${escapeSql(name)},
  ${escapeSql(description)},
  ${escapeSql(district)},
  ${escapeSql(province)},
  ${escapeSql(fileName)},
  'kml',
  ${escapeSql(r2Key)},
  1024,
  'approved',
  ${escapeSql(difficulty)},
  ${distance},
  ${gain},
  ${loss},
  ${minEle},
  ${maxEle},
  ${hours},
  ${escapeSql(boundsJson)},
  ${escapeSql(startPosJson)},
  '[]',
  '[]',
  '${systemUserId}',
  CURRENT_TIMESTAMP
);`);
  count++;
}

fs.writeFileSync(outputSqlPath, sqlLines.join('\n'), 'utf8');
console.log(`Generated ${outputSqlPath} with ${count} routes ready for Cloudflare D1!`);
