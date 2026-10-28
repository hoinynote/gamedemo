# Task: T01 Cosmos Repository

## Status: done

## Goal
Create an Azure Static Web Apps managed Functions Node.js 22 project and an injectable profile repository that can use either Cosmos DB for NoSQL or Cosmos DB for Table, without creating or mutating Azure resources.

## Decision Summary
- Existing Maze Rescue tables/containers and throughput must remain untouched.
- Cosmos API kind is not known in this workspace. Support only `nosql` and `table`; deployment is blocked for other API kinds until a compatible design is agreed.
- The repository must use existing, separately provisioned Tugmate data storage and fail closed if configuration is absent.

## Implementation

### I01. Functions project and runtime configuration
- Related Files:
  - `api/package.json` :: Azure Functions v4 project scripts/dependencies; new
  - `api/host.json` :: host configuration; new
  - `api/src/index.js` :: register HTTP handlers from subsequent T02; new
  - `api/src/config.js` :: validated environment configuration; new
- Details:
  - Use CommonJS, Node.js `>=22 <23`, `@azure/functions` v4, `@azure/cosmos`, `@azure/data-tables`, and `jose`.
  - Define `npm test` as `node --test` and `npm run check` to syntax-check every `api/src/**/*.js` file without deploying.
  - Required settings: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `COSMOS_API_KIND`.
  - For `COSMOS_API_KIND=nosql`, require `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE_ID`, and `COSMOS_CONTAINER_ID`.
  - For `COSMOS_API_KIND=table`, require `COSMOS_TABLE_CONNECTION_STRING` and `COSMOS_TABLE_NAME`.
  - `ENTRA_CLIENT_ID` and `ENTRA_API_SCOPE` are public settings consumed by `/api/config`, not secrets. Do not include any Cosmos credentials in that response.
  - `api/host.json` uses Functions host version 2.0 and extension bundle `[4.*, 5.0.0)`.

### I02. Profile model and normalization
- Related Files:
  - `api/src/profiles.js` :: `profileId`, `emptyProfile`, `normalizeProfile`, `mergeProgress`, `mergeClear`; new
- Data & Schema Fields:
  - Canonical profile: `{ id: string, tenantId: string, objectId: string, displayName: string, clearedStageIds: number[], bonusStageUnlocked: boolean, stageRecords: Record<string,{bestMs:number,teamLabel:string,updatedAt:string}>, updatedAt: string }`.
  - `id` is `${tenantId}:${objectId}`. Never store email, access tokens, or connection strings.
  - Valid stages are integer IDs `0..3`. `bestMs` is integer `1000..7200000`. `teamLabel` is trimmed, 1..80 Unicode characters, and contains the authenticated display name followed by ` with ` and a non-empty partner name.
  - `mergeProgress` takes the union of valid cleared IDs and logical-ORs the bonus unlock. `mergeClear` replaces a stage record only when the incoming time is faster; preserve the existing record and team label for a slower/equal time.

### I03. Cosmos repository adapters
- Related Files:
  - `api/src/repositories/cosmos-profile-repository.js` :: `createProfileRepository`, `NoSqlProfileRepository`, `TableProfileRepository`; new
- Details:
  - Expose methods `get(tenantId, objectId)`, `upsert(profile)`, `listByTenant(tenantId)`, and `delete(tenantId, objectId)`.
  - NoSQL: use `CosmosClient` with endpoint/key; target configured database/container; partition key `/tenantId`; query only `c.tenantId = @tenantId`; use item `id` `${tenantId}:${objectId}` and pass `tenantId` to item operations.
  - Table: use `TableClient.fromConnectionString`; `PartitionKey=tenantId`, `RowKey=objectId`; encode `clearedStageIds` and `stageRecords` as JSON string properties, and decode/validate on reads.
  - Do not call `createIfNotExists`, database/container create, throughput update, or table create from application code.
  - Accept SDK clients through constructor injection so tests can substitute in-memory fakes.

## Acceptance Criteria
- [ ] `api/src/profiles.js` has deterministic validation/merge behavior and excludes email/token fields.
- [ ] Both adapters implement the same repository contract and never create storage resources.
- [ ] Missing or invalid `COSMOS_API_KIND`/settings fail startup or return a clear server error without fallback to browser storage as cloud storage.
- [ ] `npm --prefix api install` produces a lock file and `npm --prefix api run check` passes.

## Validation
- `npm --prefix api install`
- `npm --prefix api run check`
- `npm --prefix api test`

## Commit Message
```text
feat(api): add isolated Cosmos profile repositories

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P01-api-and-data
Task: T01-cosmos-repository

- Add Node 22 managed Functions project and profile schema
- Support existing Cosmos NoSQL or Table storage without provisioning resources
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm.cmd run check`, `npm.cmd test`, `git diff --check`)
- commit: pending
