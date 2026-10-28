# Task: T01 Separate Throw Axes

## Status: done

## Goal
파트너의 발사 수평 충격량을 `700px/s`로 낮추고 수직 충격량을 `1100px/s`로 높인다.

## Decision Summary
- Replace the single `ropeLaunchImpulse: 900` constant with independent horizontal and vertical constants.
- Horizontal impulse becomes 700; vertical impulse becomes 1100.
- Preserve target-only launch, pull-direction sign, 0.35-second momentum window, and automatic rope release.

## Implementation

### I01. 축별 발사 충격량

- Related Files:
  - `game.js` :: `PHYSICS`, `Game.updateRopes(delta)`; define and apply separate horizontal and vertical launch impulse values.

#### Details
- **Signatures & Types**: Keep existing method signatures. `ropeLaunchHorizontalImpulse` and `ropeLaunchVerticalImpulse` are numeric px/s values.
- **Data & Schema Fields**: Remove `ropeLaunchImpulse`; add `ropeLaunchHorizontalImpulse: 700` and `ropeLaunchVerticalImpulse: 1100`.
- **Execution Flow / Logic**:
  1. Keep `dx` and `dy` as the normalized owner-to-target vector and preserve subtracting the vector from target velocity so the partner moves toward the thrower.
  2. Apply `target.vx -= dx * PHYSICS.ropeLaunchHorizontalImpulse`.
  3. Apply `target.vy -= dy * PHYSICS.ropeLaunchVerticalImpulse`.
  4. Do not apply launch velocity to the owner. Preserve launch timer, automatic release, baseline tension, and all other state behavior.
- **Error & Exception Handling**: Preserve the existing denominator guard for overlapping players.
- **State Transition & Return**: No state changes.

## Acceptance Criteria
- [ ] Horizontal-only pull launches the target at 700px/s toward the owner.
- [ ] Vertical-only pull launches the target at 1100px/s toward the owner.
- [ ] P2 remains unaffected while P1 is launched.
- [ ] Target momentum window, gravity, collisions, and rope detachment remain unchanged.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "ropeLaunchHorizontalImpulse|ropeLaunchVerticalImpulse|ropeLaunchImpulse|target\.v[xy]" game.js` — verify axis-specific values and target-only launch path.

## Commit Message
```text
fix(physics): balance directional rope throws

Plan: 2026-10-28-directional-throw-balance
Phase: P01-axis-impulses
Task: T01-separate-throw-axes

- Reduce horizontal launch impulse to 700
- Increase vertical launch impulse to 1100
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: dfbbe7e
