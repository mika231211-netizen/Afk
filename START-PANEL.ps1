# ============================================
# MINECRAFT PANEL STARTER
# Doppelklick um das Panel zu starten!
# ============================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MINECRAFT PANEL STARTER" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Schritt 1: Gib in Termux auf dem Handy ein:" -ForegroundColor Yellow
Write-Host "  pm2 logs tunnel --lines 2" -ForegroundColor White
Write-Host ""
$url = Read-Host "Schritt 2: Paste die Serveo-URL hier rein"
$url = $url.Trim().TrimEnd('/')

if (-not $url.StartsWith("https://")) {
    Write-Host "Ungueltige URL!" -ForegroundColor Red
    pause
    exit
}

Write-Host ""
Write-Host "Updating config..." -ForegroundColor Gray

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

Set-Content -Path "$scriptDir\frontend\vite.config.js" -Value $config

Write-Host "Opening Serveo URL in browser..." -ForegroundColor Gray
Start-Process $url
Start-Sleep -Seconds 2

Write-Host "Starting frontend..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$scriptDir\frontend'; npm run dev`""

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   PANEL LAEUFT!" -ForegroundColor Green
Write-Host "   http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Start-Process "http://localhost:5173"
