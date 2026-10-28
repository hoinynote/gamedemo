# Task: T02 Progress and Offline Sync

## Status: pending

## Goal
Associate each attempt with the signed-in employee plus a partner label, time the current attempt, and sync account progress/best clears with a local retry queue while keeping checkpoints local.

## Decision Summary
- Account identity and cloud progress belong to the signed-in employee; the two local characters share a per-run `Employee with Partner` label.
- Each stage stores the best active-play clear time; pause/menu time is excluded. Restart resets the attempt timer; checkpoint continue resumes it.
- When the API is unavailable, allow play and queue valid progress/results locally for retry.

## Implementation

### I01. Local session and outbox stores
- Related Files:
  - `game.js` :: `CheckpointStore`, `CampaignProgressStore`, new `RunSessionStore`, `PendingSyncStore`; modify
- Data & Schema Fields:
  - Run session key `tugmate:run-session:v1`: `{version:1, ownerId:string, partnerName:string, teamLabel:string, stageId:number, elapsedMs:number, attemptId:string}`.
  - Pending sync key `tugmate:pending-sync:v1`: `{version:1, ownerId:string, events:Array<{eventId:string,type:'progress'|'clear',createdAt:string,payload:object}>}`. Store no access token.
  - Checkpoint schema version 2 adds `elapsedMs`, `attemptId`, `ownerId`, `partnerName`, and `teamLabel`; invalid or mismatched account checkpoints are not continued.
- Details:
  - Add safe parse/validation and quota-error handling like existing storage classes.
  - On sign-out or account switch, do not upload another account’s checkpoint/outbox; clear active identity-bound pending state after warning, retain the global local checkpoint only if it is not account-bound (it now is, so clear on owner mismatch).
  - Preserve existing controls and game physics storage.

### I02. Attempt label and elapsed timer
- Related Files:
  - `game.js` :: `startNewGame`, `continueSavedRun`, `startStageFromCard`, `loadStage`, `resetStage`, `pause`, `advanceStage`, `serialize`, `restore`, `checkStageResult`, `update`; modify
  - `index.html` :: partner name dialog/form and validation feedback; modify
- Details:
  - Before a new campaign/replay attempt, show the authenticated first name read-only and require a trimmed partner name (1..40 characters); derive `${displayName} with ${partnerName}`. Save the session only after validation.
  - Keep the label between campaign stages and on checkpoint continue. A restart (`R`) requests a partner name again and creates a new `attemptId` with elapsed time 0.
  - Increment `elapsedMs` only while mode is `playing`; pause, menus, login, and clear overlays do not increment it. Persist timer and attempt ID in checkpoint serialization. On continue, restore saved active time. Stage transition resets timer but keeps team label.
  - At clear, post `{stageId, elapsedMs, partnerName}` to `/api/clear`; write a local `clear` outbox event first so API failure does not lose the result. Validate server response and merge the returned profile into local campaign progress without removing prior unlocked progress.
  - The bonus switch posts monotonic `bonusStageUnlocked:true` progress; stage clear posts cleared stage ID. A faster returned time replaces local best; a slower time does not.

### I03. Retry and reconciliation
- Related Files:
  - `auth.js` :: `syncPendingEvents`, `enqueuePendingEvent`, `clearOwnerData`; modify
  - `game.js` :: call `syncPendingEvents` after auth, after map open, after clear, and on `online`; modify
- Details:
  - Upload queued events serially with stable `eventId`; API merge operations are idempotent by account/stage and best-time comparison.
  - Retry on `online`, on successful map entry, and after a clear. Use exponential backoff capped at 60 seconds only while the page is open; do not spin continuously.
  - If HTTP 401 occurs, stop retrying until auth is refreshed. If 403 occurs, block company features and preserve the queue only for the same account. If network/5xx/503 occurs, keep pending state and show “기록 동기화 대기 중”.
  - Once synced, remove only the acknowledged event IDs. Merge server progress by union and best-time comparison.

## Acceptance Criteria
- [ ] Partner name and account owner persist across continue and stage transitions; restart resets timer and prompts for partner again.
- [ ] Pause/menu time is excluded and timer resumes with a checkpoint.
- [ ] Stage clear/unlock events survive API outage in local storage and later synchronize idempotently.
- [ ] Checkpoints never upload to the cloud and cannot be resumed under another account.
- [ ] No access token or Cosmos secret is written to localStorage.

## Validation
- `node --check game.js`
- `node --check auth.js`
- `npm --prefix api test`
- `git diff --check`

## Commit Message
```text
feat(progress): sync best times with offline retry

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P02-client-and-sync
Task: T02-progress-and-offline-sync

- Track partner label and active attempt time across checkpoints
- Queue account progress and clear results for resilient sync
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
