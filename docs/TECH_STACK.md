# BeArrow 기술 스택

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | **1.3.0** |
| 최종 갱신 | 2026-07-06 |
| 작성자 | 최환 |

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
| --- | --- | --- |
| 1.0.0 | 2026-06-27 | 최초 작성 — Phase 0·1 진행 후 확정·미확정 스택 정리 |
| 1.1.0 | 2026-06-27 | 미결 사항 전부 확정. 폼·날짜·애니메이션·아이콘 등 누락 항목 추가 |
| 1.2.0 | 2026-07-05 | Phase 6 완료 반영. RN 0.81.5 패치 업데이트. 미채택 라이브러리 정정 |
| 1.3.0 | 2026-07-06 | Phase 6.7 외부 캘린더(CalDAV) 반영. ADR 실제 결정 기준으로 재정렬. 테스트 수 갱신 |

---

## 1. 핵심 원칙

- **무료 우선**: EAS 클라우드 빌드 미사용. GitHub Actions(무료 분) + Fastlane으로 대체.
- **오프라인 우선**: 로컬 SQLite가 SSOT. 네트워크 없이도 핵심 기능 동작.
- **단일 코드베이스**: iOS · Android · 웹을 Expo(React Native)로 커버.
- **타입 안전**: TypeScript strict + noUncheckedIndexedAccess 전 구간 적용.
- **의존성 최소화**: Expo 54에 내장된 것은 별도 설치하지 않는다. 동일 기능이 네이티브 API로 가능하면 라이브러리를 추가하지 않는다.

---

## 2. 확정 스택

### 2.1 앱 프레임워크

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **React Native** | 0.81.5 | iOS·Android·웹 단일 코드베이스 |
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

| 기술 | 비고 |
| --- | --- |
| **수동 탭 전환** (`useState`) | `App.tsx`에서 `activeTab` 상태로 캘린더·할일·설정 탭을 전환. 768pt 이상에서 사이드바 레이아웃으로 자동 분기. |

> **Expo Router, React Navigation 미채택** — 화면 수가 적고 모달 기반 흐름이므로 별도 라우팅 라이브러리 없이 단순 상태로 충분하다.

### 2.4 상태 관리

| 기술 | 용도 |
| --- | --- |
| **useState / useReducer** | 컴포넌트 로컬 UI 상태 (이벤트 목록, 선택 날짜 등) |
| **React Context** | 전역 설정 — `ThemeProvider`(테마·강조색), `AppSettingsProvider`(공휴일 표시 등) |

> **Zustand, TanStack Query 미채택** — 추가 복잡도 없이 useState + Context로 현재 요구사항이 충분히 충족된다. 도입 필요 시 백로그에 추가 후 결정한다.

### 2.5 폼

| 기술 | 비고 |
| --- | --- |
| **네이티브 useState** | 모든 폼(EventForm, TodoForm, ICloudConnectSheet)은 controlled input + useState로 구현 |

> **react-hook-form 미채택** — 폼 필드가 5개 이하로 적어 비제어 방식의 이점이 없다.

### 2.6 날짜·시간

| 기술 | 비고 |
| --- | --- |
| **네이티브 Date** | 모든 날짜 연산 (이미 전 구간 적용) |
| **Intl.DateTimeFormat** | 로케일 포맷 |
| **@react-native-community/datetimepicker** | 날짜·시간 피커 UI (EventForm·TodoForm에서 사용) |

> 별도 date 라이브러리(date-fns, dayjs 등) 추가하지 않는다.

### 2.7 반복 일정

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **rrule** | latest | RFC 5545 RRULE 파싱·반복 날짜 전개 |

### 2.8 알림

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-notifications** | Expo 54 | 로컬 푸시 알림 예약·취소, Expo 공식 모듈 |

### 2.9 UI — 애니메이션·제스처·아이콘

| 기술 | 비고 |
| --- | --- |
| **react-native-reanimated** | 고성능 애니메이션 (Expo 54 내장) |
| **react-native-gesture-handler** | 스와이프·드래그 제스처 (Expo 54 내장) |
| **@expo/vector-icons** | 아이콘 세트 (Expo 54 내장) |

> 추가 UI 라이브러리(RN Paper, Tamagui 등) 미도입. 디자인 토큰(`src/theme/`)과 `makeStyles(colors)` 패턴으로 일관성 유지.

### 2.10 보안 저장소

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| **expo-secure-store** | ~14.0.0 | iOS Keychain / Android Keystore — 인증 토큰, iCloud 앱 전용 암호 저장 |

### 2.11 백엔드·인증

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| **Supabase** | latest | PostgreSQL DB + Auth(OAuth) + RLS |
| **Google OAuth** (Supabase Auth 경유) | — | 사용자 인증 + Google 캘린더 권한(`provider_token`) |
| **Google Calendar API** | REST | 양방향 동기화 (syncToken 증분, 410→full sync) |

> Supabase 클라이언트: `@supabase/supabase-js`. 환경별 URL·anon key는 `EXPO_PUBLIC_SUPABASE_*` 환경변수로 주입.

### 2.12 외부 캘린더 — iCloud CalDAV

| 기술 | 비고 |
| --- | --- |
| **CalDAV 프로토콜** (네이티브 fetch) | HTTP PROPFIND·REPORT로 iCloud 캘린더 조회. 별도 라이브러리 없음 |
| **iCalendar 파서** (`src/sync/icalParser.ts`) | RFC 5545 VEVENT 파싱 — 자체 구현, 의존성 없음 |
| **expo-secure-store** | Apple ID + 앱 전용 암호 안전 저장 |

> iCloud → BeArrow 단방향(가져오기 전용). Apple ID + appleid.apple.com에서 발급한 앱 전용 암호 필요.

### 2.13 식별자 생성

| 기술 | 버전 | 선택 이유 |
| --- | --- | --- |
| **expo-crypto** | Expo 54 | `randomUUID()` — Event·Todo id 생성 |

### 2.14 CI/CD · 배포

| 기술 | 비고 |
| --- | --- |
| **GitHub Actions** | CI(lint·test·typecheck), Android 디버그 APK 빌드 |
| **Fastlane** | Android(Play) · iOS(TestFlight) 스토어 제출 자동화 |

> EAS Build 미사용. macOS 러너는 릴리즈 시에만 사용(과금 최소화).

### 2.15 안정화

| 기술 | 버전 | 도입 시점 | 선택 이유 |
| --- | --- | --- | --- |
| **Sentry** | latest | Phase 5.1 | 크래시·에러 추적, 릴리즈 태깅 |
| **Maestro** | latest | Phase 5.2 | E2E 스모크 테스트 — YAML 기반, Expo 친화적 |
| **expo-updates** (self-hosted) | Expo 54 | Phase 5.4 (선택) | OTA 업데이트 (NFR-MNT-001) |

### 2.16 코드 품질

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| **ESLint** (eslint-config-expo) | 9.x | 정적 분석 |
| **Prettier** | ^3.3.0 | 코드 포맷 |
| **Jest** + **jest-expo** | 29.x / ~54.0.0 | 단위 테스트 |

> 현재 테스트 현황: **29개 파일 · 337개 테스트 · 100% green** (2026-07-06 기준)

---

## 3. 미채택 결정 요약

아래 기술은 초기 검토 대상이었으나 현재 코드베이스에서 **채택하지 않은** 것들이다. 재검토 시 이 이유를 먼저 확인한다.

| 기술 | 미채택 이유 |
| --- | --- |
| **Expo Router** | 화면 수가 적어(3탭 + 모달) 상태 기반 탭 전환으로 충분 |
| **React Navigation** | 동일 이유 |
| **Zustand** | useState + React Context로 현재 전역 상태 요구사항 충족 |
| **TanStack Query** | 모든 DB 조회가 동기식 로컬 SQLite — 비동기 캐시 필요 없음 |
| **react-hook-form** | 폼 필드 수가 적어 controlled useState로 충분 |
| **date-fns / dayjs** | 네이티브 Date로 모든 연산 처리 가능 |
| **expo-calendar (EventKit)** | CalDAV로 iCloud 직접 접근. EventKit은 iOS 전용이며 별도 권한 요청 필요 |

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
| 네비게이션 | 수동 탭 전환 (useState) | Expo Router, React Navigation | 화면 수가 적어 복잡한 라우팅 라이브러리 불필요 |
| 전역 상태 | React Context | Zustand, Redux | 설정 2종(테마·공휴일)에 한정 — 라이브러리 불필요 |
| 폼 | 네이티브 useState | react-hook-form | 필드 수가 적어 비제어 방식 이점 없음 |
| 날짜 라이브러리 | 네이티브 Date + Intl | date-fns, dayjs | 이미 전 구간에서 네이티브 Date 사용 중 |
| E2E 도구 | Maestro | Detox | 네이티브 빌드 없이 실행 가능, YAML 기반 가독성 |
| Apple 캘린더 통합 | CalDAV (네이티브 fetch) | expo-calendar (EventKit) | EventKit은 iOS 전용, CalDAV는 iOS·Android·웹 모두 동작 |
| iCalendar 파싱 | 자체 구현 (`icalParser.ts`) | ical.js 등 외부 라이브러리 | RFC 5545 주요 필드만 필요, 의존성 없이 구현 가능 |
| UI 컴포넌트 | 자체 구현 | RN Paper, Tamagui | 기존 디자인 토큰·컴포넌트 이미 구축, 마이그레이션 비용 없음 |
| 스타일 패턴 | `makeStyles(colors)` + StyleSheet | 인라인 스타일 | 컴포넌트 내부에서 테마 토큰을 안전하게 반영, 다크모드 지원 |
