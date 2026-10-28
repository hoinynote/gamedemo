# Task: T01 Entra Client

## Status: pending

## Goal
Add tenant-restricted MSAL sign-in and expose a safe client identity/session service that gates map access and game play until a DEX tenant token has been acquired.

## Decision Summary
- The Azure SWA is the official company host. The title introduction is public; map, play, and ranking require company login.
- Use MSAL single-tenant access tokens rather than the built-in SWA provider, because the built-in preconfigured provider accepts any Microsoft account and custom SWA providers require Standard.
- Production cannot use an auth bypass. Local-only preview is clearly labeled and never submits cloud data.

## Implementation

### I01. Browser auth service and configuration
- Related Files:
  - `auth.js` :: `AuthSession`, `loadPublicAuthConfig`, `signIn`, `signOut`, `getAccessToken`, `requestApi`, `isLocalPreview`; new
  - `vendor/msal-browser.min.js` and its license file :: pinned browser MSAL runtime; new
  - `index.html` :: load vendor/auth before `game.js`; modify
- Details:
  - Vendor a pinned `@azure/msal-browser` UMD/browser build (record exact version and license in `vendor/README.md`); do not depend on runtime CDN availability.
  - Load public configuration from `GET /api/config`: `{tenantId,clientId,apiScope,configured}`. If not configured, show a clear setup-unavailable message and do not start a signed-in game session.
  - Configure MSAL authority `https://login.microsoftonline.com/${tenantId}`, `clientId`, redirect URI at current origin root, and request only `openid`, `profile`, and the configured API scope. Validate returned tenant claim against configured tenant before accepting session.
  - `requestApi(path, options)` attaches the access token as a Bearer header, uses same-origin `/api`, parses JSON safely, and surfaces 401/403/503 errors without leaking token text.
  - Local preview may bypass Entra only when `location.hostname` is exactly `localhost` or `127.0.0.1` and API config is unconfigured. Mark the session “로컬 미리보기 · 기록 미동기화”; production hosts never use this branch.

### I02. Entry gate and account display
- Related Files:
  - `game.js` :: `Game.constructor`, `bindUI`, `startNewGame`, `continueSavedRun`, new `openStageMap`, `handleAuthState`; modify
  - `index.html` :: title/map action controls and auth status slots; modify
- Details:
  - On startup initialize auth, process redirect response, and keep the game in a non-playing title state until authenticated or local preview.
  - Clicking the sole title CTA starts MSAL login when signed out; when signed in it enters the stage map. Only after login succeeds call `/api/me` to establish the account row.
  - Provide sign-out and the signed-in display name on map/account controls. If login/token refresh fails, keep the title accessible and block map/game/rank actions.
  - Remove direct menu auto-start through Enter while the app is at title/auth gate; preserve Enter behavior inside active play/pause/clear.

## Acceptance Criteria
- [ ] Only configured tenant auth can reach the stage map in production.
- [ ] No Cosmos or Entra secret is bundled to the browser; API access token is not persisted to localStorage.
- [ ] Local preview explicitly says unsynced and is impossible on an Azure/GitHub hosted domain.
- [ ] Sign-out returns to public title and prevents further authenticated API requests.

## Validation
- `node --check auth.js`
- `node --check game.js`
- `node --check site/auth.js`
- `npm --prefix api test`

## Commit Message
```text
feat(auth): gate company game with single-tenant Entra login

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P02-client-and-sync
Task: T01-entra-client

- Add pinned MSAL client and tenant-only token requests
- Require sign-in before map access and game play
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
