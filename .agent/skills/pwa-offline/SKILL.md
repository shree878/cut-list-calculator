---
name: pwa-offline
description: Progressive Web App and offline rules (manifest, service worker, caching, install, updates). Use when adding offline support, install prompts, caching, or when debugging stale content after a deploy.
---

# PWA and offline

Reference: https://web.dev/learn/pwa

## Why
Workshops and supplier counters often have weak signal. After the first visit, every tool must open and calculate with no network.

## Requirements
- `manifest.webmanifest`: name, short_name, start_url, scope, display `standalone`, theme and background colours from tokens, icons (192 and 512 px plus a maskable icon).
- Service worker registered with the correct scope. All paths relative or built from the base path, because GitHub Pages project sites live under `/repo-name/`.
- Served over HTTPS (GitHub Pages provides it).

## Caching strategy
- Precache the app shell: HTML, CSS, JS, fonts, icons and every tool page.
- Static assets: cache-first with a versioned cache name (for example `cutopt-v3`).
- HTML pages: stale-while-revalidate, so pages load instantly and refresh in the background.
- No third-party runtime dependencies that break offline. Self-host fonts and libraries.
- Provide an offline fallback page only for URLs that were never cached.

## Updates
- Bump the cache version on every deploy (use the build hash or commit SHA). Delete old caches on activate.
- Show a small "New version available. Reload" notice instead of silently swapping content mid-calculation.

## User data offline
- Saved projects and settings live in localStorage or IndexedDB, wrapped in try/catch with graceful fallback. State clearly that data stays on the device.
- Offline status indicator in the header. Share-link and print features that need no network keep working.

## Install
- Do not nag. Offer "Install app" as a quiet button in the menu using the `beforeinstallprompt` event where supported. Provide short iOS "Add to Home Screen" instructions.

## Testing checklist
- Lighthouse PWA and installability audit.
- DevTools Application panel: offline mode on, reload every tool page, run a calculation.
- Test an update: deploy a change and confirm old clients fetch the new version and drop the old cache.
