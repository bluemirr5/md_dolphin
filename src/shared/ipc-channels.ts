// IPC 채널명 상수 — preload·ipc-handlers 양쪽에서 동일 상수 import
// 문자열 오타 방지, 향후 채널 화이트리스트 감사 용이 (설계 제약)
// prefix: 'api:' 통일

/** renderer → main: 파일 열기 다이얼로그 */
export const API_OPEN_FILE = 'api:openFile' as const;

/** renderer → main: 파일 읽기 (baseDir 검증 포함) */
export const API_READ_FILE = 'api:readFile' as const;

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
