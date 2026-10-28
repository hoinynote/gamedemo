# Task: T04 Stage Background Themes

## Status: done

## Goal
Replace the shared dark mountain backdrop with four distinct sky gradients and parallax silhouettes.

## Decision Summary
- Stage 1 sunny meadow; Stage 2 bright turquoise coastal ruins; Stage 3 colorful aurora canyon; bonus pastel sky observatory.
- Use the existing 960x540 canvas, preserve camera parallax, add no external assets.

## Implementation

### I01. Theme schema and palette
- Related Files:
  - game.js :: STAGES, Game.render, Game.drawBackground, Game.drawPlatform — attach/render themes; modify.
  - site/game.js :: same symbols — exact mirror; modify identically.
- Theme fields: skyTop, skyMid, skyBottom, far, near, accent, ground, platform, platformTop, moving; each is a CSS hex string.
- **Palettes**:
  - Stage 0: #f7d99a, #a9e6d1, #79c3aa, #72b79e, #4d947d, #fff0aa, #356d5d, #4c896f, #b4d98f, #68b9a3 in field order.
  - Stage 1: #83d9ee, #b7eee1, #f6d99d, #77c8c2, #398c91, #fff0a6, #28666d, #39878a, #afe0b1, #56afb0.
  - Stage 2: #41558f, #8b83be, #f3aa83, #7477a9, #4d5682, #83f2d1, #343f69, #475785, #b6a7e0, #668bc0.
  - Stage 3: #c8b8f0, #f0c4df, #ffe0a1, #ad91c8, #766492, #fff0b5, #574b78, #756395, #e3b6cf, #a88bc4.

### I02. Canvas render
- **Flow**:
  1. In render(), build vertical CanvasGradient from theme sky colors at offsets 0, 0.58, 1. Menu uses Stage 0.
  2. drawBackground(theme=this.stage.theme) keeps camera parallax factor 0.18, draws two silhouette layers with far/near and details with accent; remove single opaque #111c39 mountain.
  3. drawPlatform uses theme.platform, ground, platformTop, moving for the corresponding existing kinds.
  4. Keep hazard/player colors and all geometry/collision behavior unchanged.
  5. Bound shapes to canvas, balance ctx save/restore, and keep backdrop in screen space with cameraX only for parallax.

## Acceptance Criteria
- [ ] Four distinct themes; campaign is not uniformly dark; bonus has distinct soft palette.
- [ ] Smooth parallax without jumps at stage bounds.
- [ ] Platforms contrast with backgrounds; hazards remain readable.
- [ ] No geometry/collision changes; root/site scripts byte-identical.

## Validation
- node --check game.js — parses.
- node --check site/game.js — deployed mirror parses.
- git diff --check — no whitespace errors.
- Manual browser check: visit/pan all levels and verify palette and player/platform/hazard contrast.

## Commit Message
    feat(visuals): add distinct stage background themes

    Plan: 2026-10-28-stage-select-and-themes
    Phase: P01-stage-map-and-content
    Task: T04-stage-background-themes

    - add meadow, coast, aurora canyon, and sky observatory palettes
    - render stage-aware skies, parallax scenery, and platform colors

## Progress
- [x] Implementation complete
- [x] Validation passed: both Node syntax checks, four-palette/theme-render assertions, SHA-256 script mirror check, and `git diff --check`.
- Interactive camera pan and in-browser contrast were not manually exercised.
- commit: included in this task commit
