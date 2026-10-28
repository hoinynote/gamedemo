# Task: T01 Pull on Slack Rope

## Status: done

## Goal
줄이 파트너에게 연결되어 있는 동안 강화 키를 누르면 줄 장력이 0인 거리에서도 두 플레이어를 서로 끌어당긴다. 강화 키를 놓거나 줄을 풀면 적용 중인 힘을 멈추되 누적 속도는 보존한다.

## Decision Summary
- 연결된 줄의 기존 팽팽한 상태 당김은 계속 작동한다.
- 줄이 느슨해도 강화 키를 누르면 `ropeBoostAcceleration` 힘을 동등·반대 방향으로 양쪽 플레이어에게 적용한다.
- 자동 발사, 추가 충격, 기본 장력 변경은 하지 않는다. 줄 해제 시 기존 속도가 보존된다.

## Implementation

### I01. 느슨한 줄의 강화 당김

- Related Files:
  - `game.js` :: `Game.updateRopes(delta)`; modify the attached-rope force guard so boost force can operate while rope tension is zero.

#### Details
- **Signatures & Types**: Keep `Game.updateRopes(delta)` and all rope/player data fields unchanged. `rope.state` remains `"attached"`, `rope.tension` is numeric, `rope.boostLevel` is `0 | 1`, and `ropeBoostAcceleration` is the existing `2400` constant.
- **Data & Schema Fields**: No schema changes.
- **Execution Flow / Logic**:
  1. Preserve current attached-rope length and tension calculation, boost key detection, and center-to-center direction calculation.
  2. Apply force when `rope.tension > 0 || rope.boostLevel > 0` instead of requiring positive tension only.
  3. Keep the force calculation `(rope.tension * PHYSICS.ropeTensionAcceleration + PHYSICS.ropeBoostAcceleration * rope.boostLevel) * delta`. At zero tension with boost held, the 2400 boost term supplies the force; with no boost and slack rope, force remains zero.
  4. Keep existing equal-and-opposite velocity updates: add `dx * force` and `dy * force` to the owner and subtract them from the target.
  5. Leave rope detachment behavior unchanged. Do not reset either player's velocity when the rope is released so the resulting momentum can throw them.
- **Error & Exception Handling**: Preserve the existing `Math.max(rope.currentLength, 1)` denominator guard for overlapping player centers.
- **State Transition & Return**: No new states. Pull operates only in the existing attached state and stops applying on release of boost or rope.

## Acceptance Criteria
- [ ] Attached, slack rope plus held boost accelerates the owner toward the target and target toward the owner.
- [ ] Attached, slack rope without boost applies no force.
- [ ] Taut rope without boost retains baseline tension pull.
- [ ] Taut rope with boost retains baseline plus boost pull.
- [ ] Releasing boost or detaching the rope leaves existing player velocities intact and adds no separate impulse.
- [ ] Idle or flying ropes do not apply pull force.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "rope.state === \"attached\"|rope.tension > 0|rope.boostLevel > 0|ropeBoostAcceleration|owner.vx|target.vx" game.js` — inspect attached/slack force gating and equal-and-opposite updates.

## Commit Message
```text
feat(physics): reel in partners on slack ropes

Plan: 2026-10-28-rope-reel-in-throw
Phase: P01-slack-rope-pull
Task: T01-pull-on-slack-rope

- Apply held boost force even when attached rope is slack
- Preserve tension pull and momentum on rope release
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: e95291b
