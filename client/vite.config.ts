import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN'da telefondan erişim için
    port: 5173,
  },
  build: {
    target: 'es2020',
    // Vendor'ı ayır: react/router/socket nadiren değişir → tarayıcı uzun
    // süre cache'ler, oyun kodu güncellense bile yeniden inmez.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
