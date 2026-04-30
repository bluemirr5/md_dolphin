# md_dolphin — 프로젝트 가이드

## 프로젝트 개요

macOS 마크다운 뷰어. 스택: Electron + TypeScript + React + Vite (electron-vite, pnpm).  
마스터 플랜 인덱스: `docs/plans/README.md` (8개 파일로 분할). 기존 `docs/plans/master-plan.md`는 redirect stub.  
사이클 스펙: `docs/specs/cycle-NN-<name>.md`

## 사이클 스펙 작성 규칙 (spec-writer)

**목표 길이: 150~200줄 이내.** `docs/specs/_template.md` 구조를 따른다.

### 포함할 것

- DoD 체크리스트 — 파일 경로 + 1줄 설명
- TDD 순서 표 — 라운드·대상·핵심 3열 (라운드당 1줄)
- AC 표 — 번호·조건·검증 3열 (AC당 1줄)
- 설계 제약 bullet — non-obvious한 것만, 이유 한 줄 포함
- 신규 의존성 (있을 때만)
- 미룬 것 — "사이클 N: X, Y" 형식 1줄
- Open Questions — 정말 미해결인 것만

### 금지할 것

1. **마스터 플랜 재서술** — 결정·근거는 이미 마스터 플랜에 있음. cross-reference 코드(P2-6 등)만 허용. 코드 위치는 `docs/plans/README.md`의 매핑 표에서 확인 (결정 본문 = `01-decisions.md`, 변경 이력 = `05-changelog.md`, 사이클 표 = `03-cycles.md`)
2. **TDD 라인별 대본** — red: `...` / green: `...` / refactor: `...` 풀어쓰기 금지. 라운드 표 1줄로 대체
3. **Out of Scope 장문** — 사이클 단위 1줄씩 ("사이클 7: DOMPurify, 이미지")
4. **엣지 케이스 표** — 테스트 코드에 있어야 할 내용. 스펙에 불필요
5. **진입 게이트 표** — 선행 조건은 헤더 "선행:" 한 줄로
6. **의무 기재 항목 상세** (접근성/i18n/보안/성능 각 섹션) — 설계 제약 bullet 한 줄로 압축
7. **가정 섹션 세분화** — non-obvious한 가정만 설계 제약에 통합. 별도 섹션 금지
8. **"다음 액션" 섹션** — spec-writer 역할 아님
9. **전체 TypeScript 코드 블록** — 필드명·타입만 인라인 기술 (`{ field: Type, ... }` 형식)
10. **데이터 흐름 다이어그램** — DoD + AC로 충분

## 에이전트 연계 순서

1. **spec-writer** — 사이클 스펙 작성
2. **architect** — 스펙 리뷰 (P{N} 라운드 명명)
3. **developer** — 구현 (TDD 순서대로)
4. **code-reviewer** — 구현 후 리뷰
5. **test-writer** — 사후 테스트 보강 (필요 시)

architect 리뷰 결과는 스펙의 변경 이력 또는 `docs/plans/05-changelog.md` 0.1 표에 P{N}-{i} 형식으로 기록.

## 일반 규칙

- auto 모드: 모호함이 있으면 합리적 기본값으로 자동 진행하고 설계 제약에 명시. 마스터 플랜과 정면 충돌하거나 비가역적 결정만 사용자에게 보고
- 보고는 3~5문장 요약으로 압축
- macOS only. `process.platform === 'darwin'` 분기는 `src/shared/platform.ts` 집중
