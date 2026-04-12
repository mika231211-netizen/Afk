# 🎮 Minecraft Panel

Ein webbasiertes Control Panel für Minecraft Headless Bots – läuft 24/7 auf einem VPS.

## Features

- **Multi-User** – Jeder Nutzer verwaltet seine eigenen Bots (SaaS-Struktur)
- **Live-Status** – Echtzeit-Updates via WebSocket
- **Live-Chat** – Alle Ingame-Nachrichten direkt im Browser
- **Auto-Reconnect** – Bot verbindet sich automatisch neu bei Verbindungsabbruch
- **Dark Mode** – Modernes Dashboard-Design
- **Docker-ready** – Einfaches Deployment auf jedem VPS

## Schnellstart (Lokal)

### Voraussetzungen
- Node.js 18+
- MongoDB (lokal oder Atlas)

### Backend
```bash
cd backend
cp .env.example .env
# .env anpassen (JWT_SECRET, MONGODB_URI)
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173

---

## VPS Deployment mit Docker

```bash
# Repository klonen
git clone <repo-url>
cd minecraft-panel

# Umgebungsvariablen setzen
export JWT_SECRET="dein_sicherer_schluessel"
export FRONTEND_URL="http://deine-vps-ip"

# Starten
docker-compose up -d
```

Dashboard: http://deine-vps-ip

---

## Architektur

```
Frontend (React + Vite)
    ↕ REST API + WebSocket
Backend (Node.js + Express + Socket.io)
    ↕ mineflayer
Minecraft Server
    ↕ MongoDB
Datenbank
```

## Umgebungsvariablen (Backend)

| Variable | Beschreibung | Standard |
|---|---|---|
| `PORT` | Backend-Port | `3001` |
| `MONGODB_URI` | MongoDB Verbindungs-URL | `mongodb://localhost:27017/minecraft-panel` |
| `JWT_SECRET` | Geheimer Schlüssel für JWT | – |
| `FRONTEND_URL` | CORS-Origin des Frontends | `http://localhost:5173` |
