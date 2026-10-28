# Task: T01 Double Rope Boost

## Status: done

## Goal
강화 키를 누를 때 적용되는 로프 가속도를 `2400`에서 `4800`으로 두 배 높여 파트너를 더 빠르게 당기고, 줄을 풀었을 때 더 큰 속도로 날아가게 한다.

## Decision Summary
- `ropeBoostAcceleration` becomes `4800`, twice the current value.
- Preserve the existing held-key activation, slack-rope pull, taut-rope baseline force, and equal-and-opposite force.
- Preserve velocity when boost is released or the rope is detached.

## Implementation

### I01. 강화 로프 가속도 상향

- Related Files:
  - `game.js` :: `PHYSICS.ropeBoostAcceleration`; modify the existing constant used by `Game.updateRopes(delta)`.

#### Details
- **Signatures & Types**: Keep `Game.updateRopes(delta)` unchanged. `ropeBoostAcceleration` remains a numeric acceleration constant.
- **Data & Schema Fields**: Change `PHYSICS.ropeBoostAcceleration` from `2400` to `4800`. Keep `ropeTensionAcceleration: 7` and `moveAcceleration: 2200` unchanged.
- **Execution Flow / Logic**:
  1. Keep `rope.boostLevel` equal to `1` only while the configured boost key is held on an attached rope.
  2. Keep the current force formula and its force gate (`rope.tension > 0 || rope.boostLevel > 0`). This preserves boosted pulling at both taut and slack lengths.
  3. Keep equal-and-opposite velocity updates for owner and partner.
  4. Do not clamp rope-applied velocities or clear velocities when boost is released or the rope is detached.
- **Error & Exception Handling**: No new error paths.
- **State Transition & Return**: No state changes; only the held boost acceleration changes.

## Acceptance Criteria
- [ ] Held boost adds acceleration 4800 on a connected rope, whether slack or taut.
- [ ] Baseline taut-rope tension remains unchanged.
- [ ] Owner and partner receive equal-and-opposite acceleration.
- [ ] Releasing boost or the rope preserves the velocity already accumulated.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "moveAcceleration|ropeTensionAcceleration|ropeBoostAcceleration|rope.tension > 0 \|\| rope.boostLevel > 0" game.js` — verify force values and gating.

## Commit Message
```text
feat(physics): double rope launch acceleration

Plan: 2026-10-28-rope-launch-power
Phase: P01-launch-acceleration
Task: T01-double-rope-boost

- Double held rope boost acceleration to 4800
- Preserve recoil momentum and slack-rope pulling
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 35b76b4
