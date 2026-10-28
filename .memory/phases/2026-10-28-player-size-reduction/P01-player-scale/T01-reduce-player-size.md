# Task: T01 Reduce Player Size

## Status: done

## Goal
두 플레이어의 너비와 높이를 각각 약 20% 줄이고, 렌더링된 캐릭터도 같은 비율로 줄여 외형과 충돌 판정이 맞도록 한다.

## Decision Summary
- 기존 플레이어 크기는 `30×48px`; 새 충돌 크기는 `24×38px`이다.
- 캐릭터 그림은 균일하게 80% 축소한다.
- 이동 속도, 점프력, 중력, 로프 동작은 변경하지 않는다.

## Implementation

### I01. 플레이어 물리 크기 및 렌더링 조정

- Related Files:
  - `game.js` :: `PHYSICS.playerWidth`, `PHYSICS.playerHeight`; modify dimensions used by `Player` and collision bounds.
  - `game.js` :: `Game.drawPlayer(player)`; modify canvas transform so all player artwork scales uniformly.

#### Details
- **Signatures & Types**: Keep `Player` and `Game.drawPlayer(player)` signatures unchanged. `PHYSICS.playerWidth` and `PHYSICS.playerHeight` remain numeric pixel dimensions.
- **Data & Schema Fields**: Set `PHYSICS.playerWidth` to `24` and `PHYSICS.playerHeight` to `38`. No other schema changes.
- **Execution Flow / Logic**:
  1. `Player` already copies width and height from `PHYSICS`; changing these constants updates its collision bounds, horizontal stage clamp, and vertical landing position through existing references.
  2. In `drawPlayer`, after `ctx.translate(player.x, player.y)`, apply a uniform `ctx.scale(0.8, 0.8)` before drawing the existing 30×48-coordinate artwork. This scales the body, eyes, label, and shadow together.
  3. Preserve colors, animation/state, movement, jumping, ropes, and all other draw behavior.
- **Error & Exception Handling**: No new error paths.
- **State Transition & Return**: No state transition changes; only player dimensions/render transform change.

## Acceptance Criteria
- [ ] Both players use 24×38px collision dimensions.
- [ ] The complete character artwork, including face and P label, renders uniformly at 80% scale.
- [ ] Movement, jump, rope and platform behavior code remain unchanged.

## Validation
- `node --check game.js` — JavaScript syntax validation.
- Review the `Player` constructor and `drawPlayer` transform to confirm collision and rendered sizes both changed.

## Commit Message
```text
feat(physics): reduce player character size

Plan: 2026-10-28-player-size-reduction
Phase: P01-player-scale
Task: T01-reduce-player-size

- Reduce player collision bounds to 24 by 38 pixels
- Scale all player artwork uniformly to 80 percent
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 45363d4
