import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import './styles/global.css';
import './styles/sidebar.css';
import { initI18n } from './i18n/index';
import { initAxe } from './a11y/axe';

async function bootstrap(): Promise<void> {
  // i18next 초기화 — App mount 전에 완료 (useSuspense: false이므로 비동기 안전)
  const i18n = await initI18n();

  const root = document.getElementById('root');
  if (!root) throw new Error('root element not found');

  // StrictMode 미적용: react-virtuoso 4.18.6의 double-mount race(`dataset` null)와 충돌.
  // production 빌드에는 영향 없으며, dev에서만 double-render 디버깅 보조 손실.
  ReactDOM.createRoot(root).render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  );

  // 줌 브릿지 초기화는 App.tsx useEffect로 이전 (사이클 11a CR10-6)
  // — App unmount 시 cleanup 자동 호출 보장

  // axe-core dev only (production에서는 initAxe 내부에서 조기 반환)
  void initAxe(React, ReactDOM);
}

void bootstrap();
