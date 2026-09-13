import { Hono } from 'hono';
import { requireAuth } from '../auth.js';
import { parseGPSContent } from '../parser.js';

const userRoutes = new Hono();

// Apply auth middleware to all user routes
userRoutes.use('*', requireAuth);

function generateUUID() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Upload and submit a GPX or KML track
 */
userRoutes.post('/upload', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const bucket = c.env.BUCKET;

    if (!db || !bucket) {
      return c.json({ error: 'Database or Object Storage not configured' }, 500);
    }

    let fileContent = '';
    let fileName = '';
    let trailName = '';
    let description = '';
    let district = '';
    let province = '';

    const contentType = c.req.header('Content-Type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return c.json({ error: 'Please select a valid GPS track file (.gpx or .kml)' }, 400);
      }

      fileName = file.name;
      fileContent = await file.text();
      trailName = (formData.get('name') || '').trim();
      description = (formData.get('description') || '').trim();
      district = (formData.get('district') || '').trim();
      province = (formData.get('province') || '').trim();
    } else {
      // JSON body support
      const body = await c.req.json();
      fileContent = body.fileContent;
      fileName = body.fileName || 'trail.gpx';
      trailName = (body.name || '').trim();
      description = (body.description || '').trim();
      district = (body.district || '').trim();
      province = (body.province || '').trim();
    }

    if (!fileContent || !fileContent.trim()) {
      return c.json({ error: 'Empty file content' }, 400);
    }

    const isKML = fileName.toLowerCase().endsWith('.kml');
    const isGPX = fileName.toLowerCase().endsWith('.gpx');

    if (!isKML && !isGPX) {
      return c.json(
        { error: 'Unsupported format. Only .kml and .gpx track files are allowed.' },
        400
      );
    }

    // Parse GPS content
    let parsed;
    try {
      parsed = parseGPSContent(fileContent, fileName);
    } catch (parseErr) {
      return c.json(
        { error: `Failed to parse GPS file: ${parseErr.message}` },
        400
      );
    }

    const finalName = trailName || parsed.name || fileName.replace(/\.(kml|gpx)$/i, '');
    const finalDescription = description || parsed.description || '';
    const routeId = generateUUID();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `tracks/${user.id}/${routeId}-${cleanFileName}`;

    // Upload raw file to Cloudflare R2
    const r2ContentType = isGPX
      ? 'application/gpx+xml'
      : 'application/vnd.google-earth.kml+xml';

    await bucket.put(r2Key, fileContent, {
      httpMetadata: { contentType: r2ContentType },
      customMetadata: {
        submittedBy: user.id,
        originalFileName: fileName,
      },
    });

    const fileSize = new TextEncoder().encode(fileContent).length;

    // Insert route into Cloudflare D1 with status 'pending'
    await db
      .prepare(
        `INSERT INTO routes (
          id, user_id, name, description, district, province,
          file_name, file_format, r2_key, file_size, status,
          difficulty, distance_km, elevation_gain_m, elevation_loss_m,
          min_elevation_m, max_elevation_m, estimated_hours,
          bounds_json, start_pos_json, waypoints_json, elevation_profile_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        routeId,
        user.id,
        finalName,
        finalDescription,
        district,
        province,
        fileName,
        parsed.format,
        r2Key,
        fileSize,
        parsed.difficulty,
        parsed.stats.distance,
        parsed.stats.elevationGain,
        parsed.stats.elevationLoss,
        parsed.stats.minElevation,
        parsed.stats.maxElevation,
        parsed.stats.estimatedHours,
        JSON.stringify(parsed.bounds),
        JSON.stringify(parsed.startPos),
        JSON.stringify(parsed.waypoints),
        JSON.stringify(parsed.elevationProfile)
      )
      .run();

    return c.json({
      success: true,
      message: 'Route uploaded successfully! It is now pending administrator review.',
      routeId,
      status: 'pending',
      summary: {
        name: finalName,
        difficulty: parsed.difficulty,
        distance: parsed.stats.distance,
        gain: parsed.stats.elevationGain,
        estimatedHours: parsed.stats.estimatedHours,
      },
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return c.json({ error: err.message || 'Upload failed' }, 500);
  }
});

/**
 * List all trails submitted by the logged-in user
 */
userRoutes.get('/my-routes', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;

    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const { results } = await db
      .prepare(
        `SELECT 
          id, name, description, district, province, file_name, file_format,
          status, difficulty, distance_km, elevation_gain_m, elevation_loss_m,
          estimated_hours, admin_note, reviewed_at, created_at, bounds_json, start_pos_json
        FROM routes 
        WHERE user_id = ? 
        ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all();

    const routes = (results || []).map((row) => {
      let bounds = null;
      let startPos = null;
      try { bounds = JSON.parse(row.bounds_json); } catch {}
      try { startPos = JSON.parse(row.start_pos_json); } catch {}

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        district: row.district || '',
        province: row.province || '',
        fileName: row.file_name,
        fileFormat: row.file_format,
        status: row.status,
        difficulty: row.difficulty,
        stats: {
          distance: row.distance_km,
          elevationGain: row.elevation_gain_m,
          elevationLoss: row.elevation_loss_m,
          estimatedHours: row.estimated_hours,
        },
        bounds,
        startPos,
        adminNote: row.admin_note || '',
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      };
    });

    return c.json({ routes, count: routes.length });
  } catch (err) {
    console.error('Error fetching user routes:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default userRoutes;
