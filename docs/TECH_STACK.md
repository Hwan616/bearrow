# BeArrow 기술 스택

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | **1.1.0** |
| 작성일 | 2026-06-27 |
| 작성자 | 최환 |

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 1.0.0 | 2026-06-27 | 최초 작성 — Phase 0·1 진행 후 확정·미확정 스택 정리 |
| 1.1.0 | 2026-06-27 | 미결 사항 전부 확정. 폼·날짜·애니메이션·아이콘 등 누락 항목 추가 |

---

## 1. 핵심 원칙

- **무료 우선**: EAS 클라우드 빌드 미사용. GitHub Actions(무료 분) + Fastlane으로 대체.
- **오프라인 우선**: 로컬 SQLite가 SSOT. 네트워크 없이도 핵심 기능 동작.
- **단일 코드베이스**: iOS · Android · 웹을 Expo(React Native)로 커버.
- **타입 안전**: TypeScript strict + noUncheckedIndexedAccess 전 구간 적용.
- **의존성 최소화**: Expo 54에 내장된 것은 별도 설치하지 않는다.

---

## 2. 확정 스택

### 2.1 앱 프레임워크

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **React Native** | 0.81.0 | iOS·Android·웹 단일 코드베이스 |
| **Expo** (New Architecture) | ~54.0.0 | 네이티브 모듈 통합, 빌드 도구 제공 |
| **TypeScript** | ~5.9.0 | strict + noUncheckedIndexedAccess |

### 2.2 로컬 데이터베이스

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-sqlite** | ~16.0.10 | Expo 공식 SQLite 드라이버, New Architecture 지원 |
| **drizzle-orm** | ^0.45.2 | 타입 안전 쿼리 빌더, expo-sqlite 공식 지원 |
| **drizzle-kit** | ^0.31.10 | 스키마 → SQL 마이그레이션 자동 생성 (devDependency) |

> 마이그레이션 전략: `src/db/migrate.ts`의 `MIGRATIONS` 배열에 SQL을 순서대로 추가. `_migrations` 테이블로 적용 이력 추적 (멱등 보장).

### 2.3 네비게이션

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **Expo Router** | Expo 54 내장 | 파일 기반 라우팅, 웹 URL 자동 처리, React Navigation 대비 설정 간단 |

> 도입 시점: Phase 1.4 (첫 화면 전환 발생 시).

### 2.4 상태 관리

| 기술 | 버전 | 용도 | 도입 시점 |
| --- | --- | --- | --- |
| **useState / useReducer** | React 내장 | 컴포넌트 로컬 UI 상태 | 이미 사용 중 |
| **Zustand** | latest | 전역 클라이언트 상태 (선택 날짜, 현재 뷰 모드 등) | Phase 1.4 |
| **TanStack Query** | latest | DB 비동기 조회 캐시·재조회 관리 | Phase 1.4 |

> 레이어 규칙: 로컬 UI 상태 → useState, 전역 클라이언트 상태 → Zustand, 서버/DB 캐시 → TanStack Query.

### 2.5 폼

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **react-hook-form** | latest | 비제어 방식으로 불필요한 리렌더 없음, 유효성 검사 내장, TypeScript 지원 우수 |

> 도입 시점: Phase 1.4 (일정 생성·편집 폼). 필드 수가 많고 유효성 검사가 필요한 폼에만 사용. 단순 1~2개 필드는 useState.

### 2.6 날짜·시간

| 기술 | 비고 |
| --- | --- |
| **네이티브 Date** | 모든 날짜 연산에 사용 (이미 적용 중) |
| **Intl.DateTimeFormat** | 로케일 포맷 (추가 라이브러리 없음) |
| **@react-native-community/datetimepicker** | Expo 54 내장 — 날짜·시간 피커 UI (Phase 1.4) |

> 별도 date 라이브러리(date-fns, dayjs 등) 추가하지 않는다. RRULE 라이브러리도 네이티브 Date를 직접 사용하므로 호환 문제 없음.

### 2.7 반복 일정

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **rrule** | latest | RFC 5545 RRULE 파싱·반복 날짜 전개, 네이티브 Date와 직접 호환 |

> 도입 시점: Phase 1.5.

### 2.8 알림

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-notifications** | Expo 54 | 로컬 푸시 알림 예약·취소, Expo 공식 모듈 |

> 도입 시점: Phase 1.6.

### 2.9 UI — 애니메이션·제스처·아이콘

| 기술 | 버전 | 비고 |
| --- | --- | --- |
| **react-native-reanimated** | Expo 54 내장 | 고성능 애니메이션 (UI 트랜지션, 드래그 등) |
| **react-native-gesture-handler** | Expo 54 내장 | 스와이프·드래그 제스처 |
| **@expo/vector-icons** | Expo 54 내장 | Ionicons · MaterialIcons 등 아이콘 세트 |

> 세 가지 모두 별도 설치 없이 Expo 54에 포함. 추가 UI 라이브러리(RN Paper, Tamagui 등)는 도입하지 않는다. 디자인 토큰(src/theme/)과 자체 컴포넌트(src/ui/)로 일관성 유지.

### 2.10 보안 저장소

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-secure-store** | ~14.0.0 | iOS Keychain / Android Keystore 래핑, 인증 토큰 저장용 |

### 2.11 백엔드·인증

| 기술 | 버전 | 용도 | 도입 시점 |
| --- | --- | --- | --- |
| **Supabase** | latest | PostgreSQL DB + Auth + Realtime | Phase 4.1 |
| **Google OAuth** (Supabase Auth 경유) | — | 사용자 인증 + Google 캘린더 권한 | Phase 4.1 |
| **Google Calendar API** | REST | 양방향 동기화 (syncToken 증분) | Phase 4.3 |
| **Apple 캘린더 (expo-calendar)** | Expo 54 | iOS EventKit 래퍼, 로컬 캘린더 읽기/쓰기 | Phase 4+ (Could) |

> Supabase 클라이언트: `@supabase/supabase-js`. 환경별 URL·anon key는 `EXPO_PUBLIC_SUPABASE_*` 환경변수로 주입.
> Apple 캘린더는 CalDAV 대신 expo-calendar(EventKit 래퍼)를 사용한다. 별도 설치 필요, "Could" 우선순위로 Phase 4 이후 결정.

### 2.12 식별자 생성

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-crypto** | Expo 54 | `randomUUID()` — Event·Todo id 생성, 별도 설치 필요 |

> 도입 시점: Phase 1.4.

### 2.13 CI/CD · 배포

| 기술 | 비고 |
| --- | --- |
| **GitHub Actions** | CI(lint·test·typecheck), Android 디버그 APK 빌드 |
| **Fastlane** | Android(Play) · iOS(TestFlight) 스토어 제출 자동화 |

> EAS Build 미사용. macOS 러너는 릴리즈 시에만 사용(과금 최소화).

### 2.14 안정화

| 기술 | 버전 | 도입 시점 | 선택 이유 |
| --- | --- | --- | --- |
| **Sentry** | latest | Phase 5.1 | 크래시·에러 추적, 릴리즈 태깅 |
| **Maestro** | latest | Phase 5.2 | E2E 스모크 테스트 — YAML 기반, 네이티브 빌드 없이 실행, Expo 친화적 |
| **expo-updates** (self-hosted) | Expo 54 | Phase 5.4 (선택) | OTA 업데이트, self-hosted 서버 구성 (NFR-MNT-001) |

### 2.15 코드 품질

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| **ESLint** (eslint-config-expo) | 9.x | 정적 분석 |
| **Prettier** | ^3.3.0 | 코드 포맷 |
| **Jest** + **jest-expo** | 29.x / ~54.0.0 | 단위 테스트 |

> 현재 테스트 현황: 8개 파일 · 77개 테스트 · 100% green (2026-06-27 기준)

---

## 3. 미결 사항

없음. 현재 시점에서 결정 가능한 모든 스택이 확정되었다.

---

## 4. 아키텍처 결정 기록 (ADR 요약)

| 결정 | 선택 | 거부된 대안 | 이유 |
| --- | --- | --- | --- |
| 클라우드 빌드 | GitHub Actions + Fastlane | EAS Build | 유료 한도 없이 무제한 무료 빌드 |
| 로컬 DB ORM | Drizzle ORM | Prisma, TypeORM, 직접 SQL | expo-sqlite 공식 지원, 타입 추론, 번들 크기 작음 |
| 오프라인 전략 | SQLite SSOT + 변경 큐 동기화 | API 우선, 낙관적 업데이트만 | 오프라인 완전 동작 보장 (NFR-REL-001) |
| 충돌 해결 | Last-Write-Wins (updated_at 기준) | CRDT, 수동 병합 | 캘린더 앱 특성상 단순 LWW로 충분 |
| 인증 토큰 저장 | expo-secure-store | AsyncStorage | OS 보안 저장소 사용 (NFR-SEC-001) |
| 마이그레이션 방식 | 코드 내 MIGRATIONS 배열 | drizzle-kit 번들 마이그레이션 | 모바일 파일시스템 접근 제한 없이 단순하게 관리 |
| 네비게이션 | Expo Router | React Navigation | 파일 기반 라우팅, 웹 URL 자동 처리, 설정 부담 낮음 |
| 폼 라이브러리 | react-hook-form | useState + 수동 검증 | 비제어 방식으로 리렌더 최소화, 유효성 검사 내장 |
| 날짜 라이브러리 | 네이티브 Date + Intl | date-fns, dayjs | 이미 전 구간에서 네이티브 Date 사용 중, 추가 의존성 불필요 |
| E2E 도구 | Maestro | Detox | 네이티브 빌드 없이 실행 가능, YAML 기반 가독성, Expo 친화적 |
| Apple 캘린더 통합 | expo-calendar (EventKit) | CalDAV | Expo 공식 모듈, CalDAV 대비 설정 단순 |
| UI 컴포넌트 | 자체 구현 | RN Paper, Tamagui | 기존 디자인 토큰·컴포넌트 이미 구축, 마이그레이션 비용 없음 |
| 애니메이션 | react-native-reanimated | Animated API | Expo 54 내장, 고성능, 제스처와 통합 용이 |
