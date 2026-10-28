# Decisions: Rope Reel-In and Throw

- Date: 2026-10-28
- Status: Confirmed from the user's request, existing rope physics, and the recommended default; the user did not answer the follow-up choice.

## D01. 느슨한 줄의 당기기와 반동
- **Chosen**: 줄이 파트너에게 연결된 상태에서 강화 키를 누르면, 줄이 팽팽하지 않아도 두 플레이어에게 서로를 향하는 강화 힘을 동등·반대 방향으로 적용한다. 줄을 풀면 기존 속도를 유지해 날아가게 한다. 팽팽한 줄의 기본 장력은 그대로 둔다.
- **Rationale**: 사용자는 기존의 장거리 장력 당김을 유지하면서, 줄을 맞춘 뒤 강화 키로 파트너를 가까이 당겨 던질 수 있게 해달라고 요청했다. 별도의 자동 발사나 추가 발사 충격 없이 축적된 속도를 쓰는 것이 기존 물리와 맞는다.
