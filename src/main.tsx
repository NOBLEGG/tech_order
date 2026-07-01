import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // Cloudflare Pages 배포 직후 반영되도록 주기적으로 새 서비스워커 유무 확인
    setInterval(() => {
      registration.update()
    }, 60 * 1000)
  },
  onNeedRefresh() {
    // registerType: 'autoUpdate' + skipWaiting/clientsClaim 조합이므로
    // 새 버전이 감지되면 바로 갱신 후 새로고침
    window.location.reload()
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
