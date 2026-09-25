# Task: T02 Eight-Way Rope Aim and Stronger Pull

## Status: done

## Goal

Use each owner's held directional controls at the rope-fire frame to launch toward the target along one of eight directions. If no direction is held, launch horizontally in the owner's facing direction. Increase the held boost pull from its current weak value while preserving the existing stretched-rope tension rule and equal-and-opposite force on both players.

## Decision Summary

- Horizontal aim uses the left/right controls; vertical aim uses jump/down controls. P1 `T/G` and P2 `ArrowUp/ArrowDown` retain their jump/drop behavior while also contributing to aim. Diagonal aim is normalized so its travel speed equals horizontal or vertical travel speed.
- When attached-rope tension is positive, the boost term increases from 90 to 360 acceleration units while W/`]` is held. The existing base tension coefficient remains 7. Checkpoint restore accepts both the old scalar direction and the new direction vector.

## Implementation

### I01. Eight-direction rope flight and stronger boost force

- Related Files:
  - `game.js` :: `PHYSICS`, `Game.makeRope`, `Game.updateRopes`, `Game.fireOrToggleRope`, `Game.serialize`, `Game.restore`; modify

#### Details

- Change `PHYSICS` to include `ropeTensionAcceleration: 7` and `ropeBoostAcceleration: 360`. Replace the inline `7` and `90` in the attached-rope force formula with these named values.
- Change `Rope.direction` from a scalar `-1|1` to a unit vector `{x: number, y: number}`. Initialize it to `{x: 1, y: 0}` in `Game.makeRope`.
- Add a launch-direction helper with signature `getRopeAim(owner: Player, controls: PlayerControls): {x: number, y: number}`. Calculate `x = isDown(right) - isDown(left)` and `y = isDown(down) - isDown(jump)`. If both are zero, return `{x: owner.facing, y: 0}`. Otherwise normalize `(x,y)` by its Euclidean length. Opposite directions cancel on their axis; all eight non-zero combinations are supported.
- When `updateRopes` sees the owner's rope key edge, call `fireOrToggleRope(rope, owner, controls)`. Change `fireOrToggleRope` signature to accept `controls`; if toggling an active rope off, keep existing detach behavior. When firing from idle, store `this.getRopeAim(owner, controls)` in `rope.direction`.
- For a flying rope, move along the unit vector in substeps no longer than 8 world pixels so thin platforms and diagonal targets cannot be skipped between frames. Each substep updates both head coordinates, recomputes `currentLength = Math.hypot(headX - originX, headY - originY)`, and applies the existing max-length, solid, and target-player collision checks. Keep origin, target attachment, audio, and rope toggle behavior unchanged.
- For an attached rope, keep the current center-to-center normalized pull direction and equal-and-opposite velocities. Compute `force = (rope.tension * PHYSICS.ropeTensionAcceleration + PHYSICS.ropeBoostAcceleration * rope.boostLevel) * delta`; keep `boostLevel` at 1 only while the owner's configured boost code is held. The boost acceleration is four times the previous 90 value; do not apply boosted force when tension is zero.

### I02. Checkpoint compatibility and in-game instructions

- Related Files:
  - `game.js` :: `Game.serialize`, `Game.restore`, `Game.renderUI`, `Game.drawHud`; modify
  - `index.html` :: menu control instructions; modify

#### Details

- Serialize new rope snapshots with `direction: {x, y}`. When restoring a snapshot, accept a finite vector direction and normalize it; if `direction` is the legacy number `-1` or `1`, migrate it to `{x: direction, y: 0}`. For absent or invalid direction data, use `{x: 1, y: 0}`. Keep checkpoint version 1 and all unrelated checkpoint fields unchanged.
- Update the menu instructions to state that holding the directional controls while pressing the rope key aims in eight directions; with no aim input the rope fires in the facing direction. State that W/`]` strengthens the pull while held.
- Update any on-screen control labels to use the effective binding labels provided by T01; do not reintroduce hard-coded key strings in HUD or menu text.
- Draw the existing line from owner to rope head unchanged; because flight updates both coordinates, the existing line and flying head render the new path without a separate rendering model.

## Acceptance Criteria

- [ ] Rope fire with no directional input travels horizontally toward facing.
- [ ] Left, right, up, down, and all four diagonals launch in the expected direction; diagonal range and speed are not faster than cardinal range and speed.
- [ ] P1 T/G and P2 Up/Down both retain their existing jump/drop action while contributing to launch aim.
- [ ] Flying rope stops on the existing max-length, solid, or target collision rules along its angled path.
- [ ] Holding W/`]` while a connected rope is stretched produces a stronger pull than the previous 90 acceleration term; releasing it removes only the boost term.
- [ ] Old checkpoint snapshots with numeric rope directions restore as horizontal directions; new vector snapshots also restore correctly.

## Validation

- `node --check game.js` — JavaScript syntax validation.
- Browser manual validation: fire all eight directions for both players; hit a target along a diagonal; verify wall blocking and max range; stretch an attached rope and compare held vs released boost; reload an old checkpoint containing numeric direction and a new checkpoint containing a vector.
- `rg -n "direction:|ropeBoostAcceleration|ropeTensionAcceleration|getRopeAim" game.js` — confirm all direction and force paths use the new model.
- Do not add test files for this task unless separately requested.

## Commit Message

```text
feat(game): add eight-way rope aim and stronger pull

Plan: 2026-09-25-rope-control-improvements
Phase: P01-rope-controls
Task: T02-rope-aim-and-force

- Aim rope launches from held directional controls
- Increase boosted tension while preserving rope constraints
- Restore checkpoints with legacy or vector rope directions
```

## Progress

- [x] Implementation complete
- [x] Validation passed: `node --check game.js`, the specified `rg` inspection, eight-direction/facing/force/checkpoint mock-DOM checks, wall substep collision, and diagonal target attachment.
- [ ] Visual browser validation: unavailable because no controllable or installed browser is present in this environment.
- commit: pending
