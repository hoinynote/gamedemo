# Decisions: Stronger Rope Pull

- Date: 2026-10-28
- Status: Confirmed from the user's request, existing rope controls, and the recommended default; the user did not answer the follow-up choice.

## D01. 강화 장력 동작
- **Chosen**: 기본 장력은 유지하고, 플레이어가 기존 당기기 강화 키(`W`/`]` 또는 재설정한 키)를 누르는 동안에만 추가 장력을 높인다. 추가 가속도는 `2400`으로 설정하고, 현재의 양쪽 플레이어 동등·반대 방향 반작용을 유지한다.
- **Rationale**: 기존 조작 체계를 유지하면서 강화 입력 중 파트너가 줄을 거슬러 움직이기 어려운 힘을 만들고, 줄을 풀었을 때도 누적된 속도로 멀리 또는 높이 튕겨 나가게 한다. `2400`은 현재 플레이어 이동 가속도 `2200`보다 크다.
