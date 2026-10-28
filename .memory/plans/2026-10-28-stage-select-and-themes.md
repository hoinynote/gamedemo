# Plan: Stage Select, Themes, and Throw Challenges

## Goal
Upgrade the entry screen into a persistent stage route map, give campaign stages distinct bright themes, make throws part of campaign progression, and unlock an optional cooperative relay bonus stage from a hidden Stage 2 switch. Preserve Continue progress when replaying an unlocked stage.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Add throw-based stages, saved unlock state, a route-map entry screen, and themed canvas scenery. | [P01](../phases/2026-10-28-stage-select-and-themes/P01-stage-map-and-content/phase.md) |

## Execution Order
1. T01 defines stage metadata, throw-gated switches, and the bonus relay.
2. T02 adds persistent campaign progress, unlock rules, replay, and checkpoint separation.
3. T03 renders the stage map and Continue/New Game/card controls.
4. T04 applies stage palettes to the canvas sky and parallax scenery.

## Scope and Constraints
- Keep root and site copies of game.js, index.html, and styles.css synchronized; Azure Static Web Apps serves site/ while local development uses root copies.
- Campaign progress and run checkpoint use separate versioned localStorage keys. Progress is local to this browser; no account backend exists.
- No test framework or package manifest exists. Validate syntax, mirror equality, whitespace, and manual browser play-through.
- Do not modify deployment workflows or unrelated untracked .agents/ and .codeburn/ directories.

