# Task: T01 Pause Controls Menu

- Status: done
- Plan: 2026-10-28-pause-controls-menu

## Blueprint

### Files and symbols
- `index.html`
  - Expand `#pause-screen` with Resume, Controls, and Main Menu buttons and concise Escape shortcut guidance.
- `game.js`
  - `Game.bindUI()`: connect the three pause actions.
  - `Game.handleGlobalInput(event)`: use Escape to pause during play and resume while paused; do not intercept Escape during control binding capture.
  - `Game.openControls(returnTo)`, `Game.closeControls()`: preserve whether settings was opened from title or pause and return to that overlay.
  - Add a method for returning to the title, saving the checkpoint before setting menu mode.
  - `Game.renderUI()`: keep the pause overlay hidden while the controls overlay is open.
- `styles.css`
  - Add compact pause action button layout responsive to narrow screens.

### Data and behavior
- No schema changes. Use a control return destination selector (`#menu-screen` or `#pause-screen`).
- Paused gameplay remains stopped while controls are open.
- Returning to title saves the current serialized checkpoint before showing the title.

### Validation
- `node --check game.js` — passed.
- `git diff --check` — passed.
- Inspected pause/resume, settings return destination, and title action handlers — connected.

### Commit
- `Plan: 2026-10-28-pause-controls-menu P01-T01 add pause controls menu`
