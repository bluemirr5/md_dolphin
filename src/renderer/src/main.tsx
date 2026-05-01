import { StrictMode } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import './styles/global.css';
import './styles/sidebar.css';
import { initI18n } from './i18n/index';
import { initZoomBridge } from './zoom-bridge';
import { initAxe } from './a11y/axe';

async function bootstrap(): Promise<void> {
  // i18next 초기화 — App mount 전에 완료 (useSuspense: false이므로 비동기 안전)
  const i18n = await initI18n();

  const root = document.getElementById('root');
  if (!root) throw new Error('root element not found');

  ReactDOM.createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </StrictMode>,
  );

  // 줌 브릿지 초기화 — CSS --font-scale 단일 진입점 (P10-4)
  initZoomBridge();

  // axe-core dev only (production에서는 initAxe 내부에서 조기 반환)
  void initAxe(React, ReactDOM);
}

void bootstrap();
