import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {TOKEN_KEY} from './lib/apiClient';

// Global fetch interceptor: attach the session token to every same-origin
// `/api` request. Much of the app calls fetch('/api/...') directly instead of
// the apiClient helper, so without this the authenticated admin/lojista
// endpoints would all get a 401. Cross-origin requests are left untouched.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  const isApi = typeof url === 'string' && url.startsWith('/api');

  if (isApi) {
    const token = (() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })();

    if (token) {
      const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
        init = {...init, headers};
      }
    }
  }

  return nativeFetch(input as any, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
