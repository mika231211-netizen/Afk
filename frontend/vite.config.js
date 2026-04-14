import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://9030e1d8e97054ea-217-235-219-181.serveousercontent.com',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://9030e1d8e97054ea-217-235-219-181.serveousercontent.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
