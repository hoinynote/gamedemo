# Task: T01 게임 코어 구현

## Status: done

## Goal

외부 라이브러리 없이 브라우저에서 실행되는 Canvas 협동 플랫폼 게임의 코어를 구현한다. 두 플레이어가 한 키보드로 이동·점프하고, 각자의 발사 방향으로 상대에게 로프를 맞혀 연결한 뒤 장력과 장력 강화 입력으로 도약할 수 있어야 한다. 3개 스테이지, 출구 클리어, 위험 장애물 재시작, 카메라 추적, Web Audio 효과음의 기반을 제공한다.

## Decision Summary

- 실행 방식은 `index.html`을 브라우저로 열면 동작하는 HTML/CSS/JavaScript + Canvas 단일 웹 게임이다.
- P1 조작은 `F/H` 좌우, `T` 점프, `G` 플랫폼 통과이며 `Q`는 로프 발사·해제, `W`는 장력 강화다. P2 조작은 좌우 방향키, 위·아래 방향키, `[` 로프 발사·해제, `]` 장력 강화다.
- 로프는 플레이어가 바라보는 방향으로 발사되고 벽에 막히며, 상대에게 맞으면 연결된다. 최대 길이를 넘으면 장력이 발생한다.

## Implementation

### I01. 정적 웹 진입점과 화면 구성

- Related Files:
  - `index.html` :: Canvas, 메뉴·일시정지·클리어 오버레이, 조작 안내를 제공; new
  - `styles.css` :: 밝은 2D 벡터 스타일과 반응형 레이아웃; new

#### Details

- `index.html`에 `canvas#game-canvas`를 960x540 논리 해상도로 배치한다.
- `#menu-screen`, `#pause-screen`, `#clear-screen` 오버레이를 만들고 기본적으로 숨긴다. 메뉴에는 두 플레이어 조작법과 `Enter` 시작 안내를 표시한다.
- `styles.css`는 게임 영역을 화면 중앙에 배치하고 Canvas가 작은 화면에서 축소되도록 하며, 플레이어·로프·장력·위험·출구를 구분할 수 있는 색상 체계를 정의한다.
- `index.html`은 `styles.css`와 `game.js`를 순서대로 로드하며 네트워크 의존성이나 외부 이미지·폰트를 사용하지 않는다.

### I02. 게임 모델과 메인 루프

- Related Files:
  - `game.js` :: `Game`, `Player`, `Rope`, `Stage`, `InputManager`; new

#### Details

- `Player` 객체 필드: `id`, `x`, `y`, `vx`, `vy`, `width`, `height`, `spawnX`, `spawnY`, `facing`, `onGround`, `coyoteTimer`, `jumpBufferTimer`, `color`.
- `Rope` 객체 필드: `state` (`idle`|`flying`|`attached`), `ownerId`, `headX`, `headY`, `direction`, `speed`, `maxLength`, `currentLength`, `tension`, `boostLevel`, `targetPlayerId`.
- `Stage` 객체 필드: `id`, `name`, `width`, `height`, `spawns`, `platforms`, `hazards`, `switches`, `movingPlatforms`, `crates`, `doors`, `exit`.
- `Game` 상태 필드: `mode` (`menu`|`playing`|`paused`|`won`), `stageIndex`, `players`, `ropes`, `stageState`, `cameraX`, `elapsed`, `lastFrameAt`.
- `InputManager`는 `keydown`/`keyup`을 등록하고 키 상태를 `Set<string>`으로 관리한다. `preventDefault()`는 방향키·스페이스·대괄호에만 적용해 브라우저 스크롤을 막는다.
- `requestAnimationFrame` 루프는 프레임 간 delta를 0.033초로 제한한다. `mode !== 'playing'`이면 물리 갱신을 하지 않고 렌더링만 수행한다.

### I03. 플레이어 물리와 로프 상호작용

- Related Files:
  - `game.js` :: `Game.updatePlayers`, `Game.fireRope`, `Game.releaseRope`, `Game.applyRopeTension`, `Game.resolveCollisions`; new

#### Details

- 중력, 좌우 가속·감속, 최대 수평 속도, 점프 속도, 플랫폼 충돌을 구현한다. `T`/위쪽 방향키의 짧은 입력으로도 점프하며, `G`/아래쪽 방향키는 하강 가능한 발판에서 아래로 통과하는 상태를 만든다.
- P1은 `Q`, P2는 `[`의 신규 입력(edge)에서 자신의 로프를 `flying`으로 만들고, 이미 연결된 경우 같은 키의 신규 입력으로 `idle`로 해제한다. 발사 방향은 `facing`을 기준으로 한다.
- 로프 투사체는 `speed`로 이동하고 플랫폼·벽 AABB를 먼저 검사한다. 상대 플레이어의 AABB에 충돌하면 `attached`, 아니면 `maxLength` 또는 화면 밖 도달 시 `idle`로 돌아간다.
- `attached` 상태에서는 두 플레이어 사이 거리와 `maxLength` 차이를 장력으로 계산한다. 두 플레이어를 서로 당기는 방향으로 반작용 속도를 적용하고, 각 플레이어의 `W`/`]` 입력이 눌린 동안 `boostLevel`을 올려 장력을 강화한다.
- 로프 연결·강화·해제에는 짧은 Web Audio oscillator 효과음을 사용한다. AudioContext는 사용자 입력(`Enter` 또는 게임 조작) 이후에만 생성·재개한다.

### I04. 스테이지, 퍼즐, 카메라, 클리어·실패 처리

- Related Files:
  - `game.js` :: `STAGES`, `Game.loadStage`, `Game.resetStage`, `Game.updateObjects`, `Game.checkStageResult`, `Game.updateCamera`, `Game.render`; new

#### Details

- `STAGES`에 튜토리얼, 기본 로프 퍼즐, 복합 장애물 퍼즐 3개를 데이터로 정의한다. 각 스테이지에는 플랫폼·낭떠러지·가시·벽·스위치·움직이는 발판·중량 상자·당겨지는 문·출구를 최소 한 번씩 사용한다.
- 두 플레이어가 모두 출구 영역에 겹치면 `won` 상태가 된다. `won`에서 `Enter` 입력 시 다음 스테이지를 로드하며 3번째 스테이지 후 최종 클리어 화면을 표시한다.
- 낭떠러지 또는 가시에 닿으면 두 플레이어를 스폰 위치로 되돌리고 로프·오브젝트 상태를 초기화한다.
- 카메라는 두 플레이어의 중간 x 좌표를 기준으로 계산하고, 0과 `stage.width - canvas.width` 사이로 제한한다.
- 모든 렌더링은 Canvas 2D API의 도형·텍스트만 사용하고, 로프에는 장력 크기에 따른 색상·두께 변화를 적용한다.

## Acceptance Criteria

- [ ] `index.html`을 브라우저에서 열었을 때 시작 화면이 표시되고 `Enter`로 게임이 시작된다.
- [ ] 두 플레이어가 지정된 키로 독립적으로 이동·점프할 수 있다.
- [ ] 로프가 바라보는 방향으로 발사되고 벽에 막히며 상대에게 맞으면 연결된다.
- [ ] 연결된 로프의 최대 길이 초과와 `W`/`]` 장력 강화가 플레이어의 도약에 영향을 준다.
- [ ] 3개 스테이지를 순서대로 플레이하고 두 플레이어가 함께 출구에 도착해 클리어할 수 있다.
- [ ] 위험 장애물에 닿으면 현재 스테이지가 스폰 상태로 재시작된다.

## Validation

- `node --check game.js` — JavaScript 구문 검증
- `rg -n "canvas|requestAnimationFrame|STAGES|fireRope|applyRopeTension" index.html game.js` — 핵심 구현 존재 검증
- 브라우저에서 `index.html` 열기 — 시작·이동·점프·로프·스테이지 클리어 수동 검증

## Commit Message

```text
feat(game): implement playable cooperative rope platformer

Plan: 2026-09-21-cooperative-rope-game
Phase: P01-playable-game
Task: T01-game-core

- Add standalone Canvas game shell and two-player controls
- Add rope launch, attachment, tension physics, and three stages
```

## Progress

- [x] 구현 완료
- [x] 구조 검증 통과
- [ ] Node.js·브라우저 런타임 검증 (환경 도구 없음)
- commit: unavailable (이 환경에 Git이 설치되어 있지 않음)
