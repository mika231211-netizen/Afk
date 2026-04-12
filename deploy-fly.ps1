$MONGODB_URI = "mongodb+srv://Mika:Tino2312!@afkclient.iushys2.mongodb.net/minecraft-panel?appName=afkclient"
$JWT_SECRET = "minecraft_panel_super_secret_key_2024"
$BACKEND_APP = "minecraft-panel-backend"
$FRONTEND_APP = "minecraft-panel-frontend"
$BACKEND_URL = "https://$BACKEND_APP.fly.dev"
$FRONTEND_URL = "https://$FRONTEND_APP.fly.dev"

Write-Host "Deploying Backend..." -ForegroundColor Cyan
Set-Location backend

fly apps create $BACKEND_APP --org personal 2>$null
fly secrets set MONGODB_URI="$MONGODB_URI" JWT_SECRET="$JWT_SECRET" FRONTEND_URL="$FRONTEND_URL" --app $BACKEND_APP
fly deploy --app $BACKEND_APP --ha=false

Write-Host "Backend live: $BACKEND_URL" -ForegroundColor Green

Write-Host "Deploying Frontend..." -ForegroundColor Cyan
Set-Location ../frontend

fly apps create $FRONTEND_APP --org personal 2>$null
fly deploy --app $FRONTEND_APP --ha=false --build-arg VITE_API_URL="$BACKEND_URL/api" --build-arg VITE_SOCKET_URL="$BACKEND_URL"

Write-Host "Frontend live: $FRONTEND_URL" -ForegroundColor Green

Write-Host ""
Write-Host "FERTIG! Dein Panel laeuft 24/7 unter:" -ForegroundColor Yellow
Write-Host "  $FRONTEND_URL" -ForegroundColor White

Set-Location ..
