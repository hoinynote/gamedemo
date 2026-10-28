# Task: T03 API Validation and Setup

## Status: done

## Goal
Cover API validation and repository behavior with automated tests, and document tenant app registration plus safe, read-only-first Cosmos Cloud Shell setup.

## Decision Summary
- No Azure resource is created by tests, scripts, or function startup.
- Cloud Shell must identify the Cosmos API kind and free/capacity status before any separately named Tugmate data resource is created.
- A local in-memory repository is test-only and must not become a production fallback.

## Implementation

### I01. API unit tests
- Related Files:
  - `api/test/profiles.test.js` :: normalization and merge cases; new
  - `api/test/auth.test.js` :: token parser/tenant/audience validation cases; new
  - `api/test/handlers.test.js` :: mocked route behavior and ownership; new
  - `api/src/auth.js`, `api/src/profiles.js`, `api/src/repositories/cosmos-profile-repository.js` :: export pure/injectable helpers; modify
- Details:
  - Use built-in `node:test` and `node:assert/strict`; no live Azure dependency.
  - Cover malformed JWT, wrong issuer/audience/tenant, absent `oid`, malformed JSON, invalid stage IDs/times, team label bounds, stage unlock enforcement, lower/equal/slower clear merge, monotonic progress merge, unrecorded leaderboard rows, email omission, and self-only deletion.
  - Fake NoSQL and Table SDK surfaces and assert both use the expected partition/row key and never invoke a create/provision method.

### I02. Company setup guide and Cloud Shell commands
- Related Files:
  - `docs/company-leaderboard-setup.md` :: prerequisites and deployment/runbook; new
  - `scripts/inspect-tugmate-cosmos.sh` :: read-only account query; new
  - `api/local.settings.sample.json` :: names/placeholders only; new
- Details:
  - Document two single-tenant Entra app registrations: SPA client (redirect URI is the official SWA origin) and API resource (expose `access_as_user`); configure SPA permission to that scope and obtain admin consent if required. Store client/tenant/audience/scope in the matching public/server settings; never commit secrets.
  - Provide read-only Cloud Shell commands for `az account show`, `az cosmosdb show`, listing databases, account free-tier flag, consistency/locations, and provisioned throughput. The script must not print keys or connection strings.
  - Document conditional creation only after owner verifies costs: NoSQL database `tugmate-db` plus `profiles` container with shared/verified free throughput and `/tenantId` partition key; Table API table `TugmateProfiles`. Do not update other resources or shared throughput. If no-cost capacity cannot be established, do not execute create commands.
  - Include SWA managed API app settings names and a test/deploy checklist; local settings template values are blank and ignored by git.

## Acceptance Criteria
- [ ] `npm --prefix api test` covers all listed security/data cases and passes without Azure credentials.
- [ ] Cloud Shell script contains read-only commands only; resource creation is a separately documented conditional manual action.
- [ ] Setup documentation clearly identifies Entra registration, redirect URI, public vs secret configuration, and the stop condition for unverified cost.

## Validation
- `npm --prefix api test`
- `npm --prefix api run check`
- `bash -n scripts/inspect-tugmate-cosmos.sh`
- Validate JSON with `node -e "JSON.parse(require('fs').readFileSync('api/local.settings.sample.json','utf8'))"`

## Commit Message
```text
test(api): cover tenant boundaries and document safe setup

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P01-api-and-data
Task: T03-api-validation-and-setup

- Test auth, profile merge, leaderboard, and Cosmos adapter behavior
- Document safe Entra and Cloud Shell setup without provisioning resources
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm.cmd run check`, `npm.cmd test` — 19 passed, Bash syntax check, sample JSON parse, `git diff --check`)
- commit: pending
