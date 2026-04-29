# 사이클 1 — 프로젝트 부트스트랩

**상태**: Ready for Implementation
**작성일**: 2026-04-29
**관련 마스터 플랜**: `/docs/plans/master-plan.md` (섹션 0, 0.2, 0.3, 4.4, 6.1, 6.2, 6.7)
**TDD 정책**: 사후 테스트 (마스터 플랜 6.1 사이클 1 행)

---

## 0. 결정 반영 (사이클 1 진입 게이트)

마스터 플랜 0.2 진입 게이트 6건의 최종 상태:

| #   | 항목                         | 결정                 | 근거                                                             |
| --- | ---------------------------- | -------------------- | ---------------------------------------------------------------- |
| G1  | Tauri B안 재검토             | **A안 유지**         | 사용자 응답("A안 유지") — Electron 그대로 진행.                  |
| G2  | 렌더러 프레임워크            | **React 18**         | 결정 10. 기본값 자동 통과.                                       |
| G3  | macOS 최소 버전              | **macOS 12**         | 결정 5. 확정.                                                    |
| G4  | 빌드 도구                    | **electron-builder** | 결정 11. 단, 사이클 1에서는 설치만, 실제 dist 통합은 사이클 11a. |
| G5  | 번들 크기 표기               | **솔직 표기**        | 결정 12. 사이클 11b에서 적용.                                    |
| G6  | macOS only + 코드 친화 (A안) | **A안 유지**         | 결정 4 + 0.3. `process.platform === 'darwin'` 분기 격리.         |

**Tauri B안 재검토는 폐기 항목**. 사이클 1 종료 시점에 사용자가 명시 요청할 때에만 재개 (마스터 플랜 0.2 진입 절차 4번).

---

## 1. 개요

사용자가 **Xcode를 한 번도 열지 않고**, 셸에서 `pnpm dev` 한 줄로 빈 BrowserWindow를 띄우는 것이 본 사이클의 목적이다. 모든 후속 사이클(2~11b)이 본 부트스트랩 위에서 동작한다.

본 사이클의 가치는 **"안전한 기반 설정"**에 있다. 빈 윈도우 자체에는 사용자 가치가 없지만, 이 단계에서 굳혀지는 것들은 이후 변경 비용이 매우 크다:

- Electron 보안 기본값 (`contextIsolation`, `sandbox`, `nodeIntegration`, CSP)
- 디렉토리 구조 (main / preload / renderer / shared)
- 빌드 도구 체인 (electron-vite + Vitest + ESLint + tsc)
- TypeScript strict 설정과 모듈 시스템 (ESM)

따라서 사이클 1은 **검증 가능성** ≥ **기능 풍부도**다. `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`가 모두 그린이면 종료 조건 충족.

---

## 2. 범위

### 2.1 포함 (In Scope) — P2-4 분리에 따라 3단

#### A. 필수 (사이클 1 종료 조건 = Definition of Done)

빈 윈도우 + 보안 기본값 + dev 스크립트.

- `package.json` (스크립트: `dev`, `build`, `lint`, `typecheck`, `test`)
- `tsconfig.json` (strict, ES2022, moduleResolution: bundler) + main/preload/renderer 별 tsconfig 분리
- `electron.vite.config.ts` (electron-vite 기반)
- `src/main/index.ts` — `BrowserWindow` 생성, 보안 기본값 적용, preload 로드
- `src/preload/index.ts` — `contextBridge.exposeInMainWorld('api', {})` (빈 객체)
- `src/renderer/index.html` (CSP `<meta>` 포함)
- `src/renderer/src/main.tsx` + `src/renderer/src/App.tsx` (React 진입점)
- `src/shared/types.ts` (도메인 타입을 둘 빈 자리만 마련. 실제 타입은 사이클 2~)
- `.gitignore`, `.editorconfig`
- `pnpm dev`로 빈 윈도우(배경 색상만 적용) 띄우기 검증

#### B. 완비 (사이클 2 시작 시까지 갖춰져 있어야)

테스트 인프라 + lint + 타입 체크.

- Vitest 설정 + 더미 단위 테스트 1개 (`tests/smoke.test.ts`)
- ESLint + Prettier 설정 (`eslint.config.js`, `.prettierrc`) + `pnpm lint` 동작
- `pnpm typecheck` (`tsc --noEmit -p` 각 영역) 동작
- `pnpm build` (electron-vite build) 동작 — production 번들 검증
- CI 골격 (`.github/workflows/ci.yml`) — PR마다 `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### C. 사이클 11a 직전까지 미룰 수 있는 산출물 (본 사이클에서는 미설정)

- `electron-builder.yml` 본격 설정 (mac.target, extendInfo, dmg 옵션 등)
- `pnpm dist` 실제 동작
- DMG 생성 / GitHub Actions release 워크플로

본 사이클에서는 `electron-builder`를 **devDependency로 설치만** 하고, 실제 설정은 비워둔다. `pnpm dist` 스크립트는 정의하지 않음 (placeholder도 없음 — 이후 11a에서 추가).

### 2.2 제외 (Out of Scope) — 명시적 비포함

- **마크다운 파싱·렌더링** (사이클 2)
- **파일 열기 / 드래그앤드롭 / IPC 채널 정의** (사이클 3)
- **테마 / CSS 변수 / 다크모드 추종** (사이클 4)
- **i18next 사용** (사이클 10에서 본격 도입). 본 사이클에서 i18next는 **설치하지 않음** — 마스터 플랜 6.3 산출물에 따라 사이클 10이 인프라 자체를 책임짐.
- **markdown-it / shiki / Zustand / DOMPurify / react-virtuoso 설치** — 본 사이클에서는 설치하지 않음. 마스터 플랜 6.1 사이클 1 행 산출물에 명시되지 않음. 각 사이클에서 필요해질 때 추가.
- **Mermaid / KaTeX** (Phase 2)
- **electron-builder 본격 설정** (사이클 11a)
- **자동 업데이트, 코드 서명, 노타라이즈** (Phase 2)
- **다중 윈도우 / 탭** (Phase 2)
- **Windows / Linux 빌드 타깃** (Phase 1 Non-Goal — 0.3 가이드)

### 2.3 Non-Goals (사이클 1 한정 재확인)

- **번들 크기 최적화** — `compression: maximum`, asar 등은 사이클 11a에서.
- **콜드 스타트 1.5초 검증** — 사이클 9에서 4.7.3 벤치 표준으로 측정. 단, 본 사이클에서 **빈 윈도우 콜드 스타트 베이스라인을 가벼운 한 줄 측정으로 기록**해 사이클 9 회귀 비교용으로 남길 수 있음 (선택, 가정 11.6 참조).
- **번들 크기 베이스라인 측정** — 동일하게 사이클 9/11a로 미룸.

---

## 3. 사용자 시나리오

본 사이클의 "사용자"는 **개발자 자기 자신**이다. 다음 셸 흐름이 막힘 없이 동작하는 것이 시나리오 전부다.

### 3.1 정상 흐름

```bash
git clone <repo>
cd md_dolphin
pnpm install              # 의존성 설치
pnpm dev                  # → Electron 윈도우가 1024x768로 뜸. 흰색/회색 배경. CSP 위반 경고 없음.
# (다른 터미널에서)
pnpm typecheck            # → "0 errors"
pnpm lint                 # → "0 problems"
pnpm test                 # → 더미 테스트 1개 통과
pnpm build                # → out/main, out/preload, out/renderer 산출물 생성, 0 에러
```

### 3.2 대안 흐름

- **Node 버전 미달**: `package.json`의 `engines.node` 위반 시 `pnpm install` 단계에서 경고 출력 (`.npmrc`의 `engine-strict=true`로 강제할지 결정 — 본 사이클에서는 **경고만**, 강제 안 함).
- **포트 충돌**: Vite dev 서버 기본 포트(`5173`) 충돌 시 electron-vite가 자동으로 다음 포트로 fallback. 사용자에게 명시 메시지가 표시되어야 함.
- **macOS 외 OS에서 실행**: `pnpm dev`는 동작하나 window chrome이 다를 수 있음. 본 사이클은 macOS 전용이므로 비검증.

---

## 4. 기능 요구사항

### 4.1 디렉토리 구조 (treeview)

```graph
md_dolphin/
├── .editorconfig
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .prettierrc
├── docs/
│   ├── plans/
│   │   └── master-plan.md          (기존)
│   └── specs/
│       └── cycle-01-bootstrap.md   (본 문서)
├── electron.vite.config.ts
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── src/
│   ├── main/
│   │   ├── index.ts                # Electron main entry
│   │   └── tsconfig.json           # main 전용 tsconfig
│   ├── preload/
│   │   ├── index.ts                # contextBridge
│   │   └── tsconfig.json           # preload 전용 tsconfig
│   ├── renderer/
│   │   ├── index.html              # CSP <meta> 포함
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx            # React entry
│   │   │   └── env.d.ts            # vite/client 타입
│   │   └── tsconfig.json           # renderer 전용 tsconfig (DOM lib)
│   └── shared/
│       ├── types.ts                # 향후 도메인 타입 자리. 사이클 1에서는 export {} 만.
│       └── platform.ts             # process.platform 분기 격리 헬퍼 (P2-9)
├── tests/
│   └── smoke.test.ts               # Vitest 더미
├── tsconfig.json                   # 루트 — 참조만 함 (project references)
├── tsconfig.node.json              # 빌드 도구용 (vite.config 등)
└── vitest.config.ts
```

**디렉토리 결정 근거**:

- `src/main` / `src/preload` / `src/renderer` 분리는 electron-vite 표준 컨벤션을 따른다. 후속 사이클의 보일러플레이트를 줄임.
- `src/shared`는 main/preload/renderer 모두에서 import 가능한 **도메인 타입과 OS 분기 헬퍼**의 자리. 사이클 2부터 `MarkdownDocument`, `Outline` 등이 들어감.
- `src/shared/platform.ts`는 마스터 플랜 0.3 가이드의 "OS-specific 호출 격리"를 위한 자리. 사이클 1에서는 `isMacOS()` 정도만 두고, 사이클 3~9에서 확장.
- `tests/`는 단위/통합 테스트가 들어갈 자리. 사이클 2 부터 본격 활용. 본 사이클에서는 더미 1개만.

### 4.2 의존성 (`package.json`)

#### dependencies (런타임)

본 사이클에서는 React 외에는 **없음**. 마크다운/상태관리 라이브러리는 후속 사이클에서 추가.

```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0"
}
```

#### devDependencies

```json
{
  "electron": "^35.0.0",
  "electron-vite": "^2.3.0",
  "electron-builder": "^24.13.0",

  "@types/node": "^20.12.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",

  "typescript": "^5.4.0",
  "vite": "^5.2.0",
  "@vitejs/plugin-react": "^4.3.0",

  "vitest": "^1.6.0",
  "@vitest/coverage-v8": "^1.6.0",

  "eslint": "^9.0.0",
  "typescript-eslint": "^7.10.0",
  "eslint-plugin-react": "^7.34.0",
  "eslint-plugin-react-hooks": "^4.6.0",
  "@eslint/js": "^9.0.0",
  "globals": "^15.0.0",

  "prettier": "^3.2.0"
}
```

**버전 핀 정책**:

- `^` (caret) 사용. 메이저 버전 고정, 마이너/패치는 자동 갱신.
- `pnpm-lock.yaml`을 git에 커밋하여 재현성 보장.
- Electron만은 메이저 변경 시 보안·동작 회귀가 큼 → 사이클 11a 직전 잠금 정책 재검토 (가정 11.4).
- 위 표는 **2026-04 기준 안정판 minimum**. `pnpm install` 시점의 latest stable로 잠겨도 무방.

#### 설치하지 않는 것 (의도적 제외)

- `markdown-it`, `shiki`, `zustand`, `dompurify`, `react-virtuoso`, `i18next`, `electron-store`, `iconv-lite`
- 이유: 마스터 플랜 6.1 사이클 1 행에 "의존성 통합만 — 사용은 사이클 2부터"로 적혀 있으나, 더 보수적으로 **설치 자체도 사용 시점에 맞추는** 정책으로 한다. 이유:
  1. 사이클 2~7 각각이 자기 의존성을 추가하면 PR diff가 명확해짐.
  2. 본 사이클의 lockfile이 가벼워져 설치 속도·CI 시간이 빨라짐.
  3. 라이브러리 메이저 변경이 일어나도 사이클 1 시점의 잠금이 부담되지 않음.
- 단, **사용자가 사이클 2 시작 시 의존성을 한꺼번에 추가하기를 원하면 본 spec에 후속 노트 추가**. (가정 11.5)

### 4.3 패키지 매니저 / Node 버전 / Electron 버전

| 항목          | 결정            | 근거                                                                                                    |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| 패키지 매니저 | **pnpm 9+**     | 마스터 플랜 4.7. 디스크/속도 효율, monorepo 확장 가능.                                                  |
| Node 버전     | **20 LTS**      | 마스터 플랜 4.7. Electron 35 번들 Node와 호환.                                                          |
| Electron 버전 | **35.x stable** | 마스터 플랜 4.7. macOS 12 Monterey 이상 지원 (안정 마진 포함).                                          |
| TypeScript    | **5.4+**        | 마스터 플랜 4.7. strict mode 의무.                                                                      |
| Vite          | **5.2+**        | electron-vite 2.x가 Vite 5에 정렬.                                                                      |
| React         | **18.3+**       | 마스터 플랜 결정 10. 19로 점프하지 않음 (안정성 마진).                                                  |
| 모듈 시스템   | **ESM 우선**    | `package.json`의 `"type": "module"`. main/preload만 electron-vite가 자동으로 CJS로 변환(Electron 제약). |

**`package.json`의 `engines`**:

```json
{
  "engines": {
    "node": ">=20.10.0",
    "pnpm": ">=9.0.0"
  }
}
```

`.npmrc`에 `engine-strict=false` (경고만, 강제 차단 안 함). 사용자가 명시 변경 시 `true`.

### 4.4 `package.json` 스크립트 골격

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "pnpm typecheck && electron-vite build",
    "typecheck": "tsc --noEmit -p src/main/tsconfig.json && tsc --noEmit -p src/preload/tsconfig.json && tsc --noEmit -p src/renderer/tsconfig.json",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**의도**:

- `dev` — HMR 포함 dev 모드. main/preload는 변경 시 Electron 재시작, renderer는 HMR.
- `build` — typecheck를 선행 게이트로 두어 타입 에러가 있는 production 번들 금지.
- `typecheck` — 세 영역(main, preload, renderer)을 각자 tsconfig로 검증.
- `dist` 미정의 — 사이클 11a에서 추가.
- `prepare` 또는 `husky`는 본 사이클에서 도입하지 않음 (가정 11.7).

### 4.5 `electron.vite.config.ts` 골격

```typescript
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
      },
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: { index: resolve(__dirname, "src/preload/index.ts") },
      },
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: { index: resolve(__dirname, "src/renderer/index.html") },
      },
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  },
});
```

### 4.6 `src/main/index.ts` 골격 — 보안 기본값 의무

```typescript
import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { isMacOS } from "@shared/platform";

const isDev = !app.isPackaged;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    show: false, // 초기 흰 깜빡임 방지: 'ready-to-show'에서 표시
    backgroundColor: "#FAFAF7", // 라이트 배경 사전 적용 (4.4.1 흰화면 깜빡임 완화)
    titleBarStyle: "default", // 사이클 4 또는 추후 'hiddenInset' 검토
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true, // [SEC] 의무
      nodeIntegration: false, // [SEC] 의무
      sandbox: true, // [SEC] 의무
      webSecurity: true, // [SEC] 의무
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  window.once("ready-to-show", () => window.show());

  // 외부 링크는 시스템 기본 브라우저로
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // 앱 내 navigation 차단 (file:// 또는 dev 서버 외)
  window.webContents.on("will-navigate", (event, url) => {
    const allowed =
      url.startsWith("http://localhost:") || url.startsWith("file://");
    if (!allowed) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // ELECTRON_RENDERER_URL은 electron-vite가 dev 모드에 자동 주입. 미주입 시 file:// fallback (prod 경로).
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    void window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // macOS 표준 동작: dock 유지, 사용자가 명시 종료할 때만 quit.
  if (!isMacOS()) {
    app.quit();
  }
});
```

**보안 기본값 체크리스트** (사이클 1 종료 조건):

- [x] `contextIsolation: true`
- [x] `nodeIntegration: false`
- [x] `sandbox: true`
- [x] `webSecurity: true`
- [x] `allowRunningInsecureContent: false`
- [x] `experimentalFeatures: false`
- [x] `setWindowOpenHandler`로 새 창 deny
- [x] `will-navigate`로 외부 URL 시스템 브라우저로 위임

### 4.7 `src/preload/index.ts` 골격

```typescript
import { contextBridge } from "electron";

// 사이클 1: 빈 표면. 사이클 3에서 openFile/readFile 등 추가.
const api = {
  // 후속 사이클에서 채움
} as const;

try {
  contextBridge.exposeInMainWorld("api", api);
} catch (error) {
  // contextIsolation이 false인 경우 fallback. 사이클 1 정책상 절대 도달하면 안 됨.
  console.error("[preload] contextBridge 노출 실패:", error);
}

export type Api = typeof api;
```

**보안 영향**:

- `contextBridge.exposeInMainWorld('api', {})` — 빈 객체이지만, 향후 `api.openFile`, `api.readFile`, `api.watchTheme` 등이 추가될 자리. preload 외 어디서도 `window.api`에 직접 추가하지 않음 (lint 룰로 강제는 사이클 3에서 결정).
- `Api` 타입을 export하여 renderer 측이 `declare global { interface Window { api: Api } }` 패턴으로 타입 안전 사용 가능 (사이클 3 산출물에 연동).

### 4.8 `src/renderer/index.html` 골격 — CSP `<meta>` 의무

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'"
    />
    <title>md_dolphin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**CSP 결정 근거**:

- 마스터 플랜 4.4.1 옵션 (A) 채택: `style-src 'self' 'unsafe-inline'`. shiki 인라인 style을 사이클 6에서 허용해야 하므로 사이클 1에서 미리 박아둠.
- `mddolphin-asset:` source는 사이클 7에서 추가 (custom protocol 등록 시점).
- `connect-src` 미정 — 본 사이클은 외부 통신 없음. 사이클 6/7에서 외부 이미지 도입 시 추가.
- `frame-ancestors`는 `<meta http-equiv>`로는 무효(W3C CSP3 §3.2 — 응답 헤더에서만 적용). 따라서 `<meta>`에 포함시키지 않고, 사이클 7의 `onHeadersReceived` 이중방어 항목으로 의무를 인계.
- `<meta>` 적용은 1차 방어. **`session.defaultSession.webRequest.onHeadersReceived` 이중방어는 사이클 7에서 추가** (custom protocol 도입과 함께). 사이클 1에서는 `<meta>`만으로 충분 (외부 origin 응답이 없음).

### 4.9 `src/renderer/src/main.tsx` + `App.tsx` 골격

```tsx
// src/renderer/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```tsx
// src/renderer/src/App.tsx
function App(): JSX.Element {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily:
          '-apple-system, "SF Pro Text", system-ui, "Apple SD Gothic Neo", sans-serif',
        color: "#1C1C1E",
        background: "#FAFAF7",
      }}
    >
      <p>md_dolphin — bootstrap ready</p>
    </main>
  );
}

export default App;
```

**의도**: 사이클 1 종료 시 `pnpm dev` 실행 결과로 빈 윈도우 가운데에 "md_dolphin — bootstrap ready"가 표시. 사이클 2부터 이 자리가 `MarkdownRenderer`로 대체된다.

### 4.10 `src/shared/platform.ts` (P2-9 격리 헬퍼 자리)

```typescript
// process.platform 분기를 한 곳에 격리하기 위한 헬퍼. 마스터 플랜 0.3 가이드.
// 사이클 1에서는 isMacOS만. 사이클 3~9에서 필요 시 확장.

export function isMacOS(): boolean {
  return process.platform === "darwin";
}
```

**원칙**: **`process.platform` 직접 호출은 본 파일 외에서 금지** (린트 룰로 강제는 사이클 3 또는 별도 결정 — 본 사이클에서는 컨벤션으로만).

### 4.11 `tsconfig.json` (루트, project references)

```json
{
  "compilerOptions": {
    "composite": false,
    "skipLibCheck": true
  },
  "files": [],
  "references": [
    { "path": "src/main/tsconfig.json" },
    { "path": "src/preload/tsconfig.json" },
    { "path": "src/renderer/tsconfig.json" },
    { "path": "tsconfig.node.json" }
  ]
}
```

#### 4.11.1 `src/main/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "../..",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["./**/*.ts", "../shared/**/*.ts"]
}
```

#### 4.11.2 `src/preload/tsconfig.json`

main과 동일하되 `lib: ["ES2022", "DOM"]` 추가 (preload는 일부 DOM 타입 필요).

#### 4.11.3 `src/renderer/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "../..",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["./src/**/*.ts", "./src/**/*.tsx", "../shared/**/*.ts"]
}
```

**TypeScript strict 옵션 결정 근거**:

- `strict: true` — 마스터 플랜 4.7 의무.
- `noUncheckedIndexedAccess: true` — 배열·객체 접근 시 `undefined` 가능성을 명시. 도메인 모델 안전성 확보 (사이클 2 `Heading[]` 등에 직접 영향).
- `exactOptionalPropertyTypes: true` — `optional?: string`과 `string | undefined`를 구분. 도메인 인터페이스 명확성.
- `noImplicitOverride: true` — class 상속 사용 시 `override` 키워드 강제 (방어적).

### 4.12 ESLint 9 + Prettier 골격

```javascript
// eslint.config.js (flat config)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["out/**", "dist/**", "node_modules/**", "**/*.config.{js,ts}"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: [
          "./src/main/tsconfig.json",
          "./src/preload/tsconfig.json",
          "./src/renderer/tsconfig.json",
          "./tsconfig.node.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: { react: { version: "detect" } },
  },
];
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**룰 결정 근거**:

- `no-floating-promises`, `no-misused-promises` — Electron main의 `void window.loadURL(...)` 패턴을 강제. 누락 시 미처리 promise 경고가 production에서도 노출됨.
- `consistent-type-imports` — `import type { ... }` 강제. ESM 트리쉐이킹과 가독성.
- `react-in-jsx-scope: off` — React 17+ 자동 import.

### 4.13 Vitest 더미 테스트

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "html"], provider: "v8" },
  },
  resolve: {
    alias: { "@shared": resolve(__dirname, "src/shared") },
  },
});
```

```typescript
// tests/smoke.test.ts
import { describe, it, expect } from "vitest";
import { isMacOS } from "@shared/platform";

describe("platform helper", () => {
  it("isMacOS returns boolean", () => {
    expect(typeof isMacOS()).toBe("boolean");
  });
});
```

**의도**: Vitest 인프라가 동작함을 보장. 본 테스트는 사이클 2에서 본격 도메인 모델 테스트로 대체될 자리.

### 4.14 `.gitignore` / `.editorconfig` / CI

```gitignore
# .gitignore
node_modules/
out/
dist/
release/
*.log
.DS_Store
.vscode/
.idea/
coverage/
```

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

**runner 선택**: `macos-14`. 마스터 플랜 6.4 (사이클 11a)와 일치. arm64 네이티브 빌드 검증 의도. 사이클 1 단계에서는 `ubuntu-latest`로도 충분하나 일관성을 위해 macos-14.

---

## 5. 데이터 모델 변경

**해당 없음**. 본 사이클은 도메인 모델을 정의하지 않는다.

`src/shared/types.ts`는 **빈 export 자리**만 마련:

```typescript
// 사이클 2부터 MarkdownDocument, Outline, Heading 등이 추가됨.
// 본 사이클에서는 빈 모듈로 시작하여 import 그래프만 그려둔다.
export {};
```

---

## 6. API 계약

**해당 없음**. 본 사이클은 IPC 채널을 정의하지 않는다.

`window.api`는 빈 객체로 노출. 사이클 3에서 `openFile`, `readFile` 등이 추가됨.

---

## 7. 엣지 케이스 및 에러 처리

| 상황                                                 | 시스템 동작                                                                                        | 사용자 메시지 / 개발자 노출                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm install` 실패 (네트워크)                       | pnpm 표준 에러 메시지 그대로 노출                                                                  | 별도 핸들링 없음 — 표준 도구 메시지 신뢰                                         |
| Vite dev 서버 포트(`5173`) 충돌                      | Vite가 자동으로 다음 포트로 fallback. `ELECTRON_RENDERER_URL` 환경변수도 갱신.                     | 콘솔 출력으로 새 포트 표시. 별도 UI 처리 없음.                                   |
| `preload` 빌드 산출물 누락                           | main 프로세스 시작 시 preload 경로 존재 여부 확인 — 누락 시 콘솔 에러 후 종료                      | 개발자가 `pnpm build`/`pnpm dev` 재실행                                          |
| `contextBridge` 노출 실패                            | preload의 try/catch에서 `console.error` 후 silent. **renderer는 `window.api === undefined` 상태**. | 사이클 1은 `api`가 비어 있으므로 사용자 영향 없음. 사이클 3+에서 의미 있는 처리. |
| `BrowserWindow.loadURL` 실패                         | Electron 표준 — 빈 페이지 또는 ERR_FILE_NOT_FOUND. dev 모드에서는 자주 마주칠 수 있음.             | 콘솔 메시지로 충분. 사용자 노출 UI는 사이클 10.                                  |
| `app.on('window-all-closed')` 종료 트리거 (macOS 외) | `app.quit()`. macOS는 dock에 잔존.                                                                 | 표준 동작.                                                                       |
| Node 버전 미달 (< 20.10)                             | `pnpm install` 시 경고 (engine-strict=false)                                                       | 사용자가 nvm/asdf로 전환 권장. README에 명시 (사이클 11b).                       |
| TypeScript 타입 에러                                 | `pnpm typecheck` / `pnpm build` 단계에서 차단                                                      | tsc 표준 에러                                                                    |
| ESLint 룰 위반                                       | `pnpm lint` 단계에서 차단                                                                          | eslint 표준 에러                                                                 |

**사이클 1 한정 미구현**:

- 사용자 친화 에러 UI (사이클 10)
- crash reporter / `app.on('render-process-gone')` 핸들링 (사이클 9 또는 10)
- 큰 파일 / 손상된 파일 / 권한 오류 (사이클 3·10)

---

## 8. 수락 기준 (Acceptance Criteria)

테스트 가능한 Given/When/Then 형식. test-writer가 이 절을 직접 검증한다.

### 8.1 필수 (사이클 1 종료 조건)

- **AC1**: Given 깨끗한 macOS 12+ 환경, When `pnpm install`, Then exit code 0이며 `node_modules/`와 `pnpm-lock.yaml` 생성.
- **AC2**: Given 의존성 설치 완료, When `pnpm dev` 실행, Then 5초 이내 BrowserWindow가 1024x768 크기로 생성되고 "md_dolphin — bootstrap ready" 텍스트가 가운데에 표시. 흰 화면 깜빡임이 200ms 이상 발생하지 않음 (`backgroundColor` 효과 검증).
- **AC3**: Given dev 서버 실행 중, When DevTools를 열어 `window.api` 평가, Then `Object`이며 자체 enumerable 속성은 0개.
- **AC4**: Given dev 서버 실행 중, When DevTools Console을 확인, Then CSP 위반 경고가 0건.
- **AC5**: Given dev 서버 실행 중, When DevTools Console에서 `process` 평가, Then `ReferenceError` (renderer에서 Node 글로벌 미노출 검증 — sandbox + nodeIntegration 검증).
- **AC6**: Given main 프로세스 코드, When `BrowserWindow` 생성 옵션을 검사, Then `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`가 모두 설정됨.
- **AC7**: Given 외부 링크가 포함된 페이지에서 `target="_blank"` 클릭 시뮬레이션, When 링크 열기, Then 앱 내부에서 새 BrowserWindow가 생성되지 않고 `shell.openExternal`이 호출됨 (`setWindowOpenHandler` 검증). **본 AC는 사이클 1에서는 단위 테스트로만 검증 가능 (실제 외부 링크는 없음). 사이클 2/3에서 통합 검증 가능.**

### 8.2 완비 (사이클 2 시작 시까지)

- **AC8**: Given 프로젝트 루트, When `pnpm typecheck`, Then exit code 0이며 "0 errors".
- **AC9**: Given 프로젝트 루트, When `pnpm lint`, Then exit code 0이며 "0 problems".
- **AC10**: Given 프로젝트 루트, When `pnpm test`, Then `tests/smoke.test.ts`가 통과 (1개 테스트).
- **AC11**: Given 프로젝트 루트, When `pnpm build`, Then exit code 0이며 `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html`이 모두 생성.
- **AC12**: Given GitHub Actions 환경, When PR 또는 main 브랜치 push 트리거, Then `lint`/`typecheck`/`test`/`build` 4개 단계가 모두 그린 (CI 워크플로 자체 검증).
- **AC12.5**: Given `pnpm install` 완료, When `pnpm list electron-builder`를 실행, Then `electron-builder@24.x.x`가 출력된다(설정 파일은 비어 있어도 무관). (P3-3)

### 8.3 보안 검증 (사이클 1 핵심)

- **AC13**: Given main 프로세스 소스, When `webPreferences` 객체를 정적 분석, Then `nodeIntegration: true` 또는 `contextIsolation: false`가 **단 한 곳도 없음** (grep 또는 lint).
- **AC14**: Given `index.html`, When CSP `<meta>` 검사, Then `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`가 모두 포함. (P3-1: `frame-ancestors 'none'`은 `<meta>`에서 무효이므로 본 AC에서 제외 — 사이클 7 응답 헤더로 인계.)
- **AC15**: Given preload 소스, When `contextBridge.exposeInMainWorld` 호출 검사, Then `'api'` 단일 키로 노출되며 다른 키 노출 없음.

### 8.4 미검증 (의도적, 후속 사이클에서 검증)

- 콜드 스타트 시간 측정 (사이클 9, 4.7.3 표준)
- 메모리 사용량 (사이클 9)
- 번들 크기 (사이클 11a)
- 1만 줄 fixture 회귀 (사이클 5/6/7 — 본 사이클에 fixture 없음)
- DMG 생성 (사이클 11a)

---

## 9. 구현 가이드

### 9.1 영향받는 파일/모듈 (모두 신규)

기존 코드베이스가 비어 있으므로 **모든 파일이 신규 생성**. 4.1 디렉토리 트리 참조.

### 9.2 재사용 가능한 것들

**없음**. 본 사이클이 모든 기반을 0에서부터 마련. 후속 사이클에서 본 spec의 다음 산출물이 재사용 포인트가 됨:

- `src/shared/platform.ts` — OS 분기 격리 헬퍼 (사이클 3+에서 확장)
- `src/shared/types.ts` — 도메인 타입 진입점 (사이클 2에서 채움)
- `src/preload/index.ts`의 `Api` 타입 — 사이클 3에서 IPC API 확장 시 `declare global` 패턴 활용
- `electron.vite.config.ts`의 `@shared` 별칭 — 사이클 2+에서 import 단축
- ESLint/Prettier 룰셋 — 모든 후속 사이클에서 유지

### 9.3 주의사항

1. **electron-vite는 main/preload 빌드를 자동 CJS 변환**. 이는 Electron의 main/preload가 ESM을 완전 지원하지 않기 때문. renderer는 ESM 그대로.
2. **`__dirname` 사용 가능** — electron-vite가 main/preload 빌드 시 CJS로 변환하므로 `__dirname`이 정상 동작. 만약 ESM main으로 전환 시(미래) `import.meta.url` 패턴으로 변경 필요.
3. **preload의 `__dirname`은 `out/preload/`를 가리킴** — main에서 `join(__dirname, '../preload/index.js')`처럼 상대 경로 계산.
4. **sandbox + preload 제약** — `sandbox: true`이면 preload에서 사용 가능한 Node 모듈이 제한됨 (`electron`만 안전). 본 사이클은 `contextBridge`만 쓰므로 영향 없음. 사이클 3에서 `fs` 등이 필요해지면 main으로 IPC 위임 (renderer가 직접 fs 접근하면 안 됨 — 보안 원칙).
5. **`exactOptionalPropertyTypes: true`로 인한 React props 패턴** — `<Component prop={undefined} />`이 거부될 수 있음. 사이클 2부터 props 타입에 `prop?: T` 대신 `prop: T | undefined`를 명시할지 결정 필요 (본 사이클에서는 단순 컴포넌트라 비충돌).
6. **flat ESLint config (eslint 9)** — `.eslintrc.json` 폐기. `eslint.config.js`만 사용.
7. **build 도구를 electron-vite에서 다른 도구(vite-plugin-electron 등)로 교체할 경우, main의 dev URL 분기와 4.5 config를 전면 재검증할 것.** (P3-2)
8. **사이클 11a 진입 시 electron-builder가 이미 설치되어 있어야 함** — 사이클 1에서 devDependency 등록만 완료, 설정 파일은 사이클 11a에서 작성. (P3-3)

### 9.4 트랜잭션 / 동시성

해당 없음 — 본 사이클은 상태 변경 없음.

### 9.5 Rate limit

해당 없음.

---

## 10. 보안·성능·접근성·i18n·macOS 분기·로컬 자산 (사이클 spec 의무 항목, 6.7)

### 10.1 보안 영향 (Electron 핵심 — 본 사이클의 진짜 산출물)

- **`contextIsolation: true`** — renderer에서 main의 Node 컨텍스트 직접 접근 차단. **의무, 변경 금지**.
- **`nodeIntegration: false`** — renderer가 `require()` / `process` 호출 불가. **의무, 변경 금지**.
- **`sandbox: true`** — renderer 프로세스 OS 샌드박스. **의무**. preload의 사용 가능한 API가 제한되지만 본 프로젝트 IPC 표면에는 충분.
- **`webSecurity: true`** — same-origin 정책 활성. **의무**. 사이클 7의 `mddolphin-asset://` custom protocol은 별도 등록으로 우회.
- **CSP `<meta>`** — 1차 방어. 4.4.1 옵션 (A) 채택. shiki/DOMPurify는 사이클 6/7에서.
- **외부 링크 위임** — `setWindowOpenHandler` + `will-navigate`로 시스템 브라우저 위임. 앱 내부 webview navigation 차단.
- **이중방어 (`onHeadersReceived` CSP 헤더)는 사이클 7로 미룸** — 본 사이클은 외부 origin 응답이 없으므로 `<meta>`로 충분. **단, custom protocol을 도입하는 사이클 7 spec에 의무 흡수**.
- **IPC 표면 좁기** — `window.api` 빈 객체. 사이클 3에서 단일 함수씩 명시 추가하며 spec/리뷰 필수.

**위협 모델 (사이클 1 한정)**:

- 본 사이클은 사용자 입력을 받지 않음. 빈 윈도우에 렌더되는 텍스트는 정적 React 컴포넌트.
- 외부 네트워크 요청 없음 (CSP `default-src 'self'` 충족).
- 따라서 **잠재 위협은 0에 가까우나, 후속 사이클의 보안 기반이 본 사이클에서 정해짐**. 잘못 설정한 채로 사이클 2+가 진행되면 회수 비용이 큼.

### 10.2 성능 회귀 영향

- **1만 줄 fixture 회귀 게이트는 사이클 5/6/7에서 시작**. 사이클 1은 마스터 플랜 6.7에 따라 "해당 없음" 가능.
- **선택**: 빈 윈도우 콜드 스타트 베이스라인을 한 번 측정해 사이클 9 회귀 비교용으로 기록 (가정 11.6). 측정 방법: `app.whenReady()` 시점 `performance.now()`와 `did-finish-load` 시점 차이를 콘솔 출력. 사이클 9 표준화 이전이라 정식 합격 판정 없음.

### 10.3 접근성

- **거의 해당 없음** — 빈 윈도우. 단:
  - **앱 이름**이 macOS 메뉴바 / Cmd+Tab / VoiceOver에서 노출됨. `package.json`의 `productName`을 `md_dolphin`으로 명시 (App Menu에 표시되는 이름).
  - **`<html lang="ko">`** — 기본을 한국어로 명시. 사용자 시스템 로케일에 따라 사이클 10에서 동적 변경.
  - **컬러 대비** — `#1C1C1E` on `#FAFAF7` = 약 14:1, WCAG AAA. 충족.
- **사이클 10에서 본격 도입**: ARIA 라벨, 키보드 네비게이션, `prefers-reduced-motion` 등.

### 10.4 i18n 영향

- **사이클 1에서는 i18next 미설치**. 마스터 플랜 6.3에 따라 사이클 10이 인프라 자체를 책임짐.
- 본 사이클의 사용자 노출 문자열은 **"md_dolphin — bootstrap ready"** 단 하나. 영문이지만 부트스트랩 표시 텍스트라 i18n 대상 아님.
- `<html lang="ko">`는 시스템 로케일과 다를 수 있으나 사이클 10에서 동적 변경. 본 사이클은 한국어 기본.

### 10.5 macOS 분기 정책 영향 (P2-9)

- **`process.platform === 'darwin'` 분기 1건 발생**: `app.on('window-all-closed')`에서 macOS 외 OS는 `app.quit()`. 본 분기는 `src/shared/platform.ts`의 `isMacOS()` 헬퍼로 격리.
- 그 외 OS-specific 호출 없음. `app.dock`, `app.on('open-file')` 등은 **사이클 3에서 처음 사용**되며 그때 `isMacOS()` 분기로 흡수.
- **컨벤션**: `process.platform`을 `src/shared/platform.ts` 외 파일에서 직접 호출 금지. 본 사이클에서는 lint 룰 도입 안 함 (린트 룰 자체 작성 비용 vs 이득 — 사이클 3 의뢰 시 결정).

### 10.6 로컬 자산 접근 정책 영향 (P2-7)

- **해당 없음** — 본 사이클은 로컬 자산을 노출하지 않음. `mddolphin-asset://` custom protocol은 사이클 7에서 도입.
- `webSecurity: true`는 활성화 (file:// 자유 접근 차단). 사이클 7에서 custom protocol로 우회.

---

## 11. 가정 (Assumptions)

본 사이클 작성 중 사용자 확인 없이 합리적 기본값으로 결정한 항목들. 변경 시 spec 갱신.

1. **패키지 매니저는 pnpm 9+** — 마스터 플랜 4.7과 일치. 사용자가 npm/yarn 선호 시 명시 변경.
2. **Node 20 LTS** — Electron 35 호환. 사용자가 Node 22 사용 중이라도 문제없으나 lockfile 일관성을 위해 20 권장.
3. **electron-vite vs vite-plugin-electron** — **electron-vite 채택**. 이유: main/preload/renderer 분리가 명시적이며 표준 디렉토리 컨벤션을 강제. vite-plugin-electron은 더 유연하지만 사이클 1 부트스트랩의 명확성을 우선.
4. **Electron 35.x 메이저 고정, 마이너/패치 자동 갱신** — `pnpm-lock.yaml`로 잠금. 사이클 11a 직전 메이저 갱신 필요 시 별도 spec.
5. **마크다운 등 후속 사이클 의존성은 본 사이클에서 미설치** — 4.2 (#설치하지 않는 것) 참조. 사용자가 "사이클 1에서 일괄 추가" 선호 시 이 가정 수정.
6. **빈 윈도우 콜드 스타트 베이스라인 측정** — **선택 산출물**. 본 사이클 종료 조건에는 포함하지 않음. 사이클 9에서 본격. 하고 싶다면 main에서 `console.log('[bench] cold start ms:', performance.now() - startMark)` 한 줄 추가 가능.
7. **Husky / lint-staged / commit-msg hook 미도입** — 본 사이클은 CI에서 lint/typecheck/test 강제. 사용자가 로컬 hook 선호 시 별도 spec.
8. **앱 아이콘 미설정** — Electron 기본 아이콘. 사이클 4 또는 11a에서 디자인 후 설정.
9. **`productName: md_dolphin`** — `package.json`에 명시. macOS App Menu / Cmd+Q 텍스트에 영향.
10. **CSP `connect-src` 미명시** — `default-src 'self'`로 fallback. 사이클 6/7에서 외부 이미지 / 통신 도입 시 명시 추가.
11. **flat ESLint config (eslint 9)** — `.eslintrc.json` 폐기. typescript-eslint 7.10+ 가 9.x를 지원함.
12. **`engines.node` 경고만, 강제 안 함** (`.npmrc`의 `engine-strict=false`). 강제 시 사용자가 nvm 미사용 환경에서 install 자체가 막힘.

---

## 12. 오픈 이슈 (Open Questions)

본 사이클 진행 중 결정 가능. 구현자가 발견 시 노트 추가.

- [ ] **`titleBarStyle`** — 사이클 1은 `'default'`. 향후 `'hiddenInset'`으로 변경해 macOS 톤을 강화할지 사이클 4 또는 별도 결정.
- [ ] **앱 아이콘 / `package.json.build.icon`** — 미설정. 사이클 11a 또는 디자인 단계에서.
- [ ] **`process.platform` 직접 호출 금지를 lint 룰로 강제할지** — 사이클 3 의뢰 시 결정.
- [ ] **DevTools 자동 열기** — dev 모드에서 `window.webContents.openDevTools()`을 자동 호출할지. 본 사이클은 호출하지 않음 (사용자가 ⌘⌥I로 직접). 사이클 2~3 작업 편의에 따라 조정.

---

## 13. 비구현 사항 (Non-Goals 재확인)

- 마크다운 렌더링·파일 열기·테마·GFM·shiki·이미지·TOC·메뉴·인쇄·가상 스크롤 — **모두 후속 사이클**.
- 코드 서명, 노타라이즈, DMG, GitHub Releases 자동화 — 사이클 11a/11b.
- 자동 업데이트 (electron-updater) — Phase 2.
- 다중 윈도우 / 탭 / 검색 / Mermaid / KaTeX — Phase 2.
- Windows / Linux 빌드 — Phase 1 Non-Goal (코드 친화는 0.3 가이드 적용).

---

## 14. 다음 액션 (구현자 → 후속 사이클로의 인계)

1. **본 spec을 받은 developer는 4.1~4.14를 순서대로 구현** (디렉토리 → package.json → tsconfig → electron.vite.config → main/preload/renderer 순).
2. **AC1~AC15를 모두 그린**으로 만든 뒤 PR. 첫 커밋 메시지에 본 spec 경로 (`docs/specs/cycle-01-bootstrap.md`) 링크 포함 권장.
3. **사이클 2 spec-writer에게 의뢰** — `MarkdownDocument` 도메인 모델 + markdown-it 설치 + 자체 React 렌더러 + 1만 줄 fixture (`tests/fixtures/large-10k.md`) 표준 정착.
   - **사이클 2 spec-writer는 도메인/컴포넌트 인터페이스 정의 시 `exactOptionalPropertyTypes: true`를 전제로 `prop: T | undefined` 와 `prop?: T`를 의식적으로 구분해 선택할 것** (스펙 9.3 #5 참조). 이 결정 변경은 사이클 1 tsconfig 회귀를 유발하므로 회피. (P3-4)
4. **사이클 7 인계** — 사이클 7 spec(custom protocol 도입)에서 `onHeadersReceived`로 `frame-ancestors 'none'` 응답 헤더를 의무 추가할 것 (사이클 1 P3-1). 동일 사이클에서 CSP 이중방어(전체 디렉티브를 응답 헤더로도 적용) 의무 흡수.
5. **본 spec의 Open Question 해소** — 사이클 2 또는 3 spec 작성 중 함께 결정.

---

**spec 종료**.
