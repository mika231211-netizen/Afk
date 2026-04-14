#!/data/data/com.termux/files/usr/bin/bash
echo "[Tunnel] Starting stable tunnel..."

while true; do
  echo "[Tunnel] Connecting..."
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=20 \
      -o ServerAliveCountMax=5 \
      -o ExitOnForwardFailure=yes \
      -o ConnectTimeout=10 \
      -R 80:localhost:3001 localhost.run 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "tunneled with tls termination"; then
      URL=$(echo "$line" | grep -o 'https://[^ ]*')
      echo "[Tunnel] URL: $URL"
      echo "$URL" > /tmp/tunnel_url.txt
    fi
  done
  echo "[Tunnel] Reconnecting in 5 seconds..."
  sleep 5
done
