# Task: T02 Secure API

## Status: pending

## Goal
Expose authenticated, tenant-bound HTTP functions for game configuration, account profile/progress, stage clear submissions, leaderboard reads, and deletion.

## Decision Summary
- The browser uses single-tenant Entra access tokens; the API independently validates signature, issuer, audience, tenant, and immutable account ID.
- Only the authenticated account can read or mutate its profile. Leaderboard output contains display/team names, times, and progress only; never email.
- This is a casual ranking: enforce input/time bounds and best-time-only updates, with no server-side run-session tracking.

## Implementation

### I01. Token and request validation
- Related Files:
  - `api/src/auth.js` :: `authenticateRequest`, `parseBearerToken`, `getPrincipal`; new
  - `api/src/http.js` :: JSON response, error mapping, and validation helpers; new
- Details:
  - Parse only `Authorization: Bearer <JWT>`; verify using `jose` `createRemoteJWKSet` and issuer `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0`.
  - Require exact `aud === ENTRA_API_AUDIENCE`, exact `tid === ENTRA_TENANT_ID`, non-empty `oid`, and `name` claim of 1..80 trimmed characters. Never trust user ID/name in request bodies.
  - Return 401 for absent/invalid token, 403 for wrong tenant, 400 for invalid payload/query, 404 for unknown stage/profile where applicable, 503 for missing data-store configuration, and generic 500 for unexpected errors. Do not return SDK error bodies or secrets.
  - Cache the remote JWKS resolver and use platform HTTPS validation.

### I02. HTTP handlers
- Related Files:
  - `api/src/functions/config.js` :: `GET /api/config`; new
  - `api/src/functions/me.js` :: `GET /api/me`, `DELETE /api/me`; new
  - `api/src/functions/progress.js` :: `POST /api/progress`; new
  - `api/src/functions/clear.js` :: `POST /api/clear`; new
  - `api/src/functions/leaderboard.js` :: `GET /api/leaderboard?stageId=0..3`; new
  - `api/src/index.js` :: import/register handlers; modify
- Details:
  - `GET /api/config` returns only `{ tenantId, clientId, apiScope, configured }`; `configured` is false unless the public Entra settings are valid. It never requires auth and never returns Cosmos settings.
  - `GET /api/me` authenticates then upserts a first-login profile (with no stage result) or returns the existing profile. Source `displayName` only from the validated token.
  - `POST /api/progress` accepts `{ clearedStageIds:number[], bonusStageUnlocked:boolean }`; merge monotonically with server profile; reject invalid IDs and do not permit client to unset progress.
  - `POST /api/clear` accepts `{ stageId:number, elapsedMs:number, partnerName:string }`. Construct `teamLabel` on server as `${token.name} with ${partnerName}`. Accept elapsed times only from 1 second through 2 hours. Require prior campaign stage completion for stages 1/2 and `bonusStageUnlocked` for stage 3. Apply `mergeClear`; return accepted best result and whether it changed.
  - `GET /api/leaderboard` accepts one valid stage ID, queries profiles in the configured tenant only, sorts clear records by `bestMs` ascending then display name, gives deterministic 1-based rank, and returns all authenticated profiles including unrecorded entries. For an unrecorded entry, use token-derived profile display name and `record:null`; for a recorded entry, expose that stage's saved team label and time. Do not return tenant/object IDs or emails.
  - `DELETE /api/me` deletes only the authenticated profile and returns `{ deleted:true }`; no user ID can be supplied by the caller.
  - Register handlers with `@azure/functions` v4 `app.http` and `authLevel:'anonymous'` because the application enforces bearer-token authorization itself.

## Acceptance Criteria
- [ ] Every private route verifies Entra access tokens and rejects wrong tenant/audience before Cosmos access.
- [ ] Profile ownership comes only from verified `tid`+`oid`; records contain no email/token.
- [ ] Clear submissions preserve only a faster result and require the agreed unlock conditions.
- [ ] Deletion cannot address another account.
- [ ] `/api/config` cannot expose any private environment setting.

## Validation
- `npm --prefix api run check`
- `npm --prefix api test`

## Commit Message
```text
feat(api): add tenant-verified game leaderboard endpoints

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P01-api-and-data
Task: T02-secure-api

- Verify Entra access tokens and account ownership in Functions
- Add progress, best-clear, leaderboard, and self-delete routes
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
