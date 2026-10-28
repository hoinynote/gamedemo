# Decisions: Pause and Controls Menu

- Date: 2026-10-28
- Status: Confirmed; the user chose the recommended option to save progress before returning to the title.

## D01. Pause entry
- **Chosen**: Press `Escape` during gameplay to pause; press it again to resume. Keep `Enter` as a resume shortcut.
- **Rationale**: Escape is a familiar pause/menu key and does not overlap the remappable player controls.

## D02. Pause menu actions
- **Chosen**: Provide buttons to resume, open controls, and return to the initial menu.
- **Rationale**: This covers the requested pause and key configuration flow and provides an in-game route to the initial screen.

## D03. Controls return destination
- **Chosen**: Controls opened from pause return to the pause menu; controls opened from the title return to the title.
- **Rationale**: Preserve the caller's context and keep gameplay paused while bindings are edited.

## D04. Progress on return to title
- **Chosen**: Save the current checkpoint before returning to the title screen.
- **Rationale**: Recommended default offered in the interview; it keeps the current run recoverable if the page is reloaded.

