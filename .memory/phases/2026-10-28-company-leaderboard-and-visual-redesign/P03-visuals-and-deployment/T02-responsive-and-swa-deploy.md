# Task: T02 Responsive Viewport and SWA Deploy

## Status: pending

## Goal
Expand the play frame to the available browser size, add optional fullscreen, configure the existing official Azure SWA workflow to deploy both static assets and Functions API, and keep the `site/` deployment mirror exact.

## Decision Summary
- Target the existing blue-coast Azure Static Web Apps deployment workflow and `site/` app directory.
- Use Node 22 managed Functions; deploy the existing `api/` folder through the SWA workflow.
- Do not push or modify Azure resources/secrets in this task. Azure account/resource setup remains guarded by the no-additional-cost inspection documented in P01.

## Implementation

### I01. Responsive game sizing and fullscreen
- Related Files:
  - `styles.css` :: `.game-shell`, `.game-frame`, overlay/toolbar responsive rules; modify
  - `index.html` :: optional fullscreen button/status; modify
  - `game.js` :: `bindUI`, `toggleFullscreen`, `renderUI`; modify
- Details:
  - Replace fixed 960px frame cap with width `min(94vw, calc((100dvh - safe vertical margins) * 16 / 9))`, max width `1600px`, preserve 16:9, and handle viewport resize/short landscape screens without cropping the canvas.
  - Fullscreen button calls `requestFullscreen`/`exitFullscreen` with feature detection; keep optional; update label/`aria-pressed` on `fullscreenchange` and provide a graceful unsupported/error message.
  - Ensure title/map/ranking/pause/controls overlays scroll internally when their content exceeds the 16:9 frame.

### I02. SWA config, deployment workflow, and mirror
- Related Files:
  - `site/staticwebapp.config.json` :: configure `platform.apiRuntime` as `node:22`, navigation fallback, and security headers; new
  - `.github/workflows/azure-static-web-apps-blue-coast-030823200.yml` :: `api_location: api`; modify
  - `site/index.html`, `site/game.js`, `site/styles.css`, `site/auth.js`, `site/vendor/msal-browser.min.js` :: deploy copies; modify/new
  - `scripts/sync-site.ps1` :: deterministic root-to-site synchronization; new
- Details:
  - Configure Node `node:22`, SPA fallback to `/index.html` only for non-API routes, and headers `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP that permits only same-origin plus the required Entra login/token endpoints. Do not put tenant/client secret values in config.
  - Set only the blue-coast workflow `api_location: api`; preserve the existing token secret reference and current static `skip_app_build: true` behavior if the deployment action supports managed API packaging in this mode. If API packaging requires Oryx build, remove `skip_app_build` only after local path/build validation and set explicit empty `api_build_command` only if supported.
  - Sync the runtime web files from root to `site/` and add a validation mode that compares bytes; do not overwrite `.github` or `.memory` content.
  - Add sample SWA API application setting names to setup docs, not values: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_API_AUDIENCE`, `ENTRA_API_SCOPE`, `COSMOS_API_KIND`, and either NoSQL or Table secrets/settings. Never commit real values.
  - Preserve the separate lively-rock workflow unchanged; do not push or run an Azure deployment from this task.

## Acceptance Criteria
- [ ] Game frame fills approximately 94% of available width while remaining 16:9 and height-bounded; fullscreen remains opt-in.
- [ ] Official blue-coast workflow deploys `site/` plus the API folder with Node 22.
- [ ] Root and `site/` runtime files are byte-identical after sync and validation passes.
- [ ] No tenant credential, API secret, or Cosmos key is committed.
- [ ] No Azure resource or remote repository is changed by this task.

## Validation
- `node --check game.js`
- `node --check auth.js`
- `npm --prefix api test`
- `node -e "JSON.parse(require('fs').readFileSync('site/staticwebapp.config.json','utf8'))"`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-site.ps1 -Check`
- `git diff --check`

## Commit Message
```text
feat(deploy): enlarge game and wire SWA managed API

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P03-visuals-and-deployment
Task: T02-responsive-and-swa-deploy

- Fit the game to browser size with optional fullscreen
- Configure Node 22 API deployment and verify site mirror
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
