# Task: T03 Leaderboard and Deletion UI

## Status: done

## Goal
Add an accessible stage-tab leaderboard that shows best times and campaign progress, plus a self-service deletion flow for the signed-in account.

## Decision Summary
- Show stage-specific rankings, progress badges, and every account that has entered the game, including no-record accounts.
- Hide email addresses. Before a result show Entra display name + “미기록”; after a result show the saved `Name with Partner` label.
- The account owner can delete their own cloud profile and local queued/checkpoint data.

## Implementation

### I01. Leaderboard view and rendering
- Related Files:
  - `index.html` :: `#leaderboard-screen`, stage tabs, rows, loading/error/empty states; modify
  - `game.js` :: new `openLeaderboard`, `loadLeaderboard`, `renderLeaderboard`, `closeLeaderboard`; modify
  - `styles.css` :: leaderboard layout/styles; modify
- Details:
  - Add a leaderboard button on the signed-in stage map, never on the public title screen.
  - Render four tabs for stage IDs 0..3. Fetch `/api/leaderboard?stageId=N` on tab change; expose `aria-selected`, keyboard focus, loading, retry, and empty states.
  - Each row shows rank, team label or display name + “미기록”, formatted clear time (`m:ss.t`), and campaign progress badge (`n/3`, plus bonus unlock). Never render `email`, `objectId`, or `tenantId` even if a response unexpectedly includes them.
  - Visually distinguish the signed-in account and show a clear “동기화 대기” state when local unsent results exist.
  - Show recorded rows in server order; no client-side re-ranking of server results.

### I02. Account deletion flow
- Related Files:
  - `index.html` :: account panel, delete confirmation dialog, status feedback; modify
  - `game.js` :: `deleteMyData`, `renderAccount`; modify
  - `auth.js` :: `deleteCurrentAccountData`; modify
- Details:
  - Require explicit confirmation naming the signed-in profile and explaining that cloud progress, unlocks, and times cannot be recovered.
  - On confirm, set a local deletion tombstone first, stop pending uploads, call `DELETE /api/me`, then clear owner-bound checkpoint, run session, campaign cache, outbox, and tombstone after confirmed server success. Return to public title without automatically recreating the profile.
  - If offline/API fails, retain only the tombstone (not the profile or queued result payloads), show deletion pending, and retry only the DELETE when the same account next signs in. Never allow old outbox results to repopulate a deleted profile.
  - After deletion is confirmed, next explicit entry to the stage map may create a fresh empty account profile.

## Acceptance Criteria
- [x] Four stage tabs show server-ranked PB times with stage and campaign progress.
- [x] Unrecorded users are visible with display name and no-record label; no email/immutable IDs render.
- [x] Delete flow removes only the current user and prevents offline queued records from restoring deleted data.
- [x] Keyboard and screen-reader state for tabs/dialog/loading/errors is clear.

## Validation
- `node --check game.js`
- `node --check auth.js`
- `git diff --check`
- `npm --prefix api test`

## Commit Message
```text
feat(leaderboard): show stage rankings and account deletion

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P02-client-and-sync
Task: T03-leaderboard-and-deletion-ui

- Add stage tabs with progress and unrecorded entries
- Add account-only cloud and local data deletion
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `e1eb86f`
