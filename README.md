# Sure Step Marine Fleet Manager — v0.5 demo

Interactive browser prototype for rental-boat fleet management.

## Preview and deployment

This is a static website: publish the **repository root** with Netlify (no build command; publish directory `.`). Files: `index.html`, `styles.css`, `app.js`.

To run locally, open `index.html` in Chrome or Edge. Satellite imagery and Leaflet require internet access. Some embedded previews block external imagery even when the downloaded site works.

## Features

- Fleet dashboard, demo rentals, maintenance, engine monitoring, reports, alerts, settings.
- Satellite / aerial / street basemaps and demo boat positions.
- Polygon geofence editor: **Draw New** → click 3+ corner locations → **click the first point again to close** → name and assign boats → Save Polygon. Existing polygons can be edited.
- Ctrl + mouse-wheel zoom. GeoJSON geofence export.
- Browser-local demo storage and reset controls.

## Important limitations

**Demo only.** Simulated locations and sample data. No authentication, actual GPS telemetry, Blues Notehub, database, SMS delivery, or device-side geofence enforcement. Browser localStorage is per browser/profile, not shared between users and may be lost when site storage is cleared. Do not add real customer data or API secrets to this public repository. Before a production rollout, implement authenticated, tenant-isolated backend storage and validate all tracking and alert workflows.

Maps are **not for navigation**; review imagery licensing, permitted usage, and rate limits before commercial use.

## Planned integrations

Blues Notecard / Notehub telemetry; Supabase authentication and PostgreSQL storage; multiple engines per boat (Yamaha/Mercury/Suzuki via NMEA 2000 or optional legacy tach interface); high-water, battery voltage, geofence, parked movement and service alerts; full maintenance log.
