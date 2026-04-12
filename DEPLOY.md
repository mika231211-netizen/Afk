# 🚀 24/7 Deployment Guide

## Schritt 1 – GitHub Repository erstellen

1. Geh auf https://github.com/new
2. Repository erstellen (z.B. `minecraft-panel`)
3. Öffne ein Terminal im `minecraft-panel` Ordner und führe aus:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN_USERNAME/minecraft-panel.git
git push -u origin main
```

---

## Schritt 2 – MongoDB Atlas (Datenbank, bereits erledigt ✅)

Deine MongoDB URI ist bereits konfiguriert.

---

## Schritt 3 – Backend auf Railway deployen

1. Geh auf https://railway.app → "Start a New Project"
2. "Deploy from GitHub repo" → dein Repository auswählen
3. **Root Directory** auf `/backend` setzen
4. Unter "Variables" diese Umgebungsvariablen eintragen:

| Variable | Wert |
|---|---|
| `MONGODB_URI` | `mongodb+srv://Mika:Tino2312!@afkclient.iushys2.mongodb.net/minecraft-panel?appName=afkclient` |
| `JWT_SECRET` | `minecraft_panel_super_secret_key_2024` |
| `FRONTEND_URL` | (erst nach Schritt 4 eintragen) |

5. Deploy starten → Railway gibt dir eine URL wie `https://minecraft-panel-backend.up.railway.app`
6. Diese URL notieren!

---

## Schritt 4 – Frontend auf Railway deployen

1. Im selben Railway-Projekt: "New Service" → GitHub repo → Root Directory `/frontend`
2. Unter "Variables" eintragen:

| Variable | Wert |
|---|---|
| `VITE_API_URL` | `https://DEINE-BACKEND-URL.up.railway.app/api` |
| `VITE_SOCKET_URL` | `https://DEINE-BACKEND-URL.up.railway.app` |

3. Deploy starten → Frontend-URL notieren (z.B. `https://minecraft-panel.up.railway.app`)

---

## Schritt 5 – Backend FRONTEND_URL aktualisieren

1. Zurück zum Backend-Service in Railway
2. Variable `FRONTEND_URL` auf deine Frontend-URL setzen
3. Backend neu deployen (automatisch)

---

## ✅ Fertig!

Dein Panel läuft jetzt 24/7 unter deiner Railway-URL.
Der Bot bleibt auch dann online, wenn dein PC ausgeschaltet ist.

---

## Alternative: Render.com (auch kostenlos)

Backend: https://render.com → "New Web Service" → GitHub → Root: `backend`
- Build Command: `npm install`
- Start Command: `node src/index.js`
- Gleiche Umgebungsvariablen wie oben

Frontend: "New Static Site" → Root: `frontend`
- Build Command: `npm run build`
- Publish Directory: `dist`
- Env: `VITE_API_URL` und `VITE_SOCKET_URL`

**Hinweis Render Free Tier:** Der Free-Tier schläft nach 15min Inaktivität ein.
Für 24/7 Bot-Betrieb empfehle ich Railway ($5/Monat) oder einen eigenen VPS.

---

## VPS Option (Hetzner, DigitalOcean, etc.)

```bash
# Auf dem VPS (Ubuntu):
apt update && apt install -y nodejs npm git
git clone https://github.com/DEIN_USERNAME/minecraft-panel.git
cd minecraft-panel

# .env setzen
cp backend/.env.example backend/.env
nano backend/.env  # Werte eintragen

# Mit PM2 dauerhaft laufen lassen
npm install -g pm2
cd backend && npm install && pm2 start src/index.js --name minecraft-panel
pm2 startup && pm2 save

# Frontend bauen
cd ../frontend && npm install && npm run build
# Dann mit nginx oder serve hosten
```
