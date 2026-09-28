# Task: T01 Publication Safety Audit

## Status: done — publication gate blocked

## Goal
Determine whether the currently tracked repository and all Git history that will become public contain secrets, credentials, or personal information that should not be published, and save a sanitized audit result before any push or visibility change.

## Decision Summary
- The user chose to make the existing `hoinynote/gamedemo` repository public. Audit both the current tracked tree and all Git history that would be exposed; do not publish if a live secret or sensitive personal data is found.
- `.agents/` and `.codeburn/` are currently untracked, so GitHub will not receive them unless separately staged. Do not add them as part of this task.

## Implementation

### I01. Audit the exact publication contents

- Related Files:
  - All paths from `git ls-files` and all reachable commits from `git rev-list --all` — inspect the complete tracked publication set; read-only.
  - `.memory/audits/2026-09-28-publication-readiness.md` — sanitized findings and go/no-go result; new.

#### Details
- **Signatures & Types**: No production code or data schema changes.
- **Data & Schema Fields**:
  - Audit report fields: repository identifier (`hoinynote/gamedemo`), audit date (`2026-09-28`), checked scope (tracked working tree and reachable commit history), result (`clear` or `blocked`), finding categories and file paths only. Never copy credential values into the report.
- **Execution Flow / Logic**:
  1. Run `git status --short --branch`, `git ls-files`, `git rev-list --all --count`, and `git log --all --oneline` to identify tracked files, untracked local-only folders, and history scope.
  2. Scan tracked files and every reachable commit for credential patterns (access tokens, cloud keys, private keys, passwords) and personal data not intended for public release. Use a secret scanner if installed; inspect candidate paths without printing matched values to terminal output or chat.
  3. Check configuration, memory/decision documents, examples, and commit history as well as game source. Review any finding to distinguish placeholders from live values.
  4. If there are no actionable findings, write the sanitized report with result `clear`. If a live secret or sensitive personal information is found, write only its category and affected path, mark `blocked`, and stop before publishing. Do not silently publish, expose the value in the report, rewrite shared Git history, or rotate credentials.
  5. Do not stage `.agents/` or `.codeburn/`; they are not tracked in the currently inspected repository state.
- **Error & Exception Handling**: If full commit-history scanning cannot be completed, report `blocked` and do not treat a working-tree-only scan as sufficient. If a finding might be a credential but cannot be verified safely, treat it as `blocked`.
- **State Transition & Return**: `clear` permits T02 and T03 to proceed; `blocked` requires resolving the finding before repository visibility or pushes change.

### I02. Record sanitized audit outcome

- Related Files:
  - `.memory/audits/2026-09-28-publication-readiness.md` :: audit summary — allow later tasks to verify that the public-release gate passed; new.

#### Details
- Include the scope, tools/commands used, result, and any finding paths/categories. Do not include matched text, token prefixes, secret fragments, or personal-data contents.

## Acceptance Criteria
- [x] The tracked working tree and all reachable commits intended for publication are reviewed for credentials and unintended personal data.
- [x] A sanitized audit report records `blocked` without any sensitive value.
- [x] No publication action was performed; author-email metadata leaves the public-release gate closed.
- [x] `.agents/` and `.codeburn/` remain unstaged.

## Validation
- `git status --short --branch` — confirms audit report is the intended new tracked candidate and `.agents/` / `.codeburn/` remain untracked.
- `git ls-files` and `git rev-list --all --count` — confirm the audited tree and commit-history scope.
- Manual pattern scan across the working tree and each reachable commit — no matches for the checked credential patterns; report separately records author-email metadata as `blocked`.

## Commit Message
```text
chore(security): record public release audit

Plan: 2026-09-28-tugmate-deployment
Phase: P01-publish-game
Task: T01-publication-audit

- Audit tracked repository files and reachable history before publication
- Record only sanitized findings and the release gate result
```

## Progress
- [x] Audit and report complete
- [x] Validation passed (publication gate remains blocked)
- commit: recorded in local Git history
