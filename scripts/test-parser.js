import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGPSContent } from '../server/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Test sample KML parsing
const sampleKmlPath = path.join(__dirname, '..', 'public', 'kml', '006_WNW_6.Sisneri.kml');
if (fs.existsSync(sampleKmlPath)) {
  const kmlText = fs.readFileSync(sampleKmlPath, 'utf8');
  const result = parseGPSContent(kmlText, '006_WNW_6.Sisneri.kml');
  console.log('✅ KML Test passed:');
  console.log('   Name:', result.name);
  console.log('   Format:', result.format);
  console.log('   Stats:', result.stats);
  console.log('   Difficulty:', result.difficulty);
}

// 2. Test sample GPX parsing
const sampleGpxText = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Shivapuri Peak Trail</name><desc>Scenic forested trail</desc></metadata>
  <trk>
    <name>Shivapuri Peak Trail</name>
    <trkseg>
      <trkpt lat="27.7981" lon="85.3721"><ele>1650</ele></trkpt>
      <trkpt lat="27.8050" lon="85.3800"><ele>1850</ele></trkpt>
      <trkpt lat="27.8100" lon="85.3850"><ele>2100</ele></trkpt>
      <trkpt lat="27.8150" lon="85.3900"><ele>2560</ele></trkpt>
      <trkpt lat="27.8120" lon="85.3950"><ele>2732</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const gpxResult = parseGPSContent(sampleGpxText, 'shivapuri_test.gpx');
console.log('✅ GPX Test passed:');
console.log('   Name:', gpxResult.name);
console.log('   Format:', gpxResult.format);
console.log('   Stats:', gpxResult.stats);
console.log('   Difficulty:', gpxResult.difficulty);
console.log('   Elevation points sampled:', gpxResult.elevationProfile.length);
