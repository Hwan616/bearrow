# 0.1 CI/CD 파이프라인 구축

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-06-26 05:07 |
| 요구사항 | — (기반 인프라) |
| 커밋 | 34211f6 |

## 한 일

- GitHub Actions 워크플로 3종 구성
  - `ci.yml` — PR/push 시 typecheck · lint · test (ubuntu, 무료)
  - `build-android.yml` — develop 브랜치 push 시 디버그 APK 빌드 및 아티팩트 업로드
  - `release.yml` — `v*` 태그 또는 수동 실행 시 Fastlane으로 스토어 제출
- Fastlane 구성 (`Fastfile`, `Appfile`, `Gemfile`)
  - Android: `bundle` 태스크 → Play 내부 트랙 업로드
  - iOS: `build_app` → TestFlight 업로드 (macOS 러너, Apple Developer 계정 필요)
- EAS 클라우드 빌드를 완전히 제거하고 GitHub Actions + Fastlane 무료 스택으로 전환

## 주요 결정

- **EAS 미사용**: EAS Build는 유료 한도가 있어 GitHub Actions 자체 러너(ubuntu)로 대체. Android는 무료이고 iOS는 macOS 러너 사용 시 분당 과금이지만 릴리즈 시에만 실행.
- **서명 키를 CI에서 복원**: `ANDROID_KEYSTORE_BASE64` 시크릿을 base64로 저장 후 런타임에 디코딩. 저장소에 키파일 미포함.
- **`production` 환경 게이트**: GitHub Environments의 수동 승인으로 실수 배포 방지.

## 남은 과제 / 주의사항

- Android 릴리즈 전 GitHub Secrets에 아래 4개 등록 필요:
  - `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
  - `PLAY_SERVICE_ACCOUNT_JSON`
- iOS 빌드는 Apple Developer 계정($99/년) 및 App Store Connect API Key 필요.
- `production` GitHub Environment에 수동 승인자 설정 필요.
