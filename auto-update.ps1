# Auto-Update Script - runs in background and keeps frontend in sync with tunnel URL
# Just run this once and it handles everything automatically!

Write-Host "🎮 Minecraft Panel Auto-Updater" -ForegroundColor Cyan
Write-Host "Watching for tunnel URL changes..." -ForegroundColor Gray
Write-Host "Press CTRL+C to stop" -ForegroundColor Gray
Write-Host ""

$lastUrl = ""
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

while ($true) {
    try {
        # Get current tunnel URL from backend
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/tunnel/url" -TimeoutSec 3 -ErrorAction Stop
        $newUrl = $response.url

        if ($newUrl -and $newUrl -ne $lastUrl) {
            Write-Host "$(Get-Date -Format 'HH:mm:ss') New URL detected: $newUrl" -ForegroundColor Green
            
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
        target: '$newUrl',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: '$newUrl',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
"@
            Set-Content -Path "$scriptDir\frontend\vite.config.js" -Value $config
            $lastUrl = $newUrl
            Write-Host "$(Get-Date -Format 'HH:mm:ss') Config updated! Restart frontend if needed." -ForegroundColor Yellow
        }
    } catch {
        # Backend not reachable, skip
    }
    Start-Sleep -Seconds 10
}
