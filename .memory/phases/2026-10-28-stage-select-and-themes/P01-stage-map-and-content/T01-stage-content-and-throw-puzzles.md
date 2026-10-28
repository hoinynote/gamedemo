# Task: T01 Stage Content and Throw Puzzles

## Status: done

## Goal
Define four stage records and make throws necessary in each campaign stage, while adding a Stage 2 hidden-switch trigger and cooperative relay bonus stage.

## Decision Summary
- Keep campaign IDs 0–2; append bonus ID 3. Campaign exits clear normal stages; Stage 2's hidden launch-only switch independently unlocks the bonus.
- A requiresLaunch switch activates only when a launched player has launchTimer > 0 and overlaps its activation rectangle. Regular switches retain current pressure behavior.

## Implementation

### I01. Stage-card metadata and switch schema
- Related Files:
  - game.js :: switchPad, STAGES — add metadata and switch options; modify.
  - site/game.js :: same symbols — exact mirror; modify identically.

#### Details
- **Signatures & Types**: update switchPad(id, x, y, options = {}). SwitchOptions has optional booleans requiresLaunch, hidden, latchOnLaunch, unlockBonusStage (default false). StageCardInfo has name/objective/gimmick strings, integer difficulty and estimatedMinutes.
- Add card:StageCardInfo to every stage. difficulty is 1–5; estimatedMinutes is positive. Keep IDs and geometry for 0–2; append ID 3 with width, height, spawns, platforms, hazards, switches, movingPlatforms, crates, doors, exit so loadStage can clone it.
- **Card data**:
  - ID 0 첫 연결: objective “파트너를 발사해 첫 문을 열고 함께 출구에 도착하세요”; gimmick “던져서 작동하는 첫 스위치”; difficulty 1; 3 minutes.
  - ID 1 엇갈린 발판: objective “발판과 줄을 이용해 두 문을 지나 출구에 도착하세요”; gimmick “높은 숨은 스위치를 찾아 보너스 구역 해제”; difficulty 2; 5 minutes.
  - ID 2 마지막 당김: objective “연속 장애물을 넘고 두 플레이어가 출구에 도착하세요”; gimmick “먼 발판을 여는 발사 스위치”; difficulty 3; 6 minutes.
  - ID 3 하늘 릴레이: objective “한 명이 스위치를 잡고, 다른 한 명을 던져 연속 장치를 여세요”; gimmick “협동 발사 릴레이”; difficulty 4; 5 minutes.

### I02. Required throws and hidden switch
- Related Files:
  - game.js :: STAGES, updateObjects, drawSwitch — add interactions; modify.
  - site/game.js :: same symbols — exact mirror; modify identically.
- **Flow**:
  1. Set requiresLaunch:true on Stage 1 existing door-one switch; keep its door at x=1332.
  2. Set requiresLaunch:true on Stage 2 existing door-two-a; keep door-two-b momentary and retain the exit.
  3. Add Stage 2 switch {id:"bonus-high-switch", x:1515, y:225, w:34, h:13, requiresLaunch:true, hidden:true, latchOnLaunch:true, unlockBonusStage:true}. It is optional for normal exit and controls no ordinary door.
  4. Set requiresLaunch:true on Stage 3 existing door-three-c; retain door and exit.
  5. Use current activation bounds {x:item.x-4,y:item.y-18,w:item.w+8,h:item.h+20}. A requiresLaunch switch counts only players with launchTimer > 0; crates never count.
  6. A latchOnLaunch switch stays true once activated; all others retain momentary occupancy. Do not draw a hidden switch until active.
  7. Expose unlockBonusStage as data; T02 records it after switch update.
- **Regression guard**: Leave checkStageResult's both-players-inside-exit rule unchanged. A hidden switch never clears or transitions a stage.

### I03. Bonus relay geometry
- Related Files:
  - game.js :: STAGES[3] — add bonus record; new.
  - site/game.js :: STAGES[3] — exact mirror; new.
- **Exact geometry**: width 1700; height VIEW.height; spawns [{x:90,y:440},{x:150,y:440}]; exit {x:1580,y:290,w:72,h:110}.
  - Platforms: ground (0,500,300,40), (420,500,260,40), (820,500,280,40), (1280,500,420,40); upper (220,390,150,22), (520,345,140,22), (720,420,120,22), (980,350,150,22), (1200,410,130,22), (1430,330,170,22).
  - Hazards: (300,470,120,30), (680,470,140,30), (1100,470,180,30).
  - Switches: relay-hold (250,487), momentary; relay-launch-a (585,332), requiresLaunch+latchOnLaunch; relay-launch-b (1030,337), requiresLaunch+latchOnLaunch.
  - Doors: relay-door-a (390,420,34,80) controlled by relay-hold; relay-door-b (760,420,34,80) controlled by relay-launch-a; relay-door-c (1160,420,34,80) controlled by relay-launch-b.
  - Moving platform relay-lift at (1120,280), size 110x18, range 55, speed 1.1, phase 0. No crates.
- **Puzzle flow**: One player holds relay-hold while the partner is thrown to relay-launch-a. After that latched gate opens, partners reposition and repeat for relay-launch-b; then both reach exit.

## Acceptance Criteria
- [ ] STAGES has IDs 0–3 and card metadata; campaign geometry remains except described switch changes.
- [ ] Every campaign and bonus stage has a throw-only switch.
- [ ] Grounded players/crates cannot activate launch-only switches; regular switches retain pressure behavior.
- [ ] Hidden Stage 2 switch latches, remains hidden until activation, and does not change normal clear rules.
- [ ] Root/site game scripts are byte-identical.

## Validation
- node --check game.js — parses.
- node --check site/game.js — parses.
- git diff --check — no whitespace errors.
- Manual browser check: throw onto gated switches, verify grounded/crate rejection, clear Stage 2 without its hidden switch.

## Commit Message
    feat(game): add throw-gated stage puzzles and bonus relay

    Plan: 2026-10-28-stage-select-and-themes
    Phase: P01-stage-map-and-content
    Task: T01-stage-content-and-throw-puzzles

    - add stage card data and a four-stage catalog
    - add launch-only switches and cooperative relay geometry

## Progress
- [x] 구현 완료
- [x] 구문 검사, 미러 일치, 공백 검증 통과
- commit: pending



