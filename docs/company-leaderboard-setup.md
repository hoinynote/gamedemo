# Tugmate 회사 랭킹 설정 안내

이 안내는 Azure Static Web Apps의 `blue-coast-030823200` 앱을 회사용 공식 주소로 설정할 때 사용합니다. Cosmos 키와 Entra client secret은 브라우저 코드나 저장소에 넣지 않습니다.

## 1. Cosmos 계정 먼저 확인

Azure Portal의 Cloud Shell(Bash)에서 `scripts/inspect-tugmate-cosmos.sh` 내용을 실행합니다. 구독, Cosmos API 종류, 기존 데이터 영역의 이름, 파티션 키, 처리량 메타데이터만 읽습니다. 키와 데이터 항목은 출력하지 않습니다.

대상은 `grill-me-edu` 리소스 그룹의 `maze-rescue-ms-b7af62a9`입니다. Cloud Shell에서 다른 구독이 선택되어 있으면 중단하고 올바른 구독을 선택합니다.

무료 티어가 켜져 있다는 것만으로 추가 저장소가 무료라고 단정할 수 없습니다. Cosmos 무료 용량과 RU/s는 계정 전체가 공유합니다. 현재 사용량과 비용 부담 주체를 확인할 수 없거나 추가 비용이 0원임을 보장할 수 없으면 데이터베이스·테이블·컨테이너를 만들지 않습니다.

## 2. Microsoft Entra 앱 등록

회사 테넌트 관리자 또는 앱 등록 권한이 있는 계정으로 다음을 구성합니다.

1. 단일 테넌트 API 앱 등록 `Tugmate Game API`를 만듭니다. `Expose an API`에서 Application ID URI를 `api://<API_APP_CLIENT_ID>`로 설정하고 `access_as_user` 위임 범위를 추가합니다.
2. 단일 테넌트 SPA 앱 등록 `Tugmate Web`을 만듭니다. SPA redirect URI를 공식 SWA 주소의 루트(예: `https://<공식-SWA-호스트>/`)로 설정합니다.
3. SPA 앱의 API permissions에 `Tugmate Game API / access_as_user` 위임 권한을 추가하고 필요한 관리자 동의를 완료합니다.
4. API 앱의 optional claims에서 access token에 `name` 클레임을 추가합니다. API는 서명, 단일 테넌트 issuer, audience, `tid`, `oid`를 검증하며 사용자 이름도 검증된 토큰에서 읽습니다.
5. 준비할 값은 tenant ID, SPA client ID, API audience(`api://<API_APP_CLIENT_ID>`), API scope(`api://<API_APP_CLIENT_ID>/access_as_user`)입니다. Client ID와 scope는 공개 식별자입니다. 브라우저용 client secret은 만들거나 배포하지 않습니다.

이 방식은 SWA 사용자 지정 인증 공급자를 쓰지 않으므로 해당 기능에 필요한 Standard 요금제로의 전환을 요구하지 않습니다. 브라우저가 단일 테넌트 로그인을 수행하고 Functions API가 bearer access token을 다시 검증합니다.

## 3. Cosmos 데이터 공간 (사용량 확인 후에만)

앱 코드는 데이터베이스나 테이블을 자동 생성하지 않습니다. 기존 Maze Rescue 데이터와 처리량 설정은 그대로 둡니다. 계정 소유자가 현재 사용량과 요금을 확인하고 새 공간을 무료 한도 안에 넣을 수 있다고 확인한 경우에만 별도 Tugmate 공간을 만듭니다.

- Cosmos DB for NoSQL이면 전용 `tugmate-db` 데이터베이스와 `profiles` 컨테이너, `/tenantId` 파티션 키를 사용합니다. 무료 용량을 넘거나 기존 리소스의 처리량을 바꿔야 하면 중단합니다.
- Cosmos DB for Table이면 별도 `TugmateProfiles` 테이블만 사용합니다. 테이블 생성으로 처리량 또는 추가 비용이 생기는지 먼저 확인합니다.
- MongoDB, Cassandra, Gremlin 등 다른 API 종류면 현재 어댑터와 호환되지 않으므로 중단합니다.

다음은 명령 예시일 뿐입니다. 비용과 남은 무료 용량을 확인하기 전에는 실행하지 않습니다.

```bash
# NoSQL: 계정 소유자가 무료 RU/비용을 확인한 뒤에만 실행
az cosmosdb sql database create \
  --resource-group grill-me-edu \
  --account-name maze-rescue-ms-b7af62a9 \
  --name tugmate-db \
  --throughput 400

az cosmosdb sql container create \
  --resource-group grill-me-edu \
  --account-name maze-rescue-ms-b7af62a9 \
  --database-name tugmate-db \
  --name profiles \
  --partition-key-path /tenantId

# Table API: 생성 비용/처리량을 확인한 뒤에만 실행
az cosmosdb table create \
  --resource-group grill-me-edu \
  --account-name maze-rescue-ms-b7af62a9 \
  --name TugmateProfiles
```

## Browser auth configuration

Set `tenantId`, `clientId`, and `apiScope` in the tracked `auth-config.js` file before building the frontend. These are public Entra identifiers, not secrets. Keep them aligned with `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `ENTRA_API_SCOPE` in the Static Web App settings. The static values allow Entra sign-in to continue if the Functions API is temporarily unavailable; API-backed profile and leaderboard actions will sync when the API returns. Never put Cosmos credentials, client secrets, or access tokens in `auth-config.js`.

## 4. Static Web Apps 환경 변수

Azure Portal에서 SWA의 **Environment variables**에 다음 값을 추가합니다. Cosmos 키와 Table connection string은 비밀 환경 변수로 저장합니다.

| Setting | Value |
| --- | --- |
| `ENTRA_TENANT_ID` | DEX Consulting tenant ID |
| `ENTRA_CLIENT_ID` | `Tugmate Web` SPA client ID |
| `ENTRA_API_AUDIENCE` | `api://<Tugmate Game API client ID>` |
| `ENTRA_API_SCOPE` | `api://<Tugmate Game API client ID>/access_as_user` |
| `COSMOS_API_KIND` | `nosql` 또는 `table` |
| NoSQL settings | `COSMOS_ENDPOINT`, 비밀인 `COSMOS_KEY`, `COSMOS_DATABASE_ID=tugmate-db`, `COSMOS_CONTAINER_ID=profiles` |
| Table settings | 비밀인 `COSMOS_TABLE_CONNECTION_STRING`, `COSMOS_TABLE_NAME=TugmateProfiles` |

배포 후 `/api/config`가 Entra 공개 설정만 반환하는지, 다른 테넌트 토큰이 거부되는지, 로그인 계정의 미기록 행이 랭킹에 보이는지 확인합니다. Cosmos 연결이 설정되지 않으면 회사 로그인 뒤에도 플레이할 수 있지만 결과는 브라우저에 동기화 대기 상태로 저장됩니다.

## 5. GitHub 배포 흐름

`azure-static-web-apps-blue-coast-030823200.yml` deploys the `site/` frontend and builds the Functions API from `api/` using the checked-in deployment token secret. `skip_app_build: true` skips only the frontend build; the workflow leaves API build enabled. Before pushing a frontend change, run `scripts/sync-site.ps1` and `scripts/sync-site.ps1 -Check`. Configure the three public Entra identifiers in root `auth-config.js` so the sync step copies them into `site/`. Keep API audience/scope and Cosmos credentials in the Static Web App server environment settings.

## 6. 로컬 개발

`api/local.settings.sample.json`을 `api/local.settings.json`으로 복사하고 로컬 전용 값으로 채웁니다. 실제 키가 든 파일은 Git에 추가하지 않습니다. Azure Functions Core Tools와 Azure Static Web Apps CLI가 설치된 환경에서 실행합니다.

```bash
swa start . --api-location api
```

API 설정이 비어 있는 로컬 미리보기는 “로컬 미리보기 · 기록 미동기화”로 표시됩니다. 이 미리보기 모드는 `localhost`와 `127.0.0.1`에서만 허용됩니다.
