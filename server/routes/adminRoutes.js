import { Hono } from 'hono';
import { requireAdmin } from '../auth.js';

const adminRoutes = new Hono();

// Apply admin middleware to all routes in this router
adminRoutes.use('*', requireAdmin);

/**
 * List all submissions pending review
 */
adminRoutes.get('/routes/pending', async (c) => {
  try {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const { results } = await db
      .prepare(
        `SELECT 
          r.*,
          u.name as submitter_name,
          u.email as submitter_email,
          u.avatar_url as submitter_avatar
        FROM routes r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC`
      )
      .all();

    const routes = (results || []).map((row) => {
      let bounds = null;
      let startPos = null;
      let waypoints = [];
      let elevationProfile = [];

      try { bounds = JSON.parse(row.bounds_json); } catch {}
      try { startPos = JSON.parse(row.start_pos_json); } catch {}
      try { waypoints = JSON.parse(row.waypoints_json || '[]'); } catch {}
      try { elevationProfile = JSON.parse(row.elevation_profile_json || '[]'); } catch {}

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        district: row.district || '',
        province: row.province || '',
        fileName: row.file_name,
        fileFormat: row.file_format,
        fileSize: row.file_size,
        status: row.status,
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
        waypoints,
        elevationProfile,
        submitter: {
          id: row.user_id,
          name: row.submitter_name || 'Anonymous',
          email: row.submitter_email || '',
          avatar: row.submitter_avatar || '',
        },
        createdAt: row.created_at,
      };
    });

    return c.json({ routes, count: routes.length });
  } catch (err) {
    console.error('Admin pending fetch error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Review (approve or reject) a submitted route
 */
adminRoutes.post('/routes/:id/review', async (c) => {
  try {
    const admin = c.get('user');
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await c.req.json();

    const action = body.action; // 'approve' or 'reject'
    const adminNote = (body.adminNote || '').trim();
    const nameOverride = (body.name || '').trim();
    const difficultyOverride = (body.difficulty || '').trim();

    if (action !== 'approve' && action !== 'reject') {
      return c.json({ error: 'Action must be either approve or reject' }, 400);
    }

    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const existing = await db
      .prepare('SELECT id, status, name, difficulty FROM routes WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Route not found' }, 404);
    }

    const finalStatus = action === 'approve' ? 'approved' : 'rejected';
    const finalName = nameOverride || existing.name;
    const finalDifficulty = difficultyOverride || existing.difficulty;

    await db
      .prepare(
        `UPDATE routes 
         SET status = ?, name = ?, difficulty = ?, admin_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(finalStatus, finalName, finalDifficulty, adminNote, admin.id, id)
      .run();

    return c.json({
      success: true,
      message: `Route ${action === 'approve' ? 'approved and published' : 'rejected'}.`,
      status: finalStatus,
    });
  } catch (err) {
    console.error('Admin review error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Get all trails (with optional status filter and search query) for admin management
 */
adminRoutes.get('/routes', async (c) => {
  try {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const status = c.req.query('status') || 'all';
    const search = c.req.query('search') || '';

    let query = `
      SELECT 
        r.*,
        u.name as submitter_name,
        u.email as submitter_email,
        u.avatar_url as submitter_avatar
      FROM routes r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (search.trim()) {
      query += ` AND (r.name LIKE ? OR r.district LIKE ? OR r.description LIKE ?)`;
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    query += ` ORDER BY r.created_at DESC`;

    const { results } = await db.prepare(query).bind(...params).all();

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
        fileSize: row.file_size,
        status: row.status,
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
        submitter: {
          id: row.user_id,
          name: row.submitter_name || 'Community',
          email: row.submitter_email || '',
          avatar: row.submitter_avatar || '',
        },
        createdAt: row.created_at,
      };
    });

    return c.json({ routes, count: routes.length });
  } catch (err) {
    console.error('Admin all routes fetch error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Edit / update an existing trail's data
 */
adminRoutes.put('/routes/:id', async (c) => {
  try {
    const admin = c.get('user');
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const existing = await db
      .prepare('SELECT * FROM routes WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: 'Route not found' }, 404);
    }

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const description = body.description !== undefined ? String(body.description) : existing.description;
    const difficulty = body.difficulty !== undefined ? String(body.difficulty).trim() : existing.difficulty;
    const district = body.district !== undefined ? String(body.district).trim() : existing.district;
    const province = body.province !== undefined ? String(body.province).trim() : existing.province;
    const status = body.status !== undefined ? String(body.status).trim() : existing.status;
    const distance = body.distance !== undefined ? parseFloat(body.distance) : existing.distance_km;
    const gain = body.elevationGain !== undefined ? parseInt(body.elevationGain, 10) : existing.elevation_gain_m;
    const loss = body.elevationLoss !== undefined ? parseInt(body.elevationLoss, 10) : existing.elevation_loss_m;
    const hours = body.estimatedHours !== undefined ? parseFloat(body.estimatedHours) : existing.estimated_hours;

    await db
      .prepare(
        `UPDATE routes
         SET name = ?, description = ?, difficulty = ?, district = ?, province = ?,
             status = ?, distance_km = ?, elevation_gain_m = ?, elevation_loss_m = ?,
             estimated_hours = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(
        name, description, difficulty, district, province,
        status, distance, gain, loss,
        hours, admin.id, id
      )
      .run();

    const updated = await db
      .prepare(
        `SELECT r.*, u.name as submitter_name, u.avatar_url as submitter_avatar 
         FROM routes r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.id = ?`
      )
      .bind(id)
      .first();

    let bounds = null;
    let startPos = null;
    let waypoints = [];
    let elevationProfile = [];
    try { bounds = JSON.parse(updated.bounds_json); } catch {}
    try { startPos = JSON.parse(updated.start_pos_json); } catch {}
    try { waypoints = JSON.parse(updated.waypoints_json || '[]'); } catch {}
    try { elevationProfile = JSON.parse(updated.elevation_profile_json || '[]'); } catch {}

    return c.json({
      success: true,
      message: 'Trail updated successfully',
      route: {
        id: updated.id,
        name: updated.name,
        description: updated.description || '',
        district: updated.district || '',
        province: updated.province || '',
        fileName: updated.file_name,
        fileFormat: updated.file_format,
        difficulty: updated.difficulty,
        status: updated.status,
        stats: {
          distance: updated.distance_km,
          elevationGain: updated.elevation_gain_m,
          elevationLoss: updated.elevation_loss_m,
          minElevation: updated.min_elevation_m,
          maxElevation: updated.max_elevation_m,
          estimatedHours: updated.estimated_hours,
        },
        bounds,
        startPos,
        waypoints,
        elevationProfile,
        submitter: {
          name: updated.submitter_name || 'Community',
          avatar: updated.submitter_avatar || '',
        },
      },
    });
  } catch (err) {
    console.error('Admin route update error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Delete a route permanently (D1 + R2)
 */
adminRoutes.delete('/routes/:id', async (c) => {
  try {
    const db = c.env.DB;
    const bucket = c.env.BUCKET;
    const id = c.req.param('id');

    if (!db) return c.json({ error: 'Database not configured' }, 500);

    const route = await db
      .prepare('SELECT r2_key FROM routes WHERE id = ?')
      .bind(id)
      .first();

    if (!route) {
      return c.json({ error: 'Route not found' }, 404);
    }

    if (bucket && route.r2_key) {
      try {
        await bucket.delete(route.r2_key);
      } catch (r2Err) {
        console.warn('Could not delete R2 object:', r2Err);
      }
    }

    await db.prepare('DELETE FROM routes WHERE id = ?').bind(id).run();

    return c.json({ success: true, message: 'Route deleted successfully' });
  } catch (err) {
    console.error('Admin delete error:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default adminRoutes;
