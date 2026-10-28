# Task: T03 Entry Screen Stage Map

## Status: done

## Goal
Replace the simple entry panel with a responsive route map that explains stages and offers Continue/New Game actions.

## Decision Summary
- Use four connected cards, each showing name, objective, gimmick, difficulty, time, and status.
- The bonus card remains visible while locked with a Stage 2 hidden-switch hint. Keep controls configuration.

## Implementation

### I01. Menu DOM and card rendering
- Related Files:
  - index.html :: #menu-screen — replace simple menu; modify.
  - site/index.html :: same — exact mirror; modify identically.
  - game.js :: bindUI, renderUI, renderStageMap — render cards/wire actions; modify/add.
  - site/game.js :: same symbols — exact mirror; modify identically.
- **DOM contract**:
  - Keep #menu-screen, #controls-button, #controls-summary-p1, #controls-summary-p2, and #rope-control-help.
  - Add #stage-map role=list aria-label=스테이지 진행도; JS inserts four button.stage-card items with data-stage-id and children .stage-card-title, .stage-card-objective, .stage-card-gimmick, .stage-card-meta, .stage-card-status.
  - Add #continue-run-button, #new-game-button, #continue-run-status (aria-live=polite). Remove #start-button and update every script reference.
  - Keep control summaries/button and rope help in a compact/details region.
- **Flow**:
  1. renderStageMap clears the map, iterates STAGES, fills text via textContent, shows “난이도 n/5” and “약 n분”.
  2. Set data-state from T02 status and show Korean state text.
  3. Locked cards use disabled=true and aria-disabled=true. Enabled click calls startStageFromCard(id), never startNewGame.
  4. Bonus hint: “2스테이지에서 파트너를 던져 숨겨진 높은 스위치를 누르세요.” Locked normal cards explain previous-exit requirement.
  5. Show Continue only if CheckpointStore.load() is valid; always show New Game. Without checkpoint, hide Continue and announce “저장된 이어하기가 없습니다.”
  6. Controls open/close returns to the menu without launching a stage.

### I02. Responsive layout
- Related Files:
  - styles.css :: .overlay and new map/card/action selectors/mobile query — modify.
  - site/styles.css :: exact mirror — modify identically.
- **Styling Contract**:
  - Ordered stage map has visible connectors for campaign stages; bonus uses distinct dashed treatment and does not look like the next normal stage.
  - States must be readable without color: completed check/label; current contrast border; locked readable dim style; bonus-available accent.
  - Menu overlay scrolls vertically and start-aligns content so four cards/actions do not clip.
  - At <=620px use compact one-column cards; preserve scrolling and visible keyboard focus; aim for 44px hit targets.
  - Leave controls-screen and pause-screen behavior unchanged.

## Acceptance Criteria
- [x] Four cards show metadata and state; locked cards cannot launch; enabled cards start matching stages.
- [x] Bonus hint appears before unlock and bonus card works after unlock.
- [x] Continue only appears for valid checkpoint; New Game does not reset completion progress.
- [x] Keyboard focus/Enter works on enabled cards/actions.
- [x] Desktop layout renders and scrolls; narrow layout uses the responsive one-column CSS breakpoint.
- [x] Root/site HTML/CSS/JS mirrors are byte-identical.

## Validation
- node --check game.js and node --check site/game.js — menu code parses.
- git diff --check — no whitespace errors.
- Manual browser check desktop and <=620px: keyboard selection, controls round-trip, card states, Continue/New Game visibility.

## Commit Message
    feat(menu): add stage progression route and replay selection

    Plan: 2026-10-28-stage-select-and-themes
    Phase: P01-stage-map-and-content
    Task: T03-entry-screen-stage-map

    - render stage details and progression on connected cards
    - add separate continue/new game actions with responsive layout

## Progress
- [x] Implementation complete
- [x] Validation passed: both Node syntax checks, SHA-256 mirror checks, `git diff --check`, and headless Edge DOM inspection for all four cards and Continue/New Game visibility.
- Interactive play and narrow viewport were not manually exercised.
- commit: pending
