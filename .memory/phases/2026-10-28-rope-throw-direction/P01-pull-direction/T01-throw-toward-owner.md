# Task: T01 Throw Toward Owner

## Status: done

## Goal
발사 키 입력 시 파트너에게 발사자 쪽을 향하는 `900px/s` 속도를 주고, 기존 줄 자동 해제와 파트너의 0.35초 관성 구간을 유지한다.

## Decision Summary
- `dx`/`dy` point from owner to target, so subtract the impulse from target velocity to launch it toward owner.
- Lower `ropeLaunchImpulse` by 10%, from 1000 to 900 px/s.
- The thrower remains under normal movement; only the target receives launch velocity and timer.

## Implementation

### I01. 발사 방향 및 세기 수정

- Related Files:
  - `game.js` :: `PHYSICS.ropeLaunchImpulse`, `Game.updateRopes(delta)`; modify value and target velocity sign.
  - `game.js` :: `Game.renderControls()`; update launch-direction help.

#### Details
- **Signatures & Types**: Keep existing method signatures and `ropeLaunchImpulse` numeric type.
- **Data & Schema Fields**: Set `ropeLaunchImpulse` to `900`.
- **Execution Flow / Logic**:
  1. Keep `dx = (targetCenter.x - ownerCenter.x) / max(currentLength, 1)` and matching `dy`; this vector points from thrower to partner.
  2. Apply `target.vx -= dx * ropeLaunchImpulse` and `target.vy -= dy * ropeLaunchImpulse`, sending the partner toward the thrower along the rope's pull direction.
  3. Keep target-only launch timer, automatic rope release, and baseline tension unchanged.
  4. Update help text to say the partner flies toward the thrower, in the rope's pull direction.
- **Error & Exception Handling**: Retain the existing nonzero distance denominator guard.
- **State Transition & Return**: No state changes.

## Acceptance Criteria
- [ ] P2's connected P1 launches toward P2, along the rope's pulling direction.
- [ ] Impulse magnitude is 900px/s, 10% below the previous 1000px/s.
- [ ] P2 receives no launch impulse; P1 retains the 0.35-second momentum window.
- [ ] Rope detachment and baseline tension behavior remain unchanged.
- [ ] On-screen instructions describe the pull direction accurately.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- `rg -n "ropeLaunchImpulse|target\.v[xy].*ropeLaunchImpulse|ropeHelp.textContent" game.js` — verify impulse direction/value and help text.

## Commit Message
```text
fix(physics): throw partner along rope pull

Plan: 2026-10-28-rope-throw-direction
Phase: P01-pull-direction
Task: T01-throw-toward-owner

- Reverse partner launch impulse toward the thrower
- Reduce impulse by ten percent
- Clarify launch direction in controls help
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 7bc4d15
