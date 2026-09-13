// Web Crypto-based JWT implementation for Cloudflare Workers Edge runtime

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(secret, usage) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

export async function signJWT(payload, secret, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const dataToSign = `${encHeader}.${encPayload}`;

  const key = await getKey(secret, 'sign');
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
  const encSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encSignature}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encHeader, encPayload, encSignature] = parts;
    const dataToSign = `${encHeader}.${encPayload}`;
    const signature = base64UrlDecode(encSignature);

    const key = await getKey(secret, 'verify');
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(dataToSign)
    );

    if (!isValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encPayload)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies a Google ID Token via Google's tokeninfo API.
 */
export async function verifyGoogleToken(idToken, clientId) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error('Google token verification failed:', errText);
      return null;
    }
    const data = await res.json();
    
    // Optional check: if clientId is configured, ensure aud matches
    if (clientId && data.aud !== clientId) {
      console.error(`Audience mismatch: expected ${clientId}, got ${data.aud}`);
      return null;
    }

    return {
      googleId: data.sub,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      avatarUrl: data.picture || '',
    };
  } catch (err) {
    console.error('Error fetching Google tokeninfo:', err);
    return null;
  }
}

/**
 * Checks if an email is in the admin list
 */
export function isAdminEmail(email, adminEmailsConfig) {
  if (!email || !adminEmailsConfig) return false;
  const list = adminEmailsConfig.split(',').map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

/**
 * Extracts and verifies user token from Cookie or Authorization header.
 */
export async function getUserFromRequest(c) {
  const secret = c.env.JWT_SECRET || 'ktm-edge-secure-key-default';

  let token = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    // Check cookie
    const cookieHeader = c.req.header('Cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  const decoded = await verifyJWT(token, secret);
  if (!decoded || !decoded.userId) return null;

  // Retrieve user from D1
  if (c.env.DB) {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(decoded.userId)
      .first();

    if (user) {
      // Re-check admin status against config
      const isAdmin = user.role === 'admin' || isAdminEmail(user.email, c.env.ADMIN_EMAILS);
      return {
        ...user,
        role: isAdmin ? 'admin' : user.role,
      };
    }
  }

  return null;
}

/**
 * Hono Middleware: enforces that user is authenticated
 */
export async function requireAuth(c, next) {
  const user = await getUserFromRequest(c);
  if (!user) {
    return c.json({ error: 'Unauthorized: Please log in to perform this action' }, 401);
  }
  c.set('user', user);
  await next();
}

/**
 * Hono Middleware: enforces that user is an admin
 */
export async function requireAdmin(c, next) {
  const user = await getUserFromRequest(c);
  if (!user) {
    return c.json({ error: 'Unauthorized: Please log in as admin' }, 401);
  }
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin privilege required' }, 403);
  }
  c.set('user', user);
  await next();
}
