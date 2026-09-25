# Task: T01 Configurable Physical-Key Controls

## Status: done

## Goal

Make keyboard input depend on physical `KeyboardEvent.code` values, and give both players a menu screen to rebind all six gameplay actions. Persist valid, non-conflicting bindings in the current browser so players can select a combination that their keyboard registers simultaneously.

## Decision Summary

- Keep the defaults P1 `F/H/T/G/Q/W` and P2 arrows plus `[/]`, represented as physical codes. All 12 bindings must be unique. Enter, Escape, Tab, R, and N are reserved so settings navigation and game/menu commands remain usable.
- Provide a menu-accessible control settings panel, a button per action to capture the next eligible physical key, a clear duplicate/reserved-key message, and a restore-defaults action. Save bindings under a settings key separate from the checkpoint.

## Implementation

### I01. Physical-key input and control settings storage

- Related Files:
  - `game.js` :: `InputManager`, `Game.getControls`, `Game.handleGlobalInput`, `Game.bindUI`, new `DEFAULT_CONTROLS`, `ControlsStore`, and control-code label helper; modify/add inside existing IIFE

#### Details

- Define immutable defaults with action names `left`, `right`, `jump`, `down`, `rope`, and `boost`:
  - P1: `left: "KeyF"`, `right: "KeyH"`, `jump: "KeyT"`, `down: "KeyG"`, `rope: "KeyQ"`, `boost: "KeyW"`.
  - P2: `left: "ArrowLeft"`, `right: "ArrowRight"`, `jump: "ArrowUp"`, `down: "ArrowDown"`, `rope: "BracketLeft"`, `boost: "BracketRight"`.
- Define `ControlsStore.key` as `"ropebound-controls:v1"`. Stored JSON schema:
  ```typescript
  type PlayerControls = {
    left: string; right: string; jump: string; down: string; rope: string; boost: string;
  };
  type ControlsSettings = {
    version: 1;
    bindings: { p1: PlayerControls; p2: PlayerControls };
  };
  ```
- `ControlsStore.load()` reads localStorage in a `try/catch`; accept only `version === 1`, all 12 string codes present, and no duplicates. On missing, malformed, unavailable, or invalid storage, return a deep copy of defaults. `save(bindings)` writes `{version: 1, bindings}` and catches storage errors without stopping the game. `reset()` removes the settings key and returns defaults.
- `Game` owns the effective settings in `this.controls`, initialized from `ControlsStore.load()` before UI binding. `getControls(player)` returns the matching P1/P2 entry. On a valid rebind, replace only that action, save the full settings object, refresh the visible labels, and clear `InputManager.down` and `InputManager.pressed` so a key held during capture cannot trigger an action after capture ends.
- Change `InputManager` listeners to store `event.code` in `down` and `pressed`; change `isDown` and `wasPressed` consumers to use codes. Preserve edge behavior: ignore `event.repeat` when adding to `pressed`, always add a keydown to `down`, remove its code on keyup, and clear both sets when the window loses focus or the document becomes hidden.
- Change `Game.handleGlobalInput` to use `event.code`. Preserve `Enter` for start/resume/advance, `KeyR` for stage reset, and `KeyN` for starting over after the final clear. Ignore global game commands while the controls panel or a key capture is active. Reserve codes `Enter`, `Escape`, `Tab`, `KeyR`, and `KeyN` from gameplay binding capture; Tab remains available for keyboard navigation in the settings panel.
- Enforce uniqueness over all 12 bindings, not only within one player. If a captured code is already assigned or reserved, keep the existing binding and display a visible status message. Ignore modifier-only keys (`Shift*`, `Control*`, `Alt*`, `Meta*`) and repeated keydown events during capture.
- Implement code labels for the settings UI: `KeyA`–`KeyZ` display the letter; `Digit0`–`Digit9` display the digit; arrows display ←/→/↑/↓; `BracketLeft`/`BracketRight` display `[`/`]`; `Numpad*` displays `Num` plus its suffix; otherwise display the code unchanged. The displayed binding must be based on physical code, not layout-dependent `event.key`.

### I02. Rebinding UI and user feedback

- Related Files:
  - `index.html` :: `#menu-screen` controls summary and new `#controls-screen` section; modify
  - `styles.css` :: control settings panel, action rows, capture/error status, responsive layout, focus-visible states; modify
  - `game.js` :: `Game.bindUI`, new control-settings render/open/close/capture handlers; modify

#### Details

- Add a `조작 설정` button to `#menu-screen`, and add an initially hidden `section#controls-screen.overlay` with `aria-live="polite"`.
- In `#controls-screen`, render two player groups and one row per action (`left`, `right`, `jump`, `down`, `rope`, `boost`). Each row has a readable Korean action name, a button showing the current physical key label, and a status area for capture errors. Include `기본값 복원` and `돌아가기` buttons.
- Give each capture button `data-player` (`p1` or `p2`) and `data-action` attributes. Clicking it sets the active capture target and changes its label to an instruction such as `키를 누르세요`. The next eligible physical keydown is consumed for capture and must not also start/resume/reset the game or trigger gameplay.
- `Game` keeps `this.capturingBinding` as `null` or `{player: "p1"|"p2", action: keyof PlayerControls}`. Add a document keydown capture listener that checks this state before gameplay processing. On accepted input, update/save settings and close capture state. On rejected duplicate/reserved input, keep capture active and show the specific reason so the user can try another key.
- Restore defaults through `ControlsStore.reset()`, replace `this.controls`, update `InputManager` consumers on the next frame, and rerender all key labels. `돌아가기` closes the panel and returns to the menu overlay.
- The menu summary must be rendered from `this.controls`, not hard-coded key text, and must describe the six actions accurately: left/right movement, jump, drop through platform, fire/release rope, and hold to strengthen pull.
- In CSS, keep the settings panel inside the existing `.game-frame`, allow scrolling within the panel if needed on narrow screens, and retain visible keyboard focus outlines for every button. Match existing player-one/player-two accent colors.

## Acceptance Criteria

- [ ] Gameplay responds to physical codes for both players; default bindings match the listed P1/P2 maps.
- [ ] All six actions for either player can be rebound from the menu and remain changed after a browser refresh.
- [ ] A duplicate or reserved key (Enter, Escape, Tab, R, N) cannot be assigned, and the user sees why; defaults can be restored in one action.
- [ ] A key used to finish rebinding does not also trigger gameplay or a global menu command.
- [ ] Menu control summaries always show the current effective bindings and their correct action labels.
- [ ] Focus loss or tab hiding clears held-key state so movement cannot remain stuck.

## Validation

- `node --check game.js` — JavaScript syntax validation.
- Browser manual validation: load `index.html`; verify defaults; rebind an action; refresh and verify persistence; try assigning a duplicate and each reserved key; restore defaults; start a game and verify keyboard inputs still operate independently.
- Do not add test files for this task unless separately requested.

## Commit Message

```text
feat(controls): add persisted player key rebinding

Plan: 2026-09-25-rope-control-improvements
Phase: P01-rope-controls
Task: T01-configurable-controls

- Track controls by physical keyboard code
- Add unique, persistent bindings for both players
- Add rebinding UI with duplicate checks and default restore
```

## Progress

- [x] Implementation complete
- [x] Validation passed: `node --check game.js` and an ephemeral mock-DOM flow check for menu open/close, valid rebinding, persistence, duplicate/reserved-key rejection, and default reset.
- [ ] Visual browser validation: unavailable because no controllable or installed browser is present in this environment.
- commit: pending
