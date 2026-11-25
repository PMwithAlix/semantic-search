@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

title Semantic Search - Run

echo.
echo ========================================
echo   Semantic Search Platform
echo ========================================
echo.

if not exist ".env" (
    echo [هشدار] فایل .env پیدا نشد.
    echo         از .env.example کپی بگیرید و AVALAI_API_KEY را تنظیم کنید.
    echo.
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [خطا] Docker نصب نیست یا در PATH نیست.
    echo        Docker Desktop را نصب و اجرا کنید.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [خطا] Node.js نصب نیست یا در PATH نیست.
    pause
    exit /b 1
)

echo [1/3] راه‌اندازی backend (Docker)...
docker compose up -d --build
if errorlevel 1 (
    echo.
    echo [خطا] اجرای Docker Compose ناموفق بود.
    echo        مطمئن شوید Docker Desktop در حال اجراست.
    pause
    exit /b 1
)

echo.
echo [2/3] انتظار برای آماده شدن API...
set /a WAIT_TRIES=0
:WAIT_API
set /a WAIT_TRIES+=1
if %WAIT_TRIES% gtr 45 (
    echo [هشدار] API هنوز پاسخ نمی‌دهد — frontend همچنان اجرا می‌شود.
    goto START_FRONTEND
)
curl -sf http://localhost:8000/docs >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto WAIT_API
)
echo        API آماده است.

:START_FRONTEND
echo.
if not exist "project\node_modules\" (
    echo نصب وابستگی‌های frontend...
    pushd project
    call npm install
    if errorlevel 1 (
        popd
        echo [خطا] npm install ناموفق بود.
        pause
        exit /b 1
    )
    popd
)

echo [3/3] راه‌اندازی frontend...
start "Semantic Search Frontend" cmd /k "cd /d ""%~dp0project"" && npm run dev"

echo.
echo ========================================
echo   پروژه در حال اجراست
echo ========================================
echo   Frontend:  http://localhost:5173
echo   API Docs:  http://localhost:8000/docs
echo ========================================
echo.

timeout /t 3 /nobreak >nul
start "" http://localhost:5173

echo برای توقف backend:  docker compose down
echo برای توقف frontend: پنجره «Semantic Search Frontend» را ببندید.
echo.
pause
