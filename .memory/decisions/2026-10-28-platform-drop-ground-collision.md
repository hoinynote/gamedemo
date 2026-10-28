# Decisions: Platform Drop Ground Collision

- Date: 2026-10-28
- Status: Confirmed from the existing controls decision and the reported ground collision bug; the user did not answer the follow-up choice.

## D01. 아래 키와 맵 바닥 충돌
- **Chosen**: 아래 키는 공중 플랫폼을 통과하게 하지만 `kind: "ground"`인 맵 바닥의 충돌은 계속 유지한다.
- **Rationale**: 기존 조작 결정은 아래 키를 플랫폼 통과에 사용하도록 한다. 사용자가 보고한 문제는 맵 바닥까지 통과하는 것이므로, 기존 플랫폼 통과와 하향 로프 조준을 유지하면서 바닥만 통과 대상에서 제외한다.
