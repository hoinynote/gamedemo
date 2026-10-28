# Decisions: Disable Down-Key Platform Drop

- Date: 2026-10-28
- Status: Confirmed

## D01. Down-key gameplay behavior
- **Chosen**: Disable platform dropping for both players. The down key must never move either player through a platform or ground.
- **Rationale**: The user selected disabling this behavior for both players to prevent characters falling below the level and triggering a restart.

## D02. Down-key control and rope aiming
- **Chosen**: Keep the down-key binding configurable for both players as the downward rope-aim direction; rename its control label from platform passing to downward aiming.
- **Rationale**: Existing `getRopeAim` uses the same binding to aim the rope downward. Preserving that behavior avoids removing an unrelated rope feature.

## D03. Control summary
- **Chosen**: Remove the platform-passing description from both players' control settings and summaries, and identify the binding as downward rope aim.
- **Rationale**: Control UI should not advertise platform dropping after that behavior is disabled.

## D04. Scope
- **Chosen**: Apply the game logic and label changes to both the root and `site/` copies of `game.js`; preserve the existing saved-control schema and other actions.
- **Rationale**: The root and deployable `site/` game scripts are mirrored. Keeping both consistent avoids local/deployed behavior drift.
