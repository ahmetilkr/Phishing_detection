import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* ---------------------------------------------------------------
   Service Worker Kaydı
   Yalnızca HTTPS veya localhost ortamında çalışır.
   Vite dev sunucusu da localhost olduğu için geliştirme sırasında
   aktif olur; production build'de de otomatik çalışır.
--------------------------------------------------------------- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.log('[SW] Kayıt başarılı. Kapsam:', registration.scope)
            })
            .catch((err) => {
                console.warn('[SW] Kayıt başarısız:', err)
            })
    })
}

