@echo off
REM ========================================
REM Frontend Startup Script for Windows
REM ========================================

echo.
echo ========================================
echo   Starting Frontend Server
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
    echo [SUCCESS] pnpm installed
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    pnpm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
) else (
    echo [INFO] Installing/Updating dependencies...
    pnpm install
)

REM Start development server
echo.
echo [INFO] Starting Vite development server...
echo [INFO] Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

pnpm dev

REM If server stops
echo.
echo [INFO] Frontend server stopped
pause
