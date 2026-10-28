# Task: T01 Preserve Launch Momentum

## Status: done

## Goal
발사 직후 발사자와 파트너의 수평 속도를 `0.35초` 동안 보존해 충분히 날아가게 하고, 이후 기존 이동 제어와 마찰을 복구한다.

## Decision Summary
- Add `Player.launchTimer`, initialized to `0`.
- Set both players' timer to `0.35` on instant rope launch.
- While timer is positive, skip horizontal input acceleration, max-speed clamp, and friction; continue normal vertical gravity, jumping, and collision.
- Save/restore the timer as an optional player checkpoint field; old checkpoints default it to `0`.

## Implementation

### I01. 발사 관성 시간 적용

- Related Files:
  - `game.js` :: `PHYSICS`, `Player.constructor`, `Game.updatePlayers(delta)`, `Game.updateRopes(delta)`, `Game.serialize()`, `Game.restore(snapshot)`; modify launch-momentum state and handling.

#### Details
- **Signatures & Types**: Add numeric `PHYSICS.ropeLaunchDuration: 0.35`. Add mutable numeric `Player.launchTimer`, initialized to `0` seconds.
- **Data & Schema Fields**: Add optional `launchTimer` to each serialized player object without changing checkpoint `version: 1`. On restore, use `Math.max(0, saved.launchTimer)` when finite; default missing or invalid values to `0` for backward compatibility.
- **Execution Flow / Logic**:
  1. At the start of each `updatePlayers` iteration, decrement `player.launchTimer` by `delta`, clamped at zero.
  2. If the decremented timer is positive, leave `player.vx` unchanged for this frame: do not apply directional acceleration, `maxSpeed` clamp, or friction. If zero, run the existing direction and friction logic unchanged.
  3. Keep jump processing, gravity, collision resolution, stage bounds, and other player updates active during the launch window.
  4. In the attached-rope launch branch, after applying the existing equal-and-opposite impulse, set `owner.launchTimer` and `target.launchTimer` to `PHYSICS.ropeLaunchDuration` before detaching connected ropes.
  5. Do not modify impulse magnitude, launch direction, rope release, or baseline tension.
- **Error & Exception Handling**: Guard restored timer values with `Number.isFinite`; missing checkpoint fields remain compatible.
- **State Transition & Return**: Timers count down to zero. Normal horizontal control resumes after the 0.35-second protected period.

### I02. Checkpoint state persistence

- Related Files:
  - `game.js` :: `Game.serialize()`, `Game.restore(snapshot)`; modify player checkpoint shape compatibly.

#### Details
- Serialize `launchTimer` for each player.
- Restore finite non-negative values, defaulting old checkpoint entries to `0`.
- Preserve version 1 and all existing checkpoint fields.

## Acceptance Criteria
- [ ] After a rope launch, both players preserve their launch horizontal speed for 0.35 seconds even if they press a direction key.
- [ ] Horizontal friction and movement speed clamping resume after the timer expires.
- [ ] Gravity, jumping, and solid collision remain active throughout the launch window.
- [ ] A checkpoint saved during launch restores the remaining timer; older checkpoints without the field restore with timer zero.
- [ ] Launch impulse, direction, and baseline taut-rope pull remain unchanged.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "ropeLaunchDuration|launchTimer|maxSpeed|friction|serialize\(|restore\(" game.js` — inspect timer initialization, countdown, force trigger, and checkpoint path.

## Commit Message
```text
feat(physics): preserve momentum after rope launch

Plan: 2026-10-28-throw-momentum-window
Phase: P01-preserve-throw-speed
Task: T01-preserve-launch-momentum

- Preserve horizontal launch speed for 0.35 seconds
- Restore normal steering after the throw window
- Save launch timer with backward-compatible checkpoints
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 159835f
