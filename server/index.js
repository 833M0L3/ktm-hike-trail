import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Disposition'],
    credentials: true,
  })
);

// API Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Kathmandu Valley Hikes API',
    timestamp: new Date().toISOString(),
    cloudflare: {
      d1: !!c.env?.DB,
      r2: !!c.env?.BUCKET,
    },
  });
});

// Mount Routes
app.route('/api/auth', authRoutes);
app.route('/api', publicRoutes);
app.route('/api/user', userRoutes);
app.route('/api/admin', adminRoutes);

// Fallback to static assets for frontend if ASSETS binding is present
app.all('*', async (c) => {
  if (c.env?.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.json({ error: 'Endpoint not found' }, 404);
});

export default app;
