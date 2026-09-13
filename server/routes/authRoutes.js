import { Hono } from 'hono';
import {
  signJWT,
  verifyGoogleToken,
  isAdminEmail,
  getUserFromRequest,
} from '../auth.js';

const auth = new Hono();

function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Public auth config endpoint (returns Google Client ID if configured)
 */
auth.get('/config', (c) => {
  return c.json({
    googleClientId: c.env?.GOOGLE_CLIENT_ID || '',
  });
});

/**
 * Google Sign-In verification endpoint
 */
auth.post('/google', async (c) => {
  try {
    const body = await c.req.json();
    const credential = body.credential;

    if (!credential) {
      return c.json({ error: 'Missing Google credential token' }, 400);
    }

    const clientId = c.env.GOOGLE_CLIENT_ID || '';
    const googleProfile = await verifyGoogleToken(credential, clientId);

    if (!googleProfile) {
      return c.json({ error: 'Invalid Google token' }, 401);
    }

    const db = c.env.DB;
    if (!db) {
      return c.json({ error: 'Database binding not configured' }, 500);
    }

    // Check if user exists by google_id or email
    let user = await db
      .prepare('SELECT * FROM users WHERE google_id = ? OR email = ?')
      .bind(googleProfile.googleId, googleProfile.email)
      .first();

    const isAdmin =
      isAdminEmail(googleProfile.email, c.env.ADMIN_EMAILS) ||
      (user && user.role === 'admin');

    if (!user) {
      const userId = generateUUID();
      const role = isAdmin ? 'admin' : 'user';

      await db
        .prepare(
          'INSERT INTO users (id, google_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(
          userId,
          googleProfile.googleId,
          googleProfile.email,
          googleProfile.name,
          googleProfile.avatarUrl,
          role
        )
        .run();

      user = {
        id: userId,
        google_id: googleProfile.googleId,
        email: googleProfile.email,
        name: googleProfile.name,
        avatar_url: googleProfile.avatarUrl,
        role,
      };
    } else {
      // Update details if changed
      const role = isAdmin ? 'admin' : user.role;
      await db
        .prepare(
          'UPDATE users SET name = ?, avatar_url = ?, role = ? WHERE id = ?'
        )
        .bind(googleProfile.name, googleProfile.avatarUrl, role, user.id)
        .run();

      user.name = googleProfile.name;
      user.avatar_url = googleProfile.avatarUrl;
      user.role = role;
    }

    // Generate JWT
    const secret = c.env.JWT_SECRET || 'ktm-edge-secure-key-default';
    const token = await signJWT({ userId: user.id, email: user.email, role: user.role }, secret);

    // Set cookie
    c.header(
      'Set-Cookie',
      `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    return c.json({ error: err.message || 'Authentication failed' }, 500);
  }
});

/**
 * Local / Dev mock login for instant testing without needing Google Cloud credentials
 */
auth.post('/mock', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const role = body.role === 'admin' ? 'admin' : 'user';
    const email = body.email || (role === 'admin' ? 'admin@ktmhikes.local' : 'hiker@ktmhikes.local');
    const name = body.name || (role === 'admin' ? 'Trail Administrator' : 'Local Hiker');
    const googleId = `mock_${role}_${email}`;

    const db = c.env.DB;
    if (!db) {
      return c.json({ error: 'Database binding not configured' }, 500);
    }

    let user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      const userId = generateUUID();
      await db
        .prepare(
          'INSERT INTO users (id, google_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(userId, googleId, email, name, '', role)
        .run();

      user = { id: userId, google_id: googleId, email, name, avatar_url: '', role };
    } else {
      await db
        .prepare('UPDATE users SET role = ? WHERE id = ?')
        .bind(role, user.id)
        .run();
      user.role = role;
    }

    const secret = c.env.JWT_SECRET || 'ktm-edge-secure-key-default';
    const token = await signJWT({ userId: user.id, email: user.email, role: user.role }, secret);

    c.header(
      'Set-Cookie',
      `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Mock login error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Current user profile endpoint
 */
auth.get('/me', async (c) => {
  const user = await getUserFromRequest(c);
  if (!user) {
    return c.json({ user: null });
  }

  const isAdmin = user.role === 'admin' || isAdminEmail(user.email, c.env.ADMIN_EMAILS);
  if (isAdmin && user.role !== 'admin' && c.env.DB) {
    await c.env.DB.prepare('UPDATE users SET role = "admin" WHERE id = ?')
      .bind(user.id)
      .run()
      .catch(() => {});
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: isAdmin ? 'admin' : user.role,
    },
  });
});

/**
 * Logout endpoint
 */
auth.post('/logout', async (c) => {
  c.header(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return c.json({ success: true });
});

export default auth;
