# Decisions: Directional Throw Balance

- Date: 2026-10-28
- Status: Confirmed from the user's feedback; values chosen to reduce horizontal travel and strengthen vertical throws.

## D01. 수평·수직 발사 세기
- **Chosen**: 수평 충격량은 `700px/s`, 수직 충격량은 `1100px/s`로 별도 설정한다. 수평 발사는 기존 900보다 약 22% 낮고, 수직 발사는 약 22% 높다.
- **Rationale**: 사용자는 수평 발사가 과하고 위쪽 발사가 약하다고 했다. 축별 계수로 수평 이동을 줄이고 수직 상승 속도를 높인다.
