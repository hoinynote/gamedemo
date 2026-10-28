# Decisions: Throw Momentum Window

- Date: 2026-10-28
- Status: Confirmed from the user's request and the recommended default; the user did not answer the follow-up choice.

## D01. 발사 속도 보존
- **Chosen**: 순간 발사 후 발사자와 파트너 모두 `0.35초` 동안 수평 속도 제한과 마찰을 받지 않는다. 이후에는 기존 좌우 조작과 마찰을 적용한다. 중력과 충돌은 계속 적용하며, 남은 타이머를 체크포인트에 저장한다.
- **Rationale**: 기존 `1000px/s` 순간 속도는 다음 프레임부터 `310px/s` 제한과 마찰에 눌려 멀리 날아가지 못한다. 짧은 관성 구간으로 던짐을 보장하고 곧 일반 조작을 돌려줘 플레이어 제어도 유지한다.
