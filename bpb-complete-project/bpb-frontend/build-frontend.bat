@echo off
REM ========================================
REM Frontend Build Script for Production
REM ========================================

echo.
echo ========================================
echo   Building Frontend for Production
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] pnpm is not installed. Installing pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
)

REM Install dependencies
echo [INFO] Installing dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Build for production
echo.
echo [INFO] Building frontend for production...
pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Frontend built successfully!
echo [INFO] Build output is in the 'dist' folder
echo [INFO] To start production server, run: start-frontend-production.bat
echo.
pause
