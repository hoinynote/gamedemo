# Task: T01 Remove Down-Key Platform Drop

## Status: done

## Goal
Remove the platform-drop behavior for both players so pressing either configured down key cannot move a character through a platform or ground. Preserve the down-key binding for downward rope aiming and make the control settings and summaries describe that remaining purpose.

## Decision Summary
- Disable platform dropping for both players.
- Keep `controls.down`, the v1 saved-control schema, and downward rope aiming; relabel the setting as `아래 조준`.
- Keep the root and deployable `site/` game scripts in sync.

## Implementation

### I01. Remove platform-drop physics and update the control label

- Related Files:
  - `game.js` :: `Player` constructor; remove the unused `dropTimer` field.
  - `game.js` :: `CONTROL_ACTION_LABELS`; rename the `down` label from platform pass to downward aim.
  - `game.js` :: `TugmateGame.renderControls()`; show the down binding as downward aim in the player summaries and generated control rows.
  - `game.js` :: `TugmateGame.updatePlayers(delta)`; remove the `wasPressed(controls.down)` branch that increments `player.y`, clears `onGround`, and starts `dropTimer`; remove the `dropTimer` countdown.
  - `game.js` :: `TugmateGame.resolveVertical(player, previousY)`; remove the drop-timer exception so downward collisions with all solid platforms, including `kind: "ground"`, resolve normally.
  - `game.js` :: `TugmateGame.getRopeAim(owner, controls)`; preserve use of `controls.down` for downward rope aiming.
  - `site/game.js` :: mirror the same changes to the corresponding symbols above.

#### Details
- **Signatures & Types**:
  - `CONTROL_ACTIONS: string[]` remains `['left', 'right', 'jump', 'down', 'rope', 'boost']`.
  - `CONTROL_ACTION_LABELS.down: string` changes to `아래 조준`.
  - `TugmateGame.updatePlayers(delta: number): void` no longer changes player position or collision state in response to a down-key press.
  - `TugmateGame.resolveVertical(player: Player, previousY: number): void` keeps the existing descending landing check `player.vy >= 0 && wasAbove`, with no `dropTimer` condition.
  - `Player.dropTimer` is removed because no gameplay path uses it after platform dropping is removed.
- **Data & Schema Fields**:
  - Keep `DEFAULT_CONTROLS.p1.down` (`KeyG`) and `DEFAULT_CONTROLS.p2.down` (`ArrowDown`).
  - Keep `ControlsStore` key `ropebound-controls:v1` and the existing `bindings.down` string fields. No migration or reset of saved user bindings.
- **Execution Flow / Logic**:
  1. On a down-key press, do not alter `player.y`, `player.onGround`, or any drop timer.
  2. Continue normal gravity and vertical collision resolution; all platforms remain solid from above.
  3. Continue to read `controls.down` in `getRopeAim` so a player can aim the rope downward.
  4. Render the configured down key with the label `아래 조준`; do not display `플랫폼 통과` in control settings or summaries.
  5. Preserve all other control bindings, menus, player movement, rope launch/release, and partner launch behavior.

### I02. Keep the deployed game script synchronized

- Related Files:
  - `game.js` :: relevant constants and methods above; source copy.
  - `site/game.js` :: matching constants and methods above; deployable copy.

#### Details
- Keep both copies byte-for-byte identical after the change because `index.html` loads `game.js` and `site/index.html` loads `site/game.js`.
- Do not change either HTML file; the settings rows and summaries are generated from `CONTROL_ACTIONS` and `CONTROL_ACTION_LABELS` in the scripts.

## Acceptance Criteria
- [x] Pressing Player 1's configured down key while on a platform does not drop the player through it.
- [x] Pressing Player 2's configured down key while on ground or a platform does not move the player below it or trigger a stage reset.
- [x] Both players can still aim their rope downward using their configured down key.
- [x] The controls settings and summaries identify the down binding as `아래 조준` and do not mention platform passing.
- [x] `game.js` and `site/game.js` are identical, and no `dropTimer` references remain.

## Validation
- `node --check game.js` — passed
- `node --check site/game.js` — passed
- `git diff --check` — passed

## Commit Message
```text
fix(controls): prevent down-key platform drop

Plan: 2026-10-28-platform-drop-ground-collision
Phase: P01-disable-platform-drop
Task: T01-remove-platform-drop

- Remove platform drop input and collision bypass
- Preserve configurable down aim for rope controls
- Synchronize root and deployed game scripts
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
