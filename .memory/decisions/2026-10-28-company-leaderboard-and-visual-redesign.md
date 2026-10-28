# Decisions: Company Leaderboard and Visual Redesign

- Date: 2026-10-28
- Status: Confirmed
- Workflow stage: Grill-me interview complete; implementation plan not started.

## D01. Separate title screen and stage map
- **Chosen**: Keep a distinct public-facing title screen and stage map.
- **Title screen**: Introduce the game and show a single “게임 시작” action. Do not put leaderboard navigation on this screen.
- **Authentication**: Require company sign-in before opening the stage map, playing, or using the leaderboard. The title/introduction can be viewed without signing in.
- **Stage map**: Put the leaderboard entry here along with stage selection and progress.

## D02. Responsive game viewport
- **Chosen**: Expand the game to use about 94% of the browser width, preserve a 16:9 play area, and fit within the available viewport height.
- **Chosen**: Provide fullscreen as an optional action; do not force fullscreen.
- **Rationale**: The current game frame is too small in a desktop browser, while a responsive aspect-ratio layout also works in smaller windows.

## D03. Holographic stage map
- **Chosen**: Render stage progression as a graphical holographic map that fits the game’s visual tone.
- **Chosen**: Keep connected stage cards and show each stage’s name, objective, gimmick, difficulty, estimated play time, and completion/available/locked state.
- **Existing decisions retained**: Three campaign stages clear by reaching their exits; each has a throw-required puzzle. Stage 2’s hidden high switch, hit by throwing a partner, unlocks a separately selectable bonus stage. The bonus stage uses a cooperative switch relay. Stage-specific palettes and settings remain as recorded in `2026-10-28-stage-select-and-themes.md`.
- **Rationale**: The map should communicate both the route and the character of each challenge, and remain visually distinct from the title screen.

## D04. Company sign-in and identity
- **Chosen**: Use Azure Static Web Apps as the official company game address so sign-in and the API can share the deployment.
- **Chosen**: Allow users from the DEX Consulting Microsoft Entra tenant only. Require sign-in for the map, play, and leaderboard.
- **Identity key**: Associate cloud records with the authenticated tenant and immutable account identifiers (`tid` + `oid`), not email or a display name.
- **Privacy**: Never show email addresses on the leaderboard. Show users who have signed into the game, including those with no stage record; do not enumerate employees who have never signed in.
- **Unrecorded row**: Show the Entra display name and “미기록” until that account has a clear record.

## D05. Local co-op team label
- **Chosen**: The signed-in employee’s account owns the progress and leaderboard records. The two local players are not separate ranking identities.
- **Chosen**: At the start of each new play, prefill the first name from the signed-in employee’s Entra display name and ask for the partner’s name. Display the team label as `직원 이름 with 파트너 이름`.
- **Chosen**: Keep the team label when continuing a saved run and when moving to the next campaign stage. Ask again for a newly started play or a stage restart that begins a new attempt.
- **Record label**: A stage’s leaderboard row uses the team label from the attempt that produced that account’s best time for that stage.

## D06. Stage records and ranking view
- **Chosen**: Keep one personal best clear time per account and stage. A better clear replaces that stage’s previous best; a slower clear does not.
- **Timer**: Rank by the last attempt’s active play time for that clear. Exclude time spent in pause/menu screens. Restarting a stage begins a fresh attempt; continuing a device-local checkpoint resumes that attempt’s saved timer.
- **Chosen**: Show stage-specific leaderboard tabs and an overall campaign-progress indicator. Sort each stage by best time ascending; accounts without a clear remain visible as unrecorded.
- **Progress ownership**: Cleared stages, unlocks, and best times sync to the account. In-progress checkpoints stay in that browser/device.

## D07. Login outage and offline result handling
- **Chosen**: If the Cosmos/API is temporarily unavailable after company sign-in, allow play and keep unsynced clear results in browser storage. Retry synchronization when the API is available again.
- **Conflict handling**: Merge by authenticated account and stage, retaining the faster valid time and its associated team label. Keep local checkpoints device-specific.
- **Security boundary**: Never put Cosmos credentials in browser code. The API validates the Static Web Apps authenticated principal and tenant before reading or writing records.

## D08. Storage and cost constraints
- **Chosen**: Use the existing Cosmos DB account `maze-rescue-ms-b7af62a9` for a separate Tugmate data area, leaving all existing Maze Rescue tables/containers and data untouched.
- **Architecture direction**: Use a Static Web Apps Functions API as the only game-facing data access layer. Create a Tugmate-specific table or database/container that matches the existing Cosmos API type; do not assume “table” is supported until the account kind is checked.
- **Cloud Shell**: Use Azure Cloud Shell first for read-only inspection of the account’s API kind, free-tier status, throughput, and available capacity. Only create a separately named Tugmate data area if the existing account can support it without changing existing resources or incurring additional cost.
- **Cost guardrail**: Do not change shared throughput, free-tier settings, existing containers/tables, or other people’s data. If the account type, permissions, available capacity, or no-additional-cost condition cannot be verified, stop before creating or changing Azure resources and report what must be resolved.
- **Secrets**: Keep database connection details in server-side Azure configuration, never in the repository or client bundle.

## D09. Casual-ranking validation and user deletion
- **Chosen**: This is a casual company leaderboard, not a tamper-proof competition. Validate the signed-in tenant/account, stage identifiers, and reasonable time bounds; accept only a user’s best valid time. Do not add server-side play-session tracking.
- **Chosen**: Provide a way for a user to delete their own cloud profile, progress, unlocks, and ranking records. Clear that user’s pending local sync data as part of the delete flow; a later play can create a new account record.

## D10. Scope and implementation boundary
- This file records confirmed product and architecture decisions only. The next workflow step is `/memory-plan company-leaderboard-and-visual-redesign`.
- No application code, GitHub workflow, Azure resource, account, or database has been changed as part of this interview.
- The plan must include inspection of the current Cosmos account before any resource creation, and define safe handling for tenant authentication, API records, stage timing, local pending sync, ranking UI, and responsive visuals.
