# BeArrow

캘린더 + 투두리스트 통합 앱. Expo(React Native) 기반 크로스플랫폼(iOS · Android · 웹).

이 리포지토리는 **1단계: CI/CD 환경**이 구성된 상태이며, 파이프라인이 동작하도록 최소 스켈레톤을 포함한다. 앱 기능 코드는 다음 단계에서 추가한다.

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
├─ .github/workflows/   # ci · build-android · release
├─ fastlane/            # Fastfile · Appfile (빌드·제출)
├─ Gemfile              # fastlane 의존성
├─ src/config/          # 환경 설정 (테스트 포함)
├─ App.tsx              # 진입 컴포넌트(플레이스홀더)
├─ index.ts             # 루트 등록
├─ app.config.ts        # Expo 동적 설정(환경 분리)
├─ eslint.config.js / .prettierrc / tsconfig.json
└─ package.json
```

## 다음 단계 (2단계)

캘린더 코어 → 투두 코어 → 통합/테마 → Supabase 동기화 → 안정화 → 출시.
기획·아키텍처 문서 및 `docs/BACKLOG.md` 의 로드맵 참고.
