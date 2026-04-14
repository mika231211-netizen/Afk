#!/data/data/com.termux/files/usr/bin/bash
echo "[Tunnel] Starting stable tunnel..."

while true; do
  echo "[Tunnel] Connecting to serveo.net..."
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -R 80:localhost:3001 serveo.net 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "Forwarding HTTP traffic from"; then
      URL=$(echo "$line" | grep -o 'https://[^ ]*')
      echo "[Tunnel] Got URL: $URL"
      echo "$URL" > /tmp/tunnel_url.txt
      # Upload URL to file.io (auto-expires, no account needed)
      curl -s -X POST https://file.io \
        -F "text=$URL" \
        -F "expires=1d" > /tmp/fileio_response.txt 2>&1 || true
      echo "[Tunnel] URL saved"
    fi
  done
  echo "[Tunnel] Disconnected. Reconnecting in 5 seconds..."
  sleep 5
done
