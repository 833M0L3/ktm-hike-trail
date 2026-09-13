# Cloudflare Compute, D1, R2 & Google Auth Setup Guide

This guide explains how to run, test, and deploy the new full-stack **Kathmandu Valley Hikes Community Platform**.

---

## 🚀 Quick Local Development

You can run and test the complete system locally with zero cloud configuration using Wrangler's built-in SQLite (D1) and R2 emulators.

### 1. Initialize & Seed the Local Database
```bash
# Apply table schema to local D1
npm run db:migrate

# Seed the 99 existing Kathmandu Valley trails into local D1
npm run db:seed
```

### 2. Start the Backend Worker (Cloudflare Edge API)
In terminal 1:
```bash
npm run server
```
* The API runs on `http://127.0.0.1:8787`
* Health check: `http://127.0.0.1:8787/api/health`
* Public trails: `http://127.0.0.1:8787/api/routes`

### 3. Start the Frontend React App
In terminal 2:
```bash
npm start
```
* The app opens at `http://localhost:3000`
* Requests to `/api/*` are automatically proxied to the Worker on port 8787.

---

## 👤 Authentication & Admin Testing

### One-Click Local Testing (No Google Cloud Console Required)
1. Click **Sign In** in the top navigation bar.
2. Under **Developer / Local Quick Login**, click:
   * **Standard Hiker**: Tests uploading `.gpx` or `.kml` tracks and tracking submissions in **My Submissions** (status: *Pending Review*).
   * **Admin Reviewer**: Grants access to the **Admin Moderation** portal to review pending submissions, inspect metrics, and click **Approve & Publish Live** (which instantly promotes the route to the public map) or **Reject** with feedback.

### Production Google Sign-In Setup
When you are ready to enable official Google Sign-In:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Application type: *Web application*).
3. Under **Authorized JavaScript origins**, add your domain (e.g. `https://hikes.bimal1412.com.np` and `http://localhost:3000`).
4. Copy your **Client ID** and paste it into `wrangler.jsonc`:
   ```json
   "vars": {
     "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "ADMIN_EMAILS": "your-email@gmail.com",
     "JWT_SECRET": "your-secure-random-secret"
   }
   ```

---

## ☁️ Production Deployment to Cloudflare

### 1. Create Remote D1 Database & R2 Bucket
Run the following in your terminal using Wrangler:
```bash
# Create D1 Database
npx wrangler d1 create ktm-hikes-db

# Create R2 Storage Bucket
npx wrangler r2 bucket create ktm-hikes-tracks
```
Wrangler will print a `database_id`. Replace the placeholder ID in `wrangler.jsonc`:
```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ktm-hikes-db",
    "database_id": "PASTE_YOUR_ACTUAL_DATABASE_ID_HERE"
  }
]
```

### 2. Apply Schema & Seed Remote Database
```bash
# Apply schema to remote D1
npx wrangler d1 execute ktm-hikes-db --remote --file=schema.sql

# Seed existing routes to remote D1
npx wrangler d1 execute ktm-hikes-db --remote --file=seed.sql
```

### 3. Deploy App (Worker + React Single Page App)
```bash
# Build production bundle
npm run build

# Deploy Worker + Frontend static assets to Cloudflare Edge
npx wrangler deploy
```

Your app will be deployed globally on Cloudflare's edge network with ultra-low latency!
