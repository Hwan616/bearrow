# BeArrow 기술 스택

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | **1.0.0** |
| 작성일 | 2026-06-27 |
| 작성자 | 최환 |

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 1.0.0 | 2026-06-27 | 최초 작성 — Phase 0·1 진행 후 확정·미확정 스택 정리 |

---

## 1. 핵심 원칙

- **무료 우선**: EAS 클라우드 빌드 미사용. GitHub Actions(무료 분) + Fastlane으로 대체.
- **오프라인 우선**: 로컬 SQLite가 SSOT. 네트워크 없이도 핵심 기능 동작.
- **단일 코드베이스**: iOS · Android · 웹을 Expo(React Native)로 커버.
- **타입 안전**: TypeScript strict + noUncheckedIndexedAccess 전 구간 적용.

---

## 2. 확정 스택 (설치·사용 중)

### 2.1 앱 프레임워크

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **React Native** | 0.81.0 | iOS·Android·웹 단일 코드베이스 |
| **Expo** (New Architecture) | ~54.0.0 | 네이티브 모듈 통합, 빌드 도구 제공 |
| **TypeScript** | ~5.9.0 | 타입 안전성 — strict + noUncheckedIndexedAccess |

### 2.2 로컬 데이터베이스

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-sqlite** | ~16.0.10 | Expo 공식 SQLite 드라이버, New Architecture 지원 |
| **drizzle-orm** | ^0.45.2 | 타입 안전 쿼리 빌더, expo-sqlite 공식 지원 |
| **drizzle-kit** | ^0.31.10 | 스키마 변경 → SQL 마이그레이션 자동 생성 (devDependency) |

> 마이그레이션 전략: `src/db/migrate.ts`의 `MIGRATIONS` 배열에 SQL을 순서대로 추가. `_migrations` 테이블로 적용 이력 추적 (멱등 보장).

### 2.3 보안 저장소

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-secure-store** | ~14.0.0 | iOS Keychain / Android Keystore 래핑, 인증 토큰 저장용 |

### 2.4 CI/CD · 배포

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **GitHub Actions** | — | 무료 ubuntu 러너, CI(lint·test)·Android 디버그 APK 빌드 |
| **Fastlane** | — | Android(Play) · iOS(TestFlight) 스토어 제출 자동화 |

> EAS Build는 유료 한도로 미사용. macOS 러너는 릴리즈 시에만 사용(과금 최소화).

### 2.5 코드 품질

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| **ESLint** (eslint-config-expo) | 9.x | 정적 분석 |
| **Prettier** | ^3.3.0 | 코드 포맷 |
| **Jest** + **jest-expo** | 29.x / ~54.0.0 | 단위 테스트 |

> 현재 테스트 현황: 8개 파일 · 77개 테스트 · 100% green (2026-06-27 기준)

---

## 3. 계획 스택 (미설치 · 도입 시점 확정)

### 3.1 상태 관리 (Phase 1.4~)

| 기술 | 도입 시점 | 용도 |
| --- | --- | --- |
| **Zustand** | 1.4 일정 폼 | 전역 UI 상태 (선택 날짜, 현재 뷰 모드 등) |
| **TanStack Query** | 1.4 일정 폼 | 로컬 DB 비동기 조회 캐시·재조회 관리 |

> CONVENTIONS 명시 사항: "로컬 UI 상태 → useState, 전역 클라이언트 상태 → Zustand, 서버/DB 캐시 → TanStack Query"

### 3.2 네비게이션 (Phase 1.4~)

| 기술 | 도입 시점 | 용도 |
| --- | --- | --- |
| **Expo Router** | 1.4 일정 폼 | 파일 기반 라우팅, 모달·화면 전환 |

> **결정 이유**: Expo와 통합이 긴밀하고, 웹 지원 시 URL 구조 자동 처리. React Navigation 대비 설정 부담이 낮음.

### 3.3 유틸리티 (Phase 1.4~1.6)

| 기술 | 도입 시점 | 용도 |
| --- | --- | --- |
| **expo-crypto** | 1.4 일정 폼 | `randomUUID()` — Event·Todo id 생성 |
| **rrule** | 1.5 반복 일정 | RFC 5545 RRULE 파싱·반복 날짜 전개 |
| **expo-notifications** | 1.6 알림 | 로컬 푸시 알림 예약·취소 |

### 3.4 백엔드·인증 (Phase 4)

| 기술 | 도입 시점 | 용도 |
| --- | --- | --- |
| **Supabase** | 4.1 | PostgreSQL DB + Auth + Realtime + Storage |
| **Google OAuth** (Supabase Auth 경유) | 4.1 | 사용자 인증, Google 캘린더 권한 획득 |
| **Google Calendar API** | 4.3 | 양방향 동기화 (syncToken 증분) |

> Supabase 클라이언트: `@supabase/supabase-js`. 환경별 URL·anon key는 `EXPO_PUBLIC_SUPABASE_*` 환경변수로 주입 (`.env.example` 참고).

### 3.5 안정화 (Phase 5)

| 기술 | 도입 시점 | 용도 |
| --- | --- | --- |
| **Sentry** | 5.1 | 크래시·에러 추적, 릴리즈 태깅 |
| **Detox** 또는 **Maestro** | 5.2 | E2E 스모크 테스트 자동화 |
| **expo-updates** (self-hosted) | 5.4 | OTA 업데이트 (선택 사항, NFR-MNT-001) |

---

## 4. 미결 결정 사항

| 항목 | 후보 | 결정 시점 | 비고 |
| --- | --- | --- | --- |
| **E2E 테스트 도구** | Detox vs Maestro | Phase 5.2 | Detox: 성숙·풍부한 API / Maestro: 설정 간단·YAML 기반 |
| **Apple 캘린더 동기화** | EventKit vs CalDAV | Phase 4+ | SRS TBD-001 — Could 우선순위, 후속 버전 검토 |
| **UI 컴포넌트 라이브러리** | 자체 구현 (현재) vs RN Paper vs Tamagui | Phase 3.4~ | 현재 자체 구현 중. 디자인 시스템 복잡도에 따라 재검토 |

---

## 5. 아키텍처 결정 기록 (ADR 요약)

| 결정 | 선택 | 거부된 대안 | 이유 |
| --- | --- | --- | --- |
| 클라우드 빌드 | GitHub Actions + Fastlane | EAS Build | 유료 한도 없이 무제한 무료 빌드 |
| 로컬 DB ORM | Drizzle ORM | Prisma, TypeORM, 직접 SQL | expo-sqlite 공식 지원, 타입 추론, 번들 크기 작음 |
| 오프라인 전략 | SQLite SSOT + 변경 큐 동기화 | API 우선, 낙관적 업데이트만 | 오프라인 완전 동작 보장 (NFR-REL-001) |
| 충돌 해결 | Last-Write-Wins (updated_at 기준) | CRDT, 수동 병합 | 캘린더 앱 특성상 단순 LWW로 충분 |
| 인증 토큰 저장 | expo-secure-store | AsyncStorage | OS 보안 저장소 사용 (NFR-SEC-001) |
| 마이그레이션 방식 | 코드 내 MIGRATIONS 배열 | drizzle-kit 번들 마이그레이션 | 모바일 파일시스템 접근 제한 없이 단순하게 관리 |
