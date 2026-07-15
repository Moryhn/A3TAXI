import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Must be BASE_URL-relative (e.g. /A3TAXI/sw.js), not root-absolute — GitHub
        // Pages serves this as a project site under a subpath, and a root path 404s,
        // which silently failed registration and left every push subscribe attempt
        // hanging forever on navigator.serviceWorker.ready.
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    });
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'notification-click' && event.data.url) {
            window.location.hash = event.data.url.replace(/^\/#/, '');
        }
    });
}
