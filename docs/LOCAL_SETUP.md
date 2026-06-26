# 로컬 셋업 & 협업 방식

이 폴더(`~/Projects/BeArrow`)는 Claude(Cowork)에 연결되어 있다.
역할 분담과 최초 1회 설정을 정리한다.

## 역할 분담

- **Claude가 하는 일**: 코드 파일 생성·수정, 백로그 작업 구현, 테스트 작성, 변경 요약 보고, git 커밋.
- **사용자가 직접 하는 일(터미널)**: 최초 `npm install`, GitHub 원격 연결, `git push`, 스토어 릴리즈 승인.
  - 대용량 의존성 설치/푸시 등 네트워크 작업은 사용자 터미널이 더 빠르고 안정적이다.

## 최초 1회 설정 (사용자 터미널에서)

```bash
cd ~/Projects/BeArrow

# 1) 의존성 설치 (최초 1회, 수 분 소요)
npm install

# 2) 동작 확인
npm run typecheck && npm run lint && npm test

# 3) GitHub 원격 연결 (저장소는 미리 생성)
git remote add origin https://github.com/<계정>/bearrow.git
git push -u origin main
```

## CI/CD 활성화 (GitHub에서)

`README.md` 의 "최초 설정" 참고. 요약:

1. `eas login && eas init` → `EAS_PROJECT_ID` 발급.
2. GitHub repo → Settings → Secrets: `EXPO_TOKEN` 등록(필요 시 `EAS_PROJECT_ID`).
3. Settings → Environments → `production` 생성 + 승인자 지정(릴리즈 게이트).
4. `eas.json` 의 `submit.production` 에 스토어 자격증명 입력.

## 이후 개발 (Claude에게 프롬프트)

- "다음 작업 진행해" → `docs/BACKLOG.md` 최상단 미완료 작업을 구현.
- "1.2 월 뷰 진행해" → 특정 작업 지정.
- Claude는 작업마다 typecheck·lint·test 를 돌려 green 을 확인한 뒤 커밋한다.
  (`node_modules` 가 설치돼 있어야 검증이 동작하므로 위 1회 설치가 선행되어야 함.)

## 참고

- `node_modules`, `.env`, 자격증명은 `.gitignore` 처리되어 커밋되지 않는다.
- 운영 규칙·아키텍처는 `CLAUDE.md`, 작업 목록은 `docs/BACKLOG.md`, 코딩 규칙은 `docs/CONVENTIONS.md`.
