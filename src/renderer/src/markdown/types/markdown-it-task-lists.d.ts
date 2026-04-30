// Type declaration for markdown-it-task-lists (no @types package available)
// typescript-eslint가 declare module의 타입을 올바르게 추론하지 못하는 이슈로
// adapter.ts에서 PluginWithOptions<T>로 직접 캐스팅하여 사용.
// 이 파일은 "could not find declaration file" 에러 억제 목적.
declare module 'markdown-it-task-lists';
