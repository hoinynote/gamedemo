# Task: T02 Campaign Progress and Checkpoints

## Status: pending

## Goal
Persist stage clears and bonus unlocks separately from the run checkpoint, enforce normal-stage order, and allow replays without replacing the saved Continue run.

## Decision Summary
- IDs 0–2 are campaign; 3 is bonus. Clearing n unlocks n+1. Stage 2's bonus-high-switch independently unlocks 3.
- Campaign progress survives New Game. Stage-card replays preserve Continue, including when paused and returned to menu.

## Implementation

### I01. Versioned progress store
- Related Files:
  - game.js :: CampaignProgressStore — new class beside CheckpointStore.
  - site/game.js :: CampaignProgressStore — exact mirror; new class.
- **Schema and methods**: CampaignProgress = {version:1, clearedStageIds:number[], bonusStageUnlocked:boolean}. Methods: load() returns sanitized data; save(progress) returns boolean; clear() removes only campaign key; clearStage(stageId) and unlockBonusStage() are idempotent.
- Key ropebound-campaign-progress:v1; default {version:1,clearedStageIds:[],bonusStageUnlocked:false}. Accept integer IDs 0–3 and deduplicate. Invalid JSON/version/fields or storage errors must not interrupt play. clear() must not remove checkpoint/control keys.
- **Flow**:
  1. Load sanitized data as this.campaignProgress in Game constructor.
  2. After updateObjects processes switches, if an active switch has unlockBonusStage:true, call unlockBonusStage once and refresh state.
  3. On exit clear, call clearStage(this.stageIndex) before checkpoint save.
  4. Stage 0 always open; stage 1 requires 0 cleared; stage 2 requires 0 and 1; bonus 3 requires bonusStageUnlocked.

### I02. Run source and checkpoint separation
- Related Files:
  - game.js :: Game constructor, bindUI, handleGlobalInput, startNewGame, advanceStage, loadStage, restore, saveCheckpoint, returnToMenu — modify.
  - site/game.js :: same symbols — exact mirror; modify identically.
- **Signatures & Types**: RunSource = "campaign" | "replay"; startStageFromCard(stageId:number):void; continueSavedRun():void; startNewGame():void.
- **Flow**:
  1. Add this.runSource (default campaign) and this.savedCheckpoint (valid snapshot or null). Initial load stays in menu rather than forcing the paused overlay.
  2. continueSavedRun loads checkpoint and restores it. Resume non-won snapshots as playing, clear pauseReason, reset lastFrameAt, arm historyController; a saved won snapshot shows clear screen.
  3. startNewGame clears only CheckpointStore, sets source campaign, loads stage 0 and starts. Preserve campaign progress.
  4. startStageFromCard validates integer/unlocked ID; invalid/locked returns without state change. Otherwise source=replay, load stage from spawn, mode=playing; do not modify prior checkpoint.
  5. saveCheckpoint is a no-op during replay; campaign pause/reset/lifecycle/transition saves remain enabled.
  6. advanceStage moves 0→1 and 1→2 only. After normal stage 2 or bonus 3, return to menu and clear run checkpoint. Bonus never joins normal order.
  7. Add isStageUnlocked(id) and getStageProgressStatus(id). Status values: completed/current/locked/bonus-available. Completed takes precedence. Current is the lowest uncleared unlocked campaign ID. Bonus is locked until found, then available until cleared.
  8. Enter on menu continues a valid checkpoint; without one starts new game.
- Keep CheckpointStore key and version 1 unchanged for existing saves.

## Acceptance Criteria
- [ ] Clearing 0 unlocks 1; clearing 1 unlocks 2; hidden switch unlocks bonus independently.
- [ ] Clears/unlock survive reload and New Game in the same browser.
- [ ] Continue restores existing checkpoint after reload.
- [ ] Card replay starts from spawn and never replaces prior Continue checkpoint, including pause/menu.
- [ ] Bonus clear/replay never advances normal campaign.
- [ ] Root/site game scripts are byte-identical.

## Validation
- node --check game.js and node --check site/game.js — parse succeeds.
- git diff --check — no whitespace errors.
- Manual check with fresh/populated localStorage: clear/reload/New Game/unlock/replay/pause/menu and verify prior checkpoint.

## Commit Message
    feat(progress): persist campaign unlocks and protect continue saves

    Plan: 2026-10-28-stage-select-and-themes
    Phase: P01-stage-map-and-content
    Task: T02-campaign-progress-and-checkpoints

    - persist stage clears and independent bonus unlocks
    - support replay without replacing saved campaign run

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
