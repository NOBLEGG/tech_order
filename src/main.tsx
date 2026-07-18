// vite-plugin-pwa에서 서포트하는 virtual 모듈. Vite 프로젝트에서 PWA 쓸 때 가장 많이 쓰는 방법.
import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registering the Service Worker.
registerSW({
	immediate: true,
	onRegisteredSW(_url, registration) {
		if (!registration) return;
		// Cloudflare Pages에서 deployment 끝나면 바로 반영될 수 있게, 서비스 워커 업데이트가 있는지 체크하는 로직을 만들어 둔다.
		setInterval(() => {
			registration.update();
		}, 60 * 1000);
	},
	onNeedRefresh() { // 서비스 워커 버전이 바뀐 걸 알게 됐을 때의 콜백 함수.
		window.location.reload();
	},
});

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
