// IPC 채널명 상수 — preload·ipc-handlers 양쪽에서 동일 상수 import
// 문자열 오타 방지, 향후 채널 화이트리스트 감사 용이 (설계 제약)
// prefix: 'api:' 통일

/** renderer → main: 파일 열기 다이얼로그 */
export const API_OPEN_FILE = 'api:openFile' as const;

/** renderer → main: 파일 읽기 (baseDir 검증 포함) */
export const API_READ_FILE = 'api:readFile' as const;

/** renderer → main: 사용자가 명시 선택한 경로를 열기 (baseDir 검증 우회, baseDir 갱신) */
export const API_OPEN_FILE_PATH = 'api:openFilePath' as const;

/** renderer → main: 외부 URL 열기 */
export const API_OPEN_EXTERNAL = 'api:openExternal' as const;

/** main → renderer: 파일이 열렸음을 알림 (open-file-handler flush) */
export const API_DOCUMENT_OPENED = 'api:documentOpened' as const;

/** renderer → main: 현재 테마 조회 (invoke) */
export const API_GET_THEME = 'api:getTheme' as const;

/** main → renderer: 테마 변경 push (on) — nativeTheme.updated 이벤트 기반 */
export const API_THEME_UPDATED = 'api:themeUpdated' as const;

/** renderer → main: 현재 윈도우 id 동기 조회 (sendSync) — P7-10 windowId 주입 */
export const API_GET_WINDOW_ID = 'api:getWindowId' as const;

// ── 사이클 9 신규 채널 ────────────────────────────────────────────────────────

/** renderer → main: 콜드 스타트 시간 조회 (dev only) */
export const API_BENCH_COLD_START = 'bench:cold-start' as const;

/** renderer → main: 줌 인 */
export const API_VIEW_ZOOM_IN = 'view:zoom-in' as const;

/** renderer → main: 줌 아웃 */
export const API_VIEW_ZOOM_OUT = 'view:zoom-out' as const;

/** renderer → main: 줌 리셋 */
export const API_VIEW_ZOOM_RESET = 'view:zoom-reset' as const;

/** renderer → main: 시스템 인쇄 다이얼로그 표시 */
export const API_VIEW_PRINT = 'view:print' as const;

/** renderer → main: PDF 저장 다이얼로그 표시 → 파일 저장 */
export const API_VIEW_SAVE_PDF = 'view:save-pdf' as const;

/** main → renderer: 사이드바 토글 */
export const API_VIEW_TOGGLE_SIDEBAR = 'view:toggle-sidebar' as const;

/** main → renderer: 문서 영역 포커스 */
export const API_VIEW_FOCUS_ARTICLE = 'view:focus-article' as const;

// ── 사이클 10 신규 채널 ────────────────────────────────────────────────────────

/** renderer → main: 파일 stat 사전 확인 (10MB 모달용) */
export const API_FILE_STAT = 'file:stat' as const;

/** renderer → main: 시스템 locale 조회 */
export const API_GET_LOCALE = 'api:getLocale' as const;

/** main → renderer: 줌 레벨 변경 푸시 (--font-scale 갱신용) */
export const API_VIEW_ZOOM_CHANGED = 'view:zoom-changed' as const;

/** main → renderer: 와이드 모드 토글 (본문 max-width 해제) */
export const API_VIEW_TOGGLE_WIDE = 'view:toggle-wide' as const;

// ── 사이클 12 신규 채널 ────────────────────────────────────────────────────────

/** renderer → main: 전체 테마 팩 목록 조회 (invoke) → ThemePack[] */
export const API_THEME_PACK_LIST = 'api:themePackList' as const;

/** renderer → main: 특정 팩 조회 (invoke, id) → ThemePack | null */
export const API_THEME_PACK_GET = 'api:themePackGet' as const;

/** renderer → main: 테마 폴더 열기 (invoke) → void */
export const API_THEME_PACK_REVEAL_FOLDER = 'api:themePackRevealFolder' as const;

/** main → renderer: 팩 목록 변경 push (on) */
export const API_THEME_PACK_LIST_CHANGED = 'api:themePackListChanged' as const;

/** main → renderer: 활성 테마 팩 변경 요청 push (on) — 메뉴 라디오 클릭 시 */
export const API_THEME_PACK_SET_ACTIVE = 'api:themePackSetActive' as const;

/** renderer → main: 활성 팩 id 동기 (on) — 메뉴 라디오 갱신용 */
export const API_THEME_PACK_MENU_SYNC = 'api:themePackMenuSync' as const;

// ── 사이클 14 신규 채널 ────────────────────────────────────────────────────────

/** main → renderer: 업데이트 가능 버전 push (on) */
export const API_UPDATE_AVAILABLE = 'api:updateAvailable' as const;

/** renderer → main: GitHub Releases 페이지 열기 (invoke) */
export const API_UPDATE_OPEN_RELEASES = 'api:updateOpenReleases' as const;

// ── 사이클 16 신규 채널 ────────────────────────────────────────────────────────

/** main → renderer: 탭 닫기 요청 push (on) — ⌘W 가로채기 (D3) */
export const API_VIEW_TAB_CLOSE = 'view:tab-close' as const;

/** main → renderer: 다음 탭으로 전환 push (on) — ⌥⌘→ / ⇧⌘] */
export const API_VIEW_TAB_NEXT = 'view:tab-next' as const;

/** main → renderer: 이전 탭으로 전환 push (on) — ⌥⌘← / ⇧⌘[ */
export const API_VIEW_TAB_PREV = 'view:tab-prev' as const;

/** renderer → main: 윈도우 닫기 invoke (마지막 탭 close 시 renderer가 위임, D3) */
export const API_WINDOW_CLOSE = 'api:windowClose' as const;
