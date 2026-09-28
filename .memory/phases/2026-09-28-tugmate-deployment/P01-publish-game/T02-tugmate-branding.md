# Task: T02 Tugmate Branding and README

## Status: done

## Goal
Identify the game to players as `터그메이트` in the browser tab and replace the unrelated starter-kit README with concise instructions for playing the two-player game and understanding its GitHub Pages deployment.

## Decision Summary
- Use the user-selected Korean game name `터그메이트`; keep the existing root-level static app structure and its HTML/CSS/JavaScript entry points.
- The selected public URL is `https://hoinynote.github.io/gamedemo/`; the site is served directly from `main` root without a build step.

## Implementation

### I01. Set browser-tab branding

- Related Files:
  - `index.html` :: `<head><title>` — set a descriptive Korean page title; modify.

#### Details
- **Signatures & Types**: HTML document metadata only; no JavaScript API changes.
- **Data & Schema Fields**: No model changes.
- **Execution Flow / Logic**:
  1. Replace `<title>Ropebound Duo</title>` with `<title>터그메이트 | 2인 협동 로프 게임</title>`.
  2. Keep the page language, viewport declaration, stylesheet reference, canvas ID, and gameplay DOM structure unchanged.
  3. Do not change game input or physics behavior in this branding task.
- **Error & Exception Handling**: Preserve valid UTF-8 and existing HTML structure; do not introduce extra script or CSS dependencies.
- **State Transition & Return**: Browser-tab title identifies the published game as 터그메이트.

### I02. Write player-facing project instructions

- Related Files:
  - `README.md` :: complete document — replace the generic Project Memory Starter Kit content with the game overview, how to play, local launch instructions, and deployment address; modify.
  - `game.js` :: control mappings and displayed control labels — read-only reference for accurate control instructions.
  - `index.html` :: browser title and in-game UI — read-only reference for app identity and features.

#### Details
- **Signatures & Types**: Markdown documentation only; no code API changes.
- **Data & Schema Fields**: No model changes.
- **Execution Flow / Logic**:
  1. Describe 터그메이트 as a two-player cooperative rope game playable in a modern browser.
  2. Document how to launch locally by opening the repository root `index.html` in a browser; do not claim a package install or build command is needed.
  3. Explain that controls are shown in-game and configurable for both players, avoiding hard-coded mappings unless verified in `game.js`.
  4. Include the selected Pages URL and state that pushes to `main` update the site after Pages is configured.
  5. Remove Project Memory Starter Kit installation instructions from this game README; leave `AGENTS.md`, `.memory/`, and example files untouched.
- **Error & Exception Handling**: Do not promise the Pages URL is live before T03 verifies it; label it as the planned URL or provide the site link with an explicit deployment-pending note until verified.
- **State Transition & Return**: README matches the actual game and explains how players can open it after publication.

## Acceptance Criteria
- [x] The HTML page title reads `터그메이트 | 2인 협동 로프 게임`.
- [x] The README is about the game, has accurate local-play and control guidance, and contains no obsolete starter-kit setup steps.
- [x] The deployment link is clearly labeled as planned until T03 confirms the site is reachable.
- [x] No game logic or control behavior changes.

## Validation
- `rg -n "<title>|터그메이트|Ropebound Duo|Project Memory Starter Kit|gamedemo" index.html README.md` — title and README use expected branding; the starter-kit title/content is removed from README.
- `git diff --check` — no whitespace errors.
- Review the changed README against `game.js` control labels and local root files — no unsupported setup instructions.

## Commit Message
```text
docs(game): brand and document Tugmate

Plan: 2026-09-28-tugmate-deployment
Phase: P01-publish-game
Task: T02-tugmate-branding

- Set the browser title to 터그메이트
- Replace starter-kit README content with game and Pages instructions
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in local Git history
