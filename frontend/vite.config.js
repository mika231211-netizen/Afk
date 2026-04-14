import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://0c7f28dafcf0a0e0-217-235-219-181.serveousercontent.com',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://0c7f28dafcf0a0e0-217-235-219-181.serveousercontent.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
