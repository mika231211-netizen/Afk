# Run this script when the tunnel URL changes
# It automatically fetches the new URL and restarts the frontend

param([string]$url)

if (-not $url) {
    Write-Host "Usage: .\update-tunnel.ps1 -url https://xxxx.serveousercontent.com" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Get the URL from Termux with: pm2 logs tunnel --lines 2" -ForegroundColor Cyan
    $url = Read-Host "Paste the new Serveo URL here"
}

$url = $url.TrimEnd('/')
Write-Host "Updating to: $url" -ForegroundColor Green

# Update vite.config.js
$config = @"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: '$url',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: '$url',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
"@

Set-Content -Path "frontend\vite.config.js" -Value $config
Write-Host "Config updated!" -ForegroundColor Green
Write-Host "Opening $url in browser..." -ForegroundColor Cyan
Start-Process $url
Write-Host ""
Write-Host "Now open http://localhost:5173" -ForegroundColor Yellow
