#!/bin/bash
set -e

echo "🚀 Deploying Minecraft Panel to Fly.io..."

MONGODB_URI="mongodb+srv://Mika:Tino2312!@afkclient.iushys2.mongodb.net/minecraft-panel?appName=afkclient"
JWT_SECRET="minecraft_panel_super_secret_key_2024"
BACKEND_APP="minecraft-panel-backend"
FRONTEND_APP="minecraft-panel-frontend"

# ── BACKEND ──────────────────────────────────────────────
echo ""
echo "📦 Deploying Backend..."
cd backend

# Create app if not exists
fly apps create $BACKEND_APP --org personal 2>/dev/null || echo "App already exists"

# Set secrets
fly secrets set \
  MONGODB_URI="$MONGODB_URI" \
  JWT_SECRET="$JWT_SECRET" \
  FRONTEND_URL="https://${FRONTEND_APP}.fly.dev" \
  --app $BACKEND_APP

# Deploy
fly deploy --app $BACKEND_APP --ha=false

BACKEND_URL="https://${BACKEND_APP}.fly.dev"
echo "✅ Backend live: $BACKEND_URL"

# ── FRONTEND ─────────────────────────────────────────────
echo ""
echo "🎨 Deploying Frontend..."
cd ../frontend

# Create app if not exists
fly apps create $FRONTEND_APP --org personal 2>/dev/null || echo "App already exists"

# Deploy with build args
fly deploy --app $FRONTEND_APP --ha=false \
  --build-arg VITE_API_URL="${BACKEND_URL}/api" \
  --build-arg VITE_SOCKET_URL="${BACKEND_URL}"

FRONTEND_URL="https://${FRONTEND_APP}.fly.dev"
echo "✅ Frontend live: $FRONTEND_URL"

# ── UPDATE BACKEND CORS ───────────────────────────────────
echo ""
echo "🔗 Updating Backend CORS..."
cd ../backend
fly secrets set FRONTEND_URL="$FRONTEND_URL" --app $BACKEND_APP

echo ""
echo "🎉 FERTIG! Dein Panel läuft 24/7 unter:"
echo "   👉 $FRONTEND_URL"
