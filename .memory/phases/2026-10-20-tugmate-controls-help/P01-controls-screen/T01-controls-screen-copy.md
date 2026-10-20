# Task: T01 Controls Screen Copy

## Status: done

## Goal
Show the controls-screen user how key rebinding works and make the game name `터그메이트` visible in the menu.

## Decision Summary
- Place a concise explanation in the existing controls settings screen, retain its current change-key flow and default-reset button, and replace only the menu eyebrow branding.
- The project is static HTML/CSS/JavaScript with GitHub Pages publishing from `main` root; no compile/build command is required.

## Implementation

### I01. Update controls-screen guidance and menu identity

- Related Files:
  - `index.html` :: `#menu-screen .eyebrow` — display the current game name; modify.
  - `index.html` :: `#controls-screen .hint` — explain physical-key input, player key changes, browser storage, and duplicate/reserved-key rejection; modify.
  - `index.html` :: `#controls-reset-button` — preserve the existing `기본값 복원` action; read-only.

#### Details
- **Signatures & Types**: HTML text only; no JavaScript API changes.
- **Data & Schema Fields**: No schema changes.
- **Execution Flow / Logic**:
  1. Replace the main menu eyebrow `ROPEBOUND DUO` with `터그메이트`.
  2. Replace the existing first hint paragraph inside `#controls-screen` with concise Korean text stating that input is identified by physical key code; either player's controls can be remapped; remapped controls are saved in this browser; and keys already assigned to another action or reserved by the game cannot be assigned.
  3. Leave the capture status paragraph, player control lists, `기본값 복원`, and `돌아가기` controls intact.
  4. Preserve valid UTF-8 and the existing HTML structure.
  5. Commit the change and push `main`; the configured Pages branch source should publish the update automatically.
- **Error & Exception Handling**: Do not alter key-binding logic or promise storage if browser storage fails; the existing status message already reports that failure.
- **State Transition & Return**: The controls page explains the behavior in-game and the menu carries the `터그메이트` name; the public Pages copy contains the same text after deployment completes.

## Acceptance Criteria
- [x] Main menu eyebrow reads `터그메이트`.
- [x] Controls screen explains physical-key-code input, remapping for both players, browser-local persistence, and rejection of duplicate/reserved keys.
- [x] `기본값 복원` remains present and functional markup is unchanged.
- [x] `index.html` is published on `main` and the public Pages response contains the changed text.

## Validation
- `rg -n "터그메이트|물리 키 코드|이 브라우저|이미 배정|예약된 키|기본값 복원|ROPEBOUND DUO" index.html` — expected game name and guidance are present; old menu branding is absent.
- `git diff --check` — no whitespace errors.
- After pushing `main`, fetch `https://hoinynote.github.io/gamedemo/` and confirm HTTP 200 and that the response contains `터그메이트` and the controls guidance.

## Commit Message
```text
feat(game): explain configurable controls in game

Plan: 2026-10-20-tugmate-controls-help
Phase: P01-controls-screen
Task: T01-controls-screen-copy

- Explain physical-key controls and key assignment rules in the controls screen
- Match the in-game menu name to 터그메이트
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in local Git history
