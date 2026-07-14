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
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'notification-click' && event.data.url) {
            window.location.hash = event.data.url.replace(/^\/#/, '');
        }
    });
}
