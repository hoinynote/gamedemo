# Task: T01 Launch on Press

## Status: done

## Goal
연결된 로프 상태에서 설정된 강화 키를 새로 누르면 즉시 파트너에게 `1000px/s` 속도를 줄 방향 바깥쪽으로 적용하고, 발사자에게는 동등·반대 속도를 적용한 뒤 로프를 자동 해제한다.

## Decision Summary
- User selected an immediate launch impulse on boost-key press.
- The launch impulse is `1000px/s`, applied once per keydown edge.
- The target moves away from the owner; the owner receives the equal-and-opposite recoil.
- Detach the rope immediately after launch. Keep the baseline taut-rope tension mechanic.
- Update controls text so the key describes partner launch instead of held pull boost.

## Implementation

### I01. 순간 발사 물리

- Related Files:
  - `game.js` :: `PHYSICS`, `Game.updateRopes(delta)`; replace held boost acceleration with edge-triggered launch impulse and preserve baseline tension.

#### Details
- **Signatures & Types**: Keep `Game.updateRopes(delta)` unchanged. Add numeric `PHYSICS.ropeLaunchImpulse` in pixels per second. Preserve `rope.boostLevel` field for checkpoint compatibility but set it to `0` when calculating current rope rendering/state.
- **Data & Schema Fields**: Remove `ropeBoostAcceleration`; add `ropeLaunchImpulse: 1000`. Leave `ropeTensionAcceleration: 7` unchanged.
- **Execution Flow / Logic**:
  1. In the attached-rope branch, refresh centers, rope length, and tension as currently done.
  2. Detect the configured launch key with `this.input.wasPressed(controls.boost)` so a held key fires only once.
  3. Compute the unit vector from owner center toward target center using existing distance and denominator guard.
  4. Add `dx * ropeLaunchImpulse` and `dy * ropeLaunchImpulse` to the target velocity. Subtract those values from owner velocity for recoil.
  5. Set every attached rope involving the owner or target pair to idle and clear its `tension`, `boostLevel`, and `targetPlayerId`; this also releases a reciprocal rope if both players had fired one. Play `this.audio.boost()` once; skip further processing for this rope during that frame.
  6. When no launch-key edge occurs, apply only the existing baseline tension force when `rope.tension > 0`, using `rope.tension * PHYSICS.ropeTensionAcceleration * delta` and the current equal-and-opposite updates.
  7. Do not clamp or clear the velocities created by launch or recoil. Idle and flying ropes do not launch a partner.
- **Error & Exception Handling**: Keep `Math.max(rope.currentLength, 1)` in the direction denominator to handle coincident player centers.
- **State Transition & Return**: An attached rope transitions to idle on a launch key edge. No schema migration is required; retain the serialized `boostLevel` property for old checkpoint compatibility.

### I02. 조작 안내 업데이트

- Related Files:
  - `game.js` :: `CONTROL_ACTION_LABELS.boost`, `Game.renderControls()`; update action and summary text to describe partner launch.

#### Details
- Set the boost action label to `파트너 발사`.
- Update the menu controls summary from `당기기` to `파트너 발사` for the configured boost binding.
- Update `#rope-control-help` text to say that pressing the configured boost key while a rope is attached launches the partner away from the owner, releases the rope, and gives the owner recoil.
- Keep configurable key bindings and all other help text unchanged.

## Acceptance Criteria
- [ ] Pressing the configured boost key once while a rope is attached gives the partner an immediate 1000px/s velocity away from the owner.
- [ ] The owner receives equal-and-opposite recoil.
- [ ] All attached ropes between the pair detach immediately after launch and do not pull the target back.
- [ ] Holding the key does not repeatedly fire; a new press is required.
- [ ] Taut ropes without the launch key retain baseline tension behavior.
- [ ] Idle or flying ropes do not trigger a launch.
- [ ] On-screen action text explains the new launch behavior.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "ropeLaunchImpulse|ropeBoostAcceleration|wasPressed\(controls.boost\)|rope.state = \"idle\"|파트너 발사|rope.tension > 0" game.js` — inspect launch constant, edge trigger, detach, labels, and baseline force.

## Commit Message
```text
feat(physics): launch partner on boost press

Plan: 2026-10-28-instant-rope-launch
Phase: P01-instant-launch
Task: T01-launch-on-press

- Launch attached partner with an immediate rope impulse
- Recoil owner and release rope after launch
- Update boost-key instructions
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 3135409
