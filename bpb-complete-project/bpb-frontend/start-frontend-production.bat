@echo off
REM ========================================
REM Frontend Production Server Script
REM ========================================

echo.
echo ========================================
echo   Starting Frontend (Production Mode)
echo ========================================
echo.

REM Check if dist folder exists
if not exist "dist" (
    echo [ERROR] Production build not found!
    echo Please run build-frontend.bat first
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Start production server
echo [INFO] Starting production server...
echo [INFO] Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

set NODE_ENV=production
pnpm start

REM If server stops
echo.
echo [INFO] Frontend server stopped
pause
