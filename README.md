# Kathmandu Valley Hikes

A modern, responsive React application built to visualize hiking trails and hills around the Kathmandu Valley using raw KML files. The application automatically calculates distance, elevation gain/loss, and difficulty levels directly from GPS data.

## Features
- **Auto-KML Parsing:** Drop `.kml` files into a folder and let the app handle the math.
- **Dynamic Elevation Charts:** Visualizes the elevation profile of your hikes automatically.
- **Theme Support:** Clean, beautiful Light and Dark modes.
- **Responsive Design:** Functions flawlessly on desktop and operates as a full-screen app on mobile devices.
- **Metadata Overrides:** Easy-to-use JSON file allows you to manually override trail names, descriptions, and difficulty calculations without touching code.

---

## Getting Started

### 1. Installation
Ensure you have Node.js installed, then run the following in your terminal:
```bash
npm install
```

### 2. Starting the App
To run the app locally in development mode:
```bash
npm start
```
The app will open at `http://localhost:3000`.

---

## How to Add New Routes

Adding new hikes is incredibly simple. You don't need to write any code.

### Step 1: Add your KML files
Take any `.kml` file (exported from Google Earth, Strava, Garmin, etc.) and drop it directly into the following folder:
`public/kml/`

### Step 2: Update the Manifest
Because web browsers cannot magically scan folders, you must tell the app that new files exist. In your terminal, run:
```bash
npm run manifest
```
*What this does:* This triggers a background script that scans the `public/kml/` folder and generates/updates a master list called `routes-metadata.json`.

### Step 3: Edit Route Details (Optional)
When you run the command above, the app generates a block in `public/kml/routes-metadata.json` that looks like this:

```json
"your_new_hike.kml": {
  "name": "Your New Hike",
  "description": "",
  "difficulty": "Auto",
  "estimatedHours": "Auto"
}
```

You can open `routes-metadata.json` and edit it manually! 
- **`name` & `description`**: Replace these with whatever text you want to appear in the app.
- **`difficulty`**: By default, the app calculates this using math (`Auto`). You can override it by typing `"Easy"`, `"Moderate"`, `"Hard"`, or `"Extreme"`.
- **`estimatedHours`**: By default, this uses Naismith's hiking rule (`Auto`). You can override it by typing a number (like `4.5`).

*Note: The `npm run manifest` script will **never** overwrite changes you've manually made to this file! Your edits are safe.*

### Step 4: Refresh
Once you've run the manifest command and made your optional edits, just go to your browser and hit **F5** to refresh the page. Your new routes will appear instantly!

---

## Deployment
Because this is a standard React app without a backend server, you can host it entirely for free on platforms like Vercel, Netlify, or GitHub Pages.

To build the app for production:
```bash
npm run build
```
This will compile all your files into a highly optimized `build/` folder. You can upload the contents of this folder directly to your web host.

**Important:** Before you run the build command, make sure you have run `npm run manifest` so that your latest KML files are included in the build!
