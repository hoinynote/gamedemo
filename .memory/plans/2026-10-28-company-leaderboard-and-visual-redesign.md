# Plan: Company Leaderboard and Visual Redesign

## Goal
Turn Tugmate into a company-only, sign-in-gated game on Azure Static Web Apps with a separate title screen, an enlarged responsive play area, a holographic progression map, and stage-by-stage company rankings. Persist account progress and best times through a server API, while preserving device-local checkpoints and supporting offline result retry. Keep all existing Maze Rescue Cosmos data and Azure costs protected.

## Architecture Decisions Used by This Plan
- Use tenant-specific MSAL sign-in in the browser and validate Entra access tokens in the managed Functions API. This avoids Static Web Apps custom authentication, which requires Standard plan; the API rejects tokens from any tenant other than the configured DEX tenant.
- Use a managed Azure Functions API under `/api` with Node.js 22 and Azure Functions Node programming model v4.
- Support Cosmos DB for NoSQL and Cosmos DB for Table through separate adapters selected by `COSMOS_API_KIND`. Never create a database/table/container automatically at runtime.
- Use the existing Cosmos account only after a read-only Cloud Shell check verifies API kind, existing data isolation, permission, and free capacity. Do not change shared throughput or existing resources. If zero-additional-cost capacity cannot be verified, leave Azure storage unconfigured and report the blocker.
- Keep root HTML/CSS/JS as the source and mirror deployable static files under `site/`, since the existing Azure workflow deploys `site/`.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Secure Functions API, Cosmos adapters, contract, and deployment setup guide | [P01](../phases/2026-10-28-company-leaderboard-and-visual-redesign/P01-api-and-data/phase.md) |
| P02 | `pending` | Entra sign-in, team-run timing, cloud progress, offline queue, rankings, and data deletion | [P02](../phases/2026-10-28-company-leaderboard-and-visual-redesign/P02-client-and-sync/phase.md) |
| P03 | `pending` | Separate intro/map views, holographic map, responsive game sizing, and Azure workflow integration | [P03](../phases/2026-10-28-company-leaderboard-and-visual-redesign/P03-visuals-and-deployment/phase.md) |

## Completion Conditions
- API unit tests cover tenant/token rejection, profile ownership, best-time merge, stage bounds, Cosmos NoSQL/Table adapters, and deletion.
- Browser code parses and has no production authentication bypass; local preview can be clearly marked as unsynced.
- Stage clear/unlock state and best times sync per Entra account; checkpoint and pending result data remain local to the browser.
- All source assets deployed from `site/` match their root counterparts.
- Cloud Shell setup steps are documented, but no Azure data resource is created until account kind and no-cost capacity are verified.
