# 개발 가이드 — 사이클 구조

## 사이클 기반 개발 방법론

md_dolphin 프로젝트는 작은 사이클 단위로 기능을 점진적으로 추가합니다.
각 사이클은 독립적으로 동작 가능한 완결 상태를 목표로 합니다.

### 완료된 사이클

#### 사이클 1 — 부트스트랩

Electron + TypeScript + React + Vite 환경을 초기 설정했습니다.
electron-vite를 사용하여 주 프로세스, preload, 렌더러의 빌드 파이프라인을 통합했습니다.

- `pnpm dev`: 개발 서버 실행
- `pnpm build`: 프로덕션 빌드
- `pnpm test`: Vitest 테스트 실행

#### 사이클 2 — 마크다운 렌더러

remark 파이프라인을 구현하고 TDD 방식으로 개발했습니다.
markdown-it을 사용하여 안정적인 파싱 파이프라인을 구축했습니다.

```typescript
// 마크다운 파싱 예시
import { parseMarkdown } from './markdown/adapter';

const doc = parseMarkdown('# 제목\n\n본문입니다.', '/경로/문서.md');
console.log(doc.rawText); // 원본 텍스트
```

#### 사이클 3 — 파일 열기와 윈도우 관리

- macOS의 Finder 더블클릭, drag & drop 파일 열기 지원
- 다중 윈도우 관리를 위한 `DocumentWindowManager` 구현
- 보안을 위한 path guard 검증 (baseDir 경계 밖 접근 차단)

#### 사이클 4 — 타이포그래피 & 테마 시스템

현재 사이클입니다. 시스템 테마 연동과 한글 최적화 타이포그래피를 완성합니다.

### 예정된 사이클

- **사이클 5**: GFM (표, 취소선, 체크리스트)
- **사이클 7**: 이미지 렌더링
- **사이클 8**: TOC 사이드바
- **사이클 9**: 대용량 문서 가상화

## 코드 컨벤션

### 파일 구조

```
src/
  main/           — Electron 주 프로세스
  preload/        — contextBridge 표면
  renderer/       — React 앱
  shared/         — 공유 타입·유틸
tests/
  main/           — 주 프로세스 테스트
  renderer/       — 렌더러 테스트
  markdown/       — 마크다운 파싱 테스트
  fixtures/       — 테스트용 마크다운 파일
```

### 테스트 우선 개발

> TDD 사이클: 레드(실패 테스트) → 그린(최소 구현) → 리팩터(정리)

각 사이클의 핵심 기능은 반드시 TDD 방식으로 개발합니다.
테스트가 없는 코드는 리뷰에서 반려됩니다.

### 임포트 규칙

공유 타입은 항상 `@shared/` 경로로 임포트합니다:

```typescript
import type { RenderingTheme } from '@shared/theme-types';
import { API_GET_THEME } from '@shared/ipc-channels';
```
