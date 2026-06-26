# CLAUDE.md — BeArrow 에이전트 운영 매뉴얼

이 파일은 에이전트(Claude)가 **프롬프트만으로 자율적으로** BeArrow를 개발하기 위한 단일 기준 문서다.
새 작업을 시작할 때마다 이 파일을 먼저 읽고, 규칙과 워크플로를 그대로 따른다.

## 1. 프로젝트 개요

BeArrow는 캘린더와 투두리스트를 구조적으로 통합한 크로스플랫폼 앱(iOS · Android · 웹)이다.
일정(Event)과 할일(Todo)이 카테고리·색상 체계를 공유하고, 마감일이 있는 할일은 캘린더에 함께 표시된다.

- 스택: Expo(React Native, New Architecture) · TypeScript · Supabase · 오프라인 우선
- 상세 기획·아키텍처: 상위 폴더의 `BeArrow_기획아키텍처문서.docx`
- 작업 계획: `docs/BACKLOG.md` (원자 단위, 프롬프트 가능)
- 코딩/구조 규칙: `docs/CONVENTIONS.md`

## 2. 현재 상태

- [x] 1단계 CI/CD 환경 구축 (GitHub Actions + EAS, 환경 분리, 최소 스켈레톤)
- [ ] 2단계 앱 개발 — `docs/BACKLOG.md` 의 Phase 1 부터 진행
- [ ] 3단계 업데이트·유지보수

다음에 할 작업은 항상 `docs/BACKLOG.md` 에서 **가장 위의 미완료(`[ ]`) 항목**이다.

## 3. 핵심 명령어

```bash
npm install          # 의존성 설치
npm run start        # Expo 개발 서버
npm run typecheck    # tsc --noEmit (반드시 통과)
npm run lint         # eslint (반드시 통과)
npm test             # jest (반드시 통과)
npm run format       # prettier 정리
```

EAS(릴리즈/배포는 CI가 담당하므로 로컬 수동 실행은 지양):
`eas build` · `eas submit` · `eas update`.

## 4. 작업 완료 기준 (Definition of Done)

하나의 작업은 아래를 **모두** 만족해야 완료다.

1. `npm run typecheck` · `npm run lint` · `npm test` 가 모두 통과(green).
2. 추가/변경한 로직에는 단위 테스트가 있다.
3. `docs/CONVENTIONS.md` 의 구조·네이밍 규칙을 따른다.
4. `docs/BACKLOG.md` 에서 해당 작업 체크박스를 `[x]` 로 갱신한다.
5. 변경 요약(무엇을·왜)을 한국어로 보고한다.

## 5. 자율 진행 워크플로

사용자가 "다음 작업 진행해" 류의 프롬프트를 주면 아래 루프를 수행한다.

1. **선택** — `docs/BACKLOG.md` 에서 가장 위의 미완료 작업 1건을 고른다.
   (사용자가 특정 작업 ID를 지정하면 그것을 우선.)
2. **계획** — 작업의 완료 조건과 건드릴 파일을 짧게 정리한다.
3. **구현** — 컨벤션에 맞춰 코드를 작성한다. 작업 범위를 넘는 변경은 하지 않는다.
4. **검증** — typecheck · lint · test 를 실행해 green 을 확인한다(실패 시 수정).
5. **마감** — 백로그 체크박스를 갱신하고, 변경 요약을 보고한다.
6. 한 번에 **한 작업**만. 끝나면 멈추고 다음 작업을 제안한다(자동 연속 진행은 사용자가 명시할 때만).

## 6. 디렉터리 구조 (요지)

```
src/
├─ config/        # 환경·앱 설정
├─ db/            # 로컬 SQLite 스키마·쿼리 (Drizzle)
├─ features/      # 기능 단위 모듈 (calendar, todo, category ...)
│  └─ <feature>/  #   components / hooks / api / types / __tests__
├─ sync/          # 동기화 엔진 (변경 큐, sync token, 충돌 해결)
├─ lib/           # 공용 유틸 · Supabase 클라이언트
├─ theme/         # 색상 토큰 · 테마
└─ ui/            # 공용 프레젠테이션 컴포넌트
```

상세 규칙은 `docs/CONVENTIONS.md`.

## 7. 아키텍처 요약

- **오프라인 우선**: 로컬 SQLite 가 단일 진실 공급원(SSOT). UI 는 로컬을 읽고 쓴다.
- **동기화 엔진**: 로컬 변경을 큐에 쌓아 백엔드(Supabase)에 반영하고, 외부 캘린더(Google)는 증분 동기화(syncToken, 410→full sync, 웹훅 트리거).
- **통합 모델**: `Category` 를 `Event`·`Todo` 가 공유. 마감일 있는 `Todo` 는 캘린더에 표시.
- **인증/보안**: Supabase Auth(OAuth) + Postgres RLS, 토큰은 expo-secure-store.

## 8. 가드레일 (하지 말 것)

- 시크릿·키·`.env`·자격증명 파일을 커밋하지 않는다.
- 사용자 승인 없이 의존성을 대량 추가하거나 메이저 업그레이드하지 않는다.
- 스토어 제출/실서비스 배포를 임의로 실행하지 않는다(릴리즈는 사람이 태그/승인).
- 백로그에 없는 큰 기능을 임의로 만들지 않는다. 필요하면 백로그에 항목을 먼저 추가하고 사용자에게 제안한다.
- 한 작업의 범위를 넘어 광범위하게 리팩터링하지 않는다.

## 9. 환경 분리

`APP_ENV` = `development` / `staging` / `production`. 설정 위치: `eas.json`(빌드), `app.config.ts`(앱 메타), `src/config/env.ts`(런타임). 자세한 내용은 `README.md`.
