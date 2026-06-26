# BeArrow

캘린더 + 투두리스트 통합 앱. Expo(React Native) 기반 크로스플랫폼(iOS · Android · 웹).

이 리포지토리는 **1단계: CI/CD 환경**이 구성된 상태이며, 파이프라인이 동작하도록 최소 스켈레톤을 포함한다. 앱 기능 코드는 다음 단계에서 추가한다.

## 요구 사항

- Node.js 20+
- Expo / EAS 계정 (https://expo.dev)
- `npm i -g eas-cli` (로컬에서 EAS 명령 실행 시)

## 로컬 시작

```bash
npm install
cp .env.example .env      # 필요한 값 채우기
npm run start             # Expo 개발 서버
```

검증 스크립트:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest
npm run format      # prettier
```

## 환경 분리

`APP_ENV` 로 3개 환경을 구분한다. 앱 이름 · 번들 ID · API URL · 업데이트 채널이 환경별로 달라진다.

| 환경        | APP_ENV       | 번들 ID                | EAS 채널     |
| ----------- | ------------- | ---------------------- | ------------ |
| 개발        | `development` | `app.bearrow.dev`      | development  |
| 스테이징    | `staging`     | `app.bearrow.staging`  | staging      |
| 프로덕션    | `production`  | `app.bearrow`          | production   |

설정 위치: 빌드 환경은 `eas.json` 의 각 프로필 `env`, 앱 메타데이터는 `app.config.ts`, 런타임 설정은 `src/config/env.ts`.

## CI/CD 파이프라인

| 워크플로                 | 트리거                       | 동작                                            |
| ------------------------ | ---------------------------- | ----------------------------------------------- |
| `ci.yml`                 | PR(→develop/main), push develop | install · typecheck · lint · test            |
| `build-preview.yml`      | push develop / 수동           | EAS Build (preview, 스테이징 internal 배포)     |
| `release.yml`            | `v*` 태그 / 수동              | EAS Build(production) + 스토어 자동 제출         |
| `ota-update.yml`         | push main                    | EAS Update (production 채널 OTA 배포)           |

도구 역할 분리: **GitHub Actions** 가 PR을 검증하고, **EAS** 가 서명 빌드 · 스토어 제출 · OTA 를 담당한다.

## 브랜치 전략

- `main` — 프로덕션. 머지 시 OTA 배포. 스토어 빌드는 `v*` 태그로 트리거.
- `develop` — 통합 브랜치. 머지 시 preview 빌드.
- `feature/*` — 작업 브랜치. `develop` 으로 PR.

## 최초 설정 (한 번만)

1. **EAS 프로젝트 생성**
   ```bash
   eas login
   eas init           # EAS_PROJECT_ID 발급 → .env 및 CI 변수에 반영
   eas update:configure
   ```
2. **GitHub Secrets / Variables 등록** (repo Settings → Secrets and variables → Actions)
   - `EXPO_TOKEN` — Expo 액세스 토큰 (expo.dev → Account → Access Tokens)
   - `EAS_PROJECT_ID` — `eas init` 으로 발급된 ID (Variables 로 등록 가능)
3. **릴리즈 게이트 설정** — repo Settings → Environments → `production` 생성 후
   *Required reviewers* 지정. `release.yml` 이 이 환경의 승인을 기다린다.
4. **스토어 제출 자격증명** (`eas.json` 의 `submit.production`)
   - iOS: `appleId` · `ascAppId` · `appleTeamId` 입력
   - Android: Play Console 서비스 계정 키를 `credentials/play-service-account.json` 에 두기
     (`.gitignore` 처리됨 — CI 에서는 시크릿으로 주입)

## 디렉터리 구조

```
bearrow/
├─ .github/workflows/   # CI/CD 워크플로 4종
├─ src/config/          # 환경 설정 (테스트 포함)
├─ App.tsx              # 진입 컴포넌트(플레이스홀더)
├─ index.ts            # 루트 등록
├─ app.config.ts       # Expo 동적 설정(환경 분리)
├─ eas.json            # EAS 빌드/제출 프로필
├─ eslint.config.js / .prettierrc / tsconfig.json
└─ package.json
```

## 다음 단계 (2단계)

캘린더 코어 → 투두 코어 → 통합/테마 → Supabase 동기화 → 안정화 → 출시.
기획·아키텍처 문서의 로드맵 참고.
