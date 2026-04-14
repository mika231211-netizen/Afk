#!/data/data/com.termux/files/usr/bin/bash
# Stable tunnel - reconnects automatically, tries to keep same subdomain
echo "[Tunnel] Starting stable tunnel..."

while true; do
  echo "[Tunnel] Connecting to serveo.net..."
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -R 80:localhost:3001 serveo.net 2>&1
  echo "[Tunnel] Disconnected. Reconnecting in 5 seconds..."
  sleep 5
done
