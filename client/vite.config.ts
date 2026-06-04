import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN'da telefondan erişim için
    port: 5173,
  },
});
