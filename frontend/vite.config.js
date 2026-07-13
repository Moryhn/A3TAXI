import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/A3TAXI/',
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
    },
});
