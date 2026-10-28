# Task: T01 Title and Holographic Map

## Status: pending

## Goal
Visually separate the public game introduction from the stage selection screen and replace the simple card grid with an illustrated, neon holographic progression map.

## Decision Summary
- The title screen has one primary “게임 시작” action and remains distinct from the map.
- Stage map style is holographic and connected to the four existing stage cards and progress states.
- Existing stage copy, throw puzzles, unlock rules, and themes remain unchanged.

## Implementation

### I01. Distinct title and map structure
- Related Files:
  - `index.html` :: split current `#menu-screen` into `#title-screen` and authenticated `#stage-screen`; modify
  - `game.js` :: `renderUI`, `showOverlay`, `openStageMap`, `returnToMenu`; modify
  - `styles.css` :: title and stage screen layouts; modify
- Details:
  - Title includes game mark, short co-op hook, one “게임 시작” CTA, and small controls/settings access. Keep ranking, stage cards, progress, and continue action off title.
  - Stage screen includes user/team status, map route, continue/new-run controls, ranking button, settings, and sign-out. Stage selection stays gated by auth logic from P02.
  - Returning from pause goes to authenticated stage screen; signing out returns to title.

### I02. Holographic route composition
- Related Files:
  - `index.html` :: `#stage-map` semantic container; modify
  - `game.js` :: `renderStageMap`, `getStageProgressStatus`; modify
  - `styles.css` :: `.stage-map`, `.stage-route-node`, `.stage-card` and hologram visuals; modify
- Details:
  - Draw an inline SVG route behind cards with animated but reduced-motion-safe luminous segments, node beacons, and subtle scan lines/grid. Use CSS/SVG, not external image assets.
  - Give each existing stage card a compact illustrated icon/region badge using its stage palette: sunny meadow, turquoise coastal ruins, aurora canyon, secret relay. Make current, completed, locked, and bonus-available states distinguishable by shape/color and text label, not color alone.
  - Keep objective, gimmick, difficulty, estimate, and locked-stage hint readable; preserve existing card click behavior and accessible button labels.
  - On narrow screens, route and cards stack vertically with no horizontal overflow. Respect `prefers-reduced-motion`.

## Acceptance Criteria
- [ ] Title and stage map are visibly separate states with only the intended title CTA.
- [ ] Holographic route communicates stage order and status while all existing stage actions still work.
- [ ] Stage name/objective/gimmick/difficulty/time/hint remain readable on mobile and desktop.
- [ ] Reduced-motion preference removes continuous map animation.

## Validation
- `node --check game.js`
- `git diff --check`
- Compare root and `site/` copies after synchronization in T02.

## Commit Message
```text
feat(ui): separate title and draw holographic stage map

Plan: 2026-10-28-company-leaderboard-and-visual-redesign
Phase: P03-visuals-and-deployment
Task: T01-title-and-holographic-map

- Separate public introduction from authenticated stage selection
- Draw a responsive holographic route for campaign progress
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
