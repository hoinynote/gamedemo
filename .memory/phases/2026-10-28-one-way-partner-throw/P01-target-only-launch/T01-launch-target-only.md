# Task: T01 Launch Target Only

## Status: done

## Goal
연결된 로프에서 발사 키를 누를 때 `target`만 발사하고 `owner`에게 발사 속도와 관성 타이머를 적용하지 않는다.

## Decision Summary
- Pressing P2's launch key launches P1; the thrower remains without a launch impulse.
- Keep the existing target launch impulse and target momentum window.
- Keep baseline taut-rope force and paired-rope detachment behavior.
- Update help text so it no longer claims that the thrower recoils.

## Implementation

### I01. 대상 플레이어만 발사

- Related Files:
  - `game.js` :: `Game.updateRopes(delta)`; remove thrower impulse/timer, retain target impulse/timer.
  - `game.js` :: `Game.renderControls()`; update rope help to state only the partner launches.

#### Details
- **Signatures & Types**: Keep all method signatures and existing data types unchanged. `owner` is the player who pressed the launch key; `target` is the connected partner.
- **Data & Schema Fields**: No schema changes. Keep `Player.launchTimer` and `PHYSICS.ropeLaunchImpulse` as existing fields.
- **Execution Flow / Logic**:
  1. In the attached-rope boost-key branch, remove the `owner.vx` and `owner.vy` impulse updates.
  2. Do not set `owner.launchTimer` to the throw duration; clear any leftover owner timer to `0` so the thrower is immediately under normal horizontal control.
  3. Keep target velocity updates `target.vx += dx * PHYSICS.ropeLaunchImpulse` and `target.vy += dy * PHYSICS.ropeLaunchImpulse`.
  4. Keep `target.launchTimer = PHYSICS.ropeLaunchDuration` so the partner's thrown speed survives the protected window.
  5. Preserve automatic detachment of all attached ropes between the pair and preserve baseline tension on frames without a launch-key press.
  6. Change on-screen help to explain that the connected partner launches away from the thrower and that the thrower does not receive launch recoil.
- **Error & Exception Handling**: No new error paths.
- **State Transition & Return**: The same rope detachment state transition remains; only the target is assigned launch momentum.

## Acceptance Criteria
- [ ] P2 pressing launch applies impulse and launch timer only to P1.
- [ ] P2 receives no launch impulse and no launch timer from the action.
- [ ] P1 continues to preserve horizontal launch speed for the configured window.
- [ ] Both connecting ropes detach and baseline tension remains otherwise unchanged.
- [ ] Help text states that only the partner launches.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "owner\.v[xy].*ropeLaunchImpulse|target\.v[xy].*ropeLaunchImpulse|owner\.launchTimer|target\.launchTimer|파트너만|발사자" game.js` — verify launch impulse and timer are assigned only to the partner and help copy is accurate.

## Commit Message
```text
fix(physics): launch only the rope target

Plan: 2026-10-28-one-way-partner-throw
Phase: P01-target-only-launch
Task: T01-launch-target-only

- Apply launch impulse and momentum window only to partner
- Keep thrower under normal movement control
- Clarify one-way throw instructions
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 1877642
