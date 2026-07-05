# BeArrow

캘린더 + 투두리스트 통합 앱. Expo(React Native) 기반 크로스플랫폼(iOS · Android · 웹).

현재 **Phase 6(기능 고도화·UI 완성) 진행 중**이며, Phase 0–5 전체와 Phase 6 일부(카테고리 관리, 할일 편집, CRUD 완성, 한국 공휴일)가 완료된 상태다. 세부 진행 현황은 `docs/BACKLOG.md` 참고.

> **빌드/배포는 EAS 클라우드 없이 완전 무료 도구(GitHub Actions + Fastlane)로 구성**되어 있다.
> Expo SDK·CLI 는 무료이며, 빌드는 GitHub Actions 러너에서 직접 수행한다. (스토어 등록 비용 — Apple $99/년, Google Play $25 1회 — 은 도구와 무관한 스토어 자체 비용이다.)

## 요구 사항

- Node.js 20+
- (출시 단계) Apple Developer / Google Play 개발자 계정
- (로컬 빌드 시) Android: JDK 17 · Android SDK / iOS: Xcode(macOS) · CocoaPods · Ruby+Bundler

## 로컬 시작

```bash
npm install
cp .env.example .env      # 필요한 값 채우기
npm run start             # Expo 개발 서버 (무료)
```

검증 스크립트:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest
npm run format      # prettier
```

네이티브 빌드(필요 시):

```bash
npm run prebuild                       # ios/ · android/ 생성
cd android && ./gradlew assembleDebug  # 디버그 APK (서명 불필요)
```

## 환경 분리

`APP_ENV` 로 3개 환경을 구분한다. 앱 이름·번들 ID 가 환경별로 달라진다.

| 환경     | APP_ENV       | 번들 ID               |
| -------- | ------------- | --------------------- |
| 개발     | `development` | `app.bearrow.dev`     |
| 스테이징 | `staging`     | `app.bearrow.staging` |
| 프로덕션 | `production`  | `app.bearrow`         |

설정 위치: 앱 메타데이터는 `app.config.ts`, 런타임 설정은 `src/config/env.ts`.

## CI/CD 파이프라인 (무료)

| 워크플로            | 트리거                          | 동작                                                |
| ------------------- | ------------------------------- | --------------------------------------------------- |
| `ci.yml`            | PR(→develop/main), push develop | install · typecheck · lint · test                   |
| `build-android.yml` | push develop / 수동             | ubuntu 러너에서 디버그 APK 빌드 → 아티팩트(서명 불필요) |
| `release.yml`       | `v*` 태그 / 수동                | Fastlane 으로 프로덕션 빌드 + 스토어 제출(승인 게이트) |

도구 역할: **GitHub Actions** 가 검증·빌드를 수행하고, **Fastlane** 이 서명·스토어 제출을 담당한다.

- Android 빌드는 ubuntu 러너에서 무료로 동작한다.
- iOS 빌드는 macOS 러너가 필요하다. **public 저장소면 무제한 무료**, private 면 무료 분(分)에 macOS 10배 가중이 적용되므로 public 저장소를 권장한다.
- **OTA 업데이트는 현재 범위에서 제외**(EAS Update 미사용). 추후 self-hosted `expo-updates` 서버로 추가할 수 있다(백로그 항목).

## 브랜치 전략

- `main` — 프로덕션. 스토어 빌드는 `v*` 태그로 트리거.
- `develop` — 통합 브랜치. 머지 시 Android 디버그 빌드.
- `feature/*` — 작업 브랜치. `develop` 으로 PR.

## 최초 설정 (한 번만)

1. **GitHub 원격 연결**
   ```bash
   git remote add origin https://github.com/<계정>/bearrow.git
   git push -u origin main
   ```
   이 시점부터 `ci.yml` 검증이 자동 동작한다. (public 저장소 권장 — Actions 무료)

2. **릴리즈 게이트** — repo Settings → Environments → `production` 생성 후 *Required reviewers* 지정. `release.yml` 이 승인을 기다린다.

3. **스토어 제출 시크릿** (출시 직전, repo Settings → Secrets)
   - Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`
   - iOS: App Store Connect API Key 등 (Apple Developer 계정 필요)
   - `fastlane/Appfile` 의 식별자(번들 ID·Apple ID·Team ID)도 채운다.

## 디렉터리 구조

```
bearrow/
├─ .github/workflows/       # ci · build-android · release
├─ fastlane/                # Fastfile · Appfile (빌드·제출)
├─ docs/                    # BACKLOG.md · CONVENTIONS.md
├─ src/
│  ├─ config/               # env.ts (환경 변수·런타임 설정)
│  ├─ db/                   # client.ts · schema.ts · migrate.ts
│  ├─ features/
│  │  ├─ calendar/          # 이벤트 CRUD · 월/주/일 뷰 · 알림 · 반복 · 공휴일
│  │  ├─ todo/              # 할일 CRUD · 목록 UI · 날짜 지정 · 편집
│  │  ├─ category/          # 카테고리 CRUD · 색상 · 관리 UI
│  │  ├─ auth/              # Supabase OAuth · 세션 관리
│  │  ├─ settings/          # 설정 화면 · 앱 설정 컨텍스트
│  │  └─ sync/              # 동기화 엔진 · Google 캘린더 연동
│  ├─ lib/                  # Supabase 클라이언트 · Sentry · 공용 유틸
│  ├─ sync/                 # 변경 큐 · push/pull · 충돌 해결
│  ├─ theme/                # 색상 토큰 · useTheme 훅
│  └─ ui/                   # 공용 컴포넌트 (예정)
├─ App.tsx                  # 루트 컴포넌트 (탭 내비·모달 관리)
├─ app.config.ts            # Expo 동적 설정 (환경 분리)
└─ package.json
```

## 개발 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | CI/CD · 환경 분리 · 린트/테스트 기반 · 테마 · 로컬 DB | ✅ 완료 |
| 1 | 캘린더 코어 (월/주/일 뷰 · 일정 CRUD · 반복 · 알림) | ✅ 완료 |
| 2 | 투두 코어 (할일 CRUD · 카테고리 · 목록 UI · 날짜) | ✅ 완료 |
| 3 | 통합·테마 (캘린더↔투두 연동 · 데일리 뷰 · 색상 커스터마이징) | ✅ 완료 |
| 4 | 동기화·백엔드 (Supabase Auth · 동기화 엔진 · Google 캘린더 · RLS) | ✅ 완료 |
| 5 | 안정화 (Sentry · E2E · 성능·접근성) | ✅ 완료 (5.4 OTA 선택) |
| 6 | 기능 고도화·UI 완성 (카테고리 관리 · CRUD · 공휴일 등) | 🔄 진행 중 |
| 7 | 출시 (스토어 메타데이터 · 베타 · 정식 릴리즈) | ⏳ 예정 |

### Phase 6 세부 현황

| # | 작업 | 완료일 | 상태 |
|---|------|--------|------|
| 6.1 | 카테고리 관리 완성 (생성·편집·삭제 UI, 필수 카테고리 적용) | 2026-07-05 | ✅ |
| 6.2 | 할일 편집 기능 (행 클릭 → 편집 폼, 동그라미 → 완료 토글) | 2026-07-05 | ✅ |
| 6.3 | 이벤트·할일 CRUD 완성 (EventDetailSheet 편집·삭제, DayDetailPanel 인터랙션) | 2026-07-05 | ✅ |
| 6.4 | 한국 공휴일 표시 (월 그리드 · 데일리 패널 · 설정 토글) | 2026-07-05 | ✅ |
| 6.5 | 캘린더 통합 스크롤 · 연월 피커 · 투두 미니 캘린더 | 2026-07-05 | ✅ |
| 6.6 | 반응형·크로스플랫폼 레이아웃 (768pt 사이드바, Android Ripple, 플랫폼 중립 Modal) | 2026-07-05 | ✅ |

세부 작업 목록은 `docs/BACKLOG.md` 참고.
