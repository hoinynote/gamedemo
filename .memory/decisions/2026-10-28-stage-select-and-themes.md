# Decisions: Stage Select, Themes, and Throw Challenges

- Date: 2026-10-28
- Status: Confirmed

## D01. Stage selection and progress display
- **Chosen**: Replace the simple entry screen with a connected, route-style map of stage cards.
- **Card details**: Stage name, objective, core gimmick, difficulty, estimated play time, and progress status.
- **Progress states**: Show completed, current, and locked states. Unlocked stages can be replayed.
- **Rationale**: Players can understand both campaign progress and the kind of challenge each stage contains before selecting it.

## D02. Completion records and saved runs
- **Chosen**: Keep cleared-stage and bonus-stage unlock records when starting a new game.
- **Chosen**: Show separate “Continue” and “New Game” actions when a saved run exists.
- **Chosen**: Selecting a stage card starts that stage from its beginning and preserves the existing continue checkpoint.
- **Implementation constraint**: The game is a client-side static web app with no account backend. Store campaign progress in browser storage, separately from the existing run checkpoint.
- **Rationale**: Players can replay unlocked stages without losing their saved run, and campaign achievements survive a new game in the same browser.

## D03. Normal stage progression
- **Chosen**: Keep the three existing campaign stages in their current order. Reaching a stage exit clears it and unlocks the next campaign stage.
- **Chosen**: Each campaign stage must include at least one throw-based puzzle that is required to reach its exit.
- **Rationale**: The throw mechanic becomes part of the main campaign while the original linear route remains easy to follow.

## D04. Secret bonus stage
- **Chosen**: Add one separate special stage, unlocked by throwing a partner to hit a hidden high switch in Stage 2.
- **Chosen**: The hidden switch unlocks the special stage independently of normal progression. Stages 1, 2, and 3 are still cleared by reaching their exits; Stage 2's exit continues to unlock Stage 3.
- **Chosen**: Show the bonus stage as a locked card with a hint before discovery. After unlocking it, make it selectable from the entry screen; do not auto-transition into it.
- **Bonus stage puzzle**: A co-op relay where one player holds a switch while the other is thrown to activate successive switches.
- **Rationale**: The secret reward gives players a reason to experiment with throwing in Stage 2 without interrupting the main campaign.

## D05. Stage themes
- **Chosen**: Give each stage a distinct palette and setting instead of reusing the same dark mountain background.
- **Campaign theme direction**: Stage 1 uses a sunny meadow; Stage 2 uses bright turquoise coastal ruins; Stage 3 uses a colorful aurora canyon. The special stage receives a distinct secret-stage theme coordinated with its skyward relay challenge.
- **Rationale**: Brighter and varied scenery makes stage identity and progress easier to read.

## D06. Stage map interaction
- **Chosen**: Arrange the stage cards as a connected progression route.
- **Chosen**: Locked stages cannot be selected; unlocked stages can be replayed from their start.
- **Rationale**: The layout makes normal progression and the separately unlocked bonus stage visible at a glance.

## Scope notes
- This is an interview decision only. No game code, map, or workflow files are changed in this phase.
- Exact stage puzzle layouts, card copy, theme art direction, and the special-stage palette are implementation details to resolve in the plan and task blueprints.
