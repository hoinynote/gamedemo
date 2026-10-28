# Decisions: Instant Rope Launch

- Date: 2026-10-28
- Status: Confirmed from the user's selection of option 2. Automatic rope release follows the recommended default; the user did not answer that follow-up.

## D01. 강화 키의 발사 동작
- **Chosen**: 당기기 강화 키를 누른 순간, 연결된 파트너에게 줄 바깥 방향의 발사 속도를 즉시 준다. 줄은 충격 직후 자동 해제하고, 발사자에게는 동등·반대 방향 반동을 적용한다. 발사 속도는 `1000px/s`로 한다.
- **Rationale**: 사용자가 누르는 순간 큰 발사 충격을 주는 방식을 선택했다. 발사 직후 줄을 해제하면 장력이 파트너를 다시 끌어당기지 않으며, 기존 반작용 규칙을 지켜 발사자도 반동을 받는다.

## D02. 기본 장력 유지
- **Chosen**: 줄이 팽팽할 때 작동하는 기본 장력은 유지한다. 발사 키는 연결된 로프에서 edge-trigger 방식으로 한 번 작동한다.
- **Rationale**: 사용자는 기존의 팽팽한 줄 당김도 계속 필요하다고 했다. 기본 장력과 순간 발사를 각각 유지한다.
