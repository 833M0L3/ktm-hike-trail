-- Cloudflare D1 Schema for Kathmandu Valley Hikes
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  district TEXT,
  province TEXT,
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK(file_format IN ('kml', 'gpx')),
  r2_key TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  difficulty TEXT NOT NULL,
  distance_km REAL NOT NULL,
  elevation_gain_m INTEGER NOT NULL,
  elevation_loss_m INTEGER NOT NULL,
  min_elevation_m INTEGER NOT NULL,
  max_elevation_m INTEGER NOT NULL,
  estimated_hours REAL NOT NULL,
  bounds_json TEXT NOT NULL,
  start_pos_json TEXT NOT NULL,
  waypoints_json TEXT,
  elevation_profile_json TEXT,
  coordinates_json TEXT,
  admin_note TEXT,
  reviewed_by TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_created ON routes(created_at DESC);
