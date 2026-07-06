# BeArrow 소프트웨어 요구사항 명세서 (SRS)

> IEEE Std 830-1998 (Recommended Practice for Software Requirements Specifications) 구조를 따른다.

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | **1.1.0** |
| 상태 | Baseline (Phase 0–6 구현 완료, Phase 7 진행 예정) |
| 작성일 | 2026-06-26 |
| 최종 갱신 | 2026-07-06 |
| 작성자 | 최환 |
| 대상 시스템 | BeArrow (캘린더 + 투두리스트 통합 앱) |

## 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 변경 내용 |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-26 | 최환 | 최초 베이스라인. 대화로 입력된 요구사항을 IEEE 830 구조로 정리. |
| 1.0.1 | 2026-06-26 | 최환 | NFR-MNT-001(OTA) 명확화 — 빌드/배포를 무료 도구(GitHub Actions+Fastlane)로 전환, OTA는 self-hosted 방식으로 후속 구현. |
| 1.0.2 | 2026-06-26 | 최환 | 부록 A 추적 매트릭스를 텍스트에서 양방향 테이블로 전환. BACKLOG.md 각 항목에 요구사항 ID 추가. |
| 1.1.0 | 2026-07-06 | 최환 | Phase 6.7 완료 반영 — IF-002(Apple CalDAV) 구현 완료 처리. 추적 매트릭스 6.7 항목 추가. TBD-001 해소. |

## 버전 관리 정책

이 문서는 git 으로 형상 관리하며, 의미 기반 버전(MAJOR.MINOR.PATCH)을 사용한다.

- **MAJOR** — 제품 범위·방향의 근본적 변경, 요구사항 구조 재편.
- **MINOR** — 요구사항 항목의 추가 또는 삭제.
- **PATCH** — 문구 명확화, 오타, 비기능적 표현 수정(요구사항 의미 불변).

규칙:

1. 모든 요구사항은 **안정적 ID**(예: `FR-CAL-001`)를 가진다. ID 는 재사용·재배치하지 않는다.
2. 요구사항을 삭제하면 ID 를 없애지 않고 상태를 `Deprecated` 로 표기한다.
3. 변경 시 위 개정 이력에 한 행을 추가하고 문서 버전을 갱신한다.
4. 각 요구사항 행의 `Ver.` 열은 그 항목이 **마지막으로 바뀐 문서 버전**을 가리킨다.

---

# 1. 소개 (Introduction)

## 1.1 목적 (Purpose)

본 문서는 BeArrow 앱이 충족해야 할 기능적·비기능적 요구사항을 정의한다. 독자는 기획자, 개발자(에이전트 포함), 테스터, 이해관계자다. 이 문서는 설계·구현·검증의 기준이 된다.

## 1.2 범위 (Scope)

BeArrow 는 캘린더와 투두리스트를 하나로 통합한 크로스플랫폼 애플리케이션(iOS · Android · 웹)이다.

- **수행하는 것**: 일정(Event) 관리, 할일(Todo) 관리, 카테고리·색상 체계 공유를 통한 두 기능의 구조적 통합, 외부 캘린더와의 동기화.
- **수행하지 않는 것(현 범위 밖)**: 팀 협업·공유, 메신저, 결제. (후속 버전에서 검토)
- **기대 효과**: 기존 캘린더의 제한적 '미리 알림'을 넘어, 일정과 해야 할 일을 한 화면에서 효율적으로 관리한다.

## 1.3 정의·약어 (Definitions, Acronyms, Abbreviations)

| 용어 | 의미 |
| --- | --- |
| Event(일정) | 시작/종료 시각을 갖는 캘린더 항목 |
| Todo(할일) | 완료 여부를 갖는 작업 항목. 선택적으로 마감일 보유 |
| Category(카테고리) | Event·Todo 가 공유하는 분류·색상 단위 |
| SSOT | Single Source of Truth(단일 진실 공급원), 로컬 DB |
| RRULE | RFC 5545 반복 규칙 |
| OTA | Over-The-Air, 스토어 심사 없는 무선 업데이트 |
| LWW | Last-Write-Wins, 최신 수정 우선 충돌 정책 |

## 1.4 참고 문헌 (References)

- IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.
- `BeArrow_기획아키텍처문서.docx` (기획·아키텍처).
- `docs/CONVENTIONS.md`, `docs/BACKLOG.md`, `README.md`.
- Google Calendar API — Synchronize resources efficiently.

## 1.5 개요 (Overview)

2장은 제품 전반(관점·기능 요약·사용자·제약)을 기술하고, 3장은 검증 가능한 개별 요구사항을 ID 단위로 정의한다.

---

# 2. 전체 설명 (Overall Description)

## 2.1 제품 관점 (Product Perspective)

BeArrow 는 독립 실행형 신규 제품이며, 외부 캘린더 서비스(Google, Apple)와 연동된다. 오프라인 우선 구조로, 로컬 SQLite 가 SSOT 이고 동기화 계층이 백엔드(Supabase) 및 외부 캘린더와 데이터를 맞춘다.

```
[사용자] → [BeArrow 앱(로컬 DB=SSOT)] ⇄ [동기화 엔진] ⇄ [Supabase] / [Google·Apple 캘린더]
```

## 2.2 제품 기능 요약 (Product Functions)

- 캘린더: 일정 CRUD, 월/주/일 뷰, 반복, 알림, 검색.
- 투두: 카테고리 관리, 할일 CRUD·메모·날짜 변경·완료.
- 통합: 카테고리·색상 공유, 마감일 할일의 캘린더 표시, 통합 데일리 뷰.
- 커스터마이징: 색상·테마(라이트/다크) 변경.
- 동기화: 계정 인증, 로컬↔서버 동기화, 외부 캘린더 양방향 동기화.

## 2.3 사용자 특성 (User Characteristics)

일반 스마트폰/웹 사용자. 전문 지식 불필요. 캘린더·투두 앱 사용 경험이 있다고 가정한다. 접근성(폰트 스케일·색 대비)을 고려한다.

## 2.4 제약 (Constraints)

- 플랫폼: iOS · Android · 웹 단일 코드베이스(Expo/React Native).
- 외부 API 한도 준수(예: Google Calendar API 사용자당 분당 약 600쿼리).
- 스토어 정책(Apple/Google) 및 개인정보 보호 규정 준수.
- 시크릿·자격증명은 저장소에 커밋 금지, 보안 저장소 사용.

## 2.5 가정·의존성 (Assumptions and Dependencies)

- 외부 캘린더 동기화는 사용자가 해당 계정 권한을 부여했을 때만 동작한다.
- 백엔드는 Supabase, 인증은 OAuth 를 사용한다.
- 네트워크가 없어도 핵심 기능(로컬 CRUD)은 동작한다.

---

# 3. 구체적 요구사항 (Specific Requirements)

각 요구사항은 ID · 설명 · 우선순위(M=Must, S=Should, C=Could) · 상태 · 마지막 변경 버전을 가진다.

## 3.1 외부 인터페이스 요구사항 (External Interface Requirements)

### 3.1.1 사용자 인터페이스

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| UI-001 | 시스템은 캘린더 뷰와 투두 뷰 간 이동 수단을 제공해야 한다. | M | Active | 1.0.0 |
| UI-002 | 기본 디자인 틀 안에서 강조색·테마(라이트/다크)를 변경할 수 있어야 한다. | M | Active | 1.0.0 |
| UI-003 | 터치 타깃 최소 44pt, 색 대비·폰트 스케일을 준수해야 한다. | S | Active | 1.0.0 |

### 3.1.2 소프트웨어 인터페이스

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| IF-001 | 시스템은 Google 캘린더 API 와 연동되어야 한다. | M | Active | 1.0.0 |
| IF-002 | 시스템은 Apple 캘린더(CalDAV)와 연동될 수 있어야 한다. | C | **Implemented** | 1.1.0 |
| IF-003 | 시스템은 백엔드(Supabase)와 인증·데이터 동기화 인터페이스를 가져야 한다. | M | Active | 1.0.0 |

## 3.2 기능 요구사항 (Functional Requirements)

### 3.2.1 캘린더 (FR-CAL)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| FR-CAL-001 | 사용자는 일정을 생성·조회·수정·삭제할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-CAL-002 | 시스템은 월·주·일 뷰를 제공하고 뷰 전환을 지원해야 한다. | M | Active | 1.0.0 |
| FR-CAL-003 | 일정은 종일 또는 시작/종료 시각 지정을 지원해야 한다. | M | Active | 1.0.0 |
| FR-CAL-004 | 사용자는 일정에 카테고리·색상을 지정할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-CAL-005 | 시스템은 RRULE 기반 반복 일정과 예외 처리를 지원해야 한다. | S | Active | 1.0.0 |
| FR-CAL-006 | 시스템은 일정 전 알림(다중 설정)을 제공해야 한다. | S | Active | 1.0.0 |
| FR-CAL-007 | 사용자는 제목·메모·기간으로 일정을 검색할 수 있어야 한다. | C | Active | 1.0.0 |

### 3.2.2 카테고리 (FR-CAT)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| FR-CAT-001 | 사용자는 카테고리를 생성할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-CAT-002 | 사용자는 카테고리의 이름·색상·순서를 변경하고 삭제할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-CAT-003 | 카테고리는 Event 와 Todo 가 공유하는 단일 분류 체계여야 한다. | M | Active | 1.0.0 |

### 3.2.3 투두 (FR-TODO)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| FR-TODO-001 | 사용자는 선택한 카테고리에 할일을 추가할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-TODO-002 | 사용자는 할일을 수정할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-TODO-003 | 사용자는 할일을 삭제할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-TODO-004 | 사용자는 할일에 메모를 작성할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-TODO-005 | 사용자는 할일의 날짜(마감/수행일)를 지정·변경할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-TODO-006 | 사용자는 할일을 완료/미완료로 전환할 수 있어야 한다. | M | Active | 1.0.0 |

### 3.2.4 캘린더–투두 통합 (FR-INT)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| FR-INT-001 | 마감일이 있는 할일은 해당 날짜의 캘린더에 표시되어야 한다. | M | Active | 1.0.0 |
| FR-INT-002 | 캘린더와 투두는 동일한 카테고리·색상 체계를 공유해야 한다. | M | Active | 1.0.0 |
| FR-INT-003 | 사용자는 특정 날짜의 일정과 할일을 통합된 데일리 뷰로 볼 수 있어야 한다. | S | Active | 1.0.0 |
| FR-INT-004 | 사용자는 일정에서 연관 할일을 파생 생성할 수 있어야 한다. | C | Active | 1.0.0 |

### 3.2.5 계정·동기화 (FR-SYNC)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| FR-SYNC-001 | 사용자는 OAuth 계정으로 로그인/로그아웃할 수 있어야 한다. | M | Active | 1.0.0 |
| FR-SYNC-002 | 시스템은 로컬 변경을 백엔드와 양방향 동기화해야 한다. | M | Active | 1.0.0 |
| FR-SYNC-003 | 시스템은 외부 캘린더를 증분(syncToken) 방식으로 동기화하고, 토큰 만료(410) 시 전체 재동기화해야 한다. | S | Active | 1.0.0 |
| FR-SYNC-004 | 동기화 충돌은 최신 수정 우선(LWW)을 기본으로 해결하되 외부 원본 항목은 외부를 우선해야 한다. | S | Active | 1.0.0 |

## 3.3 성능 요구사항 (Performance Requirements)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| NFR-PERF-001 | 캘린더 월 뷰 전환 등 주요 화면 조작은 일반 기기에서 즉각적으로 느껴져야 한다(목표 16ms/frame 수준의 부드러움). | S | Active | 1.0.0 |
| NFR-PERF-002 | 외부 API 호출은 배치·지수 백오프로 한도 내에서 수행해야 한다. | M | Active | 1.0.0 |

## 3.4 설계 제약 (Design Constraints)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| NFR-CON-001 | 단일 코드베이스(Expo/React Native, TypeScript)로 iOS·Android·웹을 지원해야 한다. | M | Active | 1.0.0 |
| NFR-CON-002 | 로컬 SQLite 를 SSOT 로 하는 오프라인 우선 구조를 따라야 한다. | M | Active | 1.0.0 |

## 3.5 소프트웨어 시스템 속성 (Software System Attributes)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| NFR-REL-001 | 가용성: 네트워크가 없어도 로컬 CRUD 핵심 기능은 동작해야 한다. | M | Active | 1.0.0 |
| NFR-SEC-001 | 보안: 인증 토큰은 보안 저장소(expo-secure-store)에 저장하고, 백엔드는 RLS 로 사용자 데이터를 격리해야 한다. | M | Active | 1.0.0 |
| NFR-SEC-002 | 보안: 시크릿·자격증명은 저장소에 커밋하지 않아야 한다. | M | Active | 1.0.0 |
| NFR-MNT-001 | 유지보수성: 네이티브 변경이 없는 수정은 OTA 로 배포할 수 있어야 한다. (EAS Update 미사용 결정에 따라 self-hosted `expo-updates` 로 후속 구현 — 현재 미구현) | S | Active | 1.0.1 |
| NFR-POR-001 | 이식성: 환경 분리(dev/staging/production)를 지원해야 한다. | M | Active | 1.0.0 |

## 3.6 기타 요구사항 (Other Requirements)

| ID | 요구사항 | 우선 | 상태 | Ver. |
| --- | --- | --- | --- | --- |
| NFR-I18N-001 | 기본 언어는 한국어이며, 사용자 문자열은 추후 다국어화가 가능한 구조로 관리해야 한다. | C | Active | 1.0.0 |

---

# 부록 A. 요구사항 추적 매트릭스 (Traceability Matrix)

구현·테스트 시 커밋 메시지/PR 본문에 해당 요구사항 ID 를 함께 표기해 추적성을 확보한다.

| 요구사항 ID | 설명 요약 | 백로그 항목 |
| --- | --- | --- |
| UI-001 | 뷰 간 이동 수단 | 1.2 월 뷰, 1.3 주·일 뷰, 2.3 투두 목록 UI |
| UI-002 | 강조색·테마 변경 | 0.4 디자인 토큰·테마, 3.4 색상 커스터마이징 UI |
| UI-003 | 터치 타깃·접근성 | 5.3 성능·접근성 점검 |
| IF-001 | Google 캘린더 API | 4.3 Google 캘린더 동기화 |
| IF-002 | Apple 캘린더 CalDAV 연동 | 6.7 외부 캘린더 연동 ✅ |
| IF-003 | Supabase 인터페이스 | 4.1 Supabase 연결·인증 |
| FR-CAL-001 | 일정 CRUD | 1.1 Event CRUD, 1.4 일정 생성·편집 폼 |
| FR-CAL-002 | 월·주·일 뷰 | 1.2 월 뷰, 1.3 주·일 뷰 |
| FR-CAL-003 | 종일/시각 지정 | 1.1 Event CRUD, 1.4 일정 생성·편집 폼 |
| FR-CAL-004 | 카테고리·색상 지정 | 1.4 일정 생성·편집 폼 |
| FR-CAL-005 | RRULE 반복 일정 | 1.5 반복 일정 |
| FR-CAL-006 | 일정 전 알림 | 1.6 알림 |
| FR-CAL-007 | 일정 검색(Could) | (미배정) |
| FR-CAT-001 | 카테고리 생성 | 2.1 Category CRUD |
| FR-CAT-002 | 카테고리 수정·삭제 | 2.1 Category CRUD |
| FR-CAT-003 | 카테고리 공유 체계 | 2.1 Category CRUD |
| FR-TODO-001 | 할일 추가 | 2.2 Todo CRUD, 2.3 투두 목록 UI |
| FR-TODO-002 | 할일 수정 | 2.2 Todo CRUD |
| FR-TODO-003 | 할일 삭제 | 2.2 Todo CRUD |
| FR-TODO-004 | 할일 메모 | 2.2 Todo CRUD |
| FR-TODO-005 | 날짜 지정·변경 | 2.4 할일 날짜 지정·변경 |
| FR-TODO-006 | 완료/미완료 전환 | 2.2 Todo CRUD |
| FR-INT-001 | 마감 할일 캘린더 표시 | 3.1 캘린더–투두 연동 표시 |
| FR-INT-002 | 카테고리·색상 공유 | 3.1 캘린더–투두 연동 표시 |
| FR-INT-003 | 통합 데일리 뷰 | 3.2 통합 데일리 뷰 |
| FR-INT-004 | 일정→할일 파생(Could) | 3.3 일정→할일 파생 |
| FR-SYNC-001 | OAuth 로그인/로그아웃 | 4.1 Supabase 연결·인증 |
| FR-SYNC-002 | 로컬↔서버 동기화 | 4.2 동기화 엔진 |
| FR-SYNC-003 | 외부 캘린더 증분 동기화 | 4.3 Google 캘린더 동기화, 6.7 외부 캘린더 연동 |
| FR-SYNC-004 | 충돌 해결(LWW) | 4.2 동기화 엔진 |
| NFR-PERF-001 | 화면 조작 16ms | 5.3 성능·접근성 점검 |
| NFR-PERF-002 | API 배치·백오프 | 4.2 동기화 엔진 |
| NFR-CON-001 | 단일 코드베이스(Expo) | 기반 구조 전반 |
| NFR-CON-002 | 오프라인 우선(SQLite SSOT) | 0.5 로컬 DB, 4.2 동기화 엔진 |
| NFR-REL-001 | 오프라인 CRUD 가용성 | 0.5 로컬 DB, 4.2 동기화 엔진 |
| NFR-SEC-001 | 토큰 보안 저장·RLS | 4.1 Supabase 연결·인증, 4.4 RLS 점검 |
| NFR-SEC-002 | 시크릿 커밋 금지 | 4.4 RLS·보안 점검 |
| NFR-MNT-001 | self-hosted OTA | 5.4 self-hosted OTA |
| NFR-POR-001 | 환경 분리(dev/stg/prod) | 0.2 환경 분리 ✅ |
| NFR-I18N-001 | 한국어 기본·i18n 구조(Could) | (미배정) |

# 부록 B. 미해결 사항 (TBD)

| ID | 항목 | 비고 |
| --- | --- | --- |
| ~~TBD-001~~ | ~~Apple/CalDAV 동기화 상세 범위~~ | **해소** — Phase 6.7에서 CalDAV 가져오기 구현 완료. iCloud → BeArrow 단방향. 쓰기(PUT/DELETE)는 후속 버전. |
| TBD-002 | 위젯·통계 대시보드 포함 여부 | 우선순위 검토 필요 |
