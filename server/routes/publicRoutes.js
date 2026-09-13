import { Hono } from 'hono';
import { parseGPSContent } from '../parser.js';

const publicRoutes = new Hono();

/**
 * List all approved hiking routes with search, filter, and sort options.
 */
publicRoutes.get('/routes', async (c) => {
  try {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'Database binding not configured' }, 500);

    const search = c.req.query('search') || '';
    const difficulty = c.req.query('difficulty') || 'All';
    const district = c.req.query('district') || 'All';
    const sort = c.req.query('sort') || 'name';

    let query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.district,
        r.province,
        r.file_name,
        r.file_format,
        r.difficulty,
        r.distance_km,
        r.elevation_gain_m,
        r.elevation_loss_m,
        r.min_elevation_m,
        r.max_elevation_m,
        r.estimated_hours,
        r.bounds_json,
        r.start_pos_json,
        r.created_at,
        u.name as submitter_name,
        u.avatar_url as submitter_avatar
      FROM routes r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status = 'approved'
    `;

    const params = [];

    if (search.trim()) {
      query += ` AND (r.name LIKE ? OR r.district LIKE ? OR r.description LIKE ?)`;
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    if (difficulty !== 'All') {
      query += ` AND r.difficulty = ?`;
      params.push(difficulty);
    }

    if (district !== 'All') {
      query += ` AND r.district = ?`;
      params.push(district);
    }

    if (sort === 'distance') {
      query += ` ORDER BY r.distance_km DESC`;
    } else if (sort === 'gain') {
      query += ` ORDER BY r.elevation_gain_m DESC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY r.created_at DESC`;
    } else {
      query += ` ORDER BY r.name ASC`;
    }

    const stmt = db.prepare(query);
    const { results } = await stmt.bind(...params).all();

    // Map to the shape expected by frontend
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
        difficulty: row.difficulty,
        stats: {
          distance: row.distance_km,
          elevationGain: row.elevation_gain_m,
          elevationLoss: row.elevation_loss_m,
          minElevation: row.min_elevation_m,
          maxElevation: row.max_elevation_m,
          estimatedHours: row.estimated_hours,
        },
        bounds,
        startPos,
        coordinates: startPos ? [startPos, startPos] : [],
        submitter: {
          name: row.submitter_name || 'Community',
          avatar: row.submitter_avatar || '',
        },
        createdAt: row.created_at,
        isLazyLoaded: false,
      };
    });

    return c.json({ routes, total: routes.length });
  } catch (err) {
    console.error('Error fetching routes:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Get detailed route data (including sampled elevation profile and waypoints)
 */
publicRoutes.get('/routes/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    if (!db) return c.json({ error: 'Database binding not configured' }, 500);

    const row = await db
      .prepare(
        `SELECT r.*, u.name as submitter_name, u.avatar_url as submitter_avatar 
         FROM routes r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.id = ? AND r.status = 'approved'`
      )
      .bind(id)
      .first();

    if (!row) {
      return c.json({ error: 'Route not found or not approved' }, 404);
    }

    let bounds = null;
    let startPos = null;
    let waypoints = [];
    let elevationProfile = [];
    let coordinates = [];

    try { bounds = JSON.parse(row.bounds_json); } catch {}
    try { startPos = JSON.parse(row.start_pos_json); } catch {}
    try { waypoints = JSON.parse(row.waypoints_json || '[]'); } catch {}
    try { elevationProfile = JSON.parse(row.elevation_profile_json || '[]'); } catch {}
    try { coordinates = JSON.parse(row.coordinates_json || '[]'); } catch {}

    // Auto-heal / backfill coordinates from R2 storage if coordinates_json was not cached or has <= 2 points
    if ((!coordinates || coordinates.length < 5) && row.r2_key && c.env.BUCKET) {
      try {
        const obj = await c.env.BUCKET.get(row.r2_key);
        if (obj) {
          const fileText = await obj.text();
          const parsed = parseGPSContent(fileText, row.file_name, row.file_format);
          if (parsed?.coordinates?.length) {
            coordinates = parsed.coordinates;
            if (parsed.elevationProfile?.length) elevationProfile = parsed.elevationProfile;
            if (parsed.waypoints?.length) waypoints = parsed.waypoints;

            // Cache back into D1
            await db
              .prepare(
                'UPDATE routes SET coordinates_json = ?, elevation_profile_json = ?, waypoints_json = ? WHERE id = ?'
              )
              .bind(
                JSON.stringify(coordinates),
                JSON.stringify(elevationProfile),
                JSON.stringify(waypoints),
                row.id
              )
              .run();
          }
        }
      } catch (r2Err) {
        console.warn('Could not auto-recover coordinates from R2:', r2Err);
      }
    }

    return c.json({
      id: row.id,
      name: row.name,
      description: row.description || '',
      district: row.district || '',
      province: row.province || '',
      fileName: row.file_name,
      fileFormat: row.file_format,
      difficulty: row.difficulty,
      stats: {
        distance: row.distance_km,
        elevationGain: row.elevation_gain_m,
        elevationLoss: row.elevation_loss_m,
        minElevation: row.min_elevation_m,
        maxElevation: row.max_elevation_m,
        estimatedHours: row.estimated_hours,
        startElevation: waypoints[0]?.elevation || row.min_elevation_m,
        endElevation: waypoints[waypoints.length - 1]?.elevation || row.min_elevation_m,
      },
      bounds,
      startPos,
      coordinates,
      lineSegments: [coordinates],
      displayLineSegments: [coordinates],
      waypoints,
      elevationProfile,
      submitter: {
        name: row.submitter_name || 'Community',
        avatar: row.submitter_avatar || '',
      },
      createdAt: row.created_at,
      isLazyLoaded: true,
    });
  } catch (err) {
    console.error('Error fetching route detail:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Download raw KML / GPX track file from Cloudflare R2
 */
publicRoutes.get('/routes/:id/download', async (c) => {
  try {
    const db = c.env.DB;
    const bucket = c.env.BUCKET;
    const id = c.req.param('id');

    if (!db || !bucket) {
      return c.json({ error: 'Storage or Database not configured' }, 500);
    }

    const row = await db
      .prepare('SELECT file_name, file_format, r2_key, status FROM routes WHERE id = ?')
      .bind(id)
      .first();

    if (!row) {
      return c.json({ error: 'Route not found' }, 404);
    }

    const object = await bucket.get(row.r2_key);
    if (!object) {
      return c.json({ error: 'Track file not found in storage' }, 404);
    }

    const contentType =
      row.file_format === 'gpx'
        ? 'application/gpx+xml'
        : 'application/vnd.google-earth.kml+xml';

    c.header('Content-Type', contentType);
    c.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.file_name)}"`
    );

    return c.body(object.body);
  } catch (err) {
    console.error('Download error:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default publicRoutes;
