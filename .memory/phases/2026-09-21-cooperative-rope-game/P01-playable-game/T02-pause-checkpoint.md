# Task: T02 뒤로가기 일시정지와 체크포인트

## Status: done

## Goal

브라우저 뒤로가기나 탭 전환으로 게임 화면을 벗어나도 게임 루프를 정지하고 현재 진행 상태를 저장한다. 사용자가 게임으로 돌아오면 시작 상태로 초기화하지 않고 저장된 스테이지·플레이어·로프·퍼즐 상태를 복원한 일시정지 화면을 보여주며, 재개 입력 후 저장 지점부터 플레이할 수 있게 한다.

## Decision Summary

- 뒤로가기 감지는 `history.pushState` + `popstate`로 처리하고, 실제 문서 이탈 대신 같은 게임 URL을 유지하면서 `paused`로 전환한다.
- 탭 숨김·창 블러·페이지 이탈 직전에도 동일한 일시정지와 저장을 적용한다.
- 저장소는 `localStorage` 키 `cooperative-rope-game:checkpoint:v1`을 사용하며, JSON 파싱 실패·버전 불일치·손상된 데이터는 무시하고 새 게임으로 안전하게 시작한다.

## Implementation

### I01. 체크포인트 직렬화와 복원

- Related Files:
  - `game.js` :: `CheckpointStore`, `Game.serialize`, `Game.restore`; modify

#### Details

- 체크포인트 스키마는 다음 필드를 포함한다.
  - `version: 1`
  - `savedAt: number`
  - `mode: 'paused'|'playing'|'won'`
  - `stageIndex: number`
  - `players: Array<{id: 1|2, x: number, y: number, vx: number, vy: number, facing: -1|1, onGround: boolean}>`
  - `ropes: Array<{state: 'idle'|'flying'|'attached', ownerId: 1|2, headX: number, headY: number, direction: -1|1, currentLength: number, tension: number, boostLevel: number, targetPlayerId: 1|2|null}>`
  - `stageState: {switches: Record<string, boolean>, doors: Record<string, boolean>, movingPlatforms: Record<string, number>, crates: Record<string, {x: number, y: number, vx: number, vy: number}>}`
  - `cameraX: number`
- `CheckpointStore.save(snapshot)`은 `JSON.stringify` 후 `localStorage.setItem`을 호출하고 저장 예외를 삼킨다. 저장 실패가 게임 플레이를 중단시키면 안 된다.
- `CheckpointStore.load()`는 키를 읽어 JSON 파싱 후 `version === 1`, `stageIndex` 범위, 플레이어 좌표의 유한성 검증을 통과한 경우에만 반환한다.
- `Game.restore(snapshot)`은 스테이지를 먼저 `loadStage(snapshot.stageIndex)`한 뒤 플레이어·로프·스위치·문·움직이는 발판·상자·카메라를 복구하고 `mode = 'paused'`로 설정한다. `lastFrameAt`은 현재 시각으로 재설정해 복귀 순간 큰 delta가 발생하지 않도록 한다.

### I02. 브라우저 수명주기와 뒤로가기 일시정지

- Related Files:
  - `game.js` :: `HistoryPauseController`, `Game.pause`, `Game.resume`, `Game.saveCheckpoint`; modify

#### Details

- `HistoryPauseController.install()`은 현재 URL에 `game` 상태를 `replaceState`하고, 게임 시작 시 동일 URL에 guard entry를 `pushState`한다.
- `popstate`가 발생하면 즉시 `pushState`로 게임 guard를 복원하고 `game.pause('browser-back')`를 호출한다. 따라서 브라우저 뒤로가기로 문서가 교체되거나 게임이 새로 로드되지 않는다.
- `document.visibilitychange`에서 `document.hidden === true`이면 `game.pause('visibility')`와 `saveCheckpoint()`을 실행한다. 다시 visible이 되어도 자동 재개하지 않고 일시정지 화면을 유지한다.
- `window.blur`와 `pagehide`에서도 저장과 일시정지를 수행한다. 저장 함수는 멱등적으로 호출 가능해야 한다.
- `Game.pause(reason)`은 현재 `playing`일 때만 `mode = 'paused'`, `pauseReason = reason`, `saveCheckpoint()`을 수행한다. 렌더 루프는 계속 실행하되 물리·입력 기반 이동은 중단한다.
- `Game.resume()`은 저장된 일시정지 상태의 게임을 `playing`으로 전환하고 `lastFrameAt = performance.now()`로 갱신한다.

### I03. 일시정지 UI와 저장 지점 복귀

- Related Files:
  - `index.html` :: `#pause-screen`; modify
  - `styles.css` :: `.overlay`, `.pause-screen`; modify
  - `game.js` :: `Game.renderOverlay`, `Game.handleGlobalInput`; modify

#### Details

- 일시정지 오버레이에는 `게임 일시정지`, 일시정지 원인에 따른 안내, `Enter: 계속하기`, `R: 현재 스테이지 재시작`을 표시한다.
- 게임 초기화 시 유효한 체크포인트가 있으면 `restore()` 후 일시정지 화면을 먼저 보여준다. 체크포인트가 없으면 메뉴 화면을 보여준다.
- 일시정지 중 `Enter`는 `resume()`, `R`은 현재 스테이지를 스폰 상태로 초기화하고 체크포인트를 갱신한 뒤 `playing`으로 전환한다. 일시정지 중 이동·로프 키는 게임 상태를 바꾸지 않는다.
- 스테이지 전환·최종 클리어 시 체크포인트를 갱신하며, 새 게임 시작 또는 사용자가 최종 클리어 화면에서 `N`을 누를 때만 체크포인트를 삭제한다.

## Acceptance Criteria

- [ ] 플레이 중 브라우저 뒤로가기를 눌러도 문서가 이동하거나 게임이 초기화되지 않고 일시정지 오버레이가 표시된다.
- [ ] 뒤로가기 직전의 스테이지, 플레이어 위치·속도·방향, 로프 연결·장력, 퍼즐 상태가 localStorage에 저장된다.
- [ ] 탭 전환 후 돌아왔을 때 자동 재개하지 않고 저장된 지점에서 일시정지 상태로 유지된다.
- [ ] `Enter`로 저장 지점에서 재개하고 `R`로 현재 스테이지만 재시작할 수 있다.
- [ ] 새로고침 후 유효한 체크포인트가 있으면 저장된 지점에서 일시정지 상태로 복원된다.
- [ ] 손상되었거나 버전이 다른 체크포인트가 있어도 게임이 빈 메뉴에서 정상적으로 시작된다.

## Validation

- `node --check game.js` — JavaScript 구문 검증
- 브라우저 수동 검증 — 플레이 중 뒤로가기, 탭 전환, 새로고침, `Enter` 재개, `R` 재시작
- 개발자 콘솔 검증 — `localStorage.getItem('cooperative-rope-game:checkpoint:v1')`에 현재 상태 JSON이 저장되는지 확인

## Commit Message

```text
feat(game): pause and restore progress on browser navigation

Plan: 2026-09-21-cooperative-rope-game
Phase: P01-playable-game
Task: T02-pause-checkpoint

- Persist gameplay checkpoints in localStorage
- Pause on browser back, tab hide, blur, and page exit
- Restore the last checkpoint without resetting the game
```

## Progress

- [x] 구현 완료
- [x] 구조 검증 통과
- [ ] 브라우저 수동 검증 (환경에 사용 가능한 브라우저 없음)
- commit: unavailable (이 환경에 Git이 설치되어 있지 않음)
