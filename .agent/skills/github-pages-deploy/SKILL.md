---
name: github-pages-deploy
description: Free hosting and automated deploys with GitHub Pages and GitHub Actions. Use when setting up the repo, workflows, base paths, custom domains, or when a deploy fails or shows broken links and missing assets.
---

# GitHub Pages and Actions deploy

Reference: https://docs.github.com/en/pages

## Setup
- Repo Settings, Pages, Source: "GitHub Actions". Deploys run from a workflow, not from a branch folder.
- Workflow `.github/workflows/deploy.yml`, triggered on push to `main` and manually (`workflow_dispatch`).
- Permissions: `contents: read`, `pages: write`, `id-token: write`. Concurrency group `pages` with cancel-in-progress.
- Steps: checkout, set up Node (cached), install with the lockfile, run tests, build, `actions/configure-pages`, `actions/upload-pages-artifact` (the build output folder), then a deploy job using `actions/deploy-pages`. Pin action versions to current major versions.
- Tests run before deploy. A failing test blocks the release, so a wrong layout never ships.

## Astro settings
- In `astro.config.mjs` set `site` to `https://<user>.github.io` and `base` to `/<repo>` (or `/` for a custom domain). Output is static (`output: 'static'`), one real HTML file per page.
- Use the base path helper for every internal link, asset, manifest and service worker URL. Never write a bare `/path`.
- Run heavy audits (Lighthouse) in GitHub Actions, not on the low-spec dev laptop.

## Base path
- A project site is served at `https://<user>.github.io/<repo>/`. All asset, link, service worker, manifest, sitemap and canonical URLs must respect that base path. Configure it in one place (for example a `BASE_PATH` build setting) and never hard-code `/`.
- A custom domain or a `<user>.github.io` repo serves from `/`. Keep the setting switchable.
- Add a `404.html`. Single-page-app routing is avoided, so use real files per page.
- If using Jekyll-free output, include an empty `.nojekyll` file.

## Custom domain (later)
- Add a `CNAME` file in the published output, configure DNS at the registrar, then enable "Enforce HTTPS" in Pages settings.

## Release routine
1. Work on a branch or on `main` in small commits.
2. Push. The workflow tests, builds and deploys.
3. Open the live URL and run the smoke test: home loads, one calculation works, offline reload works, no 404s in the network panel.
4. Record the deployed commit and date in progress.txt.

## Troubleshooting
- Blank page or missing CSS/JS: wrong base path.
- Old content after deploy: service worker cache not bumped, or browser cache. Hard reload and check the cache version.
- Workflow error "Pages not enabled": set Source to GitHub Actions in settings.
- Never commit secrets. This project needs none because it is fully client-side.
