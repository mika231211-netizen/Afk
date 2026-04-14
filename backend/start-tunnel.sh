#!/bin/bash
# Auto-tunnel script - detects URL and updates backend
while true; do
  ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "Forwarding HTTP traffic from"; then
      URL=$(echo "$line" | grep -o 'https://[^ ]*')
      echo "[Tunnel] Got URL: $URL"
      # Save URL to file so frontend can read it
      echo "$URL" > /tmp/tunnel_url.txt
      # Update backend
      curl -s -X POST http://localhost:3001/api/tunnel/update \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$URL\"}" > /dev/null
    fi
  done
  echo "[Tunnel] Reconnecting in 3s..."
  sleep 3
done
