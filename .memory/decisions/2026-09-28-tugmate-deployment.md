# Decisions: Tugmate Web Deployment

- Date: 2026-09-28
- Status: Confirmed

## D01. 서비스 이름
- **Chosen**: 공개 게임 이름은 `터그메이트`로 한다.
- **Rationale**: 사용자가 정한 게임 이름을 페이지 제목과 배포 안내에 일관되게 사용한다.

## D02. 배포 플랫폼
- **Chosen**: GitHub Pages에 공개 웹 링크로 배포한다.
- **Rationale**: 정적 웹 게임을 별도 서버 없이 브라우저에서 플레이할 수 있다.

## D03. 저장소 공개 범위
- **Chosen**: 현재 `hoinynote/gamedemo` 저장소 전체를 공개로 전환한다.
- **Rationale**: 사용자가 현재 저장소 공개를 선택했다. 공개 전 저장소에 공개하면 안 되는 비밀값이나 개인정보가 포함되어 있는지 점검한다.

## D04. 배포 경로와 갱신
- **Chosen**: `main` 브랜치의 루트 폴더를 GitHub Pages 게시 소스로 지정한다. `main`에 변경이 올라올 때마다 자동으로 갱신한다.
- **Rationale**: 현재 게임은 루트의 정적 HTML/CSS/JavaScript 파일로 동작하고 별도 빌드 단계가 없어 가장 간단한 게시 경로다.

## D05. 배포 URL
- **Chosen**: 기본 프로젝트 Pages 주소(`https://hoinynote.github.io/gamedemo/`)를 사용한다.
- **Rationale**: 별도 도메인 설정 없이 공유 가능한 주소를 제공한다. 실제 게시 여부와 주소는 Pages 설정 후 확인한다.

## D06. 저장소 변경과 Pages 활성화
- **Chosen**: 변경사항은 현재 `main` 브랜치에 반영하고, Pages 게시 설정이 저장소에서 활성화되어 있는지 확인한다. 저장소 공개 전 민감정보 점검을 완료한다.
- **Rationale**: 확인된 원격 기본 브랜치는 현재 로컬보다 두 커밋 뒤에 있으므로 기존 원격 기록을 보존하며 동기화해야 한다. 원격 공개 설정 변경 및 게시 권한은 GitHub 저장소 설정 접근이 필요할 수 있다.

## D07. Commit author email disclosure
- **Chosen**: 공개 저장소에서 기존 커밋의 작성자 이메일 메타데이터가 보이는 것을 사용자가 2026-09-28에 허용했다. 현재 Git 이력을 재작성하지 않고 원격 이력을 보존한다.
- **Rationale**: 사용자가 옵션 1을 선택해 기존 주소가 공개되는 위험을 알고 진행하기로 했다. 실제 주소는 감사 기록이나 프로젝트 문서에 복사하지 않는다.
