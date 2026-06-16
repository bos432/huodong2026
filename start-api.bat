@echo off
cd /d D:\2026\活动报名\apps\api
set NODE_ENV=development
set API_PORT=3000
set DB_HOST=127.0.0.1
set DB_PORT=3307
set DB_USERNAME=activity
set DB_PASSWORD=activitypass
set DB_DATABASE=activity_registration
set DB_SYNCHRONIZE=false
set JWT_SECRET=dev-secret-change-me
set CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:8080
set TRUST_PROXY=false
set SECURITY_HEADERS_ENABLED=true
set SECURITY_HSTS_ENABLED=false
set ACCESS_LOG_ENABLED=true
set ACCESS_LOG_SKIP_HEALTH=true
set H5_AUTH_MODE=dev
set H5_AUTH_SECRET=dev-h5-auth-secret-change-me-32chars
set ADMIN_LOGIN_WINDOW_MINUTES=10
set ADMIN_LOGIN_MAX_FAILURES=20
set ADMIN_LOGIN_LOCK_MINUTES=10
set PAYMENT_SANDBOX_ENABLED=true
start /min "" "C:\Program Files\nodejs\node.exe" "dist\main.js" 1>> "D:\2026\活动报名\logs\api-bat.out.log" 2>> "D:\2026\活动报名\logs\api-bat.err.log"
echo API started
