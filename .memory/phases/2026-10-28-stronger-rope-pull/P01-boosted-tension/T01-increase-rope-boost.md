# Task: T01 Increase Rope Boost

## Status: done

## Goal
늘어난 줄에 기존 강화 키를 누르는 동안 추가 당김 가속도를 `360`에서 `2400`으로 높여 파트너의 줄 방향 이동을 제약하고, 누적 속도로 강한 반동을 만들 수 있게 한다.

## Decision Summary
- 기본 장력 계수 `ropeTensionAcceleration: 7`은 유지한다.
- 강화 가속도는 `ropeBoostAcceleration: 2400`으로 설정한다. 이는 플레이어 이동 가속도 `2200`보다 크다.
- 강화는 줄 장력(`rope.tension > 0`)이 있고 소유자가 강화 키를 누르는 동안에만 적용한다.
- 당기는 힘은 기존처럼 플레이어 양쪽에 동등·반대 방향으로 적용한다.

## Implementation

### I01. 강화 당김 가속도 상향

- Related Files:
  - `game.js` :: `PHYSICS.ropeBoostAcceleration`; modify the acceleration used by `Game.updateRopes()`.

#### Details
- **Signatures & Types**: Keep existing `PHYSICS` object and `Game.updateRopes(delta)` method unchanged. `ropeBoostAcceleration` remains a numeric acceleration constant.
- **Data & Schema Fields**: Change `PHYSICS.ropeBoostAcceleration` from `360` to `2400`. Leave `ropeTensionAcceleration` at `7`.
- **Execution Flow / Logic**:
  1. Keep `rope.boostLevel = this.input.isDown(controls.boost) ? 1 : 0` unchanged.
  2. Keep the force calculation `(rope.tension * PHYSICS.ropeTensionAcceleration + PHYSICS.ropeBoostAcceleration * rope.boostLevel) * delta` unchanged.
  3. Keep the `rope.tension > 0` guard and the equal-and-opposite velocity updates for owner and target unchanged.
  4. Do not change baseline rope force, movement speed, gravity, rope length, controls, or release/toggle behavior.
- **Error & Exception Handling**: No new error paths.
- **State Transition & Return**: No state transition changes. Existing momentum remains when boost is released or the rope is detached.

## Acceptance Criteria
- [ ] Holding the configured boost key on a stretched attached rope applies acceleration 2400 in addition to baseline tension.
- [ ] A player moving against the rope is opposed by force exceeding the 2200 movement acceleration.
- [ ] Releasing boost removes only the boost term; baseline tension and equal-and-opposite pull behavior remain.
- [ ] Rope tension does not apply boosted force while slack or detached.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "ropeBoostAcceleration|ropeTensionAcceleration|rope.boostLevel|rope.tension > 0" game.js` — confirm constants and force guards remain consistent.

## Commit Message
```text
feat(physics): strengthen boosted rope pull

Plan: 2026-10-28-stronger-rope-pull
Phase: P01-boosted-tension
Task: T01-increase-rope-boost

- Raise boosted rope acceleration above player movement acceleration
- Preserve tension gating and equal-and-opposite recoil
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: f8dbec5
