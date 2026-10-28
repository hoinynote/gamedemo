# Task: T01 Preserve Ground Collision

## Status: done

## Goal
`ArrowDown` 또는 재설정된 아래 키를 눌렀을 때 플레이어가 일반 공중 플랫폼은 통과할 수 있고, `kind: "ground"` 바닥과 겹치면 바닥 위에 정착하도록 `game.js`의 수직 충돌을 수정한다.

## Decision Summary
- 아래 키는 플랫폼 통과 동작에 계속 사용한다.
- 맵 바닥(`kind === "ground"`)은 플랫폼 통과 타이머 중에도 항상 수직 충돌 대상으로 유지한다.
- 하향 로프 조준, 키 설정 및 입력 처리는 변경하지 않는다.

## Implementation

### I01. 바닥 충돌 예외 추가

- Related Files:
  - `game.js` :: `Game.resolveVertical(player, previousY)`; modify. Preserve ground collision while the player's `dropTimer` is active.

#### Details
- **Signatures & Types**: Keep the existing JavaScript method signature `resolveVertical(player, previousY)` unchanged. `player` is the existing mutable player object with numeric `y`, `height`, `vy`, `dropTimer`, and boolean `onGround` properties. Each solid is the existing platform-like object; map ground uses the string field `kind` with value `"ground"`.
- **Data & Schema Fields**: No schema changes. Use the existing `solid.kind` field and existing `player.dropTimer` timer.
- **Execution Flow / Logic**:
  1. Preserve `player.onGround = false` at method entry and the current intersection and `wasAbove` checks.
  2. In the downward landing branch, permit landing when `player.dropTimer <= 0` **or** `solid.kind === "ground"`.
  3. Leave upward collision handling unchanged. Ordinary platforms remain pass-through while the timer is positive; ground remains solid.
  4. Do not change the drop timer duration, the 8px initial offset, controls, or rope aiming.
- **Error & Exception Handling**: No new exceptions or error paths.
- **State Transition & Return**: On landing, retain current behavior: set `player.y = solid.y - player.height`, `player.vy = 0`, and `player.onGround = true`.

## Acceptance Criteria
- [ ] Pressing the down binding while on the map ground leaves the player standing on the ground.
- [ ] Pressing the down binding on an elevated ordinary platform still lets the player pass through it.
- [ ] Vertical collision behavior when moving upward and rope aiming remain unchanged.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- Review `resolveVertical` to confirm the ground exception applies only to the downward landing condition.

## Commit Message
```text
fix(physics): keep ground solid during platform drop

Plan: 2026-10-28-platform-drop-ground-collision
Phase: P01-ground-collision
Task: T01-preserve-ground-collision

- Keep map ground collidable during the platform drop timer
- Preserve pass-through behavior for elevated platforms
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 3c1df8f
